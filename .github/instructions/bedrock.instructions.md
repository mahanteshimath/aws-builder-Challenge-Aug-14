---
applyTo: "backend/**/*.{mjs,js,ts}"
description: "Bedrock request and response shapes for Dream Postcards: Nova Lite via Converse, Stable Image Core via InvokeModel, plus region pinning and cost guards."
---

# Bedrock in this project

Region is **`us-west-2`**, pinned in code. `amazon.nova-canvas-v1:0` is LEGACY on this account and
returns `ResourceNotFoundException` — do not reintroduce it.

```js
import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
const bedrock = new BedrockRuntimeClient({ region: "us-west-2" });
```

## Text — `amazon.nova-lite-v1:0` via `ConverseCommand`

```js
const res = await bedrock.send(new ConverseCommand({
  modelId: "amazon.nova-lite-v1:0",
  system: [{ text: "Respond with a single JSON object and nothing else." }],
  messages: [{ role: "user", content: [{ text: prompt }] }],
  inferenceConfig: { maxTokens: 600, temperature: 0.9 },
}));
const text = res.output.message.content[0].text;
```

Nova Lite prepends chatter ("Understood, here is your reply:") even when told not to. Slice to the
outermost braces before parsing, and validate every field you rely on:

```js
const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
```

## Image — `stability.stable-image-core-v1:1` via `InvokeModelCommand`

Note this is Stability's own schema, **not** the older `text_prompts` SDXL schema.

```js
const res = await bedrock.send(new InvokeModelCommand({
  modelId: "stability.stable-image-core-v1:1",
  body: JSON.stringify({
    prompt,                      // <= 10000 chars
    mode: "text-to-image",
    aspect_ratio: "3:2",         // postcard shape
    output_format: "png",
  }),
}));
const { images, finish_reasons } = JSON.parse(new TextDecoder().decode(res.body));
```

`images[0]` is a base64 PNG, roughly 3-5 MB. Decode with `Buffer.from(images[0], "base64")` and put
it straight to S3 — never return it in the HTTP response body.

A non-null entry in `finish_reasons` means the content filter rejected the prompt. That is a normal
user outcome, not a server error: return a friendly message, and do not retry.

## Errors

| Error | Meaning | Response |
|---|---|---|
| `ValidationException` | prompt rejected or malformed request | 400, friendly message |
| non-null `finish_reasons[0]` | image blocked by content filter | 400, friendly message |
| `ThrottlingException` | rate limited | retry once with backoff, then 503 |
| `ResourceNotFoundException` | model is LEGACY or wrong region | do not retry — it is a config bug |

## Cost guards

Every image is a real charge. Non-negotiable:

- One image per request. Never loop, never batch, never generate on retry.
- Enforce the daily cap in the handler *before* calling the image model.
- Reject `dreamText` over 500 chars at the boundary rather than truncating and calling anyway.
- Mock Bedrock in tests. A test must never reach the real API.

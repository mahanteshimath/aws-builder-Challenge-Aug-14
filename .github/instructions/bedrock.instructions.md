---
applyTo: "backend/**/*.{mjs,js,ts}"
description: "Bedrock usage for Dream Postcards: Nova Lite via Converse for words and art direction, why there is no image model on this account, and the cost and safety guards."
---

# Bedrock in this project

Region is **`us-west-2`**, pinned in code.

```js
import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
const bedrock = new BedrockRuntimeClient({ region: "us-west-2" });
```

## There is no image model here

Both options were tried on this account and both fail. Do not reintroduce either.

| Model | Failure |
|---|---|
| `amazon.nova-canvas-v1:0` | `ResourceNotFoundException` — provider marked it LEGACY |
| `stability.stable-image-core-v1:1` | `AccessDeniedException: INVALID_PAYMENT_INSTRUMENT` — third-party Marketplace model, and the IAM user lacks `aws-marketplace:Subscribe` |

The postcard front is drawn by `backend/poster.mjs`. Nova Lite supplies art direction
(`archetype`, `palette`, `sunY`, `birds`) and the renderer draws the SVG.

If image generation is ever unblocked, add it *behind* the existing renderer as a fallback rather
than replacing it — the renderer is free, instant, and deterministic.

## Text — `amazon.nova-lite-v1:0` via `ConverseCommand`

```js
const res = await bedrock.send(new ConverseCommand({
  modelId: "amazon.nova-lite-v1:0",
  system: [{ text: "Respond with a single JSON object and nothing else." }],
  messages: [{ role: "user", content: [{ text: prompt }] }],
  inferenceConfig: { maxTokens: 700, temperature: 0.9 },
}));
const text = res.output.message.content[0].text;
```

Nova Lite prepends chatter ("Understood, here is your reply:") and wraps output in code fences even
when told not to. Slice to the outermost braces before parsing — `parseJsonObject` does this.

Nova **Pro** and Premier are not available on-demand here: they need an inference profile ID such as
`us.amazon.nova-pro-v1:0`, not the bare model ID.

## Treat model output as untrusted

- Prose fields are rendered as **text**, never as markup.
- Art-direction fields go through `normalizeScene`, which clamps them to a fixed vocabulary. A
  hostile or nonsense value degrades into a still-good poster instead of reaching the DOM.
- This is the only reason the frontend may use `dangerouslySetInnerHTML` on the poster.

## Errors

| Error | Meaning | Response |
|---|---|---|
| `ValidationException` | malformed request, or a bare model ID needing an inference profile | 400, do not retry blindly |
| `ThrottlingException` | rate limited | retry once with backoff, then 503 |
| `ResourceNotFoundException` | model is LEGACY or wrong region | config bug, do not retry |
| `AccessDeniedException` | Marketplace subscription or payment problem | config bug, do not retry |

## Guards

- Reject `dreamText` over 500 chars at the boundary rather than truncating and calling anyway.
- Claim the daily cap (`claimBudget`) *before* the model call, so a spent budget costs nothing.
- Tests never reach the real API — `npm test` makes no network calls.

# Dream Postcards

Describe a dream, get back a vintage travel postcard: an AI-painted dreamscape on the front, a
handwritten note from your dream self and an impossible postmark on the back. Click to flip.

Built for the [AWS Builder Center Weekend Creative Challenge](https://builder.aws.com/content/3HsenBszjY2I5AP4UmCHgQkImIB/terms-and-conditions-weekend-challenge-build-a-creative-app).
**Submission deadline: Aug 17 2026, 13:00 PT.**

## AWS environment

Every AWS CLI call must pass both flags — the profile is not the shell default:

```powershell
--profile hackathon --region us-west-2
```

`us-west-2` is not optional. `amazon.nova-canvas-v1:0` is marked LEGACY and returns
`ResourceNotFoundException` on this account, and no text-to-image model is ACTIVE in `us-east-1`.
`us-west-2` is the only checked region with one.

| Purpose | Model |
|---|---|
| Postcard text | `amazon.nova-lite-v1:0` (Converse API) |
| Postcard front image | `stability.stable-image-core-v1:1` (InvokeModel) |

See [.github/instructions/bedrock.instructions.md](.github/instructions/bedrock.instructions.md)
for request and response shapes.

## Layout

| Path | What |
|---|---|
| `template.yaml` | SAM stack: Lambda + Function URL, DynamoDB, S3 |
| `backend/` | Node 22 handler, one function, two routes |
| `frontend/` | Vite + React, deployed to Amplify Hosting |
| `article/` | Builder Center submission + architecture diagram |

## Commands

```powershell
cd backend; npm test              # node --test, Bedrock mocked. Run before deploying.
cd frontend; npm run dev          # local UI against the deployed Function URL
sam build; sam deploy --profile hackathon --region us-west-2
```

Use `/deploy` for a full deploy — it wires the Function URL into the frontend and verifies the
deployed artifacts rather than trusting command output. Use `/write-article` to generate the
submission.

## Conventions

- **Cost guard.** Image generation costs real money per call. Keep `numberOfImages` at 1, keep the
  daily cap in the handler, and never generate an image from a test or a retry loop.
- **Pin the Bedrock region in code** (`new BedrockRuntimeClient({ region: "us-west-2" })`). Do not
  inherit it from the environment.
- **Deliberately lazy infra**, do not "improve" it: Lambda Function URL instead of API Gateway,
  presigned S3 GETs instead of CloudFront, one handler for both routes, DynamoDB TTL instead of a
  cleanup job. Each of these is a talking point in the article.
- Validate `dreamText` at the handler boundary (non-empty, <= 500 chars) before it reaches Bedrock.
- Never `git commit` or `git push` unless asked.
- On Windows set `$env:AWS_PAGER=""` first, or table output hangs in a pager.

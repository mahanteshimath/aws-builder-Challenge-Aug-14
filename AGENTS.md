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

`us-west-2` is not optional, and **there is no image model on this account**. `amazon.nova-canvas-v1:0`
is marked LEGACY and returns `ResourceNotFoundException`; Stability's models are third-party AWS
Marketplace models and fail with `INVALID_PAYMENT_INSTRUMENT`. Do not reintroduce either.

| Purpose | How |
|---|---|
| Postcard words + art direction | `amazon.nova-lite-v1:0` (Converse API) |
| Postcard front artwork | `backend/poster.mjs` renders SVG from the model's art direction |

The model chooses an archetype, palette, sun height and bird count; our renderer draws the poster.
Model output is never emitted as markup. See
[.github/instructions/bedrock.instructions.md](.github/instructions/bedrock.instructions.md).

## Layout

| Path | What |
|---|---|
| `template.yaml` | CloudFormation/SAM stack: Lambda + Function URL, DynamoDB |
| `backend/` | Node 22 handler, one function, two routes, plus the SVG poster renderer |
| `frontend/` | Vite + React, deployed to Amplify Hosting |
| `article/` | Builder Center submission + architecture diagram |

## Commands

```powershell
cd backend; npm test              # node --test, no AWS calls. Run before deploying.
cd frontend; npm run dev          # local UI against the deployed Function URL
aws cloudformation package --template-file template.yaml `
  --s3-bucket dream-postcards-artifacts-686112930486 --output-template-file packaged.yaml `
  --profile hackathon --region us-west-2
aws cloudformation deploy --template-file packaged.yaml --stack-name dream-postcards `
  --capabilities CAPABILITY_IAM --profile hackathon --region us-west-2
```

There is no `sam` CLI on this machine — the AWS CLI's `cloudformation package` handles the SAM
transform natively. Use `/deploy` for a full deploy; it wires the Function URL into the frontend and
verifies deployed artifacts rather than trusting command output. Use `/write-article` for the
submission.

## Conventions

- **Never render model output as markup.** The poster SVG is built by our renderer from a clamped
  vocabulary (`normalizeScene`). That is the only reason the frontend can use
  `dangerouslySetInnerHTML`. Keep it that way.
- **Pin the Bedrock region in code** (`new BedrockRuntimeClient({ region: "us-west-2" })`). Do not
  inherit it from the environment.
- **Deliberately lazy infra**, do not "improve" it: Lambda Function URL instead of API Gateway, one
  handler for both routes, DynamoDB TTL instead of a cleanup job, SVG in the table instead of an S3
  object. Each of these is a talking point in the article.
- Validate `dreamText` at the handler boundary (non-empty, <= 500 chars) before it reaches Bedrock,
  and claim the daily cap before any model call.
- Never `git commit` or `git push` unless asked.
- On Windows set `$env:AWS_PAGER=""` first, or table output hangs in a pager.

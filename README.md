# Dream Postcards

Describe a dream. Get back a vintage travel postcard from wherever you went: a mid-century travel
poster on the front, a handwritten note from your dream self and an impossible postmark on the back.
Click it to turn it over.

**Live:** https://main.d5c14kpdhh5ai.amplifyapp.com

Built for the AWS Builder Center Weekend Creative Challenge, August 2026.

## How it works

Amazon Nova Lite writes the postcard *and art-directs the front* — it picks a landscape archetype, a
palette, the height of the sun and how busy the sky is. A small renderer
([backend/poster.mjs](backend/poster.mjs)) turns that direction into a layered SVG poster.

There is no image model in the loop, and that was not the original plan: Nova Canvas is retired on
this account and the Stability models need a Marketplace payment method. Making the illustration
*code* turned out cheaper, faster, deterministic, and immune to prompt injection. See
[article/architecture.md](article/architecture.md).

## Stack

Amplify Hosting, Lambda (Function URL), Amazon Bedrock, DynamoDB, CloudFormation, IAM.

## Develop

```powershell
cd backend; npm install; npm test
cd frontend; npm install; npm run dev
```

Deploy and submission workflows live in [AGENTS.md](AGENTS.md) and `.github/skills/`.

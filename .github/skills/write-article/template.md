# Weekend Creative Challenge: Dream Postcards

#creative-expression

> Delete these bracketed hints as you fill each section. Target 600-800 words — the floor is 500 and
> you do not want to discover you are at 480 the night of the deadline.

## Vision & what the app does

[What you type in, what comes back out, and why it is fun. Name the creative output concretely:
the invented destination, the note in your dream self's voice, the impossible postmark, the flip.
One sentence on why a postcard, and not a wall of generated text.]

## How I built it

[The development process in order. Where the design changed and why. The problems that cost real
time and how each was resolved — the Bedrock model availability wall is the centerpiece here.
Include the actual error string. Mention the deliberate simplifications and what each one bought:
Function URL instead of API Gateway, presigned S3 GETs instead of CloudFront, one handler for two
routes, DynamoDB TTL instead of a cleanup job.]

## AWS services used / architecture overview

[List every service and what it does here. Then the diagram from architecture.md.]

| Service | Role |
|---|---|
| Amazon Bedrock | Nova Lite writes the postcard and art-directs the front |
| AWS Lambda | single Node 22 arm64 handler behind a Function URL |
| Amazon DynamoDB | postcard store and the atomic daily budget counter, 30-day TTL |
| AWS Amplify Hosting | serves the Vite + React frontend |
| AWS CloudFormation | provisions the stack via the SAM transform |
| AWS IAM | scopes the Lambda to exactly one model ARN |

```mermaid
[paste the diagram from article/architecture.md]
```

## What I learned

[Be specific and useful to the next builder. Candidates: a model appearing in
`ListFoundationModels` does not mean you can call it — check `modelLifecycle.status`; third-party
Marketplace models need a payment instrument even when you hold service credits; Nova Pro needs an
inference profile id, not a bare model id; small models wrap JSON in prose and code fences; a CSS
`filter` silently flattens a 3D transform context and breaks `backface-visibility`.]

## Link

[Live: https://main.d5c14kpdhh5ai.amplifyapp.com plus the public repo. Add screenshots of the front
and the flipped back — the rubric rewards showing it working.]

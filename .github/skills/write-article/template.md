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
| Amazon Bedrock | Nova Lite writes the postcard text, Stable Image Core paints the front |
| AWS Lambda | single Node 22 handler behind a Function URL |
| Amazon S3 | stores generated PNGs, served via presigned GET |
| Amazon DynamoDB | postcard index, 30-day TTL |
| AWS Amplify Hosting | serves the Vite + React frontend |
| AWS CloudFormation | provisions the stack via SAM |
| AWS IAM | scopes the Lambda to exactly the two model ARNs |

```mermaid
[paste the diagram from article/architecture.md]
```

## What I learned

[Be specific and useful to the next builder. Candidates: model lifecycle status is a real deployment
constraint and `ListFoundationModels` availability does not imply access; Stability's Bedrock schema
is not the old SDXL `text_prompts` shape; small models pad JSON responses with prose so you must
slice to the braces; per-image cost makes a daily cap a design requirement, not a nice-to-have.]

## Link

[Live URL, and the public repo. Add screenshots or a short walkthrough clip — the rubric rewards
showing it working.]

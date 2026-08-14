---
name: deploy
description: "Deploy Dream Postcards to AWS: package and deploy the CloudFormation stack, wire the Function URL into the frontend, build and zip-deploy to Amplify Hosting, then verify the deployed artifacts. Use when the user says deploy, ship it, push to AWS, redeploy the backend, or update the live site."
---

# Deploy Dream Postcards

Set `$env:AWS_PAGER=""` first, then run everything from the repo root.

| Setting | Value |
|---|---|
| Profile / region | `hackathon` / `us-west-2` |
| Stack | `dream-postcards` |
| Artifacts bucket | `dream-postcards-artifacts-686112930486` |
| Amplify app id | `d5c14kpdhh5ai` |
| Live site | https://main.d5c14kpdhh5ai.amplifyapp.com |

There is **no `sam` CLI on this machine**. The AWS CLI's `cloudformation package` applies the SAM
transform natively — do not install SAM just to run `sam deploy`.

Never trust command output as proof. Step 5 checks the deployed artifacts themselves.

## 1. Test first

```powershell
cd backend; npm test; cd ..
```

Stop if this fails. Do not deploy over a failing test.

## 2. Backend

```powershell
aws cloudformation package --template-file template.yaml `
  --s3-bucket dream-postcards-artifacts-686112930486 `
  --output-template-file packaged.yaml --profile hackathon --region us-west-2

aws cloudformation deploy --template-file packaged.yaml --stack-name dream-postcards `
  --capabilities CAPABILITY_IAM --profile hackathon --region us-west-2
```

`packaged.yaml` is a build artifact and is gitignored. Delete it when finished.

## 3. Wire the Function URL into the frontend

```powershell
$fnUrl = (aws cloudformation describe-stacks --stack-name dream-postcards `
  --profile hackathon --region us-west-2 `
  --query "Stacks[0].Outputs[?OutputKey=='FunctionUrl'].OutputValue" --output text).TrimEnd('/')
"VITE_FUNCTION_URL=$fnUrl" | Set-Content frontend/.env -NoNewline
```

Always trim the trailing slash — a Function URL ends with one, and `$url/dream` would otherwise
produce a double slash and a 404.

## 4. Frontend

```powershell
cd frontend; npm ci; npm run build; cd ..
Compress-Archive -Path frontend/dist/* -DestinationPath dist.zip -Force

$d = aws amplify create-deployment --app-id d5c14kpdhh5ai --branch-name main `
  --profile hackathon --region us-west-2 --output json | ConvertFrom-Json
Invoke-RestMethod -Uri $d.zipUploadUrl -Method PUT -InFile dist.zip -ContentType "application/zip" | Out-Null
aws amplify start-deployment --app-id d5c14kpdhh5ai --branch-name main --job-id $d.jobId `
  --profile hackathon --region us-west-2 --query "jobSummary.status" --output text
```

Zip deploy is used because it needs no Git repo. If the user wants Git-based CI/CD, **ask before
pushing** — pushing is never done unqualified.

## 5. Verify the artifacts

All five must pass. Report each result explicitly — never summarize as "deployed successfully".

1. **Lambda matches the build**
   ```powershell
   aws lambda get-function-configuration --function-name $fnName `
     --profile hackathon --region us-west-2 --query "[Runtime,LastModified]"
   ```
   `nodejs22.x`, and `LastModified` from this deploy rather than an earlier one.

2. **The API really makes a postcard**
   ```powershell
   $body = @{ dreamText = "I was late for a train made of paper" } | ConvertTo-Json
   $r = Invoke-RestMethod -Uri "$fnUrl/dream" -Method POST -Body $body -ContentType "application/json"
   ```
   `destination`, `note`, `postmark`, `stamp` non-empty, and `poster` starting with `<svg`.

3. **The permalink round-trips** — `GET $fnUrl/p/$($r.id)` returns the same destination.

4. **Amplify finished** — `aws amplify get-job --app-id d5c14kpdhh5ai --branch-name main --job-id N`
   reports `SUCCEED`.

5. **The live site works, not just the API.** Open it in the browser, submit a dream, and click the
   postcard to confirm it flips to the back. Append `?cb=<timestamp>` to the URL — a cached
   `index.html` will happily serve the previous bundle and hide your change.

## When it fails

| Symptom | Cause |
|---|---|
| 500 and logs show `AccessDeniedException` | a Marketplace or image model crept back in — see `AGENTS.md` |
| 500 and logs show `ResourceNotFoundException` | wrong region, or a LEGACY model id |
| Frontend calls `localhost` | `frontend/.env` was not written before `npm run build` |
| CORS error in browser but curl works | `FunctionUrlConfig.Cors` no longer allows the site origin |
| Card shows a mirrored front instead of the back | a CSS `filter` on `.card` flattened the 3D context and disabled `backface-visibility` |
| Deploy "succeeds", behavior unchanged | cached bundle — recheck with a cache-busting query string |

Logs: `aws logs tail /aws/lambda/<FunctionName> --since 10m --profile hackathon --region us-west-2`

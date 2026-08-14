---
name: deploy
description: "Deploy Dream Postcards to AWS: sam build and deploy the backend stack, wire the Function URL into the frontend, build and ship the frontend to Amplify Hosting, then verify the deployed artifacts. Use when the user says deploy, ship it, push to AWS, redeploy the backend, or update the live site."
---

# Deploy Dream Postcards

Profile `hackathon`, region `us-west-2`, stack `dream-postcards`. Set `$env:AWS_PAGER=""` first.

Never trust command output as proof. Step 5 verifies the deployed artifacts themselves.

## 1. Test before deploying

```powershell
cd backend; npm test
```

Stop if this fails. Do not deploy over a failing test.

## 2. Backend

```powershell
sam build
sam deploy --stack-name dream-postcards --profile hackathon --region us-west-2 `
  --capabilities CAPABILITY_IAM --resolve-s3 --no-confirm-changeset
```

First run only, add `--guided` to create `samconfig.toml`.

## 3. Wire the Function URL into the frontend

```powershell
$fnUrl = aws cloudformation describe-stacks --stack-name dream-postcards `
  --profile hackathon --region us-west-2 `
  --query "Stacks[0].Outputs[?OutputKey=='FunctionUrl'].OutputValue" --output text
"VITE_FUNCTION_URL=$($fnUrl.TrimEnd('/'))" | Set-Content frontend/.env
```

Trailing slashes on a Function URL produce double-slash request paths. Always trim.

## 4. Frontend

```powershell
cd frontend; npm ci; npm run build
```

Then deploy `frontend/dist` to Amplify Hosting. If no Amplify app exists yet, ask the user whether
to create one Git-connected (needs a pushed GitHub repo — **ask before pushing**) or use zip deploy.

Zip deploy, no repo required:

```powershell
Compress-Archive -Path frontend/dist/* -DestinationPath dist.zip -Force
aws amplify create-deployment --app-id $appId --branch-name main --profile hackathon --region us-west-2
# upload dist.zip to the returned zipUploadUrl with Invoke-RestMethod -Method PUT, then:
aws amplify start-deployment --app-id $appId --branch-name main --job-id $jobId --profile hackathon --region us-west-2
```

## 5. Verify the artifacts

All five must pass. Report each result explicitly — do not summarize as "deployed successfully".

1. **Lambda matches the build**
   ```powershell
   aws lambda get-function-configuration --function-name $fnName `
     --profile hackathon --region us-west-2 --query "[Runtime,LastModified,CodeSha256]"
   ```
   Runtime is `nodejs22.x` and `LastModified` is from this deploy, not an earlier one.

2. **The API really generates a postcard**
   ```powershell
   $body = @{ dreamText = "I was late for a train made of paper" } | ConvertTo-Json
   $r = Invoke-RestMethod -Uri "$fnUrl/dream" -Method POST -Body $body -ContentType "application/json"
   $r | Format-List
   ```
   `destination`, `note`, `postmark`, and `imageUrl` must all be non-empty.

3. **The image URL serves a real PNG**
   ```powershell
   (Invoke-WebRequest $r.imageUrl).RawContentLength
   ```
   Expect hundreds of KB or more. A few hundred bytes means an XML error document.

4. **The permalink round-trips** — `GET $fnUrl/p/$($r.id)` returns the same destination.

5. **The deployed bundle points at this stack** — fetch the live site's JS and confirm the Function
   URL host appears in it. A stale bundle still loads and still looks fine while calling nothing.

## When it fails

| Symptom | Cause |
|---|---|
| CORS error in browser, curl works | `FunctionUrlConfig.Cors` missing the site origin |
| 403 on `imageUrl` | presigned URL expired, or the object was written to a different key |
| `ResourceNotFoundException` from Bedrock | wrong region or a LEGACY model — check `AGENTS.md` |
| Frontend calls `localhost` | `frontend/.env` was not written before `npm run build` |
| Deploy "succeeds", behavior unchanged | stale bundle — check 5 above, rebuild, redeploy |

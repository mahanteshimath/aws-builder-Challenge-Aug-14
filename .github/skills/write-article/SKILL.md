---
name: write-article
description: "Generate the AWS Builder Center submission article for Dream Postcards and check it against the challenge pass/fail rubric — exact title, required tag, all five sections, 500+ words, working link. Use when the user says write the article, draft the submission, or check my submission."
---

# Write the Builder Center submission

Output goes to `article/submission.md`. The challenge is graded pass/fail, so the checklist in step 3
matters more than the prose.

## 1. Gather facts from the repo — do not invent them

| Fact | Source |
|---|---|
| Services and architecture | `template.yaml`, `article/architecture.md` |
| Model IDs | `.github/instructions/bedrock.instructions.md` |
| Design decisions | the Conventions section of `AGENTS.md` |
| Live URL | Amplify app default domain |
| Real problems hit | this session's history — the Nova Canvas LEGACY block is the strongest one |

If `article/architecture.md` has no mermaid diagram yet, write one first.

## 2. Fill the template

Use [template.md](./template.md). Every heading is required by the rules.

Write it as one builder telling another what actually happened. Specifics beat adjectives: name the
error string, the wrong assumption, the fix. "I learned a lot about Bedrock" is filler; "Nova Canvas
returned `ResourceNotFoundException` because the provider marked it LEGACY, and no text-to-image
model was ACTIVE in us-east-1, so the whole app moved to us-west-2" is the article.

## 3. Verify before handing it over

Report each check with its result. Do not claim the article is ready until all pass.

- [ ] Title is exactly `Weekend Creative Challenge: Dream Postcards`
- [ ] Tag `#creative-expression` is present
- [ ] **Word count >= 500** — state the actual number:
      ```powershell
      (Get-Content article/submission.md -Raw -Encoding UTF8 |
        Select-String -Pattern '\S+' -AllMatches).Matches.Count
      ```
- [ ] All five sections present: vision, how you built it, AWS services and architecture,
      what you learned, link
- [ ] The link resolves — actually request it, don't assume
- [ ] Every AWS service named is really in `template.yaml` or the deploy path
- [ ] Screenshots referenced actually exist in `article/`

## 4. Remind the user

Publishing is manual and time-boxed. The article must be live on AWS Builder Center before
**Aug 17 2026, 13:00 PT**, and only the first 50 qualifying submissions get a jacket — earlier is
strictly better.

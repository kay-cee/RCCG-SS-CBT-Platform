---
name: cbt-deploy
description: >
  Run the full safe deploy sequence for the RCCG SS CBT Platform to Vercel production.
  Use this skill whenever the user says /cbt-deploy, "deploy to production", "push to vercel",
  "ship this", "deploy the changes", or asks to get changes live on rccgsundayschoolquiz.online.
  Also trigger when the user has just finished a feature and mentions deploying or going live.
  This skill runs tests first, checks for uncommitted changes, pushes to GitHub, deploys to
  Vercel, and verifies the production URL is responding — all in the correct order with safety
  checks at each step.
---

# CBT Platform — Safe Deploy

Run each step in order. Stop and report clearly if any step fails — do not proceed to later steps.

**Project directory:** `C:\Users\USER\OneDrive\Documents\Projects\CBT-Platform\cbt-platform`

---

## Step 1 — Run unit tests

```powershell
cd "C:\Users\USER\OneDrive\Documents\Projects\CBT-Platform\cbt-platform"
npx vitest run
```

If any tests fail: **stop here**. Report which tests failed and do not proceed. Ask the user to fix the failing tests first.

If all 50 tests pass: continue.

---

## Step 2 — Check for uncommitted changes

```powershell
git status
git diff --stat
```

Show the user what files have changed. If there are uncommitted changes:
- List the changed files
- Ask: "These changes are not committed. Would you like me to commit them before deploying, or deploy only what's already committed?"
- If the user wants to commit: ask for a commit message, then stage and commit
- If the user wants to skip: proceed with only committed changes (warn that local changes won't be deployed)

If the working tree is clean: continue directly.

---

## Step 3 — Show what will be deployed

Run:
```powershell
git log origin/master..HEAD --oneline
```

Show the user the commits that will go to production. Confirm: "Ready to push these commits and deploy?"

Wait for confirmation before proceeding.

---

## Step 4 — Push to GitHub

```powershell
git push origin master
```

If push fails (e.g., rejected): **stop**. Do NOT force push. Investigate why (diverged history?) and report to the user.

---

## Step 5 — Deploy to Vercel production

```powershell
cd "C:\Users\USER\OneDrive\Documents\Projects\CBT-Platform\cbt-platform"
npx vercel --prod
```

Watch the output. The deploy will:
1. Run `prisma generate && next build` (build script)
2. Upload to Vercel
3. Print the production alias URL

If the build fails: read the error output carefully. Common causes:
- TypeScript errors → show the TS error to the user
- Missing env var → check `vercel env ls`
- Prisma generate failed → likely a schema issue

---

## Step 6 — Health check

Once Vercel reports success, verify the live site:

```powershell
Invoke-WebRequest -Uri "https://rccgsundayschoolquiz.online/api/zones" -UseBasicParsing | Select-Object StatusCode, Content
```

Expected: `StatusCode: 200` with a JSON array of zones.

If health check fails: the deploy may have succeeded but the app is broken. Report the response and suggest checking Vercel logs.

---

## Step 7 — Report

Tell the user:
- ✅ Tests passed (N/50)
- ✅ Pushed to GitHub
- ✅ Deployed to https://rccgsundayschoolquiz.online
- ✅ Health check passed (or ⚠️ with details if not)
- The Vercel inspection URL for the deployment (from step 5 output)

---

## Safety rules (never break these)

- Never use `git push --force` or `git push -f`
- Never use `--no-verify` to skip hooks
- Never deploy without running tests first
- Always show what will be deployed before pushing
- If anything looks wrong, stop and ask the user rather than proceeding

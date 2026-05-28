Deployment instructions (ZIP method)

1. From project root run PowerShell script to create ZIP (Windows):
   make_deploy_zip.ps1 (project root)
   Example: powershell -ExecutionPolicy Bypass -File scripts\make_deploy_zip.ps1

2. Upload the generated ZIP (local-ai-productivity-deploy.zip) to your GitHub repo or extract locally and push to your connected Git repository.

3. If your Vercel project is connected to the Git repo and set to auto-deploy, pushing to main/master will trigger a build.

4. Alternatively, you can use the Vercel CLI to deploy directly from the extracted folder:
   npm i -g vercel
   vercel login
   vercel --prod path\to\extracted\folder

Notes:
- This method avoids touching node_modules and .git contents.
- After deployment, open the site and verify migration ran (check Console logs). If you need, provide repo access for me to push the branch and open a PR.

Redeploy trigger requested: 2026-05-28T18:20:00+05:30
Last deploy: 2026-05-28T18:37:56

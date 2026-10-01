# Study Atlas — Free Update Mode

Use a permanent Netlify **branch deploy** (recommended branch name: `study`) as the Study Atlas URL you use every day.

Why this works:

- Netlify credit-based plans charge **15 credits for a successful production deploy**.
- **Branch deploys and Deploy Previews use 0 deploy credits**.
- Study Atlas' AI lecture builder stores generated lectures and untouched original PDFs in a **site-wide Netlify Blobs store**. Those blobs persist across deploys and are available to every deploy context on the same Netlify project.
- Therefore, adding a lecture from inside Study Atlas changes cloud library data, not the website code. **No deploy is triggered.**

## One-time setup

1. Keep your existing Netlify project connected to a GitHub repository.
2. In GitHub, create a branch called `study` from your current working branch.
3. In Netlify open:
   **Project configuration → Developer settings → Continuous deployment → Branches and deploy contexts → Configure**.
4. Under **Branch deploys**, choose **Let me add individual branches** and add `study`, then Save.
5. Push/commit one change to the `study` branch (or make the branch after step 4). Netlify creates the branch deploy.
6. Open the branch URL. It will normally look like:
   `https://study--YOUR-SITE-NAME.netlify.app`
7. In Netlify **Project configuration → Environment variables**, make sure these variables are available to **Branch deploys** (or All deploy contexts):
   - `OPENAI_API_KEY`
   - `STUDY_ATLAS_ADMIN_KEY` (recommended)
   - `OPENAI_MODEL` (optional)
8. If you changed environment-variable scope, trigger the `study` branch once so its Functions get the variables.

After that, bookmark the `study--...netlify.app` URL and use it as your normal Study Atlas.

## Adding lectures after setup — no deploy

1. Open your `study--...netlify.app` Study Atlas.
2. Press **✦ Add lecture with AI**.
3. Choose the module and upload the original PDF.
4. Study Atlas stores the original PDF, builds the fun AI teaching version, and writes both to Netlify Blobs.
5. The lecture appears in the module library automatically.

This does **not** create a Git commit and does **not** deploy the website.

## Updating the app itself

Only code/design changes require a branch deploy. When a Study Atlas update is available, change the files on the `study` branch only. Netlify updates the same stable branch URL and branch deploys use 0 deploy credits on credit-based plans.

Do not merge `study` into the production branch unless you deliberately want to publish a production deploy.

## Important: other usage can still consume credits

Zero deploy credits does not mean zero Netlify usage. Functions compute, bandwidth, and web requests are metered separately. Study Atlas calls OpenAI directly using your `OPENAI_API_KEY`, so model usage is billed by OpenAI rather than Netlify AI Gateway unless you later switch providers.

## Local notes and annotations

Your handwritten notes, highlights, drawings, pins, and similar personal study state are saved in your browser. Browser storage is tied to the exact website origin. Once you switch to the `study--...netlify.app` URL, keep using that URL consistently.

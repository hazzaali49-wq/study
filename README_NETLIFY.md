# Study Atlas — Netlify + free branch update mode

This version is designed for a permanent Netlify **branch deploy** such as `study--your-site.netlify.app`.

- The Study Atlas app can be updated on the `study` branch without production-deploy credits.
- **Add lecture with AI** stores generated lectures and untouched source PDFs in site-wide Netlify Blobs, so adding lectures does not deploy the site at all.
- The original lecture remains available from the chapter Slides controls and at the end of each generated lecture.

Start with `FREE_UPDATE_MODE.md`.

## Required environment variables

Set these in Netlify and make them available to Branch deploys or All deploy contexts:

- `OPENAI_API_KEY`
- `STUDY_ATLAS_ADMIN_KEY` (recommended)
- `OPENAI_MODEL` (optional; default in the project code)

Never place API keys in browser JavaScript, GitHub files, or `netlify.toml`.

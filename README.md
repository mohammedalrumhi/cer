# cer
# cer

## Render persistence

This app writes runtime files to disk:

- uploaded images such as logo, signature, stamp, and template backgrounds
- JSON data under the backend data store

On Render, the container filesystem is ephemeral. If you keep using the default local paths, uploaded files can disappear after a restart or redeploy and old branding URLs will return `404`.

Configure a persistent disk and point the backend at it:

1. In Render, add a persistent disk to the backend service.
2. Mount it at a path such as `/var/data`.
3. Set environment variable `PERSISTENT_STORAGE_DIR=/var/data`.

Optional overrides if you want separate locations:

- `DATA_DIR=/var/data/data`
- `UPLOADS_DIR=/var/data/uploads`
- `FONTS_DIR=/var/data/fonts`

After redeploying with a persistent disk, re-upload the branding files once so the missing URLs are recreated on the persistent storage.


Use this exact message on the other laptop:

Hi, continue development for my cer project.
Repository: https://github.com/mohammedalrumhi/cer
Please start by:

Running backend and frontend locally
Checking current status and any issues
Proposing the next 5 highest-priority tasks
Implementing task 1 directly
Project context:

Remote is HTTPS and push works
Branch is main and tracks origin/main
Backend is Node/Express
Frontend is Vite + React
Prefer Arabic UI text when possible
If you want a stronger version, use this:

Continue as my coding partner and do not stop at planning.
Inspect the codebase, run the app, find gaps, then implement the most impactful next feature end-to-end with clean commits.

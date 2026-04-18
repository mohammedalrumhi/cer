# cer
# cer

## Hostinger deployment

This project is now ready to run on a single Hostinger Node.js app:

- backend serves the API
- backend can also serve the built frontend from `frontend/dist`
- MySQL can be used for app data
- uploaded files can stay on disk through a fixed storage path

### Recommended structure on Hostinger

Upload the full project with this structure intact:

- `backend/`
- `frontend/`
- root `package.json`

Build the frontend once on the server:

```bash
npm --prefix frontend install
npm --prefix backend install
npm run build
```

If you want to copy the built frontend directly into a `public_html` folder, run:

```bash
PUBLIC_HTML_DIR=/path/to/public_html npm run build:public-html
```

Start the app with:

```bash
npm start
```

If your hosting provider asks for a Node.js entry file, use:

```text
server.js
```

### Environment variables for Hostinger

Set these in the Node.js app configuration or your server environment:

```env
PORT=3000
AUTH_TOKEN_SECRET=change-this-to-a-long-random-secret

MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DATABASE=certificates_app
MYSQL_USER=your_mysql_user
MYSQL_PASSWORD=your_mysql_password

PERSISTENT_STORAGE_DIR=/absolute/path/to/cer-storage
VITE_API_BASE=/api
```

Notes:

- `VITE_API_BASE=/api` is recommended when frontend and backend are on the same domain.
- If Hostinger gives you a full MySQL connection string, use `MYSQL_URL` instead of separate MySQL fields.
- `PERSISTENT_STORAGE_DIR` should point to a real writable folder on the hosting account so uploaded logos, signatures, stamps, fonts, and generated assets are not lost.

Optional frontend override if the built files are in a non-default location:

```env
FRONTEND_DIST_DIR=/absolute/path/to/frontend/dist
```

### First deployment steps

1. Create the MySQL database in Hostinger.
2. Upload the project files to the Node.js application folder.
3. Install dependencies in both `backend` and `frontend`.
4. Set the environment variables.
5. Run `npm run build` from the project root.
6. Start the app with `npm start`.
7. Open `/api/health` and confirm the response includes `"storage":"mysql"`.

### Uploaded files and persistence

The app writes runtime files to disk:

- uploaded images such as logo, signature, stamp, and template backgrounds
- uploaded fonts
- local fallback data when MySQL is not enabled

Use a fixed writable folder for `PERSISTENT_STORAGE_DIR`. Example:

```env
PERSISTENT_STORAGE_DIR=/home/your-user/cer-storage
```

After the first deploy, re-upload branding files if you want them stored in the new persistent location.

## Frontend backend URL

The frontend backend URL is now configured from one file at the project root:

- `.env`

Set:

- `VITE_API_BASE=http://localhost:4000`

Example for production:

- `VITE_API_BASE=https://your-backend-domain.com`

After changing `.env`, restart the frontend dev server.

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



# Hostinger deployment

## What to use on Hostinger

- Node.js app: run the backend
- MySQL database: store users, branding, students, and templates
- File Manager or SSH: upload project files and keep a writable storage folder

## Recommended deployment model

Use one Node.js app that serves both:

- API routes from Express
- built frontend files from `frontend/dist`

This is the simplest setup for Hostinger.

## Files to upload

Upload the whole project and keep this structure:

- `backend`
- `frontend`
- `package.json`
- `.env` if you manage env by file

## Install and build

From the project root:

```bash
npm --prefix backend install
npm --prefix frontend install
npm run build
```

## Start command

Use this command in Hostinger:

```bash
npm start
```

## Required environment variables

```env
PORT=3000
AUTH_TOKEN_SECRET=use-a-long-random-secret

MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=certificates_app
MYSQL_USER=your_user
MYSQL_PASSWORD=your_password

PERSISTENT_STORAGE_DIR=/home/your-user/cer-storage
VITE_API_BASE=/api
```

If Hostinger gives one MySQL connection string, use this instead:

```env
MYSQL_URL=mysql://user:password@host:3306/database_name
```

## Verify after deploy

Open:

```text
https://your-domain.com/api/health
```

Expected result:

```json
{"status":"ok","storage":"mysql"}
```

## Important notes

- The app auto-creates the MySQL tables if they do not exist.
- If the MySQL tables are empty, the app seeds initial data from `backend/data`.
- Uploaded logos, signatures, stamps, fonts, and template background assets should be stored in the folder set by `PERSISTENT_STORAGE_DIR`.
- If you do not build the frontend, the API will run but the web interface will not be served by Node.
# Pocket Atlas

A personal finance dashboard built with React, Tailwind CSS, Recharts, Lucide, Express, and MongoDB.

## Run locally

1. Install Node.js 18+ and MongoDB (local or hosted).
2. Copy `.env.example` to `.env`, set `MONGODB_URI`, and replace `JWT_SECRET` with a random secret.
3. Install packages with `npm install`.
4. Start the API and frontend together with `npm run dev`, then open `http://localhost:5173`.

The dashboard opens in a browser-persistent demo workspace with example transactions. Use **Connect account** to register or sign in; authentication and user data require a reachable MongoDB instance. Without MongoDB, the demo remains available locally, and account endpoints return a clear service-unavailable response.

For production, build the frontend with `npm run build`, set `NODE_ENV=production`, and run `npm start`. The Express server serves the built app and API from the same origin.

## Deploy to Render

1. Push this project to a GitHub or GitLab repository. This workspace is not currently connected to a Git remote.
2. In Render, choose **New + → Blueprint**, select the repository, and let Render read `render.yaml`.
3. When prompted, enter the MongoDB Atlas connection URI as `MONGODB_URI`. Keep it in Render's environment settings; do not commit it. Render generates `JWT_SECRET` for the service.
4. In Atlas Network Access, allow connections from the deployed Render service. Use the narrowest IP access list your Render plan supports.
5. Wait for `/api/health` to report `database: true`; Render's service URL is the public app link.

Render's `RENDER_EXTERNAL_URL` is included in the server's allowed origins automatically. The existing local MongoDB data is not copied to Atlas by deployment; migrate it separately if you need those records online.

## Data and security

Each account's transactions, category budgets, monthly budget, savings goals, and profile settings are stored on its MongoDB user document. Passwords are hashed with bcrypt; protected API routes use seven-day signed bearer tokens. Set `CLIENT_ORIGIN` to the exact allowed browser origin(s) in production.

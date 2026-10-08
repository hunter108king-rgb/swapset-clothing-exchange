# Swapset – Clothing Exchange & Swap Marketplace
React + Vite + Tailwind client, Express + MongoDB API, JWT auth.

## Run locally
```
cd server && cp .env.example .env   # set MONGODB_URI and JWT_SECRET
npm install && npm run seed && npm run dev      # API on :5000
cd ../client && cp .env.example .env && npm install && npm run dev   # app on :5173
```
Production build: `cd client && npm run build` (output in `dist`).

## Environment variables
Server: `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL` (comma-separated allowed origins), `PORT`, `CLOUDINARY_URL` (optional; without it images are stored inline).
Client: `VITE_API_URL` (your deployed API URL, no trailing slash).

## Demo credentials (development only)
Admin: `admin@swapset.com` / `Admin@1234`. Users: `aarav@demo.com`, `meera@demo.com`, `riya@demo.com`, `kabir@demo.com`, `ananya@demo.com`, `rohan@demo.com`, `sara@demo.com`, `vikram@demo.com`, `isha@demo.com`, `dev@demo.com` / `Demo@1234`.
Run `npm run seed` only on a dev database: it wipes all collections.

## Deploy
1. **MongoDB Atlas:** create a free cluster, add a database user, allow network access (0.0.0.0/0 for Render), copy the connection string.
2. **Render (API):** New Web Service, root `server`, build `npm install`, start `npm start`. Set `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL` (your Vercel URL). Then run `npm run seed` once from the Render shell or your machine pointing at Atlas.
3. **Vercel (client):** root `client`, framework Vite, set `VITE_API_URL` to the Render URL. `vercel.json` handles SPA routing.
4. Update `CLIENT_URL` on Render to the final Vercel URL and redeploy.

## Test checklist
Register, log in, create a listing, search and filter, open an item, request a swap, log in as the receiver, open the chat and exchange messages, accept, check both items show RESERVED, both users confirm completion, check items show SWAPPED and the swap appears in History, log in as admin, remove a listing, resolve a report, check analytics.

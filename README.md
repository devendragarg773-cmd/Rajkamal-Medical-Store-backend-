# Rajkamal Medical Store — Render Backend

## Services
- Render: runs `server.js`
- Supabase Postgres: stores products/settings
- Supabase Storage: stores product photos permanently

## Supabase setup
1. Create a Supabase project.
2. Open SQL Editor and run `schema.sql`.
3. Create a Storage bucket named `product-images` and make the bucket public.
4. Copy Project URL and the service-role key into Render environment variables.
5. Never put the service-role key in frontend code.

## Render
Create a Web Service from this folder/repository.
Build command: `npm install`
Start command: `npm start`

Environment variables:
OWNER_PASSWORD
JWT_SECRET
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_BUCKET=product-images

After deploy, copy the Render URL into `API_URL` in the frontend `script.js`.

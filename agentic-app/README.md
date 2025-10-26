# Instagram Automation Studio

Automate the distribution of short-form videos to Instagram using the official Graph API. This project provides a scheduling dashboard, credential vault, and production-ready API routes for pushing content live automatically.

## Features
- 📆 Queue, edit, and delete scheduled Instagram video posts
- 🔐 Securely store Instagram Graph API credentials (long-lived token + business account ID)
- ⚙️ Server-side cron endpoint to execute due posts via Vercel Cron or any scheduler
- 🚀 Manual override to publish immediately and retry failed jobs
- 🧾 Detailed status, failure reason tracking, and Instagram publish IDs

## Tech Stack
- Next.js 16 (App Router) + React 19
- Prisma ORM + SQLite (swap out with Postgres for production)
- Tailwind CSS 4 design system
- Zod validation + Instagram Graph API integration

## Local Development
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create the database:
   ```bash
   npx prisma migrate dev
   ```
3. Run the application:
   ```bash
   npm run dev
   ```
4. Open `http://localhost:3000` in your browser.

## Environment Variables
Copy `.env` and fill in the following:

```bash
DATABASE_URL="file:./data/database.sqlite"
IG_ACCESS_TOKEN="<optional default token>"
IG_USER_ID="<optional default business account id>"
CRON_SECRET="<shared secret for cron endpoint>"
```

The UI lets you override credentials at runtime; values are persisted in the Prisma database. Set `CRON_SECRET` to any string and include it as the `x-cron-secret` header when hitting `/api/cron` to prevent unauthorised execution.

## Instagram Requirements
- You must own an Instagram Business or Creator account linked to a Facebook Page.
- Use the [Instagram Graph API](https://developers.facebook.com/docs/instagram-api/reference/ig-user/media) to generate a long-lived access token with the `instagram_basic`, `instagram_content_publish`, and `pages_show_list` permissions.
- Hosted videos must be reachable by Facebook (HTTPS URL, `<200MB`, `<60s`).

## Automation Flow
1. Schedule a post with video URL, caption, and publish timestamp.
2. Configure Vercel Cron (or any scheduler) to invoke `POST https://<your-domain>/api/cron` every few minutes with `x-cron-secret`.
3. The cron handler finds due posts, pushes them to Instagram, then updates status/failure details accordingly.
4. Use “Publish Now” on any job to bypass the schedule and post immediately.

## Deploying
1. Create a production-ready database (e.g., Neon, Supabase, Vercel Postgres) and update `DATABASE_URL`.
2. Run migrations in production with `npx prisma migrate deploy`.
3. Deploy to Vercel:
   ```bash
   vercel deploy --prod --yes --token $VERCEL_TOKEN --name agentic-f03688a8
   ```
4. Configure environment variables and Vercel Cron after deployment.

## Testing the Cron Endpoint Locally
```bash
curl -X POST \
  -H "x-cron-secret: $CRON_SECRET" \
  http://localhost:3000/api/cron
```

The response returns counts of processed, successful, and failed posts.

---

Happy automating!

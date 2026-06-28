# TriggerDM

Instagram comment-to-DM automation. Someone comments a keyword on your reel → they get a DM automatically.

## Deploy in 5 Steps

1. Clone this repo and run `npm install`
2. Copy `.env.example` to `.env.local` and fill in all values (see below)
3. Push to GitHub: `git push origin main`
4. Import repo on [vercel.com](https://vercel.com), add env vars, deploy
5. Paste your Vercel URL into the Meta webhook dashboard

## Environment Variables

| Variable | Where to get it |
|---|---|
| `PAGE_ACCESS_TOKEN` | Meta developer dashboard → Access Tokens |
| `PAGE_ID` | Your Instagram Page ID (numeric) |
| `APP_URL` | Your canonical deployed URL, e.g. `https://triggerdm.vercel.app` |
| `META_APP_ID` | Meta App → Settings → Basic → App ID |
| `META_APP_SECRET` | Meta App → Settings → Basic → App Secret |
| `APP_SECRET` | Meta App → Settings → Basic → App Secret |
| `VERIFY_TOKEN` | Make up any string, paste same value in Meta webhook setup |
| `GOOGLE_DRIVE_FILE_ID` | From Drive file URL: `drive.google.com/file/d/FILE_ID/view` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | From service account JSON key |
| `GOOGLE_PRIVATE_KEY` | From service account JSON key (include full key) |
| `CRON_SECRET` | Make up any secret string |

## Google Drive Setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → Create project
2. Enable **Google Drive API**
3. IAM & Admin → Service Accounts → Create → Download JSON key
4. In Google Drive: New → Google Docs → (then File → Download as JSON won't work) — instead, create a blank file via the Drive API or manually create a `.json` file
5. Share the file with the service account email (give Editor access)
6. Copy the file ID from the URL into `GOOGLE_DRIVE_FILE_ID`

Initialize the file with this content:
```json
{"rules":[],"dmedLog":{},"tokenLog":[]}
```

## Meta Webhook Setup

1. [developers.facebook.com](https://developers.facebook.com) → Your App → Webhooks
2. Subscribe to **Instagram** → field: `comments`
3. Callback URL: `https://your-app.vercel.app/api/webhook`
4. Verify token: your `VERIFY_TOKEN` value

## Meta OAuth Redirect Setup

Set `APP_URL` in Vercel to your canonical production domain, for example:

```text
https://triggerdm.vercel.app
```

Then register the matching redirect URLs in the Meta app dashboard:

- Instagram Login: `https://triggerdm.vercel.app/auth/instagram/callback`
- Facebook Login: `https://triggerdm.vercel.app/auth/meta/callback`

Use the same domain you set in `APP_URL`. Do not add a trailing slash.

## How to Use

- Open your deployed app URL to access the dashboard
- Click **New Rule** to create an automation
- Set trigger keywords, build your DM message, pick target reels
- Toggle **Apply to all reels** to fire on every reel you post
- Pause rules anytime with the Active toggle

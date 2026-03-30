# Netlify + SendGrid Setup - Complete Guide

## ✅ What's Done

- ✓ `netlify.toml` created (deployment config)
- ✓ `.env.local` configured for Netlify
- ✓ `@sendgrid/mail` package installed
- ✓ Backend function ready (`api/send-order-email.js`)
- ✓ Frontend updated for Netlify API calls

## 🚀 Next Steps (5 minutes)

### Step 1: Get SendGrid API Key (2 mins)

1. Go to [sendgrid.com](https://sendgrid.com)
2. Sign up or log in (free tier available)
3. Click **Settings** → **API Keys**
4. Click **Create API Key**
5. Name it: `3D Print It`
6. Choose **Full Access**
7. **Copy the key** (you'll only see it once!)

### Step 2: Update `.env.local`

Replace the placeholder in your project:

```env
SENDGRID_API_KEY=SG.paste_your_actual_key_here_exactly
ADMIN_EMAIL=hello@3dprintit.com
SENDGRID_FROM_EMAIL=noreply@3dprintit.com
VITE_API_URL=http://localhost:8888/.netlify/functions/send-order-email
```

### Step 3: Test Locally with Netlify CLI (2 mins)

```bash
npm install -g netlify-cli
netlify dev
```

- Go to `http://localhost:8888`
- Upload test STL file
- Add to cart
- Go to checkout
- Enter test email → Submit
- **Check your email** for 2 messages (with file attached!)

### Step 4: Deploy to Netlify (1 min)

1. Push to GitHub:

   ```bash
   git add .
   git commit -m "Add SendGrid + Netlify setup"
   git push
   ```

2. Go to **Netlify Dashboard** → Your Site → **Site Settings** → **Build & Deploy** → **Environment**
3. Click **Edit variables**
4. Add these 3 variables:
   - `SENDGRID_API_KEY` = (paste your key)
   - `ADMIN_EMAIL` = `hello@3dprintit.com`
   - `SENDGRID_FROM_EMAIL` = `noreply@3dprintit.com`

5. **Trigger a redeploy**:
   - Push a small change: `git commit --allow-empty -m "Trigger deploy"` → `git push`
   - Or click **Trigger deploy** in Netlify dashboard

### Step 5: Update Production URL

After deployment succeeds, copy your Netlify site URL and update in `.env.local`:

**Local development** (already set):

```env
VITE_API_URL=http://localhost:8888/.netlify/functions/send-order-email
```

**Production** (after deployment):

```env
VITE_API_URL=https://your-site.netlify.app/.netlify/functions/send-order-email
```

Then rebuild and push:

```bash
npm run build
git add .
git commit -m "Update production API URL"
git push
```

---

## ✨ Done!

Your system now has:

- ✅ Professional HTML emails
- ✅ STL files attached to admin emails
- ✅ Automatic emails on order placement
- ✅ Customer confirmation emails
- ✅ Secure API key storage
- ✅ Production-ready on Netlify

---

## Files Created/Modified

| File                      | Purpose                     |
| ------------------------- | --------------------------- |
| `netlify.toml`            | Netlify build config        |
| `.env.local`              | Your local API key & config |
| `.env.example`            | Template for others         |
| `api/send-order-email.js` | Serverless function         |
| `src/pages/Checkout.tsx`  | Updated for Netlify API     |
| `package.json`            | Added @sendgrid/mail        |

---

## Troubleshooting

**Error: "Cannot find module '@sendgrid/mail'"**

- Run: `npm install @sendgrid/mail` again
- Restart your dev server

**Error: "SENDGRID_API_KEY is not set"**

- Make sure `.env.local` file exists
- Verify API key is pasted correctly (no spaces)
- Restart: `netlify dev`

**Emails not arriving locally**

- Check browser console for errors
- Look at terminal output for API response
- Make sure email address is correct

**Production emails not working**

- Verify env variables set in Netlify dashboard
- Check Netlify deploy logs for errors
- Ensure API key in Netlify matches SendGrid

**File not attached in production**

- Check file size < 10MB
- Verify file upload works (check console)
- Ensure API call succeeded

---

## Quick Commands

```bash
# Local development with Netlify CLI
netlify dev

# Build for production
npm run build

# Deploy from CLI
netlify deploy --prod

# View deploy logs
netlify logs
```

---

**Everything is set up!** Follow the 5 steps above and you're ready to go. 🎉

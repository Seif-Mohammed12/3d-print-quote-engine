# Quick Start Checklist - SendGrid Setup

Follow these steps in order to get your email system working with file attachments:

## ✅ Step 1: Install Dependencies (Locally)

```bash
npm install @sendgrid/mail
```

## ✅ Step 2: Get SendGrid API Key

- [ ] Go to [sendgrid.com](https://sendgrid.com)
- [ ] Sign up for free account
- [ ] Settings → API Keys → Create API Key
- [ ] **Copy the key** (you'll only see it once!)
- [ ] Name: "3D Print It"
- [ ] Permission: Full Access

## ✅ Step 3: Create `.env.local` File

Create file in project root with:

```env
SENDGRID_API_KEY=SG.your_actual_key_here
ADMIN_EMAIL=hello@3dprintit.com
SENDGRID_FROM_EMAIL=noreply@3dprintit.com
```

## ✅ Step 4: Test Locally

```bash
npm run dev
```

- Go to Quote page → Upload test file → Add to cart → Checkout
- Enter your test email → Place Order
- **Check your email for 2 messages:**
  - ✉️ Professional admin email (with file attached)
  - ✉️ Customer confirmation email

## ✅ Step 5: Deploy to Vercel

### Option A: GitHub Push + Vercel Auto-Deploy (Recommended)

1. [ ] Commit and push: `git add . && git commit -m "Add SendGrid" && git push`
2. [ ] Go to [vercel.com](https://vercel.com)
3. [ ] Sign in with GitHub
4. [ ] Click "New Project" → Select repo
5. [ ] Click "Environment Variables"
6. [ ] Add 3 environment variables:
   - `SENDGRID_API_KEY`: (paste your key)
   - `ADMIN_EMAIL`: `hello@3dprintit.com`
   - `SENDGRID_FROM_EMAIL`: `noreply@3dprintit.com`
7. [ ] Click "Deploy"
8. [ ] **Wait 2-3 minutes** for deployment
9. [ ] Copy your Vercel URL (e.g., `https://3d-print-quote-engine.vercel.app`)

### Option B: Vercel CLI

```bash
npm install -g vercel
vercel
```

## ✅ Step 6: Update App Configuration

After deployment:

1. [ ] Update `.env.local` with Vercel URL:

```env
VITE_API_URL=https://your-vercel-url.vercel.app/api/send-order-email
```

2. [ ] Rebuild and deploy: `npm run build`
3. [ ] Push to GitHub: `git add . && git commit -m "Update API URL" && git push`
4. [ ] Vercel will auto-redeploy

## ✅ Step 7: Test Production

1. [ ] Go to your live app at Vercel URL
2. [ ] Upload a test file
3. [ ] Complete checkout
4. [ ] Verify emails arrive **with STL file attached**

## 🎉 You're Done!

Your system now:

- ✅ Sends professional emails
- ✅ Attaches STL files to admin emails
- ✅ Works from anywhere (deployed to Vercel)
- ✅ Scales automatically

## Troubleshooting

**"API key error"**

- Make sure `.env.local` exists
- Restart dev server: `npm run dev`
- Keys pasted exactly (no extra spaces)

**"Emails not arriving"**

- Check spam folder
- Verify email addresses are correct
- Check Vercel logs: Project → Deployments → View logs

**"File not attached"**

- Ensure file upload is working
- Check browser console for errors
- File must be < 10MB

**Need help?**

- Read full guide: `SENDGRID_SETUP.md`
- Check Vercel logs for specific errors
- SendGrid docs: https://docs.sendgrid.com/

---

**Questions?** All files are in place. Just follow the checklist above! 🚀

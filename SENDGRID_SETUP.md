# SendGrid Email Backend Setup Guide

This guide walks you through setting up the SendGrid email backend with file attachment support for your 3D Print It order system.

## Overview

Your app now uses **SendGrid** (a professional email service) instead of Formspree. This enables:

- ✅ Professional HTML emails with file attachments
- ✅ STL files attached to admin emails automatically
- ✅ Reliable delivery with SendGrid's infrastructure
- ✅ Easy tracking and management

## Step 1: Install SendGrid Package

Run this command in your project directory:

```bash
npm install @sendgrid/mail
```

## Step 2: Get a SendGrid API Key

1. **Sign up** at [sendgrid.com](https://sendgrid.com) (free tier available)
2. Go to **Settings** → **API Keys**
3. Click **"Create API Key"**
4. Name it something like "3D Print It" or "3D Quote Engine"
5. Select **Full Access** permission
6. Copy the key (you'll only see it once!)

## Step 3: Set Environment Variables

Create a `.env.local` file in your project root:

```env
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ADMIN_EMAIL=hello@3dprintit.com
SENDGRID_FROM_EMAIL=noreply@3dprintit.com
```

Replace:

- `SENDGRID_API_KEY` with your actual API key from Step 2
- `ADMIN_EMAIL` with where you want order notifications sent
- `SENDGRID_FROM_EMAIL` with the sender email (can be any verified email in SendGrid)

## Step 4: Deploy to Vercel (Free!)

### Option A: Deploy via GitHub (Recommended)

1. **Push your code to GitHub**:

   ```bash
   git add .
   git commit -m "Add SendGrid email backend"
   git push
   ```

2. **Go to [vercel.com](https://vercel.com)** and sign in with GitHub
3. Click **"New Project"** → Select your repository
4. Click **"Environment Variables"**
5. Add these variables:
   - `SENDGRID_API_KEY`: (paste your SendGrid key)
   - `ADMIN_EMAIL`: `hello@3dprintit.com`
   - `SENDGRID_FROM_EMAIL`: `noreply@3dprintit.com`

6. Click **"Deploy"** (takes ~2 minutes)
7. Copy your deployment URL (looks like `https://3d-print-quote-engine.vercel.app`)

### Option B: Deploy via Vercel CLI

```bash
npm install -g vercel
vercel
```

Follow the prompts and add environment variables when asked.

## Step 5: Update Environment Variable in App

After deployment, update your `.env.local`:

```env
VITE_API_URL=https://your-vercel-url.vercel.app/api/send-order-email
```

Then rebuild and redeploy.

## Step 6: Test the System

1. Go to your app's **Quote** page
2. Upload a test STL file
3. Add to cart and proceed to checkout
4. Fill in your test email and submit
5. Check your email (and spam folder) for:
   - **Admin email**: With file attachment
   - **Customer email**: Nice confirmation

## Troubleshooting

### "Missing API key" error

- Ensure `.env.local` file exists
- Restart your dev server: `npm run dev`
- Check that `SENDGRID_API_KEY` is correctly pasted

### Emails not sent

- Check your server logs on Vercel dashboard
- Verify email addresses are correct
- Make sure SendGrid API key is active

### Files not attached

- Verify file upload is working (check browser console)
- Check file buffer is being passed correctly
- Ensure file size < 10MB (Vercel timeout limit)

### "Unauthorized" error

- Verify SendGrid API key is correct
- Make sure you copied the entire key
- Generate a new key if needed

## File Structure

```
your-project/
├── api/
│   └── send-order-email.js    ← Backend function
├── src/
│   └── pages/
│       └── Checkout.tsx        ← Frontend updated
├── .env.local                  ← Add your keys here
├── .env.example                ← Reference file
├── vercel.json                 ← Vercel config
└── package.json
```

## Technical Details

**Frontend Flow:**

1. User uploads file → stored in React state (ArrayBuffer)
2. User fills checkout form
3. File converted to base64 string
4. Sent to backend via POST request

**Backend Flow (Vercel Serverless Function):**

1. Receives order details + base64 files
2. Decodes base64 back to binary
3. Prepares email with attachments using SendGrid
4. Sends email to admin (with files)
5. Sends confirmation to customer
6. Returns success/failure

## Next Steps

Optional enhancements:

- [ ] Add SendGrid webhook for delivery tracking
- [ ] Store orders in a database
- [ ] Create an admin dashboard to review orders
- [ ] Add payment processing (Stripe/Fawry)
- [ ] Set up order status emails (processing, completed, shipped)

## Support

If you have issues:

1. Check the browser's **Developer Tools** → Network tab
2. Check Vercel logs: Dashboard → Project → Deployments → Logs
3. Review SendGrid API documentation: https://docs.sendgrid.com/

---

**You're all set!** Your email system now works with professional file attachments. 🎉

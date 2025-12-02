# Vercel Deployment Guide for Dawnage AI Dashboard

This guide will walk you through deploying your Dawnage AI fitness dashboard to Vercel.

---

## Prerequisites

Before you begin, make sure you have:
- ✅ A GitHub account
- ✅ A Vercel account (sign up at [vercel.com](https://vercel.com) - it's free!)
- ✅ Your Supabase project is set up and running
- ✅ Your .env file has all the correct values

---

## Step 1: Push Your Code to GitHub

### 1.1 Initialize Git Repository (if not already done)

```bash
cd DawnageAIDash

# Initialize git
git init

# Add all files
git add .

# Create first commit
git commit -m "Initial commit - Dawnage AI Dashboard"
```

### 1.2 Create a New GitHub Repository

1. Go to [github.com](https://github.com)
2. Click the **"+"** icon in the top right
3. Select **"New repository"**
4. Name it: `dawnage-ai-dashboard` (or any name you prefer)
5. **DO NOT** initialize with README, .gitignore, or license
6. Click **"Create repository"**

### 1.3 Push Your Code to GitHub

GitHub will show you commands. Run these in your terminal:

```bash
# Add the remote repository
git remote add origin https://github.com/YOUR_USERNAME/dawnage-ai-dashboard.git

# Push your code
git branch -M main
git push -u origin main
```

**Replace `YOUR_USERNAME` with your actual GitHub username!**

---

## Step 2: Deploy to Vercel

### 2.1 Connect Vercel to GitHub

1. Go to [vercel.com](https://vercel.com)
2. Click **"Sign Up"** (or **"Log In"** if you have an account)
3. Choose **"Continue with GitHub"**
4. Authorize Vercel to access your GitHub account

### 2.2 Import Your Project

1. On the Vercel dashboard, click **"Add New..."** → **"Project"**
2. Find your GitHub repository: `dawnage-ai-dashboard`
3. Click **"Import"**

### 2.3 Configure Project Settings

Vercel will auto-detect it's a Vite project. You'll see:

**Framework Preset:** Vite
**Root Directory:** `./` (leave as is)
**Build Command:** `npm run build`
**Output Directory:** `dist`
**Install Command:** `npm install`

**Leave all these as default!** ✅

### 2.4 Add Environment Variables

This is the **most important step**! Click on **"Environment Variables"** and add these:

| Name | Value | Where to find it |
|------|-------|------------------|
| `VITE_SUPABASE_URL` | `https://hzifwkebzhzlxvigbcup.supabase.co` | Your .env file |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Your .env file (long key) |
| `VITE_WHATSAPP_NUMBER` | `918075054992` | Your .env file |
| `VITE_WHATSAPP_DEFAULT_MESSAGE` | `/start` | Your .env file |

**How to add each variable:**
1. Enter the **Name** (e.g., `VITE_SUPABASE_URL`)
2. Enter the **Value** (copy from your `.env` file)
3. Select **"Production"**, **"Preview"**, and **"Development"** (check all three)
4. Click **"Add"**
5. Repeat for all 4 variables

**⚠️ IMPORTANT:** Only add the `VITE_*` variables! Do NOT add `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, or `SESSION_SECRET` as these are backend-only.

### 2.5 Deploy!

1. After adding all environment variables, click **"Deploy"**
2. Vercel will start building your project
3. You'll see logs scrolling - this takes about 2-3 minutes
4. Once complete, you'll see: **"🎉 Congratulations!"**

---

## Step 3: Access Your Deployed App

### 3.1 Get Your Live URL

After deployment completes:
1. Vercel will show your live URL: `https://your-project-name.vercel.app`
2. Click **"Visit"** to open your deployed app
3. **Bookmark this URL!**

### 3.2 Test Your Deployment

1. **Open the URL** in your browser
2. **Test signup:** Create a new account
3. **Test login:** Log in with your credentials
4. **Test WhatsApp:** Click "Activate on WhatsApp Now"
5. **Verify Supabase:** Check if data is being saved to Supabase

---

## Step 4: Configure Custom Domain (Optional)

### 4.1 Add Your Own Domain

If you have a custom domain (e.g., `dawnage.com`):

1. Go to your Vercel project
2. Click **"Settings"** → **"Domains"**
3. Enter your domain: `dawnage.com`
4. Click **"Add"**
5. Vercel will provide DNS records
6. Add these records to your domain registrar (GoDaddy, Namecheap, etc.)
7. Wait 24-48 hours for DNS to propagate

### 4.2 SSL Certificate

Vercel automatically provisions an SSL certificate (https://) for your domain. No configuration needed!

---

## Step 5: Set Up Automatic Deployments

### 5.1 How It Works

Every time you push code to GitHub, Vercel will automatically:
1. ✅ Build your project
2. ✅ Run tests (if configured)
3. ✅ Deploy the new version
4. ✅ Create a unique preview URL for each branch

### 5.2 Deploy Updates

To deploy changes:

```bash
# Make your changes to the code
# Then commit and push:

git add .
git commit -m "Updated dashboard features"
git push origin main
```

Vercel will automatically deploy within 2-3 minutes!

---

## Step 6: Monitor Your Deployment

### 6.1 Deployment Dashboard

In Vercel:
1. Click on your project
2. You'll see:
   - **Deployments:** List of all deployments
   - **Analytics:** Visitor stats (requires upgrade)
   - **Logs:** Runtime logs
   - **Settings:** Configuration

### 6.2 View Deployment Logs

If something goes wrong:
1. Go to **"Deployments"**
2. Click on the failed deployment
3. Click **"Build Logs"** to see what went wrong
4. Fix the issue in your code
5. Push again

---

## Common Issues & Solutions

### Issue 1: Build Fails with "Module not found"

**Solution:**
```bash
# Make sure all dependencies are in package.json
npm install
git add package.json package-lock.json
git commit -m "Update dependencies"
git push
```

### Issue 2: Environment Variables Not Working

**Problem:** App shows errors like "supabase is not defined"

**Solution:**
1. Go to Vercel project → **Settings** → **Environment Variables**
2. Verify all variables start with `VITE_`
3. Make sure values are correct (no extra spaces)
4. After changing, go to **Deployments** → **Redeploy**

### Issue 3: WhatsApp Button Not Working

**Problem:** Clicking WhatsApp button doesn't open WhatsApp

**Solution:**
1. Check `VITE_WHATSAPP_NUMBER` is set correctly in Vercel
2. Verify the number format: `918075054992` (no + or spaces)
3. Redeploy if needed

### Issue 4: "Page Not Found" on Refresh

**Problem:** App works, but refreshing the page shows 404

**Solution:**
✅ Already handled! The `vercel.json` file routes all requests to `index.html`

### Issue 5: Login Not Working

**Problem:** Users can't log in after deployment

**Solution:**
1. Check Supabase dashboard → Authentication → URL Configuration
2. Add your Vercel URL to **Redirect URLs**:
   - Go to Supabase Dashboard
   - Click on your project
   - Go to **Authentication** → **URL Configuration**
   - Add: `https://your-project-name.vercel.app/**`
   - Click **Save**

---

## Performance Optimization

### Enable Caching

Vercel automatically caches:
- ✅ Static assets (images, fonts, CSS, JS)
- ✅ CDN distribution worldwide
- ✅ Edge network for fast loading

### Enable Analytics (Optional)

1. Go to your Vercel project
2. Click **"Analytics"** tab
3. Click **"Enable Analytics"**
4. View real-time visitor data, page views, performance metrics

---

## Security Best Practices

### 1. Environment Variables

✅ **DO:**
- Keep `.env` in `.gitignore`
- Only add `VITE_*` variables to Vercel
- Use Supabase RLS (Row Level Security)

❌ **DON'T:**
- Commit `.env` to GitHub
- Share `SUPABASE_SERVICE_ROLE_KEY` publicly
- Expose backend secrets in frontend code

### 2. Supabase Security

Ensure Supabase RLS is enabled:
1. Go to Supabase Dashboard → **Authentication** → **Policies**
2. Verify Row Level Security is enabled for all tables
3. Users can only access their own data

### 3. HTTPS

✅ Vercel automatically provides HTTPS for all deployments

---

## Vercel CLI (Optional Advanced Method)

### Install Vercel CLI

```bash
npm install -g vercel
```

### Deploy via CLI

```bash
# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# Deploy to preview
vercel
```

---

## Costs & Limits

### Free Tier Includes:
- ✅ Unlimited deployments
- ✅ 100 GB bandwidth/month
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Preview deployments
- ✅ Custom domains

### Paid Plans:
- **Pro:** $20/month (1 TB bandwidth, analytics, password protection)
- **Enterprise:** Custom pricing

**For most fitness coaching apps, the free tier is enough!**

---

## Maintenance & Updates

### Weekly Tasks:
1. Check Vercel deployment logs for errors
2. Monitor Supabase usage
3. Review user signups and activity

### Monthly Tasks:
1. Update dependencies:
   ```bash
   npm update
   npm audit fix
   git add .
   git commit -m "Update dependencies"
   git push
   ```

### As Needed:
1. Update environment variables in Vercel
2. Scale up plan if you exceed free tier limits
3. Add custom domain

---

## Next Steps After Deployment

1. ✅ **Test Everything:**
   - Signup/Login
   - WhatsApp activation
   - Dashboard features
   - Mobile responsiveness

2. ✅ **Share Your App:**
   - Share the Vercel URL with your clients
   - Set up custom domain if you have one

3. ✅ **Set Up WhatsApp Bot:**
   - Follow `N8N_WORKFLOW_GUIDE.md` to set up automated WhatsApp responses
   - Connect n8n to your Supabase database

4. ✅ **Monitor Performance:**
   - Enable Vercel Analytics
   - Monitor Supabase database usage

---

## Support & Resources

- **Vercel Docs:** https://vercel.com/docs
- **Vercel Support:** https://vercel.com/support
- **Supabase Docs:** https://supabase.com/docs
- **GitHub Issues:** Create issues in your repo for tracking bugs

---

## Quick Reference Commands

```bash
# Push code to GitHub (auto-deploys to Vercel)
git add .
git commit -m "Your commit message"
git push origin main

# View deployment logs
vercel logs

# Rollback to previous deployment
# Go to Vercel dashboard → Deployments → Click three dots → Promote to Production
```

---

## Checklist: Deployment Complete ✅

Before going live, make sure:

- [ ] Code pushed to GitHub
- [ ] Vercel project created and connected
- [ ] All 4 environment variables added to Vercel
- [ ] Deployment successful (green checkmark)
- [ ] App accessible via Vercel URL
- [ ] Signup/Login working
- [ ] Supabase connection working
- [ ] WhatsApp button redirects correctly
- [ ] Mobile responsive (test on phone)
- [ ] Supabase redirect URLs configured

---

**Congratulations! Your Dawnage AI Dashboard is now live! 🎉**

Your app is now accessible worldwide, with automatic deployments, HTTPS, and global CDN distribution!

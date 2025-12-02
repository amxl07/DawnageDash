# Vercel Deployment - Quick Start Card

## 🚀 Deploy in 10 Minutes

### Step 1: Push to GitHub (2 minutes)
```bash
cd DawnageAIDash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/dawnage-ai-dashboard.git
git push -u origin main
```

### Step 2: Deploy to Vercel (5 minutes)
1. Go to [vercel.com](https://vercel.com) → Sign up with GitHub
2. Click **"Add New Project"**
3. Import your repository: `dawnage-ai-dashboard`
4. **Add these 4 environment variables:**

| Variable Name | Your Value |
|---------------|------------|
| `VITE_SUPABASE_URL` | `https://hzifwkebzhzlxvigbcup.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | (Copy from your .env file) |
| `VITE_WHATSAPP_NUMBER` | `918075054992` |
| `VITE_WHATSAPP_DEFAULT_MESSAGE` | `/start` |

5. Click **"Deploy"**

### Step 3: Configure Supabase (2 minutes)
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click your project → **Authentication** → **URL Configuration**
3. Add to Redirect URLs: `https://your-app.vercel.app/**`
4. Click **Save**

### Step 4: Test (1 minute)
1. Visit your Vercel URL: `https://your-app.vercel.app`
2. Test signup and login
3. Test WhatsApp button

---

## ✅ You're Done!

Your app is now live at: `https://your-project-name.vercel.app`

---

## 📝 Environment Variables Quick Copy

Copy these from your `.env` file to Vercel:

```
VITE_SUPABASE_URL=https://hzifwkebzhzlxvigbcup.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6aWZ3a2Viemh6bHh2aWdiY3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyODg2MDksImV4cCI6MjA3Nzg2NDYwOX0.I6WWjy1hoZKA3NeN8FYagHCWxWHCFCGzxaBepZPC0Ck
VITE_WHATSAPP_NUMBER=918075054992
VITE_WHATSAPP_DEFAULT_MESSAGE=/start
```

---

## 🔄 Deploy Updates

After making code changes:
```bash
git add .
git commit -m "Updated features"
git push origin main
```

Vercel will automatically deploy!

---

## ⚠️ Important Notes

- ✅ Only add `VITE_*` variables to Vercel
- ❌ Do NOT add `DATABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY`
- ✅ Vercel provides free HTTPS and CDN
- ✅ Automatic deployments on every push

---

## 🆘 Having Issues?

See the full guide: `VERCEL_DEPLOYMENT_GUIDE.md`

Common fixes:
- Build fails? Run `npm install` locally first
- Login not working? Add Vercel URL to Supabase redirect URLs
- WhatsApp not working? Check number format (no + or spaces)

---

**Need help? Check VERCEL_DEPLOYMENT_GUIDE.md for detailed instructions!**

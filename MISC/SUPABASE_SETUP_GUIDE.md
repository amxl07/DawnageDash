# Supabase Setup Guide for DawnAge Dashboard

## ✅ What's Already Done

1. ✅ Supabase JavaScript client installed
2. ✅ Database schema expanded (7 tables)
3. ✅ Supabase client configuration created
4. ✅ .env file template ready

---

## 🎯 What You Need To Do Now

### Step 1: Create Supabase Account (5 minutes)

1. **Go to:** https://supabase.com
2. **Sign up** with GitHub or email
3. **Create New Project:**
   - Click "New Project"
   - Name: `DawnAge-Fitness`
   - Database Password: **Create a strong password and SAVE IT!**
   - Region: Choose closest to you
   - Plan: Free
   - Click "Create new project"
   - Wait ~2 minutes for provisioning

### Step 2: Get Your Credentials

Once your project is ready:

#### A. Get Project URL and API Keys

1. In your Supabase project dashboard
2. Click **Settings** (gear icon in sidebar)
3. Click **API** in the left menu
4. Copy these three values:

   ```
   Project URL: https://xxxxxxxxxxxxx.supabase.co
   anon public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (click "Reveal" button first)
   ```

#### B. Get Database Connection String

1. Still in Settings, click **Database** in the left menu
2. Scroll down to "Connection string"
3. Select **URI** tab
4. Copy the connection string
5. **Important:** Replace `[YOUR-PASSWORD]` with the database password you created in Step 1

   Example:
   ```
   postgresql://postgres.abc123:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```

### Step 3: Update Your .env File

Open the `.env` file in your project root and replace the placeholder values:

```bash
# Replace these with your actual Supabase credentials:

VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATABASE_URL=postgresql://postgres.abc123:YourPassword123@aws-0-us-east-1.pooler.supabase.com:6543/postgres

# Also change this to a random string:
SESSION_SECRET=generate-a-random-string-here-min-32-characters
```

**Tip for SESSION_SECRET:** Use a random string generator or run this in terminal:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 4: Push Database Schema to Supabase

Once your .env is updated, run:

```bash
npm run db:push
```

This will create all 7 tables in your Supabase database:
- users
- daily_check_ins
- body_measurements
- workout_plans
- meal_plans
- progress_photos
- user_goals

You should see output like:
```
✓ Pushing schema to database...
✓ Schema pushed successfully!
```

### Step 5: Verify Tables Were Created

1. Go back to your Supabase dashboard
2. Click **Table Editor** (table icon in sidebar)
3. You should see all 7 tables listed!

---

## 🎉 Next Steps After Setup

Once your database is set up:

### 1. View Your Database

**Option A: Supabase Dashboard**
- Go to: https://supabase.com/dashboard
- Click your project
- Click "Table Editor"
- Browse, edit, and query your data

**Option B: Drizzle Studio (Local)**
```bash
npm run db:studio
```
Opens at: http://localhost:4983

### 2. Test Database Connection

Run the dev server:
```bash
npm run dev
```

The app should start without errors. If you see database connection errors, double-check your .env file.

### 3. Set Up n8n Workflow (Coming Next)

After the database is working, I'll help you set up the n8n workflow to sync Google Sheets → Supabase.

---

## 📊 Your Database Schema Overview

### Tables Created:

1. **users** - User accounts
   - id, username, password, email, fullName

2. **daily_check_ins** - Daily tracking data
   - Vitals: weight, sleep
   - Workout: status, performance
   - Nutrition: score, calories, water, steps, macros
   - Wellbeing: energy, hunger, stress, digestion

3. **body_measurements** - Body composition tracking
   - weight, body fat %, muscle mass
   - chest, waist, hips, thighs, arms, neck, calves

4. **workout_plans** - Weekly workout schedules
   - day of week, focus, exercises, notes

5. **meal_plans** - Weekly meal schedules
   - day of week, meal type, description, macros

6. **progress_photos** - Progress picture uploads
   - date, photo URL, photo type (front/side/back), notes

7. **user_goals** - Goal tracking
   - goal type, target value, current value, dates, status

---

## 🆘 Troubleshooting

### Error: "Missing Supabase environment variables"

**Solution:** Make sure your .env file has all the VITE_SUPABASE_* variables and they start with `VITE_` prefix (required for Vite to expose them to the frontend).

### Error: "Failed to push schema"

**Solution:**
1. Check that your DATABASE_URL is correct
2. Verify your database password is correct
3. Make sure your IP is not blocked (Supabase free tier allows all IPs by default)

### Error: "Connection refused"

**Solution:**
1. Check if your Supabase project is still provisioning (wait a few more minutes)
2. Verify the connection string format is correct

### Tables not showing in Supabase

**Solution:**
1. Refresh the Supabase dashboard page
2. Run `npm run db:push` again
3. Check terminal output for errors

---

## 🔐 Security Notes

1. **Never commit .env to Git** - It's already in .gitignore
2. **Service Role Key** - Keep this secret, never use in frontend code
3. **Anon Key** - Safe to use in frontend, has Row Level Security
4. **Database Password** - Store securely, needed for direct database access

---

## 📞 Need Help?

If you get stuck:
1. Check the error message carefully
2. Verify all credentials are copied correctly (no extra spaces)
3. Make sure your database password doesn't have special characters that need URL encoding
4. Ask me for help and share the error message (but NOT your credentials!)

---

**Once you've completed Steps 1-4, let me know and I'll help you:**
1. Set up the n8n workflow for Google Sheets sync
2. Update the dashboard to show real data from Supabase
3. Enable real-time updates

Good luck! 🚀

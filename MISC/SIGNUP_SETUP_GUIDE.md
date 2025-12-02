# Enhanced Signup Feature - Setup Guide

## What Was Implemented

The signup form now collects the following information:
- ✅ **Full Name** - Single field for user's complete name
- ✅ **Email** - For authentication and communication
- ✅ **WhatsApp Phone Number** - Split into:
  - Country code selector (29 countries with flags)
  - Phone number input (numeric only)
- ✅ **Create Password** - With visual feedback
- ✅ **Confirm Password** - With real-time validation
- ✅ **Automatic Dashboard Redirect** - After successful signup

## How It Works

1. User fills in the signup form
2. Form validates all fields (name, email, phone, password match)
3. Data is sent to Supabase Auth with metadata
4. **Database trigger automatically creates user profile** in the `users` table
5. User is automatically logged in
6. After 1.5 seconds, user is redirected to the dashboard

## Setup Instructions

### Step 1: Configure Supabase Environment Variables

Make sure your `.env` file has:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Step 2: Run Database Migration

1. Open your Supabase Dashboard
2. Go to **SQL Editor** in the left sidebar
3. Click **"New Query"**
4. Open the file `supabase_migration.sql` in this directory
5. Copy its entire contents and paste into the SQL editor
6. Click **"Run"** to execute

This migration will:
- Create the `users` table with: id, email, full_name, phone_number, country_code
- Create all other tables (check-ins, measurements, plans, etc.)
- Set up Row Level Security (RLS) policies
- Create a **database trigger** that automatically inserts user profile data when someone signs up

### Step 3: Configure Supabase Auth Settings

1. Go to **Authentication > Settings** in Supabase
2. Enable **Email** authentication provider
3. **Optional for Development**: Under "Email Auth", you can disable "Enable email confirmations" to skip email verification during testing
4. **For Production**: Keep email confirmation enabled

### Step 4: Test the Signup Flow

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:5000/login`

3. Click **"Don't have an account? Sign up"**

4. Fill in the form:
   - Full Name: John Doe
   - Select Country Code: +1 (or your country)
   - Phone Number: 1234567890
   - Email: test@example.com
   - Create Password: (at least 6 characters)
   - Confirm Password: (must match)

5. Click **"Create Account"**

6. You should see a success toast message

7. After 1.5 seconds, you'll be automatically redirected to the dashboard

### Step 5: Verify in Supabase

1. Go to **Authentication > Users** in Supabase Dashboard
2. You should see your new user
3. Go to **Table Editor > users**
4. You should see a row with your user's data including:
   - full_name
   - phone_number
   - country_code

## Database Schema

### Users Table Structure

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,          -- User's complete name
  phone_number TEXT,       -- Phone number without country code
  country_code TEXT,       -- e.g., '+1', '+91', '+44'
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Key Features

### 1. Country Code Selector
29 popular countries included:
- 🇺🇸 United States (+1)
- 🇮🇳 India (+91)
- 🇬🇧 United Kingdom (+44)
- 🇦🇪 UAE (+971)
- 🇦🇺 Australia (+61)
- And 24 more...

### 2. Real-time Password Validation
- Shows error if passwords don't match
- Submit button disabled until passwords match
- Minimum 6 characters required

### 3. Phone Number Formatting
- Automatically removes non-numeric characters
- Stores number without country code
- Country code stored separately for flexibility

### 4. Automatic Profile Creation
The database trigger handles profile creation automatically:
```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

## Troubleshooting

### Issue: "relation does not exist" error
**Solution**: The migration hasn't been run. Go to Step 2 and run the SQL migration.

### Issue: User created but no profile in users table
**Solution**: Check if the database trigger was created properly. Re-run the migration SQL.

### Issue: Email confirmation required
**Solution**: 
- For development: Disable email confirmation in Supabase Authentication settings
- For production: User must click confirmation link in email

### Issue: Cannot see dashboard after signup
**Solution**: Check browser console for errors. Verify AuthContext is properly wrapping your app.

### Issue: RLS policy error when inserting
**Solution**: The trigger should handle this. If manual insert is needed, ensure user is authenticated and user_id matches auth.uid().

## Next Steps

After signup is working:

1. **Implement Profile Page** - Allow users to update their name, phone, avatar
2. **Add Phone Verification** - Send OTP to WhatsApp number for verification
3. **Enhance Dashboard** - Show user's name and profile info
4. **Connect Data Collection** - Link check-ins, measurements to user accounts
5. **Add Avatar Upload** - Let users upload profile pictures

## File Changes Made

### Modified Files:
1. `shared/schema.ts` - Updated users table schema
2. `client/src/pages/Login.tsx` - Enhanced signup form with all fields
3. `supabase_migration.sql` - Added country_code field and updated trigger

### Key Code Locations:
- Signup form UI: `Login.tsx:172-326`
- Form validation: `Login.tsx:73-88`
- Supabase signup: `Login.tsx:92-104`
- Country codes list: `Login.tsx:15-45`

## Security Features

✅ Row Level Security (RLS) enabled on all tables
✅ Users can only access their own data
✅ Password hashing handled by Supabase Auth
✅ Email validation built-in
✅ CSRF protection via Supabase SDK
✅ Automatic session management

## Support

If you encounter any issues:
1. Check browser console for errors
2. Check Supabase logs in Dashboard > Logs
3. Verify environment variables are set correctly
4. Ensure database migration ran successfully

---

**Your signup feature is now complete and ready to use!** 🎉

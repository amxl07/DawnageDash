# Database Migration Instructions

This guide will help you set up authentication and user-specific data filtering in your Supabase database.

## Prerequisites

1. Supabase project set up
2. Environment variables configured in `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

## Step 1: Run the Database Migration

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor (left sidebar)
3. Click "New Query"
4. Copy the entire contents of `supabase_migration.sql`
5. Paste it into the SQL editor
6. Click "Run" to execute the migration

This will:
- Create all necessary tables with proper UUID types
- Set up Row Level Security (RLS) policies to ensure users only see their own data
- Create indexes for better query performance
- Set up a trigger to automatically create user profiles when someone signs up

## Step 2: Configure Authentication

### Enable Email Authentication

1. In your Supabase dashboard, go to Authentication > Settings
2. Under "Auth Providers", enable Email provider
3. Configure email templates (optional but recommended):
   - Go to Authentication > Email Templates
   - Customize the confirmation and password reset emails

### Email Confirmation (Optional)

By default, Supabase requires email confirmation. For development/testing:

1. Go to Authentication > Settings
2. Under "Email Auth", you can toggle "Enable email confirmations"
3. For development, you might want to disable this
4. For production, keep it enabled for security

## Step 3: Test the Authentication Flow

1. Start your development server: `npm run dev`
2. Navigate to the login page
3. Sign up with a new email and password
4. Check your email for confirmation (if enabled)
5. Sign in with your credentials
6. You should be redirected to the dashboard

## Step 4: Migrate Existing Sample Data (If Applicable)

If you already have sample data in your database with different user IDs, you'll need to:

1. First, create a user account via the app (sign up)
2. Get your user ID:
   ```sql
   SELECT id, email FROM auth.users;
   ```
3. Update existing data to use your user ID:
   ```sql
   -- Update daily_check_ins
   UPDATE daily_check_ins SET user_id = 'YOUR_USER_ID_HERE';

   -- Update body_measurements
   UPDATE body_measurements SET user_id = 'YOUR_USER_ID_HERE';

   -- Update workout_plans
   UPDATE workout_plans SET user_id = 'YOUR_USER_ID_HERE';

   -- Update meal_plans
   UPDATE meal_plans SET user_id = 'YOUR_USER_ID_HERE';

   -- Update progress_photos
   UPDATE progress_photos SET user_id = 'YOUR_USER_ID_HERE';

   -- Update user_goals
   UPDATE user_goals SET user_id = 'YOUR_USER_ID_HERE';
   ```

## Understanding Row Level Security (RLS)

With RLS enabled, the database automatically filters data based on the authenticated user:

- When you query `daily_check_ins`, you'll only see records where `user_id` matches your authenticated user ID
- You can only insert, update, or delete your own records
- No additional filtering is needed in your application code

## Example: Fetching User-Specific Data

```typescript
import { supabase } from '@/lib/supabase';

// This automatically only returns the current user's check-ins
const { data, error } = await supabase
  .from('daily_check_ins')
  .select('*')
  .order('date', { ascending: false });
```

The RLS policies ensure users can only access their own data, even if they try to query for other users' data.

## Troubleshooting

### "new row violates row-level security policy"

This means you're trying to insert data without being authenticated. Make sure:
1. The user is signed in
2. The `user_id` field matches the authenticated user's ID

### "relation does not exist"

The migration hasn't run successfully. Re-run the migration SQL.

### Email not sending

1. Check Supabase dashboard > Authentication > Settings
2. Verify SMTP settings if you've configured custom email
3. Check spam folder
4. For development, consider disabling email confirmation

### Cannot sign in

1. Verify your Supabase URL and anon key in `.env`
2. Check browser console for errors
3. Verify email/password are correct
4. If email confirmation is enabled, make sure you confirmed your email

## Next Steps

Once migration is complete and authentication is working:

1. Update your dashboard components to fetch real data from Supabase
2. Create forms to insert new check-ins, measurements, etc.
3. Implement data visualization with real user data
4. Add profile editing functionality

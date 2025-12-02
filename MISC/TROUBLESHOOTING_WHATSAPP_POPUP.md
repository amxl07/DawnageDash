# WhatsApp Popup Troubleshooting Steps

## Step 1: Clear Browser Data

1. Open your browser's developer console (Press F12 or Right-click → Inspect)
2. Go to the **Console** tab
3. Clear localStorage by running:
   ```javascript
   localStorage.clear()
   ```
4. Refresh the page (Ctrl+R or Cmd+R)

## Step 2: Check Console Logs

After refreshing, look for these messages in the console:
- `WhatsApp Dialog - User object: {…}`
- `WhatsApp Dialog - User created_at: [date]`
- `WhatsApp Dialog - Has seen onboarding: null`
- `WhatsApp Dialog - Hours since signup: [number]`
- `WhatsApp Dialog - Showing dialog!`

## Step 3: Restart Development Server

1. Stop the current dev server (Ctrl+C in terminal)
2. Restart it:
   ```bash
   cd DawnageAIDash
   npm run dev
   ```

## Step 4: Test Again

1. Login to your account
2. Navigate to the dashboard
3. Wait 2 seconds
4. Check the console for debug messages

## Common Issues and Solutions

### Issue 1: "User created_at: undefined"

**Problem:** The user object doesn't have a `created_at` field

**Solution:** The dialog will still show for all users who haven't dismissed it (this is the fallback behavior)

### Issue 2: "Hours since signup: [large number]"

**Problem:** Your account was created more than 24 hours ago

**Solution:** Temporarily disable the time check:
1. Edit `WhatsAppOnboardingDialog.tsx`
2. Change line 51 from `hoursSinceSignup < 24` to `hoursSinceSignup < 720` (30 days)
3. Or comment out the time check entirely

### Issue 3: "Has seen onboarding: true"

**Problem:** You already dismissed the dialog

**Solution:** Clear localStorage (see Step 1)

### Issue 4: No console logs at all

**Problem:** Component might not be rendering

**Solutions:**
1. Check that you're on the dashboard page (not login)
2. Verify you're logged in
3. Check browser console for any errors
4. Make sure dev server is running

## Quick Fix: Force Show the Popup

If you want to test immediately without the 24-hour restriction:

1. Open `DawnageAIDash/client/src/components/WhatsAppOnboardingDialog.tsx`
2. Replace the entire `useEffect` (lines 26-77) with this simple version:

```typescript
useEffect(() => {
  if (!user) return;

  const hasSeenOnboarding = localStorage.getItem(
    `whatsapp_onboarding_seen_${user.id}`
  );

  console.log("Showing popup for testing - has seen:", hasSeenOnboarding);

  // TEMPORARY: Show to all users who haven't dismissed it
  if (!hasSeenOnboarding) {
    const timer = setTimeout(() => {
      console.log("Opening dialog now!");
      setOpen(true);
    }, 2000);

    return () => clearTimeout(timer);
  }
}, [user]);
```

3. Save the file
4. Clear localStorage
5. Refresh the page

This will show the popup to EVERYONE who hasn't dismissed it, regardless of signup date.

## Still Not Working?

Share the console output and I'll help debug further!

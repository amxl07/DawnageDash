# WhatsApp Onboarding Integration Guide

## Overview

This feature automatically prompts new users to configure their Dawnage AI assistant on WhatsApp after they sign up and access their dashboard for the first time.

---

## How It Works

### User Flow

1. **User signs up** → Creates account with email, password, name, and WhatsApp number
2. **User logs in** → Redirected to dashboard
3. **Popup appears** (2 seconds after dashboard loads) → WhatsApp onboarding dialog
4. **User clicks "Open WhatsApp"** → Redirected to WhatsApp with pre-filled message
5. **User starts chatting** → Configures their AI assistant

### Smart Display Logic

The popup will **only show** when:
- ✅ User signed up within the last 24 hours
- ✅ User hasn't dismissed or seen the dialog before
- ✅ User is on the dashboard page

The popup will **NOT show** if:
- ❌ User dismissed it (clicked "Don't Show Again")
- ❌ User already opened WhatsApp from the dialog
- ❌ More than 24 hours have passed since signup
- ❌ User clicked "Remind Me Later" and left the page

---

## Configuration

### 1. Set Your WhatsApp Number

Edit the `.env` file:

```bash
# WhatsApp Business Number (format: country code + number, no spaces or special chars)
# Example: 919876543210 for India (+91), 14155551234 for USA (+1)
VITE_WHATSAPP_NUMBER=919876543210

# Default WhatsApp welcome message
VITE_WHATSAPP_DEFAULT_MESSAGE=Hi! I just signed up for Dawnage AI and want to configure my assistant.
```

**Important Number Format Rules:**
- ✅ **Correct:** `919876543210` (country code 91 + phone number)
- ✅ **Correct:** `14155551234` (country code 1 + phone number)
- ❌ **Wrong:** `+91 9876543210` (no + symbol or spaces)
- ❌ **Wrong:** `(415) 555-1234` (no special characters)

### 2. Customize the Message (Optional)

You can customize the pre-filled WhatsApp message by editing:

```bash
VITE_WHATSAPP_DEFAULT_MESSAGE=Your custom message here
```

**Examples:**
```bash
# Friendly approach
VITE_WHATSAPP_DEFAULT_MESSAGE=Hey! I'm excited to start my fitness journey with Dawnage AI!

# Professional approach
VITE_WHATSAPP_DEFAULT_MESSAGE=Hello, I would like to configure my Dawnage AI fitness assistant.

# Include user info (will be URL encoded automatically)
VITE_WHATSAPP_DEFAULT_MESSAGE=Hi! I just signed up and I'm ready to get started with personalized coaching.
```

---

## Technical Details

### WhatsApp Click-to-Chat URL Format

The integration uses WhatsApp's official click-to-chat API:

```
https://wa.me/{PHONE_NUMBER}?text={ENCODED_MESSAGE}
```

**Example:**
```
https://wa.me/919876543210?text=Hi!%20I%20just%20signed%20up%20for%20Dawnage%20AI
```

### Component Architecture

```
Dashboard.tsx
  └── WhatsAppOnboardingDialog.tsx
       ├── Checks user signup date
       ├── Checks localStorage for dismissal
       ├── Shows dialog after 2-second delay
       └── Opens WhatsApp with pre-filled message
```

### Storage Keys

The component uses `localStorage` to track whether a user has seen the dialog:

```javascript
localStorage.setItem(`whatsapp_onboarding_seen_{USER_ID}`, "true");
```

This ensures the popup doesn't annoy users by showing repeatedly.

---

## User Options

The dialog provides 3 actions:

### 1. **Open WhatsApp** (Primary Action)
- Opens WhatsApp with pre-filled message
- Marks dialog as seen (won't show again)
- Best for users ready to configure immediately

### 2. **Remind Me Later**
- Closes the dialog temporarily
- Will show again on next dashboard visit (if still within 24 hours)
- Best for users who want to explore the dashboard first

### 3. **Don't Show Again**
- Permanently dismisses the dialog
- Marks as seen in localStorage
- Best for users who don't want WhatsApp integration

---

## Testing the Integration

### Test 1: New User Signup Flow

1. Create a new account (use real WhatsApp number)
2. Log in to dashboard
3. Wait 2 seconds
4. ✅ Dialog should appear

### Test 2: WhatsApp Redirect

1. Click "Open WhatsApp" button
2. ✅ Should open WhatsApp (web or app)
3. ✅ Message should be pre-filled
4. ✅ Number should be correct

### Test 3: Dismissal Persistence

1. Click "Don't Show Again"
2. Refresh the dashboard
3. ✅ Dialog should NOT appear again

### Test 4: Old User Check

1. Use an account created more than 24 hours ago
2. Visit dashboard
3. ✅ Dialog should NOT appear

---

## Customization Options

### Change the Delay Before Showing

Edit `WhatsAppOnboardingDialog.tsx`:

```typescript
// Show dialog after a short delay for better UX
const timer = setTimeout(() => {
  setOpen(true);
}, 2000); // Change this value (in milliseconds)
```

**Examples:**
- `1000` = 1 second
- `3000` = 3 seconds
- `5000` = 5 seconds

### Change the 24-Hour Window

Edit `WhatsAppOnboardingDialog.tsx`:

```typescript
// Check if user signed up recently (within last 24 hours)
const hoursSinceSignup = (now.getTime() - userCreatedAt.getTime()) / (1000 * 60 * 60);

// Show dialog if user signed up within last 24 hours
if (!hasSeenOnboarding && hoursSinceSignup < 24) {
  // Change 24 to your desired hours
}
```

**Examples:**
- `1` = Show only for users who signed up in the last hour
- `48` = Show for users who signed up in the last 2 days
- `168` = Show for users who signed up in the last week

### Customize the Dialog Design

The dialog uses shadcn/ui components. You can customize:

1. **Colors** - Edit the button colors in `WhatsAppOnboardingDialog.tsx`
2. **Size** - Change `sm:max-w-[500px]` to your preferred width
3. **Content** - Edit the features list and descriptions
4. **Icons** - Replace `MessageCircle` icon with your preferred icon

---

## Troubleshooting

### Dialog Not Appearing

**Problem:** Dialog doesn't show for new users

**Solutions:**
1. Check browser console for errors
2. Verify user was created within last 24 hours:
   ```javascript
   console.log(new Date(user.created_at))
   ```
3. Clear localStorage and try again:
   ```javascript
   localStorage.clear()
   ```

### WhatsApp Not Opening

**Problem:** Clicking "Open WhatsApp" doesn't do anything

**Solutions:**
1. Check if WhatsApp number format is correct (no +, spaces, or special chars)
2. Verify `.env` file has `VITE_WHATSAPP_NUMBER` set correctly
3. Check browser console for blocked popups
4. Try opening the URL manually:
   ```
   https://wa.me/919876543210?text=test
   ```

### Wrong Number in WhatsApp

**Problem:** Opens wrong WhatsApp number

**Solutions:**
1. Check `.env` file for `VITE_WHATSAPP_NUMBER`
2. Restart development server after changing `.env`:
   ```bash
   npm run dev
   ```
3. Clear browser cache and try again

### Dialog Shows Too Often

**Problem:** Dialog keeps appearing on every page refresh

**Solutions:**
1. Verify localStorage is working:
   ```javascript
   console.log(localStorage.getItem('whatsapp_onboarding_seen_' + user.id))
   ```
2. Check if user ID is consistent across sessions
3. Ensure you're not in incognito/private mode (localStorage may not persist)

---

## WhatsApp Business API Integration (Advanced)

For automated responses and chatbot functionality, you'll need:

1. **WhatsApp Business Account**
   - Apply at: https://business.whatsapp.com/
   - Verification process takes 1-3 days

2. **WhatsApp Business API**
   - Providers: Twilio, MessageBird, 360Dialog
   - Cost: Varies by provider and usage

3. **Chatbot Platform**
   - Options: Dialogflow, Rasa, n8n, custom solution
   - Integrate with your WhatsApp Business API

---

## Privacy & Security

### User Data Handling

- ✅ Phone numbers are stored securely in Supabase
- ✅ Messages are sent directly to WhatsApp (not stored by Dawnage)
- ✅ Users control when to initiate WhatsApp conversation
- ✅ No automatic messages sent without user action

### GDPR Compliance

- Users provide explicit consent during signup
- Phone numbers can be deleted via profile settings
- WhatsApp conversation data is controlled by WhatsApp's privacy policy

---

## Best Practices

### 1. **Clear Value Proposition**
The dialog explains WHY users should connect WhatsApp (daily check-ins, coaching, reminders)

### 2. **Non-Intrusive Timing**
2-second delay prevents immediate popup on page load

### 3. **User Control**
Three options give users full control over the experience

### 4. **Single Show Policy**
Only shows once to avoid annoyance

### 5. **Mobile Optimized**
Dialog is responsive and works perfectly on mobile devices

---

## Next Steps

1. ✅ Configure your WhatsApp number in `.env`
2. ✅ Test the signup flow
3. ✅ Verify WhatsApp opens correctly
4. ⏳ Set up WhatsApp Business API for automated responses
5. ⏳ Build AI chatbot for WhatsApp conversations
6. ⏳ Integrate chatbot with your Supabase database

---

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review browser console for errors
3. Test with different browsers
4. Verify environment variables are set correctly

---

**Need to customize further?** The component is fully customizable in:
- `/client/src/components/WhatsAppOnboardingDialog.tsx`
- `/client/src/pages/Dashboard.tsx`
- `/.env`

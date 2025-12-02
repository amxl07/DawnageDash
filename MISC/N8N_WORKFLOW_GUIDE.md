# n8n Workflow Guide: Google Sheets → Supabase Sync

## Overview

This guide will help you set up n8n workflows to automatically sync data from your Google Sheets to Supabase, so your dashboard always displays the latest client data.

---

## 🎯 Architecture

```
Client submits form (Google Forms, Typeform, etc.)
        ↓
      n8n receives webhook or polls sheet
        ↓
   Transforms data to match database schema
        ↓
    ┌────────┴────────┐
    ↓                 ↓
Google Sheets    Supabase Database
(Backup/View)    (Primary Source)
                      ↓
              Dashboard updates automatically
```

---

## 📋 Prerequisites

1. ✅ Supabase database set up (you've done this!)
2. ✅ Google Sheets with your client data
3. ⏳ n8n instance (cloud or self-hosted)

---

## 🚀 Step 1: Set Up n8n

### Option A: n8n Cloud (Easiest)

1. Go to https://n8n.io
2. Sign up for n8n Cloud (free tier available)
3. Create a new workflow

### Option B: Self-Hosted (Free, more control)

```bash
# Using Docker
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n

# Or using npx
npx n8n
```

Access at: http://localhost:5678

---

## 🔗 Step 2: Add Credentials in n8n

### A. Google Sheets Credentials

1. In n8n, go to **Credentials** menu
2. Click **Add Credential**
3. Select **Google Sheets API**
4. Click **Sign in with Google**
5. Authorize n8n to access your sheets
6. Test the connection

### B. Supabase Credentials

1. Click **Add Credential**
2. Select **Supabase**
3. Enter:
   - **Host**: `https://hzifwkebzhzlxvigbcup.supabase.co` (your project URL)
   - **Service Role Secret**: Your `SUPABASE_SERVICE_ROLE_KEY` from .env file
4. Test the connection

---

## 🔄 Step 3: Create Your First Workflow

### Workflow 1: Daily Check-Ins Sync

This workflow watches for new rows in your Google Sheet and inserts them into Supabase.

#### Node Configuration:

```
[Google Sheets Trigger] → [Transform Data] → [Supabase Insert] → [Success Notification]
```

#### Detailed Setup:

**1. Google Sheets Trigger Node**
- Node type: **Google Sheets** (Trigger)
- Operation: **On Row Added** or use **Schedule** to poll every 5 minutes
- Spreadsheet: Select your sheet
- Sheet: Select the specific tab (e.g., "Daily Check-Ins")
- Trigger On: **Append**

**2. Code Node (Transform Data)**
```javascript
// Map Google Sheets columns to Supabase schema
const items = $input.all();

return items.map(item => {
  const row = item.json;

  return {
    json: {
      user_id: row['Client ID'] || 'default-user-id', // Map your client ID column
      date: row['Date'],
      day_number: parseInt(row['Day Number']),

      // Vitals
      morning_weight: parseFloat(row['Morning Weight']),
      sleep_hours: parseFloat(row['Sleep Hours']),

      // Workout
      workout_status: row['Workout Status']?.toLowerCase(),
      workout_performance: parseInt(row['Performance']),

      // Nutrition
      nutrition_score: parseInt(row['Nutrition Score']),
      calorie_intake: parseInt(row['Calories']),
      water_liters: parseFloat(row['Water (L)']),
      daily_steps: parseInt(row['Steps']),
      protein: parseFloat(row['Protein']),
      carbs: parseFloat(row['Carbs']),
      fats: parseFloat(row['Fats']),

      // Wellbeing
      energy_level: parseInt(row['Energy']),
      hunger_level: parseInt(row['Hunger']),
      stress_level: parseInt(row['Stress']),
      digestion: row['Digestion']?.toLowerCase() || 'none',

      // Notes
      notes: row['Notes'] || null
    }
  };
});
```

**3. Supabase Node**
- Operation: **Insert**
- Table: `daily_check_ins`
- Data to Insert: `{{ $json }}` (uses transformed data from previous node)
- Options:
  - **On Conflict**: `Do Nothing` (or `Update` if you want to update existing records)
  - **Columns**: Leave empty to insert all columns

**4. Send Email Node (Optional - for notifications)**
- Node type: **Email** (Send Email)
- To: Your email
- Subject: `New check-in synced to Supabase`
- Message: `Successfully synced data for {{$node["Transform Data"].json["date"]}}`

---

### Workflow 2: Body Measurements Sync

Similar structure but for body measurements:

**Google Sheets Columns → Supabase Mapping:**

| Google Sheets Column | Supabase Column |
|---------------------|-----------------|
| Client ID | user_id |
| Date | date |
| Weight | weight |
| Body Fat % | body_fat_percentage |
| Muscle Mass | muscle_mass |
| Chest | chest |
| Waist | waist |
| Hips | hips |
| Thighs | thighs |
| Arms | arms |
| Neck | neck |
| Calves | calves |

**Transform Code:**
```javascript
const items = $input.all();

return items.map(item => {
  const row = item.json;

  return {
    json: {
      user_id: row['Client ID'] || 'default-user-id',
      date: row['Date'],
      weight: parseFloat(row['Weight']),
      body_fat_percentage: parseFloat(row['Body Fat %']),
      muscle_mass: parseFloat(row['Muscle Mass']),
      chest: parseFloat(row['Chest']),
      waist: parseFloat(row['Waist']),
      hips: parseFloat(row['Hips']),
      thighs: parseFloat(row['Thighs']),
      arms: parseFloat(row['Arms']),
      neck: parseFloat(row['Neck']) || null,
      calves: parseFloat(row['Calves']) || null,
      notes: row['Notes'] || null
    }
  };
});
```

---

## 🎨 Advanced: Bidirectional Sync

If you also want dashboard updates to sync back to Google Sheets:

### Workflow 3: Supabase → Google Sheets

**Trigger:** Supabase Database Webhook

1. In Supabase, go to **Database** → **Webhooks**
2. Create new webhook:
   - Table: `daily_check_ins`
   - Events: `INSERT`, `UPDATE`
   - Type: `HTTP Request`
   - URL: Your n8n webhook URL (from n8n Webhook Trigger node)

3. In n8n:
```
[Webhook Trigger] → [Transform Data] → [Google Sheets Update]
```

---

## 📊 Google Sheets Template Structure

Your Google Sheets should be structured like this:

### Sheet 1: Daily Check-Ins

| Client ID | Date | Day Number | Morning Weight | Sleep Hours | Workout Status | Performance | Nutrition Score | Calories | Water (L) | Steps | Protein | Carbs | Fats | Energy | Hunger | Stress | Digestion | Notes |
|-----------|------|------------|----------------|-------------|----------------|-------------|-----------------|----------|-----------|-------|---------|-------|------|--------|--------|--------|-----------|-------|
| user-123 | 2025-02-04 | 28 | 78.5 | 7.5 | done | 9 | 9 | 2100 | 2.8 | 9200 | 151 | 207 | 63 | 9 | 4 | 2 | none | Felt great! |

### Sheet 2: Body Measurements

| Client ID | Date | Weight | Body Fat % | Muscle Mass | Chest | Waist | Hips | Thighs | Arms | Neck | Calves | Notes |
|-----------|------|--------|------------|-------------|-------|-------|------|--------|------|------|--------|-------|
| user-123 | 2025-02-04 | 78.5 | 18.2 | 62.5 | 102 | 84 | 98 | 58 | 36 | 38 | 38 | Progress! |

---

## 🧪 Testing Your Workflow

1. **Activate the workflow** in n8n (toggle switch)
2. **Add a test row** to your Google Sheet
3. **Wait 5 minutes** (or trigger manually)
4. **Check n8n execution log**:
   - Click on the workflow execution
   - Verify all nodes executed successfully
   - Check the data was transformed correctly
5. **Verify in Supabase**:
   - Go to Supabase → Table Editor
   - Check if the new row appears in `daily_check_ins` table
6. **Check your dashboard**:
   - Open your dashboard at http://localhost:5000
   - The new data should appear!

---

## 🐛 Troubleshooting

### Workflow not triggering

**Issue:** New Google Sheets rows don't trigger the workflow

**Solution:**
- Check if the workflow is activated (toggle on)
- Verify Google Sheets credentials are valid
- Try "Execute Workflow" manually first
- Check n8n execution logs for errors

### Data not inserting into Supabase

**Issue:** Workflow runs but no data in Supabase

**Solutions:**
1. **Check data transformation:**
   - Click on "Transform Data" node execution
   - Verify output matches Supabase schema
   - Check for `null` values in required fields

2. **Check Supabase credentials:**
   - Verify Service Role Key is correct
   - Test connection in n8n credentials

3. **Check Supabase logs:**
   - Go to Supabase → Logs
   - Look for failed insert attempts
   - Check error messages

### Type mismatch errors

**Issue:** `column "weight" is of type numeric but expression is of type text`

**Solution:**
- Ensure you're parsing numbers: `parseFloat()` for decimals, `parseInt()` for integers
- Check your transform code uses correct types

### Missing columns

**Issue:** `column "user_id" does not exist`

**Solution:**
- Check your table schema in Supabase matches the data you're inserting
- Verify column names are snake_case (e.g., `user_id` not `userId`)

---

## 📈 Monitoring & Maintenance

### Set Up Error Notifications

Add an **IF** node after Supabase to catch errors:

```
[Supabase] → [IF Node] → [Success Path] → [Log Success]
                       → [Error Path] → [Send Alert Email]
```

**IF Node Configuration:**
- Condition: `{{ $node["Supabase"].json["error"] }}` **is not empty**
- True: Send error email
- False: Continue normally

### Schedule Regular Sync

Instead of real-time, you can schedule syncs:

1. Use **Schedule Trigger** node instead of Google Sheets Trigger
2. Set interval: Every 5 minutes, 15 minutes, or hourly
3. Add **Google Sheets** node (not trigger) to read all rows
4. Filter for rows updated since last sync

---

## 🎯 Next Steps

1. ✅ Set up n8n instance
2. ✅ Add Google Sheets & Supabase credentials
3. ✅ Create Daily Check-Ins sync workflow
4. ✅ Test with sample data
5. ✅ Create additional workflows for measurements, plans, etc.
6. ✅ Enable monitoring and error alerts
7. ✅ Train your clients/team on the Google Sheets format

---

## 💡 Pro Tips

1. **Use Templates:** n8n has pre-built templates for Google Sheets → Database sync
2. **Batch Processing:** If syncing historical data, process in batches of 100 rows
3. **Deduplication:** Add a check to avoid inserting duplicate records (use date + user_id as unique key)
4. **Data Validation:** Add validation nodes to check data quality before inserting
5. **Logging:** Keep logs of all syncs for debugging

---

## 🔗 Useful Resources

- n8n Documentation: https://docs.n8n.io
- n8n Workflow Templates: https://n8n.io/workflows
- Supabase + n8n Tutorial: https://n8n.io/integrations/supabase
- Community Forum: https://community.n8n.io

---

**Need help setting up a specific workflow?** Let me know which data you want to sync first and I can provide more detailed configuration!

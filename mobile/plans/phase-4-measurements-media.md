# Phase 4 — Body Tracking: Measurements + Media

Web sources: `pages/Measurements.tsx`, `components/MeasurementDialog.tsx`, `components/Measurement{Card,ProgressChart,ComparisonCard}.tsx`, `pages/Media.tsx`, `components/PhotoUploadCard.tsx`, `components/PhotosUploadDialog.tsx`.

Decision (already made in Phase 0): these remain **separate destinations** under the More tab, matching the web's three routes — but each gets prefill-from-last-entry and a delta payoff on save. Do not build a combined wizard.

## 4a. Measurements (`(app)/measurements.tsx`)
- Header metric cards: Total Weight Lost (from check-in weights), Waist Reduction (oldest→newest waist), Avg Weekly Loss — formulas in contract.
- Multi-series line chart (chest/waist/hip/thigh/arm by week index W0..Wn, oldest = W0 baseline) with series toggles; comparison card (baseline vs latest per measurement with signed deltas, green when reduced).
- History list: one card per entry (Week n, date, 5 values), tap → edit. `FlatList`, memoized row, `keyExtractor` on id (§03.D).
- Add/Edit sheet: date (default today, capped at today; locked when editing), five decimal inputs (cm) — **prefilled with the previous entry's values** so the user edits deltas (label "last: x cm"). All five use `keyboardType="decimal-pad"`, chain with `onSubmitEditing`, validate on blur with a plausible range (20–250 cm) and an inline message, and sit above a sticky save bar inside the safe area with `KeyboardAvoidingView` (§03.C).
- Save = fetch-by-(user_id,date)-then-update/insert (NO unique constraint — the check is what prevents dupes); button disabled + spinner in flight. On success: `notificationAsync(Success)` + a one-line delta payoff ("Waist −2.0 cm since last time"), also sent to `announceForAccessibility`.
- Chart series toggles are `accessibilityRole="switch"` with state; the chart wrapper's `summary` prop describes the visible series (§03.A.7).

## 4b. Media / Progress Photos (`(app)/media.tsx`)
- Install: `npx expo install expo-image-picker expo-image-manipulator expo-image` (use `expo-image` for cached rendering).
- Grid of week cards (newest first): "Week 0 (Baseline)" highlighted, date badge, 4 thumbnails (Front/Back/Left/Right, 3:4), "n/4 photos" warning when incomplete, edit button. `FlatList` with `numColumns`, memoized cell; every `expo-image` gets explicit dimensions + `cachePolicy="memory-disk"` + a `placeholder` blurhash or skeleton so the grid never shifts as images arrive (§03.D.4).
- Capture/edit sheet for a date (default today): 4 slots. Each slot → choice of camera or library (`expo-image-picker`, request permissions with a friendly **pre-permission explainer card before the OS prompt** — "Your photos are uploaded to your private progress log and only your coach can see them"; denial shows an inline hint with a link to system settings, never a dead end).
- **Camera mode shows a pose-guide overlay**, and this is where the mobile app can beat the web outright:
  - **Primary guide = the ghost of last week's photo for this same angle**, rendered at ~25% opacity over the live camera. Aligning against your own previous shot produces genuinely comparable progress photos; a generic silhouette does not. The URL is already in the previous `weekly_progress_photos` row — no new data needed.
  - **Fallback for Week 0** (or a missing angle): the semi-transparent human-silhouette outline per angle (front/back/side variants, bundled SVGs via react-native-svg).
  - Either overlay is toggleable with a visible control, plus a one-line hint ("line up with last week's outline"). `impactAsync(Medium)` on capture.
- Pipeline per photo: pick → `expo-image-manipulator` resize to fit 1200×1600, JPEG quality 0.75 → upload to bucket `progress_photos` at `${userId}/${dateStr}/${label}_${Date.now()}.jpg` (`upsert: true`, `contentType: 'image/jpeg'`) → `getPublicUrl` → set the slot URL. Per-slot progress spinner; failures keep the slot editable and show a retry.
- Save row: fetch-by-(user_id,date)-then-update/insert with the four `*_url` columns (null allowed). Removing a photo just nulls the column (web behavior — don't delete storage objects).
- Full-screen viewer on thumbnail tap with swipe between angles — **and a visible prev/next affordance plus a dot pager, because swipe must never be the only way (§03.B.2)**; close button always present. Simple side-by-side "compare with baseline" view (this week vs Week 0, same angle) as the payoff moment, with the week numbers and dates labelled under each image.
- Upload states: per-slot progress spinner, a retry affordance on failure that keeps the picked image so nothing has to be re-shot, and a clear "uploading n of 4" summary. Never leave a slot in an ambiguous state.

## Acceptance criteria
- Measurements: values, deltas, and chart match web for the same account; prefill works; editing an existing date updates rather than duplicating; keyboard never covers the active field; blur validation fires with a readable message.
- Photos: capture with **both** overlay modes exercised (ghost of last week where a previous photo exists, silhouette at Week 0), compressed size logged (<~500KB typical), row visible on web app's Media page afterward (cross-check!), incomplete-set warning shows, baseline compare works.
- Upload failure path tested (kill Wi-Fi mid-upload): slot stays editable, retry works, no orphaned state.
- Permission denial paths handled gracefully (pre-prompt shown first, settings hint after denial, no crash).
- Viewer is fully operable without swiping. §03 quick check passes; one screen traversed with a screen reader (name it). Both themes. `tsc` clean.

**STOP. Post summary. Wait for "continue".**

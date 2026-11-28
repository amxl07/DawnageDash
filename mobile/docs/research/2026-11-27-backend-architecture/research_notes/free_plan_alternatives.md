# Staying on the Supabase Free plan safely: limits, DIY backups, logs, storage, and when to upgrade

Research date: **2026-11-28**. This was read-only research. Nothing was changed on the project, no SQL was run, and no secrets were used or printed.

Project context (given, not re-researched):
- `hzifwkebzhzlxvigbcup`, ap-southeast-2, Postgres 17.6, org `DAWNAGE` on Free. The org is `"plan":"free","tier":"tier_free"` (live `get_organization` 2026-11-28), and the project is `ACTIVE_HEALTHY` (live `get_project`).
- DB is 28 MB. The `progress_photos` bucket holds 927,962,420 bytes in 1,691 objects. It is growing about 31.7 MiB/month and carries 139 MiB of orphans and 624 MiB of legacy originals.

All web sources below were fetched on 2026-11-28 unless another date is given. A date in brackets is the page's own date, where it shows one. Most Supabase docs pages are undated.

---

## TL;DR

1. **The Free plan is workable until launch, but not for a paid production service.** Supabase says so itself: "If people rely on what you're building, even with light traffic, upgrade the project to a paid plan" ([KB, updated 2026-10-27](https://supabase.com/kb/faqs/platform/free-project-pausing)). Pricing calls Free "Perfect for passion projects & simple websites" and Pro "For production applications".
2. **The biggest Free-plan risk isn't pausing. It's the Fair Use restriction.** Going over any quota (storage is the near one) leads, after a single grace period, to restrictions that can include **402 on all API requests for every project in the org**. Support cannot lift it. Only the next billing cycle or an upgrade does.
3. **Build the DIY backup now. It's needed on Pro too.** Use a nightly GitHub Actions job that runs:
   - `supabase db dump` three times (roles, schema, data), plus the managed-schema customisations and the migration history;
   - an `age` encryption step;
   - `rclone` incremental mirroring of the bucket through rclone-crypt.

   Both go to **Backblaze B2** (10 GB free, no card, a write-without-delete key, versioning and lifecycle). A 7-day GitHub artifact is a second copy of the DB dump. Pro's backups only keep 7 days, stay on-platform and **exclude Storage objects**, so the photo backup is needed on any plan. The YAML is in **Appendix A**.
4. **Keep photos on Supabase Storage. Clean up first (after the first backup), and don't move to R2.** Cleanup takes the bucket from 0.928 GB to about 0.29 GB, roughly 21 months of runway at today's rate. R2 would move authorization out of RLS into Edge Function code and add a vendor, to save $25/mo.
5. **Logs beyond 1 day:**
   - an in-DB write-audit table (trigger) — this also identifies the n8n/service_role writer;
   - Auth "Write audit logs to the database" on;
   - Sentry Developer (free).

   The Metrics endpoint is **not included on Free** per the pricing page.
6. **When to upgrade to Pro ($25/mo, spend cap on by default):** the day the first paying client relies on the app (store build 1 going public), or earlier if any trigger in §6 fires.

---

## 1. Current Free plan limits (verified 2026-11-28)

Source: the [Supabase pricing page](https://supabase.com/pricing) (undated; it says "Pricing may change in the future") and the per-quota docs pages named in each row.

| Item | Free plan | Pro plan, for comparison | Source |
|---|---|---|---|
| Database size | "500 MB database size per project". Shared CPU, 500 MB RAM. The disk is a fixed 2 GB. | 8 GB disk per project, then $0.125/GB | pricing; [Database size](https://supabase.com/docs/guides/platform/database-size) |
| File storage | **1 GB**, i.e. 744 GB-Hrs per month. The max upload size is 50 MB. Image transformations are not included. | 100 GB, then $0.0213/GB | [Storage size](https://supabase.com/docs/guides/platform/manage-your-usage/storage-size); [file limits](https://supabase.com/docs/guides/storage/uploads/file-limits) |
| Egress | **5 GB uncached + 5 GB cached**. These are independent quotas. | 250 GB + 250 GB, then $0.09 / $0.03 per GB | [Egress](https://supabase.com/docs/guides/platform/manage-your-usage/egress) |
| MAU | 50,000, plus 50,000 third-party MAU. SSO is not included. | 100,000, then $0.00325 | pricing; [MAU](https://supabase.com/docs/guides/platform/manage-your-usage/monthly-active-users) |
| Edge Function invocations | 500,000/month | 2M, then $2 per 1M | [Edge Function invocations](https://supabase.com/docs/guides/platform/manage-your-usage/edge-function-invocations) |
| Realtime | 200 concurrent peak connections, 2M messages/month, 256 KB max message size | 500 connections, 5M messages, 3 MB messages | pricing; [Realtime messages](https://supabase.com/docs/guides/platform/manage-your-usage/realtime-messages); [peak connections](https://supabase.com/docs/guides/platform/manage-your-usage/realtime-peak-connections) |
| Log retention | **1 day** (API and Database). Auth audit logs are kept 24 hours. Log ingest: 1 GB included. Log query: 100 GB. | 7 days; 20 GB ingest | pricing; [Logs ingest](https://supabase.com/docs/guides/platform/manage-your-usage/logs-ingest) |
| Log drains / Metrics endpoint | **Not included** / **Not included** | $60/drain / included | pricing (the "Metrics endpoint" row) |
| Backups / PITR | Not included / not included | Daily, kept 7 days / $100/mo per 7 days | pricing; [Backups](https://supabase.com/docs/guides/platform/backups) |
| Active projects | 2. Paused projects don't count. | First project included, then from $10/mo each | pricing; [Billing FAQ](https://supabase.com/docs/guides/platform/billing-faq) |
| Support / SLA | Community only / no SLA | Email support with no support SLA / **no uptime SLA** (uptime SLA is Enterprise only) | pricing; [SLA](https://supabase.com/sla) |
| Other Free gaps that matter for production | Leaked password protection, session timeouts, branching, custom domains, platform audit logs | Included or available on Pro | pricing |

**Notes on the limits:**
- **Log ingest is newly metered.** Free includes 1 GB of log ingest. Billing has a "grace period that runs through the start of 2027" ([logs ingest doc](https://supabase.com/docs/guides/platform/manage-your-usage/logs-ingest); [changelog 2026-09-25](https://supabase.com/changelog/50925-logs-usage-based-pricing)). On Free, going over is not billed; it falls under Fair Use. **So don't turn on verbose statement logging or pgaudit on Free.**
- **The DB-size quota scope is contradictory.** The pricing page and a [2025-01-27 changelog](https://supabase.com/changelog/33121-relaxing-database-size-limit-on-free-plan-0-5-gb-database-size-per-project) say "per project". The current database-size doc says the Fair Use DB-size quota is "evaluated per organization, summing the database size across all of your projects", based on the average daily size. At 28 MB this doesn't matter.
- **Egress counts everything.** It includes Database, Auth, Storage, Functions, Realtime and **Shared Pooler egress**, so pg_dumps through the pooler count. The egress doc says: "When running manual backups through Supavisor, remove unneeded tables and/or reduce the frequency."

### Pause policy
Sources: [Project Pausing doc](https://supabase.com/docs/guides/platform/free-project-pausing), [KB FAQ (updated 2026-10-27)](https://supabase.com/kb/faqs/platform/free-project-pausing), [Upgrading doc](https://supabase.com/docs/guides/platform/upgrading) and [restore after pause KB](https://supabase.com/docs/guides/troubleshooting/restore-project-after-90-days-pause).

- **Inactivity window.** Supabase "pauses Free Plan projects that show low activity over a 7-day period". A project is inactive "if it does not receive sufficient user database activity over the past week… Typically a few user requests to the database each day over the previous week is enough". The KB adds that this "isn't a guarantee".
- **What counts as activity.** "Opening the project in the dashboard or sending real requests from your app both count as activity" (KB). After a warning, the doc also suggests "making API calls to your project or sending requests via your connected application". The thresholds are not published.
- **Warning.** Supabase emails the project owner "roughly one week before the pause", and again when the pause happens.
- **Unpausing.** In the Dashboard, open the org, open the project and click **Resume project**. The project returns "to its previous state, including data and configurations". Free projects "move to the latest minor version when their paused project is restored" (Upgrading doc).
- **Restore window.** The live docs say there is a **1-year** window to restore from Studio. This conflicts with older material:
  - a [June 2024 changelog](https://supabase.com/changelog/27497-paused-free-plan-projects-are-restorable-for-90-days) and the MCP docs index both still say 90 days;
  - a May 2026 status incident involved a wrong resume-deadline display ([status](https://status.supabase.com/incidents/v0qk7t3y3c5j)).

  Treat 1 year as current, but don't plan around it.
- **After the window.** You can download the DB backup and Storage objects from the dashboard "before the project is deleted". The KB warns: "Once a project is deleted, all associated data including backups is permanently removed." **The docs give no fixed N-day deletion date.**
- **Billing.** Paused projects aren't charged and don't count toward the 2-project limit.

### What happens when the storage quota is exceeded (and any other quota)
Sources: [Billing FAQ, Fair Use Policy](https://supabase.com/docs/guides/platform/billing-faq), [Storage size](https://supabase.com/docs/guides/platform/manage-your-usage/storage-size) and [KB on HTTP 402](https://supabase.com/kb/troubleshooting/http-status-codes).

1. **Notification and grace period.** "You will get a notification to your billing email address and put under a grace period." The **length is not documented**. One community case was a notice dated 2025-11-03 with an end date of 2025-11-26, about 3 weeks ([GitHub discussion #40081](https://github.com/orgs/supabase/discussions/40081), community answer, not staff).
2. **Only one grace period.** "If you exceed your plan limits again, you will not receive another grace period and your project will be restricted." The warning clears only after staying under limits "for multiple billing cycles".
3. **Possible restrictions:**
   - "Pausing projects"
   - "Switching databases to read-only mode"
   - "Disabling new project launches/transfers"
   - "Responding with a 402 status code for all API requests"

   These are "generally applied to all projects of the restricted organization". The 402 description carries codes such as `exceed_storage_size_quota`.
4. **Removing restrictions.** Restrictions are lifted when the quota refills at the next billing cycle, or immediately on upgrade to Pro. "The support team cannot extend grace periods or make exceptions."
5. **Storage is billed on GB-hours (an average), not the live size.** "Reducing storage late in the cycle lowers the average only gradually", so a late cleanup may not clear a restriction until the next cycle. **Do cleanups early in a billing cycle.**
6. **Delete objects through the Storage API, never SQL.** Deleting `storage.objects` rows with SQL leaves the files and the usage behind ([KB](https://supabase.com/kb/troubleshooting/storage-unexpectedly-high-usage-or-exceed_storage_size_quota-errors-ae21a5)).
7. **Database disk on Free.** Separately, the fixed 2 GB disk goes read-only at 95% disk use. If the disk fills, "Postgres shuts down. It stays down until you upgrade to the Pro Plan" (database-size doc). This is irrelevant at 28 MB, but bulk writes and WAL count.

**Org isolation tip.** The DAWNAGE org also contains the paused, unrelated `AuxiDesk` project (from the 2026-11-27 notes). Fair Use and quotas are org-wide, so if AuxiDesk is ever resumed, its usage could get Dawnage restricted. Transfer it to its own Free org with the self-serve [project transfer](https://supabase.com/docs/guides/platform/project-transfer), or delete it if it isn't needed.

---

## 2. Free, automated, restorable backups

### Recommendation
- **What runs:** a **nightly GitHub Actions job**, in this repo (`amxl07/DawnageDash`, private). The YAML is in Appendix A.
- **Where it connects:** to the **session pooler**, because GitHub runners are IPv4-only.
- **Database:** the official three-file `supabase db dump` set, plus the managed-schema customisations and the migration history.
- **Encryption:** `age` with **public-key recipients only**, so CI never holds the decryption key.
- **Photos:** `rclone sync` from the Supabase S3 endpoint into an **rclone-crypt** remote.
- **Destination:**
  - **Primary:** Backblaze B2.
  - **Secondary:** a GitHub artifact of the encrypted DB dump, kept 7 days.
- **Restore drill:** an automated one every Sunday on the runner, plus a manual quarterly decrypt-and-restore into a second free Supabase project.

Supabase itself recommends this for Free: "We recommend that free tier plan projects regularly export their data using the Supabase CLI `db dump` command and maintain off-site backups" ([Backups doc](https://supabase.com/docs/guides/platform/backups)).

### What `supabase db dump` covers (CLI v3)
Verified against the [CLI reference](https://supabase.com/docs/reference/cli/supabase-db-dump) and the CLI v3.4.0 source, released 2026-11-24 (`apps/cli/src/command-internal/pg-dump.env.ts`, `pg-dump.scripts.ts`).

**CLI v3 behaviour:**
- **CLI v3 changed the default target.** `db dump` "Dumps the **local** database by default. Pass `--remote` … or `--remote=<ref|branch|url>`". `--db-url` and `--linked` "still work in v3 but are deprecated and removed in v4".
- **So always pass `--remote="$URL"` in CI, and pin CLI 3.x.**

**What goes into each file:**
- **Schema dump.** It excludes managed schemas (`auth`, `storage`, `realtime`, `vault`, `extensions`, `supabase_migrations`, `cron`, …).
- **Data dump.** It **includes `auth` and `storage` data**: `auth.users`, identities, sessions and refresh tokens, and `storage.buckets` and `storage.objects` metadata.
  - In the source, `"auth"` and `"storage"` are commented out of the data `EXCLUDED_SCHEMAS`.
  - It excludes `auth.schema_migrations`, `storage.migrations`, `vault`, `pgsodium` and `supabase_migrations`.
  - **The data dump therefore contains bcrypt password hashes and refresh tokens, so it must be encrypted.**
- **Roles dump.** It uses `pg_dumpall --roles-only --no-role-passwords` and comments out reserved roles. Custom login roles need passwords reset after restore.

**Not in any db dump. Handled separately in Appendix A or the checklist below:**
1. **Customisations on managed schemas: RLS policies on `storage.objects` and triggers on `auth.users`.** The docs say: "If you have modified the `auth` and `storage` schemas … such as adding triggers or Row Level Security (RLS) policies, you have to restore them separately" ([backup-restore guide](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)). This project has `on_auth_user_created` on `auth.users` (data_model_schema.md) and private-bucket policies on `storage.objects` (migration 07). **Appendix A step "managed customisations" dumps both with a catalog query.**
2. **`supabase_migrations` history.** It needs its own two dumps, as in the docs.
3. **Storage objects.** These are files, not rows, and need the rclone job. **Pro backups don't include them either:** "Database backups do not include objects you store via the Storage API" (Backups doc).
4. **Settings and secrets that aren't data:**
   - Auth settings (URLs, providers, SMTP, templates)
   - API keys and the JWT secret
   - Edge Functions (the source is in repo `supabase/functions/`) and their secrets
   - Storage and Realtime settings
   - Vault secrets and the root key — `supabase_vault` is installed. If it holds secrets, the root key must be copied with the `/pgsodium` Management API endpoint while the old project is alive.

### IPv4 vs IPv6, and which connection string
- **Direct host** `db.hzifwkebzhzlxvigbcup.supabase.co:5432` is **IPv6 on Free**. The IPv4 add-on is Pro and above ([Connecting to Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres)).
- **GitHub Actions is listed as IPv4-only** ([IPv4 add-on doc](https://supabase.com/docs/guides/platform/ipv4-address)). "The shared pooler is IPv4-only on every plan."
- **Use the shared pooler in session mode, port 5432:**
  `postgresql://postgres.hzifwkebzhzlxvigbcup:<PASSWORD>@aws-<N>-ap-southeast-2.pooler.supabase.com:5432/postgres`
  Copy the exact host (`aws-0` or `aws-1`) from **Dashboard, Connect, Session pooler**.
  - Don't use transaction mode (6543) for pg_dump.
  - The backup-restore guide prescribes session pooler when IPv6 isn't available.
- **Use a URL-safe password.** Percent-encode special characters in the URI, or reset to a long alphanumeric password. **Before resetting the DB password, confirm nothing else uses it, for example the n8n automation (see open questions).**

### Secrets handling
Use a GitHub **Environment** named `backup` with **deployment branches limited to `main`**.
- Don't require reviewers; that would block scheduled runs.
- Scheduled workflows only run from the default branch ([GitHub events doc](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)).

| Name | Kind | Notes |
|---|---|---|
| `SUPABASE_DB_URL` | secret | The session-pooler URI including the password. It is the most sensitive item: it can read and write all data. |
| `SUPABASE_S3_KEY_ID`, `SUPABASE_S3_SECRET` | secret | A dedicated pair named `github-backup` from Storage, S3 settings. "S3 access keys provide full access to all S3 operations across all buckets and bypass RLS" ([S3 auth](https://supabase.com/docs/guides/storage/s3/authentication)). It can be revoked on its own. Only ever used as an rclone *source*. |
| `B2_KEY_ID`, `B2_APP_KEY` | secret | **Bucket-restricted** key with `listBuckets,listFiles,readFiles,writeFiles` and **no `deleteFiles`** ([B2 application keys, updated 2026-09-29](https://www.backblaze.com/docs/cloud-storage-application-keys)). A leaked key can add versions or hide files, but can't destroy history. |
| `PHOTOS_CRYPT_PASSWORD`, `PHOTOS_CRYPT_SALT` | secret | Long random values for rclone crypt. **Also keep them offline.** Losing them makes the photo backup unreadable. |
| `BACKUP_HEARTBEAT_URL` | secret | A dead-man's switch: Sentry Cron Monitor (1 is free) or Healthchecks.io. |
| `AGE_RECIPIENTS` | **variable** (public) | One or two `age1…` public keys. The private keys never go to GitHub. |
| `B2_BUCKET`, `SUPABASE_PUBLISHABLE_KEY`, `KEEPALIVE_TABLE` | variables | Public values. |

**Hygiene:**
- Set `permissions: contents: read`.
- No `actions/checkout`; the job needs no repo code.
- Use `umask 077` and no `set -x`.
- Pin third-party actions by commit SHA.
- Never upload plaintext.

### Encrypting the dump (health data)
- **Use `age` with X25519 recipients.** Run `age-keygen -o dawnage-backup.key` on the iMac; age v1.3.2 ships a `darwin-amd64` build ([releases](https://github.com/FiloSottile/age/releases/tag/v1.3.2), 2026-08-29).
  - Put the **public** key in `AGE_RECIPIENTS`.
  - Keep the private key in a password manager **plus** one offline copy (USB or paper).
  - Optionally add a second recipient key held by a trusted second person, so losing one key isn't fatal.
- **Why not symmetric gpg:** the passphrase would have to live in CI. With age, a compromise of CI or of the storage account can't decrypt old backups. CI already holds DB credentials, so it adds no new read exposure for *current* data.
- **Photos use rclone `crypt` (symmetric, encrypts names and content).** The CI that holds the crypt password already holds the S3 keys to the live photos, so symmetric encryption adds no new exposure. It does protect against a breach of the B2 account itself.

### Where to keep backups

| Option | Free allowance | Verdict |
|---|---|---|
| **GitHub artifacts** | **500 MB** artifact storage on GitHub Free, billed as GB-hours. Retention is 1–**400 days** for private repos, default 90 ([billing doc](https://docs.github.com/en/billing/concepts/product-billing/github-actions); [retention settings](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository)). | **Secondary only**, 7-day copy of the encrypted DB dump (a few MB). Too small for photos. Anyone with write access can delete it, and it's tied to one account. |
| **Private repo commits** | Repos should be "ideally less than 1 GB"; files over 100 MiB are blocked. "Git is not designed to handle large SQL files" ([GitHub large files](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github)). | **No.** Encrypted blobs don't delta-compress, and history only grows. |
| **Backblaze B2** | First **10 GB free**, "Free 3x monthly egress", "Class A, B, and C API calls are free" ([pricing](https://www.backblaze.com/cloud-storage/pricing)). Sign-up "No credit card required" ([sign-up page](https://www.backblaze.com/sign-up/cloud-storage-v2)). Keys can be write-without-delete, and there are versioning and lifecycle rules. Regions are US West, US East, EU Central and CA East only — no APAC ([regions](https://www.backblaze.com/docs/cloud-storage-data-regions)). | **Recommended primary.** Data is client-side encrypted, so offshore storage is ciphertext only. Mention backups in the privacy policy. |
| **Cloudflare R2** | **10 GB-month**, 1M Class A, 10M Class B, **egress free** ([R2 pricing](https://developers.cloudflare.com/r2/pricing/)). It needs an "R2 subscription" checkout ([get started](https://developers.cloudflare.com/r2/get-started/)), in practice a payment method. Location hint **`oc` (Oceania)** is best effort ([data location](https://developers.cloudflare.com/r2/reference/data-location/)). **Bucket locks** stop deletes and overwrites for N days ([bucket locks](https://developers.cloudflare.com/r2/buckets/bucket-locks/)). Tokens are "Object Read & Write", which includes delete ([tokens](https://developers.cloudflare.com/r2/api/tokens/)). | **Good alternative** if keeping data in Oceania matters, or a Cloudflare account already exists. Use the S3 provider `Cloudflare`, endpoint `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`, region `auto`. Lock `db/` for 30 days. |

**Suggested B2 lifecycle rules** (bucket settings, or `b2 bucket update --lifecycle-rules`):
```json
[
  {"fileNamePrefix": "db/daily/",   "daysFromUploadingToHiding": 35, "daysFromHidingToDeleting": 1},
  {"fileNamePrefix": "db/monthly/", "daysFromUploadingToHiding": 95, "daysFromHidingToDeleting": 1},
  {"fileNamePrefix": "photos/",     "daysFromUploadingToHiding": null, "daysFromHidingToDeleting": 30}
]
```
- **Effect:**
  - DB dumps are kept at most about 95 days.
  - A deleted or replaced photo version disappears from backups 30 days after the next sync.
  - That supports an honest privacy-policy line: "deleted data is purged from backups within 90 days".
- **The pre-cleanup snapshot comes for free.** The first full mirror's versions are the snapshot: after the cleanup, the old versions stay for 30 days. Temporarily raise `photos/` to 45 days if verification needs longer.
- Expected B2 use is about 1–1.3 GB, against 10 GB free.

### GitHub Actions minutes (private repo)
- **GitHub Free includes "$12 USD" of compute per month,** "expressed as a monetary amount, not a fixed number of minutes". Linux 2-core is $0.006/min, so that is about **2,000 Linux minutes** ([billing doc](https://docs.github.com/en/billing/concepts/product-billing/github-actions)).
- **"If your account does not have a valid payment method on file, usage is blocked once you consume the included compute usage."** The existing `mobile.yml` CI (30-min timeout) shares that budget. **Heavy CI could silently stop backups.** Hence the heartbeat. Optionally add a payment method with a small budget.
- **Estimate for this job:** about 4–6 min/day, plus about 8 min on Sundays for the drill. That is about 160–220 min/month, roughly $1–1.30 of the $12.
- **Scheduled runs can be delayed or dropped.** "The schedule event can be delayed during periods of high loads… some queued jobs may be dropped." Schedule off the hour.
  - `timezone:` is supported: `cron: '17 3 * * *'` with `timezone: "Australia/Sydney"`.
  - Auto-disable after 60 days applies only to *public* repos.

### Backing up Storage objects
- **Recommended: rclone over the S3 endpoint.** Supabase S3 implements `ListObjectsV2`, `GetObject`, `HeadObject` and others ([compatibility](https://supabase.com/docs/guides/storage/s3/compatibility)).
  - Endpoint: `https://hzifwkebzhzlxvigbcup.storage.supabase.co/storage/v1/s3`.
  - Region: `ap-southeast-2`.
  - Use path-style addressing.
  - Use **`--s3-list-version 2`**, per Supabase's [rclone KB](https://supabase.com/kb/troubleshooting/rclone-error-s3-protocol-error-received-listing-v1-with-istruncated-set-no-nextmarker-and-no-contents-e64d34).
- **Why rclone:**
  - It's incremental (`--size-only` suits immutable paths, and avoids per-object HEAD requests).
  - It's cheap: only new objects count as egress, about 33 MB/month.
  - The first run downloads about 0.93 GB once, roughly 19% of the 5 GB monthly uncached egress.
- **Guard rails:**
  - `--max-delete 50` stops an empty or failed listing from hiding the whole mirror. Override it once for the planned orphan cleanup.
  - **Never** run `rclone sync` with Supabase as the destination.
- **Alternative: supabase-js `storage.from(b).list()` plus `download()` with the secret key.** It is the same power with more code. The docs' migration script uses it ([backup-restore guide](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)). `supabase storage cp -r ss:///bucket … --experimental --remote` also works ([KB](https://supabase.com/docs/guides/troubleshooting/restore-project-after-90-days-pause)).

### Restore procedure (no Docker needed on the iMac)
Two drill levels:
- **Automated (weekly, in CI).** The Sunday run restores that night's *plaintext* dump, before encryption and on the same runner, into a throwaway local stack (`supabase start`; Docker is on GitHub runners). It then compares row counts with production. This proves that dumps are restorable.
- **Manual (quarterly, and before any destructive cleanup).** Tests the full path: download, decrypt, restore into a second free Supabase project.

**Tools on the 2015 iMac (macOS 12):**
- **psql:** [Postgres.app v2.9.7 "PostgreSQL 17"](https://postgresapp.com/downloads.html), which requires macOS 10.15, so 12 is fine. It provides `/Applications/Postgres.app/Contents/Versions/17/bin/psql`.
  - Homebrew lists macOS 11–14 as "unsupported but may work" ([brew docs](https://docs.brew.sh/Installation)).
  - The Supabase CLI on darwin-x64 runs pg_dump in Docker (CLI source `bundled-postgres-client.ts`: native only on darwin-arm64 and linux), so **don't run dumps locally**.
- **age:** `darwin-amd64`. **rclone:** `osx-amd64` (v1.75.2).

**Steps:**
1. **Get the file and decrypt it:**
   - `rclone copy b2:<bucket>/db/daily/dawnage-db-<STAMP>.tar.gz.age .` (or download in the B2 web UI).
   - `age -d -i ~/secure/dawnage-backup.key dawnage-db-<STAMP>.tar.gz.age | tar -xzf - -C restore/`
   - `shasum -a 256 -c` against the `.sha256` file.
2. **Target:**
   - **Drill:** a new **free** project `dawnage-restore-drill` in ap-southeast-2 on PG17. The Free org allows 2 active projects; AuxiDesk is paused.
   - **Real disaster:** decide between that new project and wiping prod (see step 9).
3. **Prepare the target:**
   - Enable the same extensions. Today these are `pgcrypto`, `uuid-ossp`, `pg_stat_statements` and `supabase_vault`, which are mostly default.
   - Then revoke default grants so the dump's privileges win ([CLI reference](https://supabase.com/docs/reference/cli/supabase-db-dump)):
   ```sql
   ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES    FROM anon, authenticated;
   ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
   ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
   ```
4. **Restore the DB.** Use the target's **session pooler** URL. Commands are from the backup-restore guide:
   ```bash
   PSQL=/Applications/Postgres.app/Contents/Versions/17/bin/psql
   $PSQL --single-transaction --variable ON_ERROR_STOP=1 \
     --file restore/roles.sql --file restore/schema.sql \
     --command 'SET session_replication_role = replica' \
     --file restore/data.sql --dbname "$DRILL_DB_URL"
   $PSQL --variable ON_ERROR_STOP=1 --file restore/managed_customizations.sql --dbname "$DRILL_DB_URL"
   $PSQL --single-transaction --variable ON_ERROR_STOP=1 \
     --file restore/history_schema.sql --file restore/history_data.sql --dbname "$DRILL_DB_URL"
   ```
   **Known fixes from the guide:**
   - Comment out `ALTER ... OWNER TO "supabase_admin"` lines.
   - Comment out the `GRANT "postgres" TO "cli_login_postgres"` line.
5. **Restore photos.**
   - The `storage.buckets` and `storage.objects` rows came back with `data.sql`.
   - Create S3 keys on the **drill** project and define a `drill:` S3 remote.
   - `rclone copy photos: drill:progress_photos --s3-list-version 2`. The `photos:` remote is the crypt remote over `b2:<bucket>/photos`, using the offline crypt password and salt. Use `copy`, never `sync`.
   - Verify in the drill that PutObject over an existing metadata row behaves as an upsert.
6. **Re-apply what isn't in dumps:**
   - Auth URL config, providers, SMTP and templates. Export them now and quarterly with a **scoped PAT** (Auth Config: Read) from `GET /v1/projects/{ref}/config/auth` and age-encrypt the result ([scoped PATs](https://supabase.com/docs/guides/platform/personal-access-tokens)).
   - Edge Functions: `supabase functions deploy delete-account --remote=<new_ref>` from the repo, plus their secrets.
   - Realtime publications, the Vault root key if Vault is used, n8n credentials.
7. **Verify:**
   - Row counts against `rowcounts.txt` from the tarball.
   - Log in as a test user. Password hashes are restored; old sessions and JWTs are not valid, so users sign in again.
   - Open a photo in a coach view.
8. **Clean up.** **Delete the drill project afterwards.** It holds real health data.
9. **A real disaster on a new project means a new URL and keys.**
   - The mobile build embeds `EXPO_PUBLIC_SUPABASE_URL`, so it needs an OTA update or store build. **That is a reason to ship expo-updates in build 1.**
   - Custom domains, which would hide this, are a paid add-on.
   - **If the original project still exists,** for example after data corruption, restore into the drill project and copy back only the affected tables.

**Neon as a test target:** Free gives 1 GB/project, no card, 10 branches ([Neon pricing, page updated 2026-11-04](https://neon.com/pricing)). It is **not recommended for the drill**:
- Supabase roles (`anon`, `authenticated`, `service_role`, `supabase_admin`) are missing, as are the `auth` and `storage` schemas and `auth.uid()`.
- So `schema.sql` would fail without hand-made stubs.
- It's only useful as a last-resort "can I read the public tables" target.

**RPO/RTO on this setup:**
- **RPO** is up to 24 h.
- **RTO** is about 1–3 h for the DB plus photos into a new project; app re-pointing is the long pole.
- Pro's daily backups give the same 24 h RPO, with a one-click restore into the *same* project.

---

## 3. Avoiding the inactivity pause

**Is the scheduled backup enough activity?** Probably, but it's not guaranteed.
- A pg_dump through Supavisor is a real client session issuing queries, which is "user database activity".
- But Supabase publishes neither the signals nor the thresholds, and the KB stresses "real requests from your app".
- So the Appendix A job also makes one tiny Data API read (`GET /rest/v1/<table>?select=id&limit=1` with the publishable key). This covers the "making API calls to your project" path the docs name.
- The n8n automation already writes daily through the API (608 service_role inserts in `daily_check_ins`, from the 2026-11-27 notes). After launch, real app traffic does the job except in holiday lulls.

**What the policy and ToS say about keep-alive pings:**
- [ToS](https://supabase.com/terms), Use Restrictions §2(c): no clause about pausing, inactivity or keep-alive. It forbids things like bypassing security devices.
- [AUP, "Version 1 — June 1, 2026"](https://supabase.com/aup): no mention either. §1.1 forbids use that "materially degrades, disrupts, or interferes", which one or two requests a day can't do.
- The **Project Pausing doc explicitly suggests** "making API calls to your project" to prevent a pause, so modest pings aren't prohibited.

**Honest caveats:**
- Supabase can change the heuristic at any time.
- The KB says it "isn't a guarantee" and recommends upgrading "if people rely on what you're building".
- The real safety net is the **warning email about a week before**. Make sure the owner's account email is monitored and filtered as important.
- A pause doesn't lose data: it's restorable for 1 year. It does take the whole app offline until someone clicks Resume.

---

## 4. Logs beyond 1 day without Pro

| Option | Free? | What it gives | Recommendation |
|---|---|---|---|
| **In-DB write-audit table** (trigger) | Yes. It lives in the DB and uses a few MB a year of the 500 MB. | Who wrote what and when, forever: API role, `auth.uid()`, user-agent and `x-client-info`, direct-SQL `application_name`. **This identifies the unknown service_role / n8n writer.** | **Do it.** SQL sketch in Appendix B. Attach it to the write-heavy and security-relevant tables. |
| **Auth audit to DB** | Yes | Toggle "Write audit logs to the database" under Authentication, Audit Logs. Events then persist in `auth.audit_log_entries` ([Auth audit logs](https://supabase.com/docs/guides/auth/audit-logs)). | **Turn on**, and prune at 180 days. |
| **Sentry Developer (free)** | Yes | 1 user, **5k errors, 5 GB logs**, 5M spans, **1 cron monitor, 1 uptime monitor**, **30-day lookback** ([Sentry pricing](https://sentry.io/pricing/)). Supabase has an Edge Functions guide ([Monitoring with Sentry](https://supabase.com/docs/guides/functions/examples/sentry-monitoring)). | **Do it** for mobile, web and `delete-account`. Use the cron monitor as the backup heartbeat. Keep PII scrubbing on. |
| **Archive platform logs via the Management API** | Yes. 100 GB of log queries are included. | `GET /v1/projects/{ref}/analytics/endpoints/logs` takes ClickHouse SQL and a range of **≤ 24 h** ([API ref](https://supabase.com/docs/reference/api/v1-get-project-logs)). The Logs Explorer caps runs at 1000 rows ([log querying](https://supabase.com/docs/guides/observability/advanced-log-filtering)). Use a **scoped PAT** with only Logs: Read on this project. `logs.all` now returns 410. | **Optional.** A daily job could pull `edge_logs` writes and errors, `auth_audit_logs` and `function_logs` for the last 24 h, then gzip, age-encrypt and upload to B2. First check the query in Logs Explorer: ClickHouse has been the default since June 2026, and this project dates from 2025-11, so it may still be on BigQuery. |
| **pgaudit** | Available (17.0) | It writes to Postgres *logs*: only 1 day of retention, and it eats into the 1 GB log-ingest quota. | **No** on Free. |
| **Metrics API** (Prometheus) | **Not on Free** | Pricing table: "Metrics endpoint: Not included in free". The [Elastic integration](https://www.elastic.co/docs/reference/integrations/supabase) says "The Metrics API and Log Drains are not available on the Free tier". The [Supabase Metrics doc](https://supabase.com/docs/guides/telemetry/metrics) says "Every Supabase project exposes" it, and is ambiguous. | Treat it as Pro-only. If needed, test the status code only, without printing secrets: `curl -s -o /dev/null -w '%{http_code}\n' --user "service_role:$SB_SECRET" https://hzifwkebzhzlxvigbcup.supabase.co/customer/v1/privileged/metrics` |
| **Log drains** | Not on Free | — | Not until Pro, and probably not even then ($60/mo). |

**Reading the audit table:** in PostgREST, `current_setting('request.headers', true)::json->>'user-agent'`, `request.jwt.claims`, `request.method` and `request.path` are set per request ([PostgREST docs](https://docs.postgrest.org/en/stable/references/transactions.html)).
- **`request.headers` also contains `authorization` and `apikey`.** The trigger must whitelist headers and **never store the full JSON**, or it would copy service_role keys into the table.
- Direct-SQL writers (an n8n Postgres node through the pooler) have no `request.*` settings. They show up as `session_user = postgres`, with whatever `application_name` the client sets.

---

## 5. Storage headroom without Pro

### Cleanup math
Numbers are from media_timeseries_health.md, Q2 (live SQL 2026-11-27).
- **Now:** 927,962,420 B = 884.97 MiB = **0.928 GB** (decimal) = 0.864 GiB. Whether Supabase's "1 GB" means 10⁹ B or 2³⁰ B isn't stated, so headroom is one of:
  - 10⁹ B: 92.8% used, 68.7 MiB left. **About 2.2 months at 31.7 MiB/month, crossing about early Feb 2027.**
  - GiB: 86.4% used, 139 MiB left. **About 4.4 months, about mid-April 2027.**
  - GB-hour averaging delays the crossing slightly, but also delays any recovery.
- **Cleanup (after the first full backup, early in a billing cycle):**
  1. Delete the 285 orphans through the Storage API: −139 MiB (92 MiB of them legacy). That leaves 746 MiB.
  2. Re-encode the 336 legacy non-orphans (532 MiB) to about 200 KB each, about 66 MiB: −466 MiB. **That leaves about 280 MiB (0.29 GB, about 29% of quota).** It also removes the possible GPS EXIF in the legacy originals.
  3. Lock the bucket to `image/jpeg,image/webp` and ≤ 2 MB, and fix the replace-without-delete leak. About 17% of uploads become orphans, so growth falls to about 26 MiB/month.
- **Runway after cleanup to 10⁹ B (953.7 MiB):**
  - about **21 months** at 31.7 MiB/month;
  - about 26 months with the leak fixed;
  - about 11 months if launch doubles uploads;
  - **about 2–4 months** if, say, 50–100 clients each do a weekly 4-photo check-in. At about 200 KB per photo that is ≈ 3.5 MB per client-month, 175–350 MB/month.
  - Today's real rate is ≈ 0.94 MB per active uploader-month.
- **Egress check:** the photo egress sample was ≈ 1.85 GB/month, ~98% uncached (one-day sample). Add about 0.3 GB/month for dumps and about 0.03 GB/month for photo sync, plus 0.93 GB once. That is comfortably under 5 GB now, but it scales with clients.

### R2 for primary photo storage, vs staying on Supabase Storage

| | Stay on Supabase Storage (after cleanup) | Move to Cloudflare R2 |
|---|---|---|
| Free capacity | 1 GB storage, 5 GB egress | 10 GB-month, 1M writes, 10M reads, **$0 egress** |
| Privacy / authz | **RLS on `storage.objects`** stays the single authorization layer, already hardened (private bucket, path regex). Account deletion already removes objects. | Authz moves to an **Edge Function**. It must re-implement "owner or assigned coach" in code, then mint presigned GET/PUT URLs (max 7 days; they only work on the `<account>.r2.cloudflarestorage.com` S3 domain, not custom domains, per [R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)). A bug there is a data leak. Account deletion must also delete in R2. Cloudflare becomes a new subprocessor; residency is the `oc` hint, best effort only. |
| Complexity | None new | Edge Function plus R2 token secret, CORS for the web dashboard, migrating 1,691 objects and DB paths, mobile and web upload/view changes, two systems to back up and monitor, a Cloudflare billing account. Roughly 2–4 dev days plus ongoing operations. |
| Cost later | Pro $25/mo gives 100 GB + 250 GB egress (and backups, no pausing…) | $0.015/GB-month over 10 GB; Edge Function calls fit inside 500k |

**Recommendation:**
- **Stay on Supabase Storage. Clean up now, after the first backup, and upgrade to Pro at launch.**
- **Use R2 or B2 only as the *backup* target.** That gets the free-storage benefit with none of the authz risk.
- R2 as primary storage only makes sense at photo egress far above Pro's 250 GB/month, which is nowhere near this app's scale.

---

## 6. When Pro becomes genuinely necessary (concrete triggers)

Upgrade when **any one** of these fires:
1. **Business trigger:** the first paying client depends on the app in production, i.e. store build 1 goes public. This is the main trigger. A pause on a quiet week, or an org-wide 402, is an outage that support can't fix on Free.
2. **Any Fair Use or grace-period email**, for any quota. The next breach gets no grace period.
3. **Any pause-warning email** after launch.
4. **Storage:** cycle-average bucket ≥ **0.8 GB**, or projected to cross 1 GB within 60 days. (After cleanup, this is unlikely before launch.)
5. **Egress:** uncached ≥ **3.5 GB**, or cached ≥ 3.5 GB, in any cycle. Check Usage weekly.
6. **DB:** ≥ 350 MB (far off), or disk ≥ 80% of the fixed 2 GB, for example from WAL during bulk jobs.
7. **Realtime:** ≥ 140 peak concurrent connections, once chat or notifications use Realtime.
8. **Capability needs:**
   - a staging **branch** ($0.01344/branch-hour ≈ $9.81/month if persistent);
   - **PITR** ($100/mo per 7 days), only if a 24 h RPO is unacceptable;
   - **7-day logs** for investigating client-reported incidents;
   - the **Metrics endpoint** for alerting;
   - **email support**;
   - **leaked-password protection** and session timeouts;
   - a **custom domain** ($10/mo add-on) to decouple the apps from the project ref for DR.
9. **Not reasons to upgrade:**
   - **Uptime SLA.** Pro doesn't have one; it's Enterprise only ([SLA](https://supabase.com/sla)).
   - **Support SLA.** That's Team ($599/mo).
   - **HIPAA / SOC2.** That's Team and Enterprise.

**Cost:** Pro is $25/mo and includes $10 compute credit covering one Micro, so one project ≈ **$25/mo**. The spend cap is on by default, so there are no surprise overages.

---

## 7. Risks of staying on Free with paying coaching clients, and the recommendation

**Risks, most serious first:**
1. **Org-wide Fair Use restriction.**
   - It can mean 402 on *all* API requests: login, data, photos.
   - Usage is averaged, so you can't clean your way out mid-cycle.
   - Support "cannot extend grace periods".
   - Bounded only because upgrading lifts it immediately — if someone notices and acts.
2. **Inactivity pause.** The whole app is offline until a manual Resume. Activity thresholds are undisclosed and "isn't a guarantee". Holiday lulls are the danger window.
3. **No platform backups.**
   - DIY backups bring RPO to 24 h, but restore is manual and probably goes to a new project.
   - A new project means a new URL and keys, so the app needs an update.
4. **1-day logs.** A client complaint about "Monday's missing check-in" on Wednesday can't be investigated from platform logs. The audit table covers writes only.
5. **Community-only support.** No one to escalate to during an incident.
6. **Security features missing on Free:** leaked-password protection and session timeouts.
7. **Shared CPU / 500 MB RAM.** Fine for about 150 users. It's a ceiling during spikes, such as AI jobs or bulk imports.
8. **Single-founder failure mode.** Every mitigation above depends on the owner reading emails and acting within days.

**Honest recommendation, the cheapest safe path:**
1. **Now (pre-launch, $0):**
   1. Ship the Appendix A backup workflow to `main`. Run it once by hand.
   2. Do **one manual decrypt-and-restore drill** into a free drill project, then delete that project.
   3. Run the storage cleanup at the start of a billing cycle and set the bucket limits.
   4. Add the audit trigger and turn Auth audit-to-DB on.
   5. Set up Sentry Developer, with its cron monitor as the backup heartbeat.
   6. Move AuxiDesk out of the org.
   7. Check the Usage page weekly.
2. **At launch with paying clients: upgrade to Pro ($25/mo)** — that's under $1/day, less than one refunded session.
   - **Keep the DIY backups running.** Pro backups are on-platform, last 7 days and exclude photos.
3. **Upgrade earlier** if any §6 trigger fires.
4. **Don't plan to run a paid production service on Free with keep-alive pings.** It isn't prohibited, but Supabase positions Free against exactly this. The failure modes are full outages that support can't help with, and the saving is $300/yr.

---

## Open questions (for the owner)
1. What is the exact session-pooler host (`aws-0` vs `aws-1` `-ap-southeast-2`)? It's in the Dashboard Connect dialog.
2. **Does anything else use the DB password, such as n8n's Postgres node?** Resetting it to get a CI secret could break that writer. The audit trigger will show whether n8n writes over REST (service_role) or SQL.
3. Does Supabase's "1 GB" storage quota mean 10⁹ or 2³⁰ bytes? This decides whether there are about 2.2 or about 4.4 months before the quota is crossed. The Usage page percentage will show it.
4. When does the org's billing cycle reset, and is the billing email actually monitored?
5. Is the GitHub account on Free, and is there a payment method? Without one, Actions stop at $12, and backups could silently stop if CI uses it up.
6. Is Supabase Vault holding any secrets? If so, the root key must be exported with a scoped PAT while the project is alive. Dumps exclude `vault`.
7. **B2 or R2?** B2 needs no card but stores data in the US/EU/CA. R2 needs a card and has an Oceania hint. Both are client-side encrypted.
8. What backup retention should the privacy policy state? The suggested lifecycle gives ≤ 95 days for DB dumps and ≤ 30 days after deletion for photos.
9. What are the launch date and expected paying-client count over the first 3 months? These drive the storage and egress projections and the Pro date.
10. Verify on the first run:
    - that CLI v3 `db dump --remote=<url>` runs in an empty working dir without `supabase/config.toml`;
    - the CLI v3 `supabase start` service names for `-x`.
11. Is this project's Logs Explorer on ClickHouse or still BigQuery? This only matters for the optional log-archive job.
12. Is the Metrics endpoint really blocked for this Free project? A one-line status-code test answers it.

---

## Appendix A: GitHub Actions workflow sketch (`.github/workflows/backup.yml`)

> **SKETCH — not committed, not run.**
> - Review it.
> - Pin each `uses:` to a commit SHA.
> - Create the `backup` Environment, its secrets and its variables (see §2).
> - Merge to `main`; schedules only run from the default branch.
> - Run it once with `workflow_dispatch` and read every log line.
>
> Versions checked 2026-11-28: supabase CLI **3.4.0** (2026-11-24), `supabase/setup-cli@v3`, rclone **v1.75.2** (2026-10-09), Postgres client 17 from PGDG. age comes from Ubuntu apt.

```yaml
name: Off-site backup (DB + Storage)

on:
  schedule:
    - cron: '17 3 * * *'               # 03:17 every night
      timezone: 'Australia/Sydney'     # off the hour: GitHub may delay/drop top-of-hour runs
  workflow_dispatch:
    inputs:
      restore_drill:
        description: 'Run the restore drill on this run'
        type: boolean
        default: false
      max_delete:
        description: 'rclone --max-delete for the photo mirror (raise once for the planned orphan cleanup)'
        type: string
        default: '50'

permissions:
  contents: read

concurrency:
  group: offsite-backup
  cancel-in-progress: false

jobs:
  backup:
    runs-on: ubuntu-24.04
    timeout-minutes: 40
    environment: backup               # secrets live here; restrict the environment to the main branch
    env:
      PROJECT_REF: hzifwkebzhzlxvigbcup
      BUCKET_ID: progress_photos
      RCLONE_VERSION: v1.75.2
      # rclone remotes are configured entirely by env (no config file on disk)
      RCLONE_CONFIG_SUPA_TYPE: s3
      RCLONE_CONFIG_SUPA_PROVIDER: Other
      RCLONE_CONFIG_SUPA_ENDPOINT: https://hzifwkebzhzlxvigbcup.storage.supabase.co/storage/v1/s3
      RCLONE_CONFIG_SUPA_REGION: ap-southeast-2
      RCLONE_CONFIG_SUPA_FORCE_PATH_STYLE: 'true'
      RCLONE_CONFIG_SUPA_LIST_VERSION: '2'           # Supabase KB: rclone needs ListObjectsV2
      RCLONE_CONFIG_SUPA_ACCESS_KEY_ID: ${{ secrets.SUPABASE_S3_KEY_ID }}
      RCLONE_CONFIG_SUPA_SECRET_ACCESS_KEY: ${{ secrets.SUPABASE_S3_SECRET }}
      RCLONE_CONFIG_B2_TYPE: b2
      RCLONE_CONFIG_B2_ACCOUNT: ${{ secrets.B2_KEY_ID }}
      RCLONE_CONFIG_B2_KEY: ${{ secrets.B2_APP_KEY }}  # bucket-restricted, no deleteFiles
      RCLONE_CONFIG_PHOTOS_TYPE: crypt
      RCLONE_CONFIG_PHOTOS_REMOTE: b2:${{ vars.B2_BUCKET }}/photos
    steps:
      - name: Install age, psql 17 and rclone (pinned)
        run: |
          set -euo pipefail
          sudo apt-get update -qq
          sudo apt-get install -y -qq age postgresql-common unzip
          sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh -y
          sudo apt-get install -y -qq postgresql-client-17
          cd "$RUNNER_TEMP"
          curl -fsSLO "https://downloads.rclone.org/${RCLONE_VERSION}/rclone-${RCLONE_VERSION}-linux-amd64.zip"
          curl -fsSL  "https://downloads.rclone.org/${RCLONE_VERSION}/SHA256SUMS" \
            | grep " rclone-${RCLONE_VERSION}-linux-amd64.zip$" | sha256sum -c -
          unzip -q "rclone-${RCLONE_VERSION}-linux-amd64.zip"
          sudo install "rclone-${RCLONE_VERSION}-linux-amd64/rclone" /usr/local/bin/rclone
          age --version; psql --version; rclone version | head -1

      - uses: supabase/setup-cli@v3        # pin to a SHA
        with:
          version: 3.4.0                   # CLI v3: always pass --remote (default target is LOCAL)

      - name: Decide whether this run includes the restore drill
        run: |
          if [ "$(TZ=Australia/Sydney date +%u)" = "7" ] || [ "${{ inputs.restore_drill }}" = "true" ]; then
            echo "DRILL=true" >> "$GITHUB_ENV"
          fi
          echo "STAMP=$(date -u +%Y-%m-%dT%H%MZ)" >> "$GITHUB_ENV"

      - name: Dump database (roles, schema, data, migration history, managed customisations)
        env:
          DB_URL: ${{ secrets.SUPABASE_DB_URL }}   # session pooler, port 5432 (runners are IPv4-only)
        working-directory: ${{ runner.temp }}
        run: |
          set -euo pipefail
          umask 077
          mkdir -p out && cd out
          # Exact row counts first (table names + counts only; no row data)
          psql "$DB_URL" -X -q -At -F '|' -v ON_ERROR_STOP=1 > rowcounts.txt <<'SQL'
          select format('select %L, count(*) from %I.%I;', n.nspname||'.'||c.relname, n.nspname, c.relname)
          from pg_class c join pg_namespace n on n.oid = c.relnamespace
          where c.relkind in ('r','p')
            and (n.nspname = 'public'
                 or (n.nspname, c.relname) in (('auth','users'),('auth','identities'),('storage','objects'),('storage','buckets')))
          order by 1
          \gexec
          SQL
          supabase db dump --remote="$DB_URL" --role-only -f roles.sql
          supabase db dump --remote="$DB_URL" -f schema.sql
          supabase db dump --remote="$DB_URL" --data-only --use-copy \
            -x "storage.buckets_vectors" -x "storage.vector_indexes" -f data.sql
          supabase db dump --remote="$DB_URL" --schema supabase_migrations -f history_schema.sql
          supabase db dump --remote="$DB_URL" --data-only --use-copy --schema supabase_migrations -f history_data.sql
          # RLS policies + user triggers on Supabase-managed schemas are NOT in schema.sql
          psql "$DB_URL" -X -q -At -v ON_ERROR_STOP=1 > managed_customizations.sql <<'SQL'
          select '-- policies on managed schemas';
          select format('DROP POLICY IF EXISTS %I ON %I.%I;' || E'\n' ||
                        'CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s%s%s;',
                        policyname, schemaname, tablename,
                        policyname, schemaname, tablename, permissive, cmd,
                        array_to_string(array(select quote_ident(r) from unnest(roles) r), ', '),
                        coalesce(' USING (' || qual || ')', ''),
                        coalesce(' WITH CHECK (' || with_check || ')', ''))
          from pg_policies
          where schemaname in ('auth','storage','realtime')
          order by schemaname, tablename, policyname;
          select '-- user triggers on managed tables (function outside managed schemas)';
          select format('DROP TRIGGER IF EXISTS %I ON %I.%I;', t.tgname, n.nspname, c.relname)
                 || E'\n' || pg_get_triggerdef(t.oid) || ';'
          from pg_trigger t
          join pg_class c      on c.oid = t.tgrelid
          join pg_namespace n  on n.oid = c.relnamespace
          join pg_proc p       on p.oid = t.tgfoid
          join pg_namespace pn on pn.oid = p.pronamespace
          where not t.tgisinternal
            and n.nspname  in ('auth','storage','realtime')
            and pn.nspname not in ('auth','storage','realtime')
          order by 1;
          SQL
          # Sanity: files exist, are non-trivial, and the key data is present
          for f in roles.sql schema.sql data.sql; do test -s "$f"; done
          grep -q 'COPY "auth"."users"' data.sql
          grep -q 'COPY "public"\.' data.sql
          grep -q 'on_auth_user_created' managed_customizations.sql || echo "::warning::auth.users trigger not found"
          ls -l

      - name: Encrypt (age, public-key recipients only) and checksum
        working-directory: ${{ runner.temp }}
        env:
          AGE_RECIPIENTS: ${{ vars.AGE_RECIPIENTS }}   # space-separated age1... public keys
        run: |
          set -euo pipefail
          umask 077
          R=(); for k in $AGE_RECIPIENTS; do R+=(-r "$k"); done
          F="dawnage-db-${STAMP}.tar.gz.age"
          tar -C out -czf - . | age "${R[@]}" -o "$F"
          sha256sum "$F" > "$F.sha256"
          echo "DB_FILE=$F" >> "$GITHUB_ENV"

      - name: Upload DB backup to B2 (daily; plus monthly on the 1st)
        working-directory: ${{ runner.temp }}
        run: |
          set -euo pipefail
          rclone copyto "$DB_FILE"        "b2:${{ vars.B2_BUCKET }}/db/daily/$DB_FILE"
          rclone copyto "$DB_FILE.sha256" "b2:${{ vars.B2_BUCKET }}/db/daily/$DB_FILE.sha256"
          if [ "$(TZ=Australia/Sydney date +%d)" = "01" ]; then
            rclone copyto "$DB_FILE"        "b2:${{ vars.B2_BUCKET }}/db/monthly/$DB_FILE"
            rclone copyto "$DB_FILE.sha256" "b2:${{ vars.B2_BUCKET }}/db/monthly/$DB_FILE.sha256"
          fi

      - name: Secondary copy as a short-lived GitHub artifact (encrypted file only)
        uses: actions/upload-artifact@v4        # pin to a SHA
        with:
          name: db-backup-${{ env.STAMP }}
          path: |
            ${{ runner.temp }}/dawnage-db-*.tar.gz.age
            ${{ runner.temp }}/dawnage-db-*.tar.gz.age.sha256
          retention-days: 7
          if-no-files-found: error

      - name: Mirror the photo bucket into an encrypted B2 prefix (incremental)
        env:
          CRYPT_PW:   ${{ secrets.PHOTOS_CRYPT_PASSWORD }}
          CRYPT_SALT: ${{ secrets.PHOTOS_CRYPT_SALT }}
        run: |
          set -euo pipefail
          export RCLONE_CONFIG_PHOTOS_PASSWORD="$(rclone obscure "$CRYPT_PW")"
          export RCLONE_CONFIG_PHOTOS_PASSWORD2="$(rclone obscure "$CRYPT_SALT")"
          # Source is ALWAYS supa:, destination ALWAYS photos:. Never reverse this.
          # Deletions become B2 "hidden" versions (key has no deleteFiles); lifecycle purges them after 30 days.
          rclone sync "supa:${BUCKET_ID}" photos: \
            --size-only --fast-list --transfers 4 --checkers 8 \
            --max-delete "${{ inputs.max_delete || '50' }}" \
            --stats-one-line -v
          rclone size photos: --fast-list

      - name: Keep-alive Data API read (cheap; covers the "API calls" activity path)
        run: |
          curl -fsS -o /dev/null -m 15 \
            -H "apikey: ${{ vars.SUPABASE_PUBLISHABLE_KEY }}" \
            "https://${PROJECT_REF}.supabase.co/rest/v1/${{ vars.KEEPALIVE_TABLE }}?select=id&limit=1" \
            || echo "::warning::keep-alive request failed"

      - name: Restore drill into a throwaway local stack (Sundays / on demand; runs AFTER uploads so a drill failure never skips a backup)
        if: env.DRILL == 'true'
        working-directory: ${{ runner.temp }}
        run: |
          set -euo pipefail
          mkdir -p drill && cd drill
          supabase init                       # verify v3 flags on first run (non-interactive)
          # keep DB + auth + storage migrations; drop UI/edge/log services (verify names: supabase start --help)
          supabase start -x studio,imgproxy,mailpit,edge-runtime,logflare,vector,realtime,postgres-meta,supavisor
          DRILL_URL="$(supabase status -o env | sed -n 's/^DB_URL="\{0,1\}\([^"]*\)"\{0,1\}$/\1/p')"
          O="$RUNNER_TEMP/out"
          psql "$DRILL_URL" -X -v ON_ERROR_STOP=1 -c "
            ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES    FROM anon, authenticated;
            ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
            ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;"
          psql "$DRILL_URL" -X --single-transaction -v ON_ERROR_STOP=1 \
            -f "$O/roles.sql" -f "$O/schema.sql" \
            -c 'SET session_replication_role = replica' -f "$O/data.sql"
          psql "$DRILL_URL" -X -v ON_ERROR_STOP=1 -f "$O/managed_customizations.sql"
          psql "$DRILL_URL" -X -q -At -F '|' -v ON_ERROR_STOP=1 > drill_rowcounts.txt <<'SQL'
          select format('select %L, count(*) from %I.%I;', n.nspname||'.'||c.relname, n.nspname, c.relname)
          from pg_class c join pg_namespace n on n.oid = c.relnamespace
          where c.relkind in ('r','p')
            and (n.nspname = 'public'
                 or (n.nspname, c.relname) in (('auth','users'),('auth','identities'),('storage','objects'),('storage','buckets')))
          order by 1
          \gexec
          SQL
          # Fail if any table that has rows in prod restored empty; report drift (writes during dump are normal)
          join -t'|' <(sort "$O/rowcounts.txt") <(sort drill_rowcounts.txt) | awk -F'|' '
            $2 > 0 && $3 == 0 { print "::error::EMPTY AFTER RESTORE: " $1; bad = 1 }
            $2 != $3          { print "count drift: " $1 " prod=" $2 " restored=" $3 }
            END { exit bad }'
          supabase stop --no-backup

      - name: Remove plaintext dump from the runner
        if: always()
        working-directory: ${{ runner.temp }}
        run: rm -rf out drill

      - name: Heartbeat OK
        if: success()
        run: curl -fsS -m 10 --retry 3 "${{ secrets.BACKUP_HEARTBEAT_URL }}" > /dev/null
      - name: Heartbeat FAIL
        if: failure()
        run: curl -fsS -m 10 --retry 3 "${{ secrets.BACKUP_HEARTBEAT_URL }}/fail" > /dev/null || true
        # /fail is the Healthchecks.io convention; for a Sentry cron monitor use its check-in URL with ?status=error
```

**First-run checklist:**
1. Make B2 lifecycle rules (§2) and the bucket-restricted key *before* the first run.
2. Make the first run a `workflow_dispatch`. It downloads the whole bucket once, about 0.93 GB of egress.
3. Download that night's `.age` file to the iMac and decrypt it with the offline key. Check `rowcounts.txt`.
4. Do the full drill into a free drill project (§2), then delete the drill project.
5. Only then do the storage cleanup, using a one-off `workflow_dispatch` with `max_delete=400` for the sync after the cleanup.
6. Confirm the heartbeat alerts by temporarily breaking a secret.

---

## Appendix B: audit-trigger SQL sketch (not applied; ship through the normal migration path and pgTAP)

```sql
-- Private schema: not in the Data API's exposed schemas, no grants to API roles.
create schema if not exists audit;
revoke all on schema audit from public, anon, authenticated;

create table audit.write_log (
  id           bigint generated always as identity primary key,
  at           timestamptz not null default now(),
  tbl          text not null,
  op           text not null check (op in ('INSERT','UPDATE','DELETE')),
  row_id       text,
  changed_cols text[],        -- UPDATE only: column NAMES, never values (no health data duplicated)
  api_role     text,          -- JWT role on Data API calls: anon / authenticated / service_role
  auth_uid     uuid,          -- JWT sub (null for service_role and direct SQL)
  db_user      text not null, -- session_user: 'authenticator' = Data API, 'postgres' = direct/pooler SQL
  app_name     text,          -- application_name (direct-SQL clients such as an n8n Postgres node)
  user_agent   text,
  client_info  text,          -- x-client-info (supabase-js flavour/version: mobile vs web vs node)
  method       text,
  path         text,
  caller_ip    inet           -- recorded ONLY for service_role / direct SQL, never for end users
);
alter table audit.write_log enable row level security;   -- no policies: invisible to API roles
create index write_log_at_idx      on audit.write_log (at);
create index write_log_tbl_at_idx  on audit.write_log (tbl, at);

create or replace function audit.log_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  hdr    jsonb;
  claims jsonb;
  r_new  jsonb;
  r_old  jsonb;
  role_  text;
begin
  begin  -- an audit failure must never block the user's write
    hdr    := nullif(current_setting('request.headers', true), '')::jsonb;      -- whitelist below; NEVER store hdr whole (contains apikey/authorization)
    claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
    role_  := claims ->> 'role';
    if tg_op <> 'DELETE' then r_new := to_jsonb(new); end if;
    if tg_op <> 'INSERT' then r_old := to_jsonb(old); end if;

    insert into audit.write_log
      (tbl, op, row_id, changed_cols, api_role, auth_uid, db_user, app_name,
       user_agent, client_info, method, path, caller_ip)
    values (
      tg_table_schema || '.' || tg_table_name,
      tg_op,
      coalesce(r_new ->> 'id', r_old ->> 'id'),
      case when tg_op = 'UPDATE' then
        array(select k from jsonb_object_keys(r_new) as k where r_new -> k is distinct from r_old -> k)
      end,
      role_,
      nullif(claims ->> 'sub', '')::uuid,
      session_user,
      nullif(current_setting('application_name', true), ''),
      left(hdr ->> 'user-agent', 300),
      left(hdr ->> 'x-client-info', 100),
      current_setting('request.method', true),
      left(current_setting('request.path', true), 200),
      case when role_ is null or role_ = 'service_role'
           then nullif(trim(split_part(coalesce(hdr ->> 'x-forwarded-for', ''), ',', 1)), '')::inet
      end
    );
  exception when others then
    raise warning 'audit.log_write failed on %.%: %', tg_table_schema, tg_table_name, sqlerrm;
  end;
  return null;  -- AFTER trigger
end;
$$;
revoke all on function audit.log_write() from public, anon, authenticated;

-- Attach to write-heavy / security-relevant tables (confirm the final list):
create trigger audit_write after insert or update or delete on public.daily_check_ins
  for each row execute function audit.log_write();
create trigger audit_write after insert or update or delete on public.users
  for each row execute function audit.log_write();
-- … weekly_check_ins, weekly_progress_photos, workout tables, packages/assignments

-- Retention (pg_cron 1.6.4 is available but not installed; or run monthly by hand):
-- select cron.schedule('audit-prune', '15 3 * * *',
--   $$ delete from audit.write_log where at < now() - interval '180 days' $$);

-- "Who is the unknown service_role writer of daily_check_ins?"
-- select api_role, db_user, app_name, user_agent, client_info, caller_ip, count(*), max(at)
-- from audit.write_log
-- where tbl = 'public.daily_check_ins' and at > now() - interval '30 days'
-- group by 1,2,3,4,5,6 order by 7 desc;
```

**Sizing:** about 200–300 bytes a row × about 100–300 writes a day ≈ 10–30 MB a year, against the 500 MB DB quota.

---

## Sources (all fetched 2026-11-28 unless dated)

**Supabase**
- [pricing](https://supabase.com/pricing) (undated)
- Usage docs:
  - [Egress](https://supabase.com/docs/guides/platform/manage-your-usage/egress)
  - [Storage size](https://supabase.com/docs/guides/platform/manage-your-usage/storage-size)
  - [MAU](https://supabase.com/docs/guides/platform/manage-your-usage/monthly-active-users)
  - [Edge Function invocations](https://supabase.com/docs/guides/platform/manage-your-usage/edge-function-invocations)
  - [Realtime messages](https://supabase.com/docs/guides/platform/manage-your-usage/realtime-messages)
  - [Realtime peak connections](https://supabase.com/docs/guides/platform/manage-your-usage/realtime-peak-connections)
  - [Logs ingest](https://supabase.com/docs/guides/platform/manage-your-usage/logs-ingest)
- [Logs usage-based pricing changelog](https://supabase.com/changelog/50925-logs-usage-based-pricing) (2026-09-25)
- [Billing FAQ / Fair Use](https://supabase.com/docs/guides/platform/billing-faq)
- [Database size](https://supabase.com/docs/guides/platform/database-size)
- [DB size changelog](https://supabase.com/changelog/33121-relaxing-database-size-limit-on-free-plan-0-5-gb-database-size-per-project) (2025-01-27)
- Pausing and restore:
  - [Project Pausing](https://supabase.com/docs/guides/platform/free-project-pausing)
  - [KB: Do projects pause](https://supabase.com/kb/faqs/platform/free-project-pausing) (updated 2026-10-27)
  - [Restore after >1 year](https://supabase.com/docs/guides/troubleshooting/restore-project-after-90-days-pause)
  - [90-day changelog](https://supabase.com/changelog/27497-paused-free-plan-projects-are-restorable-for-90-days) (June 2024, superseded)
  - [Upgrading](https://supabase.com/docs/guides/platform/upgrading)
- [KB: HTTP status codes / 402](https://supabase.com/kb/troubleshooting/http-status-codes)
- [KB: storage quota and SQL deletes](https://supabase.com/kb/troubleshooting/storage-unexpectedly-high-usage-or-exceed_storage_size_quota-errors-ae21a5)
- [GitHub discussion #40081](https://github.com/orgs/supabase/discussions/40081) (2025-11-03, community)
- Backups and restore:
  - [Backups](https://supabase.com/docs/guides/platform/backups)
  - [Backup and restore using the CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
  - [Restore platform project to self-hosted](https://supabase.com/docs/guides/self-hosting/restore-from-platform)
  - [CLI `db dump` reference](https://supabase.com/docs/reference/cli/supabase-db-dump)
  - Supabase CLI source at tag v3.4.0 (2026-11-24): `pg-dump.env.ts`, `pg-dump.scripts.ts`, `bundled-postgres-client.ts`, `dump.handler.ts`
- Connectivity:
  - [Connecting to Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres)
  - [IPv4 add-on](https://supabase.com/docs/guides/platform/ipv4-address)
- Storage:
  - [S3 authentication](https://supabase.com/docs/guides/storage/s3/authentication)
  - [S3 compatibility](https://supabase.com/docs/guides/storage/s3/compatibility)
  - [rclone KB](https://supabase.com/kb/troubleshooting/rclone-error-s3-protocol-error-received-listing-v1-with-istruncated-set-no-nextmarker-and-no-contents-e64d34)
  - [Upload limits](https://supabase.com/docs/guides/storage/uploads/file-limits)
- Observability and access:
  - [Metrics API](https://supabase.com/docs/guides/telemetry/metrics)
  - [Query logs with SQL](https://supabase.com/docs/guides/observability/advanced-log-filtering)
  - [Management API logs](https://supabase.com/docs/reference/api/v1-get-project-logs)
  - [Personal access tokens (scoped)](https://supabase.com/docs/guides/platform/personal-access-tokens)
  - [Auth audit logs](https://supabase.com/docs/guides/auth/audit-logs)
  - [Sentry for Edge Functions](https://supabase.com/docs/guides/functions/examples/sentry-monitoring)
- Legal:
  - [Terms of Service](https://supabase.com/terms)
  - [AUP](https://supabase.com/aup) (Version 1, 2026-06-01)
  - [SLA](https://supabase.com/sla)
- [status incident: resume deadline](https://status.supabase.com/incidents/v0qk7t3y3c5j) (May 2026, via search)
- Live MCP: `get_project`, `get_organization` (2026-11-28)

**GitHub**
- [Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
- [Actions settings / retention](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository)
- [Events that trigger workflows (schedule)](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)
- [About large files](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github)
- Release API: supabase/cli v3.4.0 (2026-11-24); supabase/setup-cli v3.2.0 (2026-11-02); rclone v1.75.2 (2026-10-09) and v1.76.0 (2026-11-06); age v1.3.2 (2026-08-29)

**Cloudflare**
- [R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- [R2 get started](https://developers.cloudflare.com/r2/get-started/)
- [R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
- [R2 bucket locks](https://developers.cloudflare.com/r2/buckets/bucket-locks/)
- [R2 API tokens](https://developers.cloudflare.com/r2/api/tokens/)
- [R2 data location](https://developers.cloudflare.com/r2/reference/data-location/)

**Backblaze**
- [B2 pricing](https://www.backblaze.com/cloud-storage/pricing) (footer © 2024, content current)
- [B2 application keys](https://www.backblaze.com/docs/cloud-storage-application-keys) (updated 2026-09-29)
- [B2 data regions](https://www.backblaze.com/docs/cloud-storage-data-regions) (via search)
- [B2 sign-up: no credit card](https://www.backblaze.com/sign-up/cloud-storage-v2) (via search)

**Other**
- [Sentry pricing](https://sentry.io/pricing/)
- [Elastic Supabase integration](https://www.elastic.co/docs/reference/integrations/supabase) (v0.1.4)
- [Neon pricing](https://neon.com/pricing) (page updated 2026-11-04)
- [Postgres.app downloads](https://postgresapp.com/downloads.html)
- [Homebrew installation requirements](https://docs.brew.sh/Installation)
- [PostgREST transactions / request GUCs](https://docs.postgrest.org/en/stable/references/transactions.html)
- Internal: `research_notes/Dawnage backend architecture 2026/{platform_devops,media_timeseries_health,events_realtime_jobs,data_model_schema}.md` (2026-11-27)

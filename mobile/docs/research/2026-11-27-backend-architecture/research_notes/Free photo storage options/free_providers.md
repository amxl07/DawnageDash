# Free cloud object/image storage for private body-progress photos (late 2026), vs staying on Supabase Storage

Research date: **2026-11-28**. Read-only: no accounts were created and nothing in the repo or the Supabase project was changed.

**Dating convention.**
- All web pages were fetched on 2026-11-28 unless a note says otherwise.
- The page's own date is given in brackets where it shows one: `[dateModified 2026-10-30]`, `[undated]` or `[© 2026 only]`.
- **STALE?** marks a source dated before 2025, or an undated third-party listing.
- Some findings come from search-result summaries rather than full page fetches. They are marked *(search summary)* and are weaker evidence.

**Project facts used (local, not re-researched):**
- Project `hzifwkebzhzlxvigbcup`, ap-southeast-2, Free plan.
- Bucket `progress_photos`: about 0.93 GB in 1,691 objects. That falls to about 0.29 GB after cleanup.
- Clients re-encode photos to about 200 KB JPEG, with the path `<uid>/<YYYY-MM-DD>/<angle>_<ms>.jpg`.
- Photos are signed with a 300 s token, re-signed every 240 s, and caching is disabled. There are no thumbnails.

Sources for those facts:
- `research_notes/Dawnage backend architecture 2026/media_timeseries_health.md` (line 18 and its Q7 projection table)
- `research_notes/free_plan_alternatives.md`

**Current read authorization (repo).** `sqlmigrationfiles/2026-11-22_07_private_progress_photos.sql` defines `public.progress_photo_can_read(object_name)`. It is `security definer` and grants access if the folder uid is `auth.uid()`, or if `users.coach_id = auth.uid()`, or if `is_admin()`. Execute is granted to `authenticated`.

**Account deletion (repo).** `supabase/functions/delete-account/index.ts` lists `<uid>/` and its date subfolders with the admin client, then removes them in chunks of 100.

---

## Q1. What do the free tiers actually offer in late 2026? (Verification, provider by provider)

### Takeaway
Only **three** options give *permanent*, *commercial-use* free object storage worth considering for private photos:
- **Cloudflare R2:** 10 GB, zero egress, Oceania location hint.
- **Backblaze B2:** 10 GB, no card, but no APAC region.
- **Supabase itself:** 1 GB, either the current project or a second Free org.

The others drop out for the following reasons:
- **Oracle Always Free** has the biggest allowance (20 GB, Sydney and Mumbai regions) but too few API requests (50k/month), requires a card, and has a pattern of terminated free tenancies.
- **Expired or trial-only:** AWS (credit-based since 2025-07-15), Azure (12 months), Storj (30-day trial).
- **US-only and billing-account-gated:** GCS and Firebase. Firebase Spark lost Storage on 2026-02-03.
- **Wrong for private health photos on free:** the media CDNs. Cloudinary authenticated delivery is on Advanced only; Uploadcare is "personal use only" with Pro-only signed URLs; ImageKit lists access control as Pro.

### Cited Findings

#### Comparison table A: allowance and terms
| Option | Free storage | Egress | Operations | Card needed? | Permanent? |
|---|---|---|---|---|---|
| **Supabase Storage (current project)** | 1 GB (GB-hour averaged) | 5 GB uncached + 5 GB cached, shared with DB/Auth/etc. | n/a | No | Yes, but pauses after 7 days of inactivity; org-wide Fair Use restrictions |
| **Cloudflare R2** | 10 GB-month (Standard class only; **Infrequent Access excluded**) | **Free** (S3 API, Workers, r2.dev) | 1M Class A + 10M Class B per month | **Conflicting.** Docs require "an R2 subscription" through a "checkout flow". A marketing page *(search summary)* says "no credit card required". The 2026-11-27 notes said it is a payment method in practice. | Yes ("forever-free", 2020 launch post) |
| **Backblaze B2** | 10 GB ("always free") | Free up to 3× average stored data, then $0.01/GB | Class A/B/C free. Class D costs $0.004/10k after 2,500/day. The pricing page contradicts itself. | **No** | Page implies it, without a guarantee |
| **Oracle OCI Always Free** | 20 GB combined (Std+IA+Archive) once the trial ends. During the trial or on a paid tenancy: 10 GB each | 10 TB/month outbound for the whole tenancy | **50,000 API requests/month** | **Yes** (card + phone; prepaid/virtual cards refused) | Yes, but there are 2025 reports of free tenancies terminated without warning |
| **Google Cloud Storage** | 5 GB-month regional, **us-east1/us-west1/us-central1 only** | 100 GB/month from North America, **excluding China and Australia destinations** | 5k Class A, 50k Class B | A billing account is required (the trial needs a card) | Yes |
| **Firebase Storage** | **None on Spark**: Spark lost all bucket access 2026-02-03. Blaze only: legacy `*.appspot.com` 5 GB; new `*.firebasestorage.app` = GCS free tier, US regions | Legacy: 1 GB/day | Legacy: 20k uploads, 50k downloads/day | Yes (Blaze) | Spark: no Storage at all |
| **AWS S3** | New accounts (on or after 2025-07-15): no S3-specific free amount; $100–200 credits; the Free plan account **closes after 6 months** or when credits run out. Legacy accounts (before 2025-07-15): 5 GB S3 for 12 months | — | — | Not stated on page | **No** |
| **Azure Blob** | 5 GB LRS hot | — | 20k read + 10k write | Not verified (see Gaps) | **No: 12 months**, new customers only |
| **IDrive e2** | "Try with 10GB Free". Third-party sources disagree on whether this is a permanent plan or a trial | Free up to 3× stored, then $0.01/GB | Free API calls | Not stated | **Unclear** |
| **Tebi** | Third-party listings: 25 GB (×2 geo copies) + 250 GB transfer **STALE?** | — | — | Unknown | Unknown. **tebi.io and docs.tebi.io did not resolve (DNS) on 2026-11-28** |
| **Filebase** | 5 GB (shared S3 + IPFS), 1 bucket, "500 pinned files" | Object egress free; IPFS egress 10 GB | — | Not stated | Plan labelled "For testing and learning" |
| **Storj** | **No free tier.** 30-day trial, no card | — | — | No (trial) | **No.** $5/month minimum afterwards |
| **ImageKit** | 3 GB DAM, 20 GB bandwidth | in bandwidth | 500 video units; transforms "with monthly limits" | — | "Forever free" |
| **Cloudinary** | 25 credits; 1 credit = 1 GB storage **or** 1 GB bandwidth **or** 1k transforms | in credits | in credits | **No** ("No credit card required") | "Free forever" |
| **Uploadcare** | 1 GB (cumulative; never resets) | 5 GB/month | 1,000 ops/month | — | Yes, but "**Personal use only**" |

Sources for table A:
- **Supabase:** `free_plan_alternatives.md` §1, which cites the [Supabase pricing page](https://supabase.com/pricing) and the storage-size and egress docs, all fetched 2026-11-28.
- **R2 allowance:** [R2 pricing [dateModified 2026-10-30]](https://developers.cloudflare.com/r2/pricing/).
- **R2 card requirement:** [R2 get started [2026-11-12]](https://developers.cloudflare.com/r2/get-started/) says: "You need a Cloudflare account with an R2 subscription… Complete the checkout flow to add an R2 subscription". The "no credit card required" claim is a *search summary* of [cloudflare.com/r2](https://www.cloudflare.com/r2/).
- **R2 permanence:** [R2 open-beta post, 2022 — STALE?](https://blog.cloudflare.com/r2-open-beta/).
- **B2 allowance:** [B2 pricing [undated, footer © 2024 — STALE?, but content matches the 2026-11-28 notes]](https://www.backblaze.com/cloud-storage/pricing).
- **B2 sign-up without a card:** the B2 sign-up page as cited in `free_plan_alternatives.md`.
- **Oracle:** [Always Free resources [undated, © 2026]](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm). Card and phone requirements are from the [OCI Free Tier FAQ](https://www.oracle.com/uk/cloud/free/faq/) *(search summary)*.
- **GCS:** [Google Cloud free features [undated]](https://docs.cloud.google.com/free/docs/free-cloud-features).
- **Firebase:** [Firebase Storage changes FAQ [undated; references 2026-02-03]](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024).
- **AWS:** [AWS Free Tier page [undated]](https://aws.amazon.com/free/), the [2025-07 What's New post](https://aws.amazon.com/about-aws/whats-new/2025/07/aws-free-tier-credits-month-free-plan) and the [legacy Free Tier FAQ](https://aws.amazon.com/free/legacy/free-tier-faqs) *(search summary)*.
- **Azure:** the [Azure free services page](https://azure.microsoft.com/en-us/pricing/free-services) *(the fetched page didn't render the list; the 5 GB / 20k / 10k figures come from a search summary of Microsoft pages and match a [2022 archive — STALE?](https://webcf.waybackmachine.org/web/20220208065848/https://azure.microsoft.com/en-us/pricing/free-services))*.
- **IDrive e2:** [IDrive e2 pricing [undated]](https://www.idrive.com/s3-storage-e2/pricing). The trial-vs-plan conflict comes from [Cloudwards](https://www.cloudwards.net/idrive-e2/) *(search summary)*.
- **Tebi:** [SaaSworthy](https://www.saasworthy.com/product/tebi-io/pricing) and [TrustRadius](https://www.trustradius.com/products/tebi.io/pricing) *(search summary, undated — STALE?)*. The DNS failure was observed directly with WebFetch.
- **Filebase:** [Filebase pricing [© 2026]](https://filebase.com/pricing/).
- **Storj:** [Storj pricing [undated]](https://www.storj.io/pricing).
- **ImageKit:** [ImageKit plans [© 2026]](https://imagekit.io/plans/).
- **Cloudinary:** [Cloudinary pricing [© 2026]](https://cloudinary.com/pricing).
- **Uploadcare:** [Uploadcare pricing [undated]](https://uploadcare.com/pricing/).

#### Comparison table B: fit for private, health-adjacent photos
| Option | Oceania / India / EU / UK / CA regions | S3 API + presigned URLs | Privacy / DPA | Account / ToS risk | Lock-in |
|---|---|---|---|---|---|
| **Supabase Storage** | Project is in Sydney (ap-southeast-2) | Own API + `createSignedUrl`; signed *upload* URLs valid 2 h; S3 endpoint too | Already the processor for the rest of the data | Pause; org-wide Fair Use 402 | Already here |
| **R2** | Location **hints** `oc`, `apac`, `weur`, `eeur`, `wnam`, `enam` are **best effort**. Guaranteed jurisdictions: `eu`, `us`, `fedramp` only | Yes. Presigned GET/HEAD/PUT/DELETE, **max 7 days**, **S3 domain only (not custom domains)**, **no POST form uploads**, Content-Type can be signed | Customer DPA v6.4 (effective 2026-04-03). Annex 1 contemplates special-category data "determined and controlled by the Customer". SCCs, UK Addendum, EU-US DPF. AES-256(-GCM) at rest, automatic | Developer Platform terms: illegal or harmful content can be removed, account suspended. A community thread "URGENT: R2 suspended, no invoice" (2026-07-15) has no detail | Low (S3 + SigV4) |
| **B2** | US West, US East, EU Central (Amsterdam), CA East (Toronto). **No APAC, India or UK.** **One region per account, fixed at sign-up** | Yes. B2 S3 API supports SigV4 presigned URLs; max expiry not found | DPA Modules 1/2/3. Accepting the Agreement executes the SCCs and UK Addendum; Backblaze is a processor for B2 files. SSE-B2 AES-256 now **on by default for new uploads** | No suspension reports found (not specifically searched) | Low |
| **Oracle Always Free** | ap-sydney-1, ap-melbourne-1, ap-mumbai-1, ap-hyderabad-1, uk-london-1, EU (Frankfurt etc.), ca-toronto-1. The home region is fixed at sign-up; compute and block volumes are home-region-only (Object Storage rule not stated) | S3 Compatibility API (SigV4; SigV2 not supported). **Presigned-URL support not stated**; OCI has its own Pre-Authenticated Requests | Always encrypted at rest | Many 2025 forum reports of Always Free tenancies "terminated without warning", with data purged | Medium (S3 compat with quirks) |
| **GCS / Firebase** | Free tier only in 3 US regions | XML API / Firebase SDK | Google DPA (not researched) | Billing-account gated | Medium |
| **IDrive e2** | 15 regions incl. London, Frankfurt, Ireland, Paris, Milan, Montreal, Singapore, Tokyo. **No Sydney, no India** | S3 (presign not checked) | Not researched | Not researched | Low |
| **ImageKit** | Not researched | Proprietary; signed URLs and private files exist as features | Not researched | Commercial use on Free not stated | **High** (URL/transform syntax) |
| **Cloudinary** | — | Proprietary | — | — | High. **Authentication options are Advanced-plan only** |
| **Uploadcare** | — | Proprietary. Signed *uploads* free; **signed URLs Pro only** | — | **Personal use only. Over-limit = suspension to next month** | High |

Sources for table B:
- **Supabase:** [`createSignedUploadUrl` reference](https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl): "They are valid for 2 hours" [undated].
- **R2 regions:** [R2 data location [2026-08-19]](https://developers.cloudflare.com/r2/reference/data-location/).
- **R2 presigned URLs:** [R2 presigned URLs [2026-11-12]](https://developers.cloudflare.com/r2/api/s3/presigned-urls/).
- **R2 encryption:** [R2 data security [2026-04-21]](https://developers.cloudflare.com/r2/reference/data-security/).
- **Cloudflare DPA:** [Cloudflare customer DPA v6.4](https://www.cloudflare.com/cloudflare-customer-dpa/).
- **R2 terms and suspension:** [Developer Platform service-specific terms](https://www.cloudflare.com/service-specific-terms-developer-platform/) *(search summary; regional pages dated 2026-03-24 / 2026-06-02)* and the [Cloudflare Community billing list](https://community.cloudflare.com/tag/billing/135) *(search summary)*.
- **B2 regions:** [B2 data regions [2026-11-13]](https://www.backblaze.com/docs/cloud-storage-data-regions).
- **B2 presigned URLs:** [Backblaze help: presigned URLs](https://help.backblaze.com/hc/en-us/articles/360047815993-Does-the-B2-S3-Compatible-API-support-Pre-Signed-URLs) *(search summary)*.
- **B2 DPA:** [Backblaze DPA Module 2](https://www.backblaze.com/company/policy/dpa-module-2) and the [privacy notice for EEA/UK](https://www.backblaze.com/company/policy/gdpr) *(search summary; older EEA/UK DPA pages dated 2022-09-20 — STALE?)*.
- **B2 encryption:** [Backblaze blog: B2 to encrypt new uploads by default](https://www.backblaze.com/blog/backblaze-b2-to-encrypt-new-uploads-by-default/) *(search summary; older help pages contradict it)*.
- **Oracle regions:** [OCI regions [© 2026]](https://docs.oracle.com/en-us/iaas/Content/General/Concepts/regions.htm).
- **Oracle S3 compatibility:** [OCI S3 Compatibility API [© 2026]](https://docs.oracle.com/en-us/iaas/Content/Object/Tasks/s3compatibleapi.htm).
- **Oracle terminations:** Oracle forum threads, e.g. [always free tier account suspended without clear reason](https://forums.oracle.com/ords/apexds/post/always-free-tier-account-suspended-without-clear-reason-3380) and [free tenancy terminated without any warning](https://forums.oracle.com/ords/apexds/post/free-tenancy-terminated-without-any-warning-1153) *(anecdotal, search summary)*.
- **IDrive regions:** [IDrive e2 locations](https://www.idrive.com/s3-storage-e2/locations).
- **ImageKit features:** [ImageKit basic security docs](https://imagekit.io/docs/media-delivery-basic-security) *(search summary)*. The plans page lists "access control… advanced security" under Pro/Enterprise only.
- **Cloudinary and Uploadcare:** their pricing pages, as above.

#### Other per-provider details
- **R2 tokens and immutability.** Tokens are "Object Read & Write", which includes delete. Bucket locks can block deletes and overwrites for N days ([R2 tokens](https://developers.cloudflare.com/r2/api/tokens/), [bucket locks](https://developers.cloudflare.com/r2/buckets/bucket-locks/), as cited in `free_plan_alternatives.md`, 2026-11-28).
- **B2 alerts and limits are optional.** Data caps and alerts are optional; "if you do not set up data caps… usage is unlimited, and unlimited charges can accrue". Alerts fire at 75% and 100% ([B2 data caps and alerts](https://www.backblaze.com/docs/cloud-storage-data-caps-and-alerts), *search summary*). Older B2 FAQ text describes free daily allowances (1 GB download/day, 2,500 Class B and C per day), which conflict with the current pricing page's "3× egress" and "Class A/B/C free" ([Backblaze help, B2 pricing — STALE?](https://help.backblaze.com/hc/en-us/articles/360037814594-B2-Pricing)).
- **AWS legacy accounts.** Accounts created before 2025-07-15 keep the legacy 12-month tier, measured from account creation ([AWS docs, legacy free tier](https://docs.aws.amazon.com/en_us/awsaccountbilling/latest/aboutv2/billing-free-tier.html), *search summary*).
- **Azure 12-month eligibility.** The 12-month services are "available only to new customers who have not previously had an Azure account". Free-account users must move to pay-as-you-go within 30 days to keep them ([Azure free services](https://azure.microsoft.com/en-us/pricing/free-services)).
- **Supabase Edge Function limits on Free:**
  - 2 s CPU per request (async I/O excluded), 150 s wall clock;
  - 256 MB memory, 100 functions per project;
  - the bundle may be 20 MB if built by the CLI.

  ([Edge Function limits [undated]](https://supabase.com/docs/guides/functions/limits)). Invocations: 500,000/month on Free (`free_plan_alternatives.md` §1, citing the [invocations doc](https://supabase.com/docs/guides/platform/manage-your-usage/edge-function-invocations)).

### Inferences
- **R2 is the only option that is permanent, commercial, S3-compatible, egress-free and can hint Oceania.** That matters because today's data already sits in Sydney.
  - The open question is the card: the "R2 subscription checkout" wording suggests a payment method on file.
  - Even with a card, R2 stays $0 inside 10 GB / 1M / 10M.
- **B2 is the best no-card option.** But it moves Australian clients' photos from Sydney to the US, EU or Canada. A single-region account means one more hop for every client region except Canada and the EU.
- **Oracle loses because of its 50,000 API requests per month,** not its storage. Each photo view or upload is at least one request. 1k users opening a 4-photo week a few times a month would use that up. Add the 2025 termination reports and the card requirement.
- **Tebi should be treated as unavailable or unverifiable.** Its domains did not resolve on 2026-11-28, and every figure comes from undated aggregators.
- **The media CDNs (ImageKit, Cloudinary, Uploadcare) are designed for public assets.** Their free tiers either exclude access-controlled delivery or are personal-use only. They would also add a proprietary URL scheme for data that must stay private.

### Gaps
- **R2 payment method.** Whether R2's checkout requires a payment method for $0 use was not verifiable without logging in: docs and marketing conflict. Checking the dashboard flow (without completing it) would settle it.
- **Azure card requirement** was not verified this session.
- **IDrive e2 "10GB Free":** permanent plan or trial? The page doesn't say, and third parties conflict.
- **B2's presigned-URL max expiry** (7 days under SigV4 is likely but unconfirmed), and whether B2 limits free (card-less) accounts beyond 10 GB.
- **Whether OCI's S3 Compatibility API supports query-string presigned URLs:** not stated on the fetched page.
- **Filebase "500 pinned files":** whether it limits S3 objects or only IPFS pins. If S3 objects, 1,691 objects already exceed it.
- **Google DPA, IDrive DPA and ImageKit DPA terms** were not researched.

---

## Q2. Second free Supabase project as overflow storage: allowed? What limit?

### Takeaway
It is **allowed**. The billing FAQ even suggests creating another Free org to get around the per-org count.

It only adds capacity if it sits in a **separate Free organization**, because Free quotas and Fair Use are evaluated at org level. It would need its own keep-alive, and it inherits the same Edge-Function-signing complexity as R2. In return it adds only 1 GB.

### Cited Findings
- **Project limit.** "You are entitled to two active free projects", and "within an organization, we count the free project limits from all members that are either Owner or Admin". "Paused projects do not count towards your quota". When blocked, "You can create another Free Plan organization or change the role of the affected member" ([Supabase billing FAQ [undated]](https://supabase.com/docs/guides/platform/billing-faq)).
- **Abuse clause.** The Fair Use section allows that "in some cases, like suspected abuse of our services, restrictions may be applied without prior notice". Abuse is not defined (same source).
- **Org-wide quotas.**
  - Free quotas and Fair Use restrictions are applied org-wide ("generally applied to all projects of the restricted organization").
  - The DB-size quota doc says it is "evaluated per organization".
  - The DAWNAGE org already holds the paused AuxiDesk project.
  
  Sources: `free_plan_alternatives.md` §1, citing the [billing FAQ](https://supabase.com/docs/guides/platform/billing-faq) and the [database size doc](https://supabase.com/docs/guides/platform/database-size).
- **Pausing.** Free projects pause after about 7 days of low activity (`free_plan_alternatives.md` §1, citing the [Project Pausing doc](https://supabase.com/docs/guides/platform/free-project-pausing)).

### Inferences
- **Same org: no extra capacity, two projects to pause.** A second project in the DAWNAGE org would likely share the org's Free quota, so it gains nothing.
- **Separate org: +1 GB storage and +5 GB egress,** but the owner then runs **two** Free orgs, each with its own pause and Fair Use exposure.
- **Auth doesn't carry over.** The overflow project's Storage RLS cannot see the main project's `auth.uid()` unless JWTs are shared. So reads still go through an Edge Function in the main project, which holds the overflow project's service key and calls `createSignedUrl`.
  - That is the same architecture as R2 (Q4) for 1/10th of the capacity, and egress still counts against a 5 GB quota.
  - **Not recommended** over R2.
- **Using a second org purely to multiply free quotas** sits uncomfortably close to the undefined "suspected abuse" clause. The FAQ's suggestion is about project *count*, not quota stacking. This is an interpretation, not a stated rule.

### Gaps
- Whether Storage size and egress quotas are evaluated per org or per project on Free is not stated explicitly for Storage (it is for DB size).
- Whether Supabase Third-Party Auth can trust another Supabase project's JWTs was not researched.

---

## Q3. How do the options compare with staying on Supabase Storage after cleanup, at 152 / 1,000 / 10,000 users? (Recommendation)

### Takeaway
**Stay on Supabase Storage. Do the cleanup, fix the replace-without-delete leak, and add thumbnails and stable caching.** It is $0, keeps RLS as the single authorization layer, and gives about 21 months of storage runway at today's rate.

Supabase Free stops being viable at about 300–1,000 active users, because of **egress, pausing and Fair Use, not photo bytes**. Pro ($25/month, 100 GB storage) then makes external photo storage pointless.

**If $0 must hold past 1 GB, Cloudflare R2 is the choice** (Backblaze B2 if no card can be added). Budget about 3–5 dev days, and accept that authorization moves into Edge Function code.

### Cited Findings
- **Growth projections at today's engagement** (local analysis: `media_timeseries_health.md` Q7, from live SQL and logs on 2026-11-27):

  | Users | Photo storage added per year | Photo egress per month, current pipeline | Photo egress per month, target pipeline (thumbnails, stable URLs, memory cache) |
  |---|---|---|---|
  | 152 | ≈0.40 GB | ≈1.85 GB | — |
  | 1,000 | ≈2.6 GB | ≈12 GB | ≈2–4 GB |
  | 10,000 | ≈26 GB | ≈122 GB | ≈20–40 GB |

  - **High-engagement stress case:** 4 photos per client per week ≈ 3.5 MB per client-month. 10k clients add ≈35 GB/month, or ≈420 GB/year.
  - **Same source:** "Egress (≈400 users), the DB (500 MB) and the lack of Smart CDN and transforms make Pro the realistic plan at about 300–500 users or more."
- **Cleanup runway.** Cleanup brings the bucket to about 0.29 GB, which is about 21 months of runway at 31.7 MiB/month, or about 2–4 months if 50–100 clients do weekly 4-photo check-ins (`free_plan_alternatives.md` §5).
- **Supabase Free vs Pro limits.** Free: 1 GB storage, 5 + 5 GB egress. Pro: 100 GB storage, 250 + 250 GB egress, $25/month (`free_plan_alternatives.md` §1, citing [pricing](https://supabase.com/pricing)).
- **R2 limits and overage.** Free: 10 GB-month, 1M Class A, 10M Class B, free egress. Over that: $0.015/GB-month ([R2 pricing [2026-10-30]](https://developers.cloudflare.com/r2/pricing/); the overage price is as cited in `free_plan_alternatives.md` §5).
- **B2 limits and overage.** Free: 10 GB, egress up to 3× stored. Over that: $6.95/TB/month storage and $0.01/GB egress ([B2 pricing — STALE? footer](https://www.backblaze.com/cloud-storage/pricing)).
- **Edge Function invocations.** 500k/month on Free; Pro has 2M, then $2 per 1M (`free_plan_alternatives.md` §1).

#### Scale table (inferred from the projections above and the cited allowances)
| | 152 users (now) | 1,000 users | 10,000 users |
|---|---|---|---|
| **Supabase Free** | 0.29 GB after cleanup: fits about 21 months. Egress 1.85 GB of 5 GB | Storage crosses 1 GB within about 3–4 months of reaching 1k (0.29 + 2.6 GB/year). Egress 12 GB is **over 5 GB** unless thumbnails cut it to 2–4 GB | Not viable |
| **Supabase Pro ($25)** | Overkill for photos | Fits easily | Fits: 26 GB/year storage; egress 20–122 GB of 250 GB. Stress case: 420 GB/year means about $7/month storage overage by end of year 1 (local source) |
| **R2 Free** | Fits, at $0 | Fits at $0 for about 3+ years at today's engagement. Stress case (≈3.5 GB/month) passes 10 GB in about 3 months, then cents. Ops: about 4.3k PUTs/month, far below 1M | Passes 10 GB in about 4–5 months at today's engagement, then about $0.25/month. Stress case ≈ (420 − 10) × $0.015 ≈ **$6/month** by month 12. Egress is $0 at any level. Class B: 10M reads is roughly 1,000 reads per user-month |
| **B2 Free** | Fits | Storage fits. Egress at 12 GB/month exceeds 3 × about 3 GB stored, so about $0.03/month (cents) | About 26 GB stored means 78 GB of free egress; ≈$0.11/month storage over 10 GB |
| **Edge Function invocations** (if signing moves to a function, batched per screen) | Negligible | ≈30–60k/month | ≈300–600k/month: **at or over the 500k Free quota**, and this app would be on Pro anyway |

### Inferences
- **The photo bytes are not the binding constraint.** At 1,000 users, Supabase Free fails on egress, pausing risk, the Fair Use blast radius and 1-day logs, all documented in `free_plan_alternatives.md` §6–7. Moving photos to R2 removes only *photo* storage and egress pressure.
  - Once Pro is bought for those other reasons, 100 GB of photo storage is included, and R2 becomes redundant complexity.
- **So R2 buys $0 photo storage only in the window between about 1 GB of photos and the day Pro is needed anyway.** Cleanup plus the leak fix plus thumbnails already covers most of that window.
- **R2 makes sense as primary photo storage only if:**
  - the owner insists on Free past about 1 GB **and** accepts the authorization rewrite; or
  - photo egress later goes far beyond Pro's 250 GB, which won't happen at 10k users with thumbnails.
- **Recommendation order:**
  1. Supabase Storage (cleanup + thumbnails + cache), then Pro at launch with paying clients.
  2. R2 behind an Edge Function, if $0 is non-negotiable.
  3. B2 behind an Edge Function, if no payment method can be added.
  4. Nothing else.

### Gaps
- Egress per user comes from less than one day of logs (local source's own gap). The 1k/10k egress numbers could be off by a factor of 2–3.
- Real post-launch engagement (photos per client per week) is unknown. It drives both the R2 overage and the Supabase runway.

---

## Q4. Integration design with existing Supabase auth: R2 (primary), B2 (runner-up)

### Takeaway
A single Edge Function `photo-url` covers both directions:
1. It verifies the caller's JWT.
2. It authorizes each path by calling the **existing** `progress_photo_can_read()` SQL helper with the caller's JWT, so owner, assigned coach and admin semantics stay in one place.
3. It returns batched SigV4 presigned PUT (upload) or GET (view) URLs, signed locally with `aws4fetch`.

Signing is pure HMAC, needs no network call, and fits easily in 2 s CPU. Clients PUT and GET directly against `<account>.r2.cloudflarestorage.com`.

`delete-account` gains an R2 prefix-delete. The B2 backup job switches its source remote. Effort is about 3–5 dev days. B2 is the same design with a different endpoint.

### Cited Findings
- **Signing in Deno is supported.**
  - Supabase Edge Functions import npm packages with `npm:` specifiers (example `import { createClient } from 'npm:@supabase/supabase-js@2'`) and JSR modules ([Supabase dependencies doc [undated]](https://supabase.com/docs/guides/functions/dependencies)).
  - Cloudflare documents `aws4fetch` ("built on `fetch` and `SubtleCrypto`") and `@aws-sdk/s3-request-presigner` for R2 presigning ([R2 presigned URLs [2026-11-12]](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)).
  - Deno's own example drives R2 with the AWS SDK `S3Client`, region `auto` and a custom endpoint ([Deno S3 upload example](https://docs.deno.com/examples/s3_upload/), *search summary*).
- **aws4fetch pitfall.** A roughly 3-year-old thread reports aws4fetch putting `x-amz-expires` into the signed headers, which breaks R2 presigned URLs ([Answer Overflow thread — STALE?](https://www.answeroverflow.com/m/1068121057984249866), *search summary*). Cloudflare's current guide sets `X-Amz-Expires` as a query parameter before signing ([R2 aws4fetch example](https://developers.cloudflare.com/r2/examples/aws/aws4fetch), *search summary*).
- **R2 presigned-URL constraints** ([R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)):
  - max 7 days;
  - GET, HEAD, PUT and DELETE only, **no POST form uploads**;
  - **S3 API domain only, not custom domains**;
  - browser use needs bucket CORS;
  - Content-Type can be bound into the signature (mismatch gives `403 SignatureDoesNotMatch`; with aws4fetch, use `allHeaders: true`);
  - **Content-Length enforcement is not mentioned.**
- **Edge Function capacity on Free.** 2 s CPU, 150 s wall clock, 256 MB, 100 functions ([limits](https://supabase.com/docs/guides/functions/limits)); 500k invocations/month (`free_plan_alternatives.md` §1).
- **Today's Supabase baseline.**
  - Bucket `file_size_limit` = 20 MB and `allowed_mime_types = image/*` are enforced server-side (migration 07 in the repo).
  - The read RLS policy uses `progress_photo_can_read(name)`. Write policies require `split_part(name,'/',1) = auth.uid()` (same file).
- **Supabase signed upload URLs** are valid for 2 hours ([reference](https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl)).
- **delete-account today** lists `<uid>/` and each date folder (limit 1000) and calls `bucket.remove()` in chunks of 100 (`supabase/functions/delete-account/index.ts`, repo).
- **Backups.** The planned B2 backup uses `rclone sync supa:progress_photos photos:` through an rclone-crypt remote (`free_plan_alternatives.md` Appendix A). R2 is an S3 provider in rclone (`free_plan_alternatives.md` §2: "Use the S3 provider `Cloudflare`, endpoint `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`, region `auto`").

### Inferences

#### Edge Function sketch (SKETCH — not run; verify the env var names and the aws4fetch signing options)
```ts
// supabase/functions/photo-url/index.ts
import { createClient } from 'npm:@supabase/supabase-js@2';
import { AwsClient } from 'npm:aws4fetch@1';

const r2 = new AwsClient({
  accessKeyId: Deno.env.get('R2_KEY_ID')!, secretAccessKey: Deno.env.get('R2_SECRET')!,
  service: 's3', region: 'auto',
});
const BASE = `https://${Deno.env.get('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com/progress-photos/`;
const PATH = /^[0-9a-f-]{36}\/\d{4}-\d{2}-\d{2}\/[a-z_]+_\d+\.jpg$/; // matches the current naming scheme

async function presign(key: string, method: 'GET' | 'PUT', ttl: number) {
  const url = new URL(BASE + key);
  url.searchParams.set('X-Amz-Expires', String(ttl));
  const headers = method === 'PUT' ? { 'content-type': 'image/jpeg' } : undefined;
  const signed = await r2.sign(new Request(url, { method, headers }),
                               { aws: { signQuery: true, allHeaders: method === 'PUT' } });
  return signed.url;
}

Deno.serve(async (req) => {
  // + CORS preflight handling for the Vite dashboard
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return new Response('unauthorized', { status: 401 });

  const { action, paths } = await req.json();
  if (!Array.isArray(paths) || paths.length === 0 || paths.length > 60 || !paths.every((p) => PATH.test(p)))
    return new Response('bad request', { status: 400 });

  if (action === 'upload') {                       // = today's INSERT policy
    if (!paths.every((p) => p.startsWith(`${user.id}/`))) return new Response('forbidden', { status: 403 });
    return Response.json(await Promise.all(paths.map((p) => presign(p, 'PUT', 120))));
  }
  // = today's SELECT policy: the same SQL helper, run as the caller
  const ok = await Promise.all(paths.map((p) => sb.rpc('progress_photo_can_read', { object_name: p })));
  if (ok.some((r) => r.error || r.data !== true)) return new Response('forbidden', { status: 403 });
  return Response.json(await Promise.all(paths.map((p) => presign(p, 'GET', 3600))));
});
```
- **Authorization parity.** Calling `progress_photo_can_read` as the caller (user-scoped client, not service role) reuses the exact predicate RLS uses today, so owner, coach and admin rules cannot drift.
  - N RPCs per batch is the lazy version. A `progress_photo_can_read_many(text[])` SQL function is a one-call upgrade if latency matters.
  - Keep the `storage.objects` policies untouched during migration.
- **What R2 cannot enforce that Supabase does today:**
  - **max file size** (no POST policy; Content-Length enforcement undocumented);
  - **server-side MIME allow-list** (only the signed Content-Type).

  Mitigations: a 120 s PUT TTL, Content-Type bound into the signature, and an optional `commit` call that HEADs the object and deletes it if it is over 2 MB. That is new attack surface compared with today.
- **Upload flow (Expo).**
  1. The client already re-encodes to about 200 KB JPEG.
  2. Call `photo-url` with `{action:'upload', paths:[…4 angles]}`.
  3. `fetch(putUrl, {method:'PUT', headers:{'content-type':'image/jpeg'}, body: blob})` for each angle.
  4. Upsert the `weekly_progress_photos` row with **bare paths**. The canonicalization of the 1,394 legacy public-URL references is a prerequisite either way.
  5. Delete the replaced object in the same flow; this fixes the existing leak.
- **Dashboard (Vite).** The same function serves GET URLs for `<img>`. Browser PUT (`PhotosUploadDialog.tsx`) needs the R2 bucket's CORS rules for the dashboard origin.
- **GET TTL and caching.**
  - Return 1-hour GET URLs per screen batch, and drop today's 240 s re-sign loop.
  - Object keys are immutable (timestamped), so clients should cache by **object path, not URL**. In expo-image that is a stable `cacheKey`; verify it in the expo-image docs.
  - R2 egress is free, so caching here is about latency and Class B ops (10M/month), not money.
  - A leaked GET URL is valid for at most the TTL. Today it is 300 s, so 1 h is a deliberate trade-off. 15 min is the conservative choice.
- **Invocations.** One call per screen or upload batch, not per photo, keeps usage at about 30–60k/month at 1k users, far inside 500k.
- **Account deletion.** In `delete-account`:
  1. List R2 objects with prefix `<uid>/` (ListObjectsV2 via aws4fetch).
  2. DELETE each object, or batch them.
  3. Then delete the auth user.
  4. Keep the existing Supabase-bucket removal during the dual-storage period.
  5. Return an error, not success, if any R2 delete fails, so the user or ops can retry.
  6. Backup copies still age out under the B2 lifecycle (≤30 days after deletion, per `free_plan_alternatives.md`). The privacy policy wording should match.
- **Backups.** Repoint the existing rclone job's source from `supa:` to an R2 remote (`provider = Cloudflare`, `--s3-list-version 2` not needed). R2 has no versioning parity with B2 (not verified). The B2 mirror with hidden-version retention remains the safety net.
  - Don't back up R2 to R2. Use a different vendor (B2) so one account suspension doesn't take both copies.
- **Migration.**
  1. Run cleanup first.
  2. `rclone copy` about 1,400 objects (≈0.29 GB) from the Supabase S3 endpoint to R2.
  3. Make clients read through `photo-url` with a fallback to Supabase `createSignedUrl` when the R2 object is missing.
  4. After a verification window, delete the Supabase copies through the Storage API.
- **Effort estimate (one developer):**

  | Work | Estimate |
  |---|---|
  | Edge Function + SQL batch helper + tests (owner, coach, admin, stranger, path traversal) | 1 day |
  | Mobile upload and view hooks (`useProgressPhotos`, `usePrivatePhotoUrl`) | 1 day |
  | Dashboard (`Media.tsx`, `PhotosUploadDialog.tsx`, `CoachClientsPage.tsx`) + CORS | 0.5–1 day |
  | `delete-account`, backup source switch, migration script, path canonicalization | 0.5–1 day |
  | Device testing and rollout | 0.5–1 day |
  | **Total** | **≈3.5–5 days**, versus about 0 for staying on Supabase |

  This is consistent with the earlier "2–4 dev days" estimate (`free_plan_alternatives.md` §5), plus the testing it omitted.
- **B2 variant.** Identical code with endpoint `https://s3.<region>.backblazeb2.com`, a bucket-scoped application key with read, write and delete, and the region chosen once at sign-up (EU Central or US West for most clients). Latency for Australian clients will be worse than R2 `oc` or Supabase Sydney.
- **Alternative not researched in depth: Cloudflare Worker proxy.** Instead of presigned URLs, a Cloudflare Worker with an R2 binding could validate the Supabase JWT and stream the object. That avoids bearer URLs entirely, but it needs a DB round-trip for the coach check and moves auth code to a second platform. Workers free-plan limits were not verified this session.

### Gaps
- R2 support for `DeleteObjects` (multi-delete) and object versioning was not verified. Per-object DELETE always works.
- Whether a signed `Content-Length` header is enforced by R2 on presigned PUT is undocumented. Test before relying on it.
- The default secret names in the Edge Function environment (`SUPABASE_ANON_KEY` vs `SUPABASE_PUBLISHABLE_KEY` after the key migration) need checking against the current Supabase docs.
- Measured Edge Function cold-start latency added to every photo screen (an extra hop before images load) was not measured.

---

## Q5. Privacy and compliance: DPAs, encryption at rest, data location, naming the provider

### Takeaway
Both R2 and B2 offer GDPR- and UK-ready DPAs. Each is accepted with the service terms and covers SCCs plus the UK Addendum. Both encrypt at rest with AES-256 by default.

**R2 is the better privacy fit, because photos stay near Sydney, where all other client data already lives.** Note that the `oc` hint is best effort, and the only *guaranteed* jurisdictions are EU, US and FedRAMP. B2 would create a new US, EU or CA transfer for Australian and Indian clients.

The privacy policy must list recipients **or categories** of recipients, plus third-country transfer safeguards. Naming the vendor isn't strictly required by GDPR Art. 13, but it is the simplest honest option.

### Cited Findings
- **Cloudflare DPA v6.4** (effective 2026-04-03):
  - It "forms part of the Main Agreement", which includes the Self-Serve Subscription Agreement.
  - Annex 1 contemplates special-category data "determined and controlled by the Customer in its sole discretion".
  - Transfers: SCCs Modules 2/3, UK Addendum, Swiss modifications, EU-US DPF with its UK and Swiss extensions.
  - It does not name R2 explicitly; "Services" and "Customer Content" are defined broadly.

  ([Cloudflare customer DPA](https://www.cloudflare.com/cloudflare-customer-dpa/))
- **R2 encryption.** R2 encrypts all objects and metadata at rest with AES-256 (GCM preferred), using Cloudflare-managed keys, and TLS in transit. SSE-C is not mentioned ([R2 data security [2026-04-21]](https://developers.cloudflare.com/r2/reference/data-security/)).
- **R2 location.** Location hints, including `oc` (Oceania), are "a best effort and not a guarantee". Jurisdictions `eu`, `us` and `fedramp` are guaranteed ([R2 data location [2026-08-19]](https://developers.cloudflare.com/r2/reference/data-location/)).
- **Backblaze DPA.** Backblaze publishes Modules 1/2/3. "Customer's acceptance of the Agreement and this DPA constitutes execution by Customer… of the SCCs… the UK Addendum". Backblaze is a processor "for files uploaded… [to] B2 Cloud Storage" ([DPA Module 2](https://www.backblaze.com/company/policy/dpa-module-2); [privacy notice](https://www.backblaze.com/company/policy/gdpr); *search summary*; older EEA/UK DPA pages dated 2022-09-20 — **STALE?**).
- **B2 encryption.** SSE-B2 (AES-256) is now applied by default to new uploads and new buckets. Objects stored before the change are not retro-encrypted, and older help pages say encryption is opt-in ([Backblaze blog](https://www.backblaze.com/blog/backblaze-b2-to-encrypt-new-uploads-by-default/), *search summary; conflicting older docs*).
- **B2 regions.** US, EU (Amsterdam) and Canada only ([B2 regions [2026-11-13]](https://www.backblaze.com/docs/cloud-storage-data-regions)).
- **GDPR Art. 13(1)(e)** requires "the recipients or categories of recipients of the personal data, if any". **Art. 13(1)(f)** requires notice of a transfer to a third country and "reference to the appropriate or suitable safeguards" ([GDPR Art. 13](https://gdpr-info.eu/art-13-gdpr/), regulation text 2016; UK GDPR mirrors it).
- **India (DPDP).** The DPDP Rules 2025 were notified on 13 or 14 November 2025 (sources differ). Cross-border transfer is "permit unless restricted": the Central Government may restrict transfers to specified countries, with tighter rules for Significant Data Fiduciaries. Hogan Lovells lists the Rule 15 transfer provisions as effective **13 May 2027** ([Hogan Lovells](https://www.hoganlovells.com/en/publications/indias-digital-personal-data-protection-act-2023-brought-into-force-); [Mondaq](https://www.mondaq.com/india/data-protection/1708164/digital-personal-data-protection-rules-2025-notified); [SCC Online, 2025-12-26](https://www.scconline.com/blog/post/2025/12/26/digital-personal-data-protection-rules-2025-key-highlights/); *law-firm summaries, search summary*).
- **Australia (APP 8).** OAIC guidance says that giving personal information to an overseas cloud provider *only for storage*, while the entity keeps effective control and has a binding contract limiting the provider's handling, may be a "use", not a "disclosure", so APP 8 may not apply. APP 11 (security) still applies. Chapter 8 guidelines were updated to v1.3 in October 2025 with a new exception; the details were not confirmed ([OAIC APP guidelines Ch. 8](https://www.oaic.gov.au/privacy/australian-privacy-principles-guidelines/chapter-8-app-8-cross-border-disclosure-of-personal-information/); [v1.3 PDF, Oct 2025](https://www.oaic.gov.au/__data/assets/pdf_file/0036/256959/APP-Guidelines-Chapter-8-Cross-border-disclosure-of-personal-information-October-2025-v1.3.PDF); *search summary*).

### Inferences
- **Status quo.** Clients in India, the UK and Canada already have *all* their data in Sydney (Supabase ap-southeast-2). So R2 with `oc` doesn't change where data sits, only who holds it. B2 adds a second geography for every client.
- **Encrypting before upload?** For a primary store (unlike backups), photos can't be client-side encrypted without breaking coach viewing on the dashboard, unless per-user key distribution is built. So the provider's at-rest encryption is the realistic control. Both meet AES-256.
- **Privacy-policy wording.** Under GDPR and UK GDPR, a category ("cloud storage provider") is enough for Art. 13(1)(e). But the transfer safeguards (SCCs, UK Addendum, DPF) must be referenced under Art. 13(1)(f). Supabase is already a sub-processor, so adding "Cloudflare, Inc. (R2 object storage)" by name is the cleanest option and costs nothing.
- **Make the DPA demonstrable.** The DPA becomes binding through the self-serve terms. Save a dated PDF copy of DPA v6.4 (or the Backblaze Module 2) with the compliance records, since neither requires a signature.
- **Health-adjacent photos.** Body-progress photos are plausibly health data in the UK and EU. For an Australian business, the health-service and small-business-exemption questions decide whether APP 8 and APP 11 bind at all.

### Gaps
- Not researched or confirmed:
  - whether body-progress photos are "special category" (health) data under UK GDPR, or "sensitive information" under the Australian Privacy Act;
  - whether a sub-$3M Australian coaching business is exempt;
  - Canada (PIPEDA) cross-border requirements;
  - Apple App Store and Google Play requirements on naming storage processors.
- Whether R2's EU jurisdiction (guaranteed) could be combined with an Oceania hint: it can't in one bucket. Choosing it would move all photos to the EU.

---

## Q6. Hybrid ideas: cold tier, or thumbnails on Supabase with originals elsewhere

### Takeaway
**Neither hybrid is worth it now.** Both need *all* of the R2 integration work (Edge Function signing, a second delete path, a second backup source), and they add routing logic on top.

The useful part of the thumbnail idea is generating about 30 KB thumbnails for grid views. That should be done **inside Supabase Storage** regardless, because it is the main egress fix.

### Cited Findings
- Grid views loading about 30 KB thumbnails, instead of ≈200 KB-to-5 MB originals, and removing the 240 s re-download loop is projected to cut photo egress from ≈12 to ≈2–4 GB/month at 1k users (`media_timeseries_health.md` Q7, inference marked unmeasured there).
- Free Supabase has no image transformations, so thumbnails must be made client-side (`free_plan_alternatives.md` §1; `media_timeseries_health.md` line 18). Both clients already re-encode on device (same line).
- R2's free tier covers Standard storage only; "does not apply to Infrequent Access storage" ([R2 pricing](https://developers.cloudflare.com/r2/pricing/)).
- After cleanup the bucket is about 0.29 GB, with about 21 months of runway (`free_plan_alternatives.md` §5).

### Inferences
- **Cold tier (inactive users' photos moved to R2 or B2).**
  - **Costs:**
    - a `storage_location` column or path prefix on every reference;
    - a mover job with copy, verify and delete steps, plus failure handling;
    - reads that branch on location (and rehydrate if a client returns);
    - `delete-account` and backups covering both stores;
    - two vendors to monitor.
  - **Benefit:** keeps the Supabase bucket under 1 GB longer. But after cleanup the bucket is at 29% with about 21 months of runway. Growth comes from *active* users, whose photos stay hot, so cold-tiering barely changes the growth curve. A free cold tier on R2 must also use Standard storage, not IA.
  - **Verdict:** high complexity for months of runway that cleanup already provides. Skip.
- **Thumbnails on Supabase, originals on R2.**
  - **Benefit:** RLS stays authoritative for the most-viewed images (grids), and Supabase storage per photo falls about 85% (30 KB vs 200 KB).
  - **Cost:** the full R2 integration for originals, and two objects per photo across two vendors, which must be kept consistent on replace and delete.
  - **Verdict:** a reasonable *second* step only if photos exceed Supabase Free and Pro is refused. Even then, plain "everything on R2" is simpler than the split.
- **Lazy path:** cleanup → leak fix → client-side thumbnails in the same bucket → path-keyed caching → Pro at launch. Revisit R2 only if a measured trigger fires: bucket ≥ 0.8 GB on Free with Pro rejected, or photo egress approaching Pro's 250 GB.

### Gaps
- Real thumbnail size and view mix (grid vs full-screen) have not been measured. The 85% figure assumes about 30 KB thumbnails.
- The latency of an extra Edge Function hop for originals vs direct Supabase signing has not been measured.

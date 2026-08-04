# Beleh Support UX Flow Guide

**Audience:** Support AI agents guiding end users.  
**Branch context:** Current product UX on the Beleh client app (chat, datasources, billing, landing, sample data).  
**Product:** Beleh (ብልህ) — AI business intelligence. Users ask questions in plain English against connected data.

Use this document to map a user’s request to the correct screens, buttons, and outcomes. Prefer exact UI labels in quotes. When blocked, explain the cause and the next action (including owner vs member differences).

---

## How to use this guide

1. Match the user intent (see [Intent cheat sheet](#intent-cheat-sheet)).
2. Confirm **role** (owner vs member) and **plan state** (trial / paid / expired / daily limit).
3. Walk them through the step-by-step path.
4. If something fails, use the **Blocks & what to say** section for that flow.

---

## Product map (routes)

| Path                          | Who                 | Purpose                                     |
| ----------------------------- | ------------------- | ------------------------------------------- |
| `/`                           | Public (signed-out) | Landing / marketing                         |
| `/signin`                     | Public              | Google sign-in                              |
| `/signup`                     | Public              | Google sign-up / start trial                |
| `/invitations/accept?token=…` | Public              | Accept workspace invite                     |
| `/auth/provider/callback`     | Public              | Cloud provider OAuth return (e.g. Supabase) |
| `/workspace/:id`              | Signed-in           | Main chat                                   |
| `/workspace/:id/datasets`     | Signed-in           | Datasource list                             |
| `/settings/general`           | Signed-in           | Account / preferences                       |
| `/settings/security`          | Signed-in           | Security / sign out                         |
| `/settings/workspaces`        | Signed-in           | Workspaces                                  |
| `/settings/members`           | **Owner only**      | Invite / manage members                     |
| `/settings/usage`             | Signed-in           | Usage meters                                |
| `/settings/billing`           | **Owner only**      | Plans, upgrade, Stripe                      |
| `/settings/billing/success`   | Signed-in           | After Stripe checkout                       |
| `/settings/about`             | Signed-in           | About                                       |

Auth is **Google only** (popup). There is no email/password form.

After sign-in, users land on their last workspace chat when possible; otherwise the default workspace; otherwise workspace settings.

---

## Roles (always check)

| Capability                   | Owner                                                         | Member                               |
| ---------------------------- | ------------------------------------------------------------- | ------------------------------------ |
| Invite teammates             | Yes                                                           | No                                   |
| Billing / upgrade            | Yes                                                           | No — plan is managed by the owner    |
| Add datasources / connectors | Yes                                                           | Yes                                  |
| Edit/delete a datasource     | Any they can access; members typically only ones they created | Same rule                            |
| Delete workspace             | Owner rules (not default workspace)                           | No                                   |
| Chat when trial/plan locked  | Sees **Upgrade plan**                                         | Sees “ask the owner” style messaging |

**What to tell members about billing:**  
“This workspace’s plan is managed by the owner. Ask them to open Settings → Billing to upgrade.”

---

## Intent cheat sheet

| User says…                      | Guide them to…                                                                                                           |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Start a trial / create account  | Landing **Start free trial** → `/signup` → **Sign up with Google**                                                       |
| Log in                          | **Sign in** → **Continue with Google**                                                                                   |
| Invite doesn’t work             | Open invite link while signed in with the invited Google account; owner can **Resend** from Members                      |
| Can’t chat / chat disabled      | Check: no data source, trial ended, daily token limit, or plan quota                                                     |
| Add my database                 | Chat **Connect DB** or Datasets **+** → PostgreSQL / Supabase                                                            |
| Upload a spreadsheet            | Datasets / full connect panel → Excel, CSV, or JSON (**Upload dataset**). Note: chat connect panel may hide file sources |
| Try sample / demo data          | Free trial, empty workspace → **Explore sample data**                                                                    |
| Remove sample data              | Source picker → select sample → **Remove sample** (or connect live data — sample is removed automatically)               |
| Suggested questions disappeared | Sample prompts hide after use; when all used, ask a custom question                                                      |
| Upgrade / trial over            | Owner: Settings → **Billing** → **Upgrade plan**. Member: ask owner                                                      |
| Switch workspace                | Workspace switcher → **Switch Workspace**                                                                                |
| Source failed / not ready       | Wait for sync; check Datasets status **FAILED**; re-test Postgres / re-upload                                            |
| Payment failed                  | Owner: Billing → **Update payment method**                                                                               |
| Theme / light mode hard to read | Landing or app theme toggle; preference persists                                                                         |

---

## 1. Landing (signed-out)

### Goals

Understand Beleh, start a trial, sign in, estimate savings, see how chat works.

### Sections & CTAs

| Section                     | Anchor         | Key CTAs                                                                   |
| --------------------------- | -------------- | -------------------------------------------------------------------------- |
| Nav                         | —              | **Sign in**, **Start free trial**, theme toggle                            |
| Hero                        | `#top`         | **Start your free 7-day trial**, **See what you'd save ↓**                 |
| Ask Beleh help chat         | Hero panel     | Interactive Q&A about the product                                          |
| Problem                     | `#problem`     | —                                                                          |
| How it works                | `#how`         | —                                                                          |
| See it in action (emulator) | `#demo`        | Autoplay product demo (charts + streaming answer)                          |
| Features                    | —              | —                                                                          |
| Your savings                | `#savings`     | Calculator → **Start saving , free for 7 days**                            |
| Results                     | `#proof`       | —                                                                          |
| Pricing                     | `#pricing`     | **Start 7-day free trial** / **Get \<plan\>** / **Talk to us** → `/signup` |
| Final CTA                   | `#get-started` | **Start your free 7-day trial**                                            |

### Fine print users may cite

- No credit card required
- Cancel anytime
- 7-day free trial
- SOC 2 ready

### Theme

- Default follows the device (light/dark).
- If the user toggles theme, the choice is saved and reused across the app.

---

## 2. Authentication

### 2.1 Sign up (start trial)

**Preconditions:** Signed out.

**Steps**

1. Open `/signup` (from any **Start free trial** CTA).
2. Click **Sign up with Google**.
3. Complete Google popup.
4. App validates session and opens workspace chat (or invite completion if pending).

**Blocks & what to say**

- Popup blocked → allow popups for the Beleh site and retry.
- _Google sign-up failed_ → retry; try another Google account; clear cookies if stuck.
- After Google login, session rejected (401/403) → account may not exist on the backend yet; retry signup; if persistent, escalate.

### 2.2 Sign in

**Steps**

1. `/signin` → **Continue with Google**.
2. Redirect priority: pending invite → `?next=` return path → last/default workspace.

### 2.3 Accept invitation

**Steps**

1. Open `/invitations/accept?token=…`.
2. If signed out: **Sign in** or **Create an account** (invite token is kept).
3. If signed in: joining runs automatically → workspace chat.

**Blocks & what to say**

- Missing/invalid token → ask the workspace owner to **Resend** the invite from Settings → Members.
- Wrong Google account → sign out, sign in with the email that received the invite.

---

## 3. Workspace

### 3.1 Switch workspace

1. Open the workspace switcher (side menu).
2. Sheet title **Switch Workspace**.
3. Select a workspace → `/workspace/:id`.  
   Labels may show **Yours** vs **Shared**.

### 3.2 Create workspace

1. Switcher → **Create New Workspace**.
2. Enter name → **Create Workspace**.

**Block:** Workspace plan limit → _You've reached the workspaces limit_ → owner upgrades at `/settings/billing?upgrade=1`.

### 3.3 Invite teammate (owner)

1. Settings → **Members**.
2. **Invite** → enter email → **Send invite** (role is member).
3. Pending invites: **Resend** / **Revoke**.
4. Members: **Remove**; self **Leave**.

**Block:** Seat limit → upgrade plan (owner) or remove unused seats.

---

## 4. Datasources

### Entry points

| From                                                        | Opens         | Notes                                                |
| ----------------------------------------------------------- | ------------- | ---------------------------------------------------- |
| Chat welcome **Add your data** / composer **Connect DB**    | Connect panel | May hide file uploads                                |
| `/workspace/:id/datasets` → **+** / **Connect data source** | Connect panel | Full catalog including files                         |
| After live source succeeds                                  | —             | Sample/demo data is removed automatically if present |

Panel title: **Connect a source** — _Add files, cloud platforms, or databases to this workspace._

### Catalog (what works today)

| Category  | Option                   | Status                     |
| --------- | ------------------------ | -------------------------- |
| Files     | Excel, CSV, JSON         | Live → **Upload dataset**  |
| Cloud     | Supabase                 | Live (OAuth orgs/projects) |
| Cloud     | Google Sheets            | **Soon**                   |
| Databases | PostgreSQL               | Live                       |
| Databases | MySQL, MongoDB, DynamoDB | **Soon**                   |

### 4.1 Upload file

1. Choose Excel / CSV / JSON → **Upload dataset**.
2. Drop or browse file.
3. Wait until status is **READY** (may show syncing first).

**Statuses to explain**

- Syncing / processing → “Still preparing; wait before querying.”
- **READY** / Connected → safe to chat.
- **FAILED** → re-upload or check file format; message may mention ingestion error.

### 4.2 PostgreSQL

1. Catalog → **PostgreSQL** → **Connect PostgreSQL**.
2. Paste connection string and/or fill host, database, user, password.
3. **Test connection** (must succeed).
4. **Initialize connection**.

### 4.3 Supabase

1. Catalog → **Supabase**.
2. Connect/select organization → pick project → bind.
3. OAuth returns via `/auth/provider/callback`.

### 4.4 Sample / demo datasource (free trial)

**Eligibility (all required)**

- Plan is free trial.
- Sample not already connected.
- No live datasources or connectors yet.

**Steps**

1. On empty chat, welcome shows **Try Beleh on sample data**.
2. Click **Explore sample data** (busy label: **Preparing sample data…**).
3. App connects sample → waits until **READY** → binds chat to that source.
4. Suggested question chips appear (from the API `suggested_prompts` list).
5. Click a chip → sends a normal chat message on the sample source.

**After each assistant answer (sample source)**

- More suggested questions appear under the reply (**Try another sample question**).
- Order is shuffled.
- Questions the user already sent are removed from later previews.
- When all sample questions are used: nudge to type a custom question about the dataset.

**Remove sample**

- Source picker → sample selected → **Remove sample**.
- Or connect real data → sample is removed automatically.

**Blocks & what to say**
| Situation | Message to user |
|-----------|-----------------|
| Not on free trial | Sample data is only available during the Free trial. |
| Already has live data | Sample data is unavailable once live sources exist. |
| Dataset limit | Upgrade or remove a dataset (owner for upgrade). |
| Preparing timeout | Try **Explore sample data** again; if it keeps failing, escalate. |
| FAILED prepare | Sample failed to prepare; retry or contact support. |

---

## 5. Chat

### Happy path

1. Open `/workspace/:id`.
2. Ensure a **READY** source is selected (or All sources when appropriate).
3. Type a question or click a suggested chip → send.
4. Read the answer, charts/tables, and follow-up suggestions if shown.

### Source picker (composer)

- Shows **All sources** or **Analyzing: \<name\>**.
- Sample sources show a sample badge.
- Actions: search sources, pick one, **Add datasource**, **Connect DB**, **Remove sample**.
- Tip users may see: **Tip: Select a database for deep analysis**.

### When chat is disabled

| Cause                      | What user sees                   | What to tell them                                               |
| -------------------------- | -------------------------------- | --------------------------------------------------------------- |
| Free plan, no sources      | Connect or explore sample banner | Click **Explore sample data** or **Add your data**              |
| Daily AI token limit       | Daily limit / reset time         | Wait until reset; upgrade does not always apply to daily cap    |
| Trial ended / plan expired | Upgrade banner                   | Owner: Settings → Billing → **Upgrade plan**. Member: ask owner |
| Period token quota         | Quota message                    | Owner upgrades; member asks owner                               |
| Soft warning (~80%)        | Toast                            | Optional early upgrade                                          |

### Suggested prompts behavior (sample)

1. First connect → welcome chips.
2. After each answer → remaining unused chips (shuffled).
3. Layout: stacked on small screens; side-by-side wrapping on large screens.
4. Exhausted → encourage free-form questions.

### Other chat guidance

- Unavailable old chat → app may start a new conversation; user can continue asking.
- Prefer selecting one database for deeper analysis when the tip appears.

---

## 6. Billing & plans

### Landing pricing

- Plans load from the API.
- Free CTA: **Start 7-day free trial**.
- Paid: **Get \<plan name\>**.
- Enterprise custom: **Talk to us**.
- All primary CTAs on landing go to `/signup`.

### In-app billing (owners)

1. Settings → **Billing** (`/settings/billing`).
2. See current plan, trial days left, usage.
3. **Upgrade to \<plan\>** → Stripe Checkout.
4. Success page → billing with confirmation toast.
5. Cancel checkout → no charge; user can retry.
6. Subscribed: **Manage billing** opens Stripe customer portal.
7. Past due: **Update payment method**.

Deep link for upgrade focus: `/settings/billing?upgrade=1`.

### Members

- No Billing nav item.
- Guide them to contact the workspace owner.

---

## 7. Settings quick map (when blocked)

| Problem             | Send user to              | Action                                       |
| ------------------- | ------------------------- | -------------------------------------------- |
| Trial over (owner)  | `/settings/billing`       | **Upgrade plan**                             |
| Trial over (member) | —                         | Ask owner                                    |
| Dataset limit       | Datasets and/or Billing   | Remove sources or upgrade                    |
| Seat limit          | `/settings/members`       | Remove invites/members or upgrade            |
| Workspace limit     | Create modal / Workspaces | Upgrade                                      |
| Daily tokens        | Stay in chat              | Wait for reset time shown in UI              |
| No data (free)      | Chat welcome              | **Explore sample data** or **Add your data** |
| Failed source       | `/workspace/:id/datasets` | Inspect status; reconnect                    |
| Sign out            | Settings → Security       | Sign out → `/signin`                         |

Visible settings: General, Security, Workspaces, Members (owner), Usage, Billing (owner), About.

---

## 8. Decision trees for the support agent

### “I can’t chat”

```
Is there a banner about trial ended / plan expired?
  YES → owner upgrades Billing; member asks owner
Is there a daily limit / reset time message?
  YES → wait until reset
Does the UI say connect data or explore sample?
  YES → Explore sample data (if eligible) OR Connect DB / Add your data
Is the selected source FAILED or still syncing?
  YES → wait for READY or fix/recreate the source
Otherwise → ask them to refresh, confirm workspace, try a new chat session
```

### “How do I try the product without my data?”

```
Are they on Free trial with no live sources?
  YES → Chat → Explore sample data → wait for READY → click suggested questions
  NO → explain sample is trial-only and unavailable once live data is connected;
       offer Connect DB / upload instead
```

### “I want to connect Postgres”

```
Chat Connect DB OR Datasets + → PostgreSQL
→ fill connection details → Test connection → Initialize connection
→ wait READY → select source in chat → ask a question
```

---

## 9. Tone & escalation

- Use the same button names the UI shows.
- Never invent email/password login.
- Distinguish **owner** vs **member** before saying “upgrade”.
- For payment, Stripe portal, or repeated 5xx failures: escalate to human support with workspace id, approximate time, and screenshot of the error banner if available.

---

## 10. Key implementation references (engineering)

Support agents normally do not need these; useful if escalating to engineering:

| Area              | Path                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------- |
| Routes            | `src/App.tsx`, `src/lib/publicRoutes.ts`                                                                |
| Access / quotas   | `src/utils/workspaceAccess.ts`, `src/utils/quotaExceededUi.ts`                                          |
| Sample data       | `src/lib/workspaceDemo.ts`                                                                              |
| Chat UX           | `src/components/chat/GenerativeChat.tsx`, `ChatWelcome.tsx`, `SuggestedPrompts.tsx`, `ChatComposer.tsx` |
| Connect panel     | `src/components/layout/DatasourceConnectionPanel.tsx`                                                   |
| Billing UI        | `src/components/settings/UsageSection.tsx`                                                              |
| Landing           | `src/pages/LandingPage.tsx`, `src/components/landing/*`                                                 |
| Auth home resolve | `src/lib/resolveAuthenticatedHome.ts`                                                                   |

---

_Document generated for support-AI guidance from the current Beleh frontend UX. Update this file when CTAs, eligibility rules, or billing paths change._

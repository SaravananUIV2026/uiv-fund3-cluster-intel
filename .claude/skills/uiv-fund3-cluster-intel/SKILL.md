---
name: uiv-fund3-cluster-intel
description: Runs the UIV Fund III Weekly Portfolio Insights pipeline v2 — cluster SubAgents analyze each Fund III company one at a time, read-only, from a verified Google Drive folder map plus the MIS business-update Sheet, computing financials/burn/runway/KPIs/MoM-QoQ driver analysis, a Master Agent validates every figure, then a tabulated one-pager HTML digest is emailed to saravanan@unicornivc.com. Trigger on "run weekly portfolio intel", "send the Fund III update", "/uiv-fund3-cluster-intel", or similar.
---

# UIV Fund III — Weekly Portfolio Intelligence (v2, cluster-based)

This skill runs the Master Agent + cluster SubAgent orchestration defined in
`.claude/workflows/uiv-fund3-cluster-intel.js` via the Workflow tool. It supersedes the
older `uiv-fund3-weekly-intel` skill/workflow (sector-based, 15 sectors) — the portfolio
is now organized into 9 clusters (see table below), and several correctness fixes were
made after a test run surfaced wrong/hallucinated data in the Semiconductor cluster and
elsewhere (see "What was fixed" below). Do not use the old skill going forward.

## Standing facts (do not re-ask the user for these)

- Google Drive source (READ-ONLY, never write/edit/rename/move/delete/upload/annotate):
  root folder ID `1uzeYKzH4uNIkUsN2yfYtGX-Gu2qwl2-Y`. Company folders sit **directly**
  under this root (there is no "MIS - Portfolio Companies" / "MIS - Auto Upload"
  subfolder layer — that assumption in the old v1 workflow was wrong and is the likely
  root cause of several data-fetch failures; see below).
- "MIS Quarterly Business Updates mail" Google Sheet ID:
  `1IcnFB3af0LmT3FkFYJu_R9KUJEgZvwz7fyLDfj3X6u0` — a founder-self-reported quarterly
  update (columns: Email, Name, CompanyName, Email in CC, BusinessUpdates, Quarter).
  Used as a secondary, explicitly-cited source alongside Drive MIS files.
- Recipient for the weekly email: `saravanan@unicornivc.com`.
- Permissions: the user has pre-authorized this entire pipeline end-to-end, including
  sending the weekly email to their own address — do not stop to ask permission for
  steps within this workflow. The only hard rule is that the Google Drive source must
  never be modified in any way; all analysis works off read-only access.
- Every company's Drive folder ID was resolved by direct reconnaissance and is
  hard-coded into `COMPANY_SOURCE_MAP` in the workflow script — SubAgents are handed the
  exact folder ID directly and are told never to fall back to an unscoped Drive-wide
  search. If the user adds/removes a portfolio company, a fresh reconnaissance pass is
  needed to add/remove its verified folder entry before it can be analyzed correctly —
  don't just add a company name to the cluster table without also resolving its folder.

## Fund III cluster -> company map (update this and the workflow's `CLUSTERS`/
`COMPANY_SOURCE_MAP` together if the user says the portfolio or its grouping changed)

**Correction (2026-08-19):** the user's original 9-cluster table mixed in Fund I and
Fund II companies. The list below is the confirmed **Fund III-only** roster (23
companies) mapped into the *same* 9 clusters — the cluster taxonomy itself did not
change, only which companies populate it. Two clusters (Energy; Industry 4.0/Advanced
Manufacturing) currently have zero Fund III members and so produce no rows — that's
expected, not a bug, until a Fund III company is added to them.

| Cluster | Fund III companies |
|---|---|
| Fintech & B2B SaaS | Kluisz, DeepAlgo, Pelocal, Qubehealth, StampMyVisa, Zealthix |
| DefenceTech | Qdit Labs, Eyerov, BonV Aero, Venttup |
| SpaceTech | OrbitAid, Takeme2Space, Satleo |
| Semiconductors | Netrasemi, Vervesemi |
| HealthTech | Piscium, BioScan, Exsure, Mediseva |
| Energy | *(none currently)* |
| AI (Vertical AI + AI Infra) | Vodex |
| Climate / Agri Tech | Aurassure, Verdant Impact, Cropcoin |
| Industry 4.0 / Advanced Manufacturing | *(none currently)* |

Notes on this mapping:
- **Kluisz, StampMyVisa, Piscium** were not named in the user's 9-cluster message at all
  (they predate it, from the original 15-sector list). Placed here by best fit against
  their old sector tags — Kluisz (was "CloudTech") and StampMyVisa (was "TravelTech")
  both landed in Fintech & B2B SaaS; Piscium (was "MedTech") landed in HealthTech.
  Revisit if the user places them differently.
- **Venttup and Aurassure** are analyzed once (DefenceTech and Climate/Agri Tech
  respectively) but their SubAgents also apply an Industry 4.0/Advanced Manufacturing
  lens where the source supports it, since both have genuine cross-cutting exposure.
  **DeepAlgo** similarly gets an AI-cluster secondary lens.
- **4 of the 23 could not be located** under the authorized Drive root by direct
  reconnaissance: **Qdit Labs, Satleo, BioScan, Cropcoin**. Each exists only in a
  separate, unrelated deal-tracking folder tree (term sheets/valuation docs, not MIS)
  that this pipeline is not authorized to read from. These 4 still get a row in the
  email (marked as no-data, not omitted) — flag to the user that their correct MIS
  folder needs to be located/shared before real figures can be pulled.

## What the weekly email must contain (per user's explicit spec)

For every portfolio company (this is a full one-pager overview, not a highlights-only
digest — a company with nothing new this week still gets a row, just with N/A where data
is genuinely unavailable):
1. **Financials**: latest month's revenue (with currency), YTD revenue, projected
   year-end revenue (only if the source itself states a management projection — never a
   run-rate extrapolation invented by the agent).
2. **Cost/cash**: cash in bank, monthly burn, quarterly burn, and runway — runway and the
   derived quarterly-burn fallback (3x monthly, when no separate quarterly figure exists)
   are computed **deterministically in the workflow's JS code** from the two numbers the
   analyst reports, specifically so there is no LLM arithmetic error.
3. **4-5 top KPIs per company**, chosen for that company's actual business/sector — not
   generic SaaS metrics. Customer pipeline detail is the explicit last-resort fallback
   only, and only after a genuinely thorough search, flagged visibly (`*`) rather than
   presented as an equivalent KPI.
4. **MoM and QoQ driver analysis** (never YoY — too slow a cadence for a weekly,
   early-stage portfolio review): what moved revenue and cost, traced through the MIS's
   own line items end-to-end (volume/price/mix/one-off/timing/collections, etc.), plus
   whatever of customer concentration, unit economics, backlog/order book, gross-margin
   driver, working capital, fundraising/cap table, and regulatory/IP milestones the
   source actually supports.

Email format: one HTML one-pager, tabulated per cluster (a financial-snapshot table +
a KPI/driver table per cluster), bullet points inside cells, no long scrolling
paragraphs. A plain-text fallback is generated from the same validated data for the
`body` field alongside `htmlBody`.

## What was fixed after the v1 test run (keep these when editing further)

- **Wrong folder-structure assumption**: v1 told every SubAgent to look inside
  "MIS - Portfolio Companies" / "MIS - Auto Upload" subfolders that do not exist —
  company folders are direct children of the root. A SubAgent that can't find the
  subfolder it was told to expect may fall back to an unscoped Drive search and pick up
  unrelated content, which is the likely cause of the false/random data seen in the
  Semiconductor cluster and a few others. Fixed by resolving every company's exact
  folder ID ahead of time (`COMPANY_SOURCE_MAP`) and forbidding unscoped search.
- **Semiconductor cluster specifically**: Vervesemi's Drive folder contains only annual
  statutory filings (Balance Sheet, P&L, ITR acknowledgement) — no monthly MIS at all.
  A prompt that demanded a monthly revenue/burn figure regardless would force the model
  to invent one. Fixed by making `dataFormat: annual-statutory-only` an explicit, allowed
  outcome with monthly fields left null, not fabricated.
- **Brand name vs legal entity name**: some companies' filed financials are under a
  different registered legal entity name than the portfolio brand (e.g. Vodex's MIS
  workbook is titled/labeled "LilChirp AI Technologies Private Limited"). v1's
  "resolve by parent folder, never filename" rule was right but didn't warn the agent
  that the name mismatch itself is normal — a stricter agent could wrongly discard a
  correct file. Fixed by pre-flagging known mismatches in `COMPANY_SOURCE_MAP` and
  telling the SubAgent this is expected, not disqualifying.
- **Empty template files**: some folders accumulate repeated near-empty
  "Cashflow_Template" uploads with no filled figures but recent modifiedTime, which could
  get mistaken for "the latest MIS" under a naive most-recent-file rule. Fixed by telling
  SubAgents explicitly to identify the latest file with real filled-in figures, not just
  the latest by date.
- **Multi-company-per-call contamination risk**: v1 gave one SubAgent call several
  companies to process "one at a time" within the same conversation — the "isolation"
  was procedural, not structural, so context could still bleed across companies inside
  one call. Fixed by giving every company its own fully separate `agent()` call (true
  isolation), still framed with its cluster's sector lens.
- **YoY -> MoM/QoQ**: v1's framework mentioned benchmarking against history without
  banning YoY; the user was explicit that YoY doesn't fit a weekly-cadence early-stage
  review. Fixed in the framework text.
- **LLM-authored email body -> code-authored**: v1 had the Master Agent hand-write the
  entire plain-text email body, including all the numbers, from scratch — a second place
  numbers could get mistyped even after correct extraction. Fixed by having agents return
  only structured JSON; the actual HTML/plain-text email (including all number
  formatting and the runway/quarterly-burn math) is assembled by deterministic code in
  the workflow, not retyped by any model.

## What to do when invoked

1. Compute the coverage week: the 7 days ending on today's date (inclusive). Render
   `coverageWeekLabel` as `"Mon D – Mon D, YYYY"`.
2. Call the `Workflow` tool with `name: "uiv-fund3-cluster-intel"` and `args`:
   ```json
   {
     "recipientEmail": "saravanan@unicornivc.com",
     "coverageWeekLabel": "<computed>",
     "coverageStart": "<computed>",
     "coverageEnd": "<computed>"
   }
   ```
   (Cluster/company/folder data is embedded in the workflow script itself, not passed
   as args, since it's a large verified map that shouldn't be retyped per invocation.)
3. Run it in the background (it fans out ~37 company-level subagents and takes a while);
   tell the user it's running.
4. When it completes, report: how many companies were covered, any flagged in
   `dataIntegrityNotes` or `portfolioFlags`, any companies with a genuine data gap
   (`dataGapsOrCaveats`), and confirm the email send result. Do not re-send the email
   yourself — the workflow's final step already sends it.
5. Every company appears in the email every week (full one-pager, not filtered to
   "material" news only) — so there is no "quiet week, suppress the email" case to check
   with the user the way v1 had; only surface it if the workflow reports a structural
   failure (e.g. most companies came back `dataAvailable: false`), which would indicate a
   pipeline problem worth flagging rather than sending as-is.

## Notes for future edits

- The full analytical framework and data-integrity rules are embedded in
  `FRAMEWORK_CORE` in the workflow script so every per-company SubAgent carries them
  automatically — don't strip them out when editing.
- `COMPANY_SOURCE_MAP` (folder IDs + per-company quirks) was built by direct Drive
  reconnaissance, not guessed — if a company's data still looks wrong after this fix,
  re-verify its folder contents directly rather than assuming the prompt needs more
  words.
- To change cadence to fully automatic (e.g. every Monday), use the `schedule` skill /
  scheduled-tasks tool to call this skill on a cron — but only after the user explicitly
  asks for a standing schedule, since that creates persistent configuration.

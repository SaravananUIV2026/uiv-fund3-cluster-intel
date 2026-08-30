Base directory for this skill: /home/user/uiv-fund3-cluster-intel/.claude/skills/latest-fund3-portfolio-summary

# Latest Fund III Portfolio Summary (cluster-based, burn/runway-integrity fix)

This skill runs the Master Agent + cluster SubAgent orchestration defined in
`.claude/workflows/latest-fund3-portfolio-summary.js` via the Workflow tool. It is a
**separate copy** of `uiv-fund3-cluster-intel` (the original v2 skill) — v2 is untouched
and still usable. Use this one going forward once you've verified a run looks right; it
carries the same company/cluster data as v2 plus two classes of fixes:

## What changed vs v2 (this is the entire diff — everything else is identical)

1. **Burn/runway integrity fixes** (the actual bug you reported):
   - v2's analyst prompt never told SubAgents how to handle a source that reports "Net
     Cash Flow" (negative = burning, standard accounting sign) instead of "Burn"
     (positive = burning, the convention `computeRunway` expects). A SubAgent copying a
     net-cash-flow figure straight through would silently invert the runway calculation —
     an actively-burning company could show as "Cash-generative." v3's prompt makes the
     sign rule explicit and load-bearing, and adds a new `burnSignConvention` field so
     every sign flip is auditable.
   - v2 never guarded against a SubAgent reading a YTD/cumulative burn figure into the
     single-month `monthlyBurnValue` field. v3 explicitly bans this and requires leaving
     the field null if a source only gives an aggregate.
   - v2's Master Agent validation step said only "check internal consistency" in the
     abstract. v3 adds 5 concrete, mandatory burn-integrity checks: sign-vs-narrative
     cross-check, sourced-flag contradiction check, plausibility-range check (runway
     <0.1mo or >120mo is now flagged, not silently trusted), period-alignment check
     (cash-as-of-date vs burn-period-label more than ~a month apart gets flagged in
     `dataGapsOrCaveats`), and a monthly-vs-cumulative scale smell test.
   - `computeRunway()` now distinguishes `burn === 0` ("Breakeven — no burn") from
     `burn < 0` ("Cash-generative — building cash") instead of conflating both under one
     label.
   - New fields `monthlyBurnPeriodLabel` and `cashInBankAsOfDate` are now surfaced
     directly in the email next to their figures, so a period mismatch between the two
     numbers feeding runway is visible to the reader instead of hidden.
   - The actual arithmetic (`cash ÷ burn`, `monthly × 3` for derived quarterly) was
     already correct in v2 and is unchanged — the bug was entirely in unvalidated inputs
     reaching a correct formula; v3 fixes the inputs and adds the missing checks.

2. **2-column, mobile+laptop-friendly email layout**: each company is now one table row
   with 3 cells — Company (name + health badge), **Revenue/Cashflow** (all financial
   fields, bulleted), **KPIs/Business Updates** (KPIs + MoM drivers + QoQ drivers + next
   question, bulleted) — replacing v2's separate 9-column financials table and 5-column
   KPI table. A `<style>` media query stacks the 3 cells vertically on narrow screens.
   The underlying data and validation pipeline are unaffected — this is a display-layer
   change only.

## Standing facts (same as v2, do not re-ask the user for these)

- Google Drive source (READ-ONLY, never write/edit/rename/move/delete/upload/annotate):
  root folder ID `1uzeYKzH4uNIkUsN2yfYtGX-Gu2qwl2-Y`. Company folders sit directly under
  this root.
- "MIS Quarterly Business Updates mail" Google Sheet ID:
  `1IcnFB3af0LmT3FkFYJu_R9KUJEgZvwz7fyLDfj3X6u0`.
- Recipient for the weekly email: `saravanan@unicornivc.com`.
- Permissions: this entire pipeline is pre-authorized end-to-end, including sending the
  weekly email — do not stop to ask permission for steps within a run. The only hard
  rule is that the Google Drive source must never be modified in any way.
- Every company's Drive folder ID is hard-coded into `COMPANY_SOURCE_MAP` in the
  workflow script (same map as v2) — SubAgents get the exact folder ID directly and must
  never fall back to an unscoped Drive-wide search.
- `Verdant Impact` still carries `skipThisRun: true` (carried over from v2, not touched
  by this fix pass) — clear it in the workflow script whenever it should resume normal
  weekly analysis.
- 4 companies (Qdit Labs, Satleo, BioScan, Cropcoin) still have no verified Drive folder
  and appear as explicit no-data rows, same as v2 — their correct MIS folder still needs
  to be located before this changes.

## What to do when invoked

1. Compute the coverage week: the 7 days ending on today's date (inclusive). Render
   `coverageWeekLabel` as `"Mon D – Mon D, YYYY"`.
2. Call the `Workflow` tool with `name: "latest-fund3-portfolio-summary"` and `args`:
   ```json
   {
     "recipientEmail": "saravanan@unicornivc.com",
     "coverageWeekLabel": "<computed>",
     "coverageStart": "<computed>",
     "coverageEnd": "<computed>"
   }
   ```
3. Run it in the background (it fans out ~37 company-level subagents and takes a while);
   tell the user it's running.
4. When it completes, report: how many companies were covered, any flagged in
   `dataIntegrityNotes` or `portfolioFlags` (pay particular attention to any burn-sign or
   plausibility corrections logged here — that is this version's core fix, so a clean
   first run is worth calling out explicitly), any companies with a genuine data gap
   (`dataGapsOrCaveats`), and confirm the email send result. Do not re-send the email
   yourself.
5. Every company appears in the email every week (full one-pager) — only surface a
   structural-failure case to the user (most companies came back `dataAvailable: false`),
   same as v2.

## Notes for future edits

- Do not edit `uiv-fund3-cluster-intel.js` (the original v2 workflow) as part of
  maintaining this one, and vice versa — they are intentionally forked copies so v2
  remains a known-good rollback point until this version has been verified against a
  real run.
- If a future edit needs to touch the company/cluster map (add/remove a company, folder
  ID changes), verify by fresh Drive reconnaissance and update both `COMPANY_SOURCE_MAP`
  and `CLUSTERS` in `latest-fund3-portfolio-summary.js` together, exactly as the v2
  workflow required.

export const meta = {
  name: 'latest-fund3-portfolio-summary',
  description: 'Latest Fund III Portfolio Summary: cluster-SubAgent + Master Agent pipeline (formerly "uiv-fund3-cluster-intel-v3") with (a) burn/runway integrity fixes — sign-convention normalization, monthly-vs-cumulative guard, and explicit Master Agent sanity checks — and (b) a mobile/laptop-friendly 2-column email layout (Revenue/Cashflow | KPIs/Business Updates) per company, read-only from the verified Drive folder map + MIS Sheet.',
  whenToUse: 'Run weekly to produce and send the UIV Fund III Weekly Portfolio Insights email (corrected burn/runway integrity, 2-column layout). Supersedes the older uiv-fund3-cluster-intel (v2) for ongoing use once verified.',
  phases: [
    { title: 'Analyze' },
    { title: 'Validate' },
    { title: 'Email' },
  ],
}

// ===========================================================================
// PART 1 — verified source map. Unchanged from v2 (same companies, same
// resolved Drive folder IDs, same reconnaissance notes) — this version only
// changes the burn/runway logic and the email layout, not the source data.
// ===========================================================================
const DRIVE_ROOT_ID = '1uzeYKzH4uNIkUsN2yfYtGX-Gu2qwl2-Y'
const MIS_SHEET_ID = '1IcnFB3af0LmT3FkFYJu_R9KUJEgZvwz7fyLDfj3X6u0'

const COMPANY_SOURCE_MAP = {
  'OrbitAid': { folderId: '144eC3LxiI4wUEr6lj5atLp8WZWmBj8kj', folderTitle: 'OrbitAID', legalEntityNameIfDifferent: 'OrbitAID Aerospace Private Limited', dataFormatHint: 'monthly-mis',
    notesForAnalystPrompt: 'The latest workbook is literally filed as "Template MIS - 2026-27.xlsx" but IS filled with real quarterly-tagged (Q1 Jun-26, Q2 Jul-26) figures — the word "Template" in the filename does not mean it is empty; verify by opening it. Many duplicate copies exist, use latest by modifiedTime.' },
  'Takeme2Space': { folderId: '1LI00NTepyvhe_4l7eY_ZHDVhQvmnCGM_', folderTitle: 'TM2Space', dataFormatHint: 'mixed',
    notesForAnalystPrompt: 'Folder is cluttered with duplicate empty "Cashflow_Template_UIV.xlsx" files (~10KB, identical size) and stray untitled embedded images — ignore those. Use "MIS Q1 FY 2026-27.xlsx" and "MIS Data Q4 2025-26 and MoM FY 2025-26.xlsx" for real figures.' },
  'Satleo': { folderId: null,
    notesForAnalystPrompt: 'NOT FOUND under the authorized portfolio root: a "17. Satleo" folder exists but sits in a different, unrelated deal-tracking tree (term sheets/SHA legal docs only), not accessible from this pipeline\'s authorized Drive root. Flag to the fund team to confirm/relocate the correct MIS folder — do not use the unrelated tree.' },
  'Netrasemi': { folderId: '1Abw0FfdtjBNkomMDudJCI_zFcp_CEz06', folderTitle: 'Netrasemi', dataFormatHint: 'monthly-mis',
    notesForAnalystPrompt: 'A small empty "Cashflow_Template" file is also present alongside the real MIS — ignore it. Use the "Netrasemi_MIS_*" workbook (includes a 24-month projection tab, useful for projectedYearEndRevenue if it states a management figure).' },
  'Vervesemi': { folderId: '1FcG6rurMsCKtUeFO2TbcY0y3FbzXF6A6', folderTitle: 'Vervesemi', legalEntityNameIfDifferent: 'Vervesemi Microelectronics Pvt. Ltd.', dataFormatHint: 'mixed',
    notesForAnalystPrompt: 'Only 4 files total: annual P&L, annual Balance Sheet, filed ITR (all statutory/annual — company is export-sales + grant-funded and largely profitable, not burn-driven), plus one "MIS FY 25-26" workbook that DOES contain a monthly-dated Balance Sheet series (Apr-25 through Mar-26) — cash-in-bank and current-liabilities can be read monthly from that workbook even though P&L is annual-only. Do NOT invent a monthly revenue or burn figure if the P&L truly only reports annually — leave those null and say so; this is expected for this company, not an error.' },
  'Qdit Labs': { folderId: null,
    notesForAnalystPrompt: 'NOT FOUND under the authorized portfolio root: a "23. QDit Labs" folder exists but sits in a different, unrelated deal-tracking tree (term sheets/valuation reports only), not accessible from this pipeline\'s authorized Drive root. Flag to the fund team to confirm/relocate the correct MIS folder.' },
  'Kluisz': { folderId: '1P01j8N5wkf0on6IoRtLHV3mYrHZLwQii', folderTitle: 'Kluisz', dataFormatHint: 'monthly-mis',
    notesForAnalystPrompt: 'Older monthly files (Dec-25 - Mar-26) are named "Kluisz P&L_*"; the two most recent files (Jun-26) are named "Nava P&L_*" — same tracked entity, apparently mid-rebrand from Kluisz to Nava. Use the latest available file regardless of which brand label appears on it, but report the company under the name "Kluisz" as tracked in the fund\'s records, noting the apparent rebrand in dataGapsOrCaveats.' },
  'Eyerov': { folderId: '1g1cdm-DuKcgQgrkXh9AmU9Qf825yXZMF', folderTitle: 'Eyerov', dataFormatHint: 'monthly-mis',
    notesForAnalystPrompt: 'Multiple duplicate uploads of the same June-2026 MIS exist; use latest by modifiedTime.' },
  'BonV Aero': { folderId: '1KCtnKvprLPCo7Cf6OamnRQ4dRzWw8R_F', folderTitle: 'BonV', dataFormatHint: 'mixed',
    notesForAnalystPrompt: 'Only one MIS file exists (Jan-2026, PDF) and it is stale (~7 months old) — say so. All recent 2026 uploads are pre-emptive-rights-offer notices and CCD/fundraising legal documents for a new round, not business updates; do not treat those as financial data.' },
  'Vodex': { folderId: '16hiGnWNZl2SyNxCCOmM_cn2SwrKWIq82', folderTitle: 'Vodex', legalEntityNameIfDifferent: 'LilChirp AI Technologies Private Limited', dataFormatHint: 'mixed',
    notesForAnalystPrompt: 'The most-recently-touched file is a forward-looking "Projections" workbook, not actuals — for actual monthly figures use "Vodex MIS_Draft IR v3.xlsx" (Jul 2026 version; several duplicate copies of this exact title exist, use the latest by modifiedTime). Several empty duplicate "Cashflow_Template" files exist, ignore them. Legal entity in all filings is "LilChirp AI Technologies Pvt Ltd", not "Vodex" — this is expected, not a mismatch to discard.' },
  'DeepAlgo': { folderId: '1tz9iCT38ycIzp4Xo3INH7jpEdbqJGp-d', folderTitle: 'Deep Algorithms', dataFormatHint: 'monthly-mis',
    notesForAnalystPrompt: 'Very clean unbroken monthly MIS series Oct 2025 - Jul 2026; safe to trust as primary source.' },
  'Venttup': { folderId: '10NDHBEhBsG9UJN1rvL0FZrr_fzmOfZYu', folderTitle: 'Venttup', dataFormatHint: 'monthly-mis',
    notesForAnalystPrompt: 'Folder also contains "Capitar-Venttup" legal/deal docs (SSA, DTD, DTAA, stamp duty matrix) from a June-2026 transaction — these are legal documents, not MIS; ignore for financial figures.' },
  'Aurassure': { folderId: '1nZr8l_DOFgQccxnrqUPBzfFzWMra20M3', folderTitle: 'Aurassure', legalEntityNameIfDifferent: 'APL (Aurassure Pvt Ltd)', dataFormatHint: 'monthly-mis',
    notesForAnalystPrompt: 'Clean unbroken monthly MIS series Oct 2025 - Jul 2026. Folder also has tiny decorative button images; ignore those. Also carries genuine Industry 4.0 / Advanced Manufacturing exposure alongside Climate/AgriTech — apply both lenses where evidenced.' },
  'Pelocal': { folderId: '1ohY4CBiDisI03h_T3WyRq_5yPMOwyk2a', folderTitle: 'Pelocal', dataFormatHint: 'monthly-mis',
    notesForAnalystPrompt: 'Clean monthly MIS ("MIS - FTM <Month>") cadence through June 2026; duplicate uploads on adjacent days exist, use latest by modifiedTime.' },
  'Qubehealth': { folderId: '1qNov7UVjon2QaYUG8RVunRNe-QsrjalU', folderTitle: 'QubeHealth', dataFormatHint: 'mixed',
    notesForAnalystPrompt: 'No separate monthly MIS files — only a Q4 FY25-26 quarterly investor-update doc, a provisional annual balance sheet, a 5-year model, and one consolidated "QB MIS FY2025-2026" workbook (check it for internal monthly columns). Many duplicate copies exist; use latest by modifiedTime.' },
  'StampMyVisa': { folderId: '1tsxWNqv8K1A3ztAsOcyGEfXNPG0OdYiX', folderTitle: 'StampMyVisa',
    notesForAnalystPrompt: 'Folder location confirmed from the Drive root listing; its file contents have not yet been characterized by prior reconnaissance (unlike most other companies in this map) — verify the latest substantive file and actual dataFormat yourself from scratch, don\'t assume monthly cadence.' },
  'Piscium': { folderId: '1adCKmEW2ztN00RGhCT3LFIM31ahaveTW', folderTitle: 'Piscium',
    notesForAnalystPrompt: 'Folder location confirmed from the Drive root listing; its file contents have not yet been characterized by prior reconnaissance — verify the latest substantive file and actual dataFormat yourself from scratch, don\'t assume monthly cadence.' },
  'BioScan': { folderId: null,
    notesForAnalystPrompt: 'NOT FOUND under the authorized portfolio root: a "16. Bioscan" folder exists but sits in a different, unrelated deal-tracking tree (SSHA/term sheet legal docs only), not accessible from this pipeline\'s authorized Drive root. Flag to the fund team to confirm/relocate the correct MIS folder.' },
  'Exsure': { folderId: '1t3cFGR7b71RFqIRU83mf6WVjKZjWK5rm', folderTitle: 'Exsure', dataFormatHint: 'monthly-mis',
    notesForAnalystPrompt: 'Clean unbroken monthly MIS series Oct 2025 - Jun 2026. Folder also contains small repeated logo/signature images; ignore those.' },
  'Verdant Impact': { folderId: '1zHsmYWyWL_H4_aC13h6uoONuJZXoGVDz', folderTitle: 'Verdant Impact', legalEntityNameIfDifferent: 'VIPL (Verdant Impact Pvt Ltd)', dataFormatHint: 'monthly-mis',
    // Carried over from v2 as-is (not in scope of this burn/runway + layout
    // fix pass) — remove skipThisRun whenever the user wants it analyzed
    // normally again.
    skipThisRun: true,
    notesForAnalystPrompt: 'Only one consolidated FY2025-26 workbook exists (no separate monthly uploads) — check it for internal monthly columns; not updated since June 2026.' },
  'Zealthix': { folderId: '166QhkSnyxW6OgYrdYvVvt1qGktLLoNBu', folderTitle: 'Zealthix', dataFormatHint: 'monthly-mis',
    notesForAnalystPrompt: 'No MIS uploaded since April 2026 (stale ~4 months as of this run) — say so explicitly. A Dec-2025 board deck is also present but is not a financial workbook.' },
  'Mediseva': { folderId: '1GHadQwS8pWxx7Wpb514wGFIU1R4uTLKk', folderTitle: 'Medyseva', dataFormatHint: 'mixed',
    notesForAnalystPrompt: 'Note the Drive folder/files use the spelling "Medyseva" — same company as "Mediseva", not a mismatch. Only one file exists: a single consolidated tracker, partially filled (real revenue through Nov-25, some ops metrics through Mar-26) but many cost/expense rows are blank — treat blank rows as "not yet reported", never as zero.' },
  'Cropcoin': { folderId: null,
    notesForAnalystPrompt: 'NOT FOUND under the authorized portfolio root: a "19. CropCoin" folder and MIS file exist but sit in a different, unrelated deal-tracking tree, not accessible from this pipeline\'s authorized Drive root. Flag to the fund team to confirm/relocate the correct MIS folder.' },
}

const CLUSTERS = [
  { name: 'Fintech & B2B SaaS', companies: ['DeepAlgo', 'Pelocal', 'Qubehealth', 'StampMyVisa', 'Zealthix'] },
  { name: 'DefenceTech', companies: ['Qdit Labs', 'Eyerov', 'BonV Aero', 'Venttup'] },
  { name: 'SpaceTech', companies: ['OrbitAid', 'Takeme2Space', 'Satleo'] },
  { name: 'Semiconductors', companies: ['Netrasemi', 'Vervesemi'] },
  { name: 'HealthTech', companies: ['Piscium', 'BioScan', 'Exsure', 'Mediseva'] },
  { name: 'Energy', companies: [] },
  { name: 'AI (Vertical AI + AI Infra)', companies: ['Vodex', 'Kluisz'] },
  { name: 'Climate / Agri Tech', companies: ['Aurassure', 'Verdant Impact', 'Cropcoin'] },
  { name: 'Industry 4.0 / Advanced Manufacturing', companies: [] },
]
const SECONDARY_LENS = {
  Venttup: 'Industry 4.0 / Advanced Manufacturing',
  Aurassure: 'Industry 4.0 / Advanced Manufacturing',
  DeepAlgo: 'AI (Vertical AI + AI Infra)',
}

// ---------------------------------------------------------------------------
// Shared analytical framework injected into every per-company Cluster
// SubAgent's prompt. v3 CHANGE: hardened burn/runway integrity rules (sign
// normalization, monthly-vs-cumulative guard) — see BURN INTEGRITY block.
// ---------------------------------------------------------------------------
const FRAMEWORK_CORE = `
ROLE: You are a senior VC Portfolio Analyst SubAgent for UIV Fund III. You do NOT
summarize numbers — you investigate what is happening inside the company, why, whether
it matters, and what it implies for the investment thesis and next action.

DATA SOURCES (read-only, exactly these two, nothing else):
1. Google Drive — you will be given this company's EXACT folder ID directly. Do NOT
   search Drive by company name and do NOT browse sibling/parent folders "just in case" —
   open only files under the given folderId (and its own subfolders, if any). If you are
   ever tempted to fall back to a Drive-wide fullText/title search because the given
   folder seems to lack what you need, STOP — report the gap honestly instead
   (dataAvailable: false / dataGapsOrCaveats) rather than pulling in a file from outside
   this company's folder. Cross-contamination from another company's or another client's
   Drive content is the single worst failure mode here — treat scope discipline as
   inviolable.
2. Google Sheet "MIS Quarterly Business Updates mail" (ID ${MIS_SHEET_ID}) — filter its
   rows to THIS company only (by the CompanyName column, tolerant of brand-name
   spelling), and use the BusinessUpdates text + Quarter for that row as a legitimate,
   citable, founder-self-reported source — cite it explicitly as "founder-reported
   business update, <Quarter>" wherever you use a figure or claim from it, distinct from
   MIS-sourced figures.

NON-NEGOTIABLE DATA RULES (zero tolerance):
- Drive is STRICTLY READ-ONLY. Never edit, rename, move, delete, format, annotate,
  upload to, or restructure anything.
- Never fabricate, estimate, infer, or extrapolate a number that is not explicitly
  present in a source (this includes run-rate projections you compute yourself — a
  "projected year-end revenue" is only valid if the source ITSELF states a management
  projection/plan figure; otherwise leave it null and say so).
- A company's legal entity name in its filed financials is frequently DIFFERENT from its
  portfolio brand name (e.g. a brand's MIS may be filed under its holding company's
  registered name). This is normal, not an error — you were told below if this company
  has a known legal-entity-name difference. Do not discard a file just because the name
  on it doesn't literally match the brand name; instead confirm via the folder location
  (you were given the exact folder) and content consistency (email domains, addresses,
  product/brand mentions inside the document).
- Drive folders are sometimes reused for repeated monthly uploads of a mostly-EMPTY
  template (e.g. a "Cashflow_Template" with column headers but no filled figures). Do
  not treat an empty template as "the latest MIS" just because it has a recent
  modifiedTime — identify the most recent file that actually has real filled-in figures.
- Not every company reports monthly. Some folders contain ONLY annual statutory filings
  (audited/unaudited Balance Sheet, P&L, ITR acknowledgement) with no monthly MIS at all.
  If that is what you find, say so plainly (dataFormat: "annual-statutory-only") and do
  NOT invent a monthly revenue/burn figure to fill the schema — leave those fields null
  and explain in dataGapsOrCaveats. A company with only annual filings can still be
  meaningfully summarized on what IS in those filings (revenue, profit, reserves, current
  ratio) — just don't pretend it has monthly granularity it doesn't have.
- Every number you report must be traceable to: Source File -> exact location/line in
  that file -> reporting period. State the reporting period explicitly (never assume the
  most recent upload date equals the most recent reporting period — verify the period
  written inside the file itself).
- If evidence is insufficient for any field, leave it null/empty and say so explicitly in
  dataGapsOrCaveats — never guess to avoid an empty cell in the final table.

REQUIRED FINANCIAL FIELDS — extract exactly as reported, and give ALL monetary values as
PLAIN NUMBERS in the base currency unit stated in the source (e.g. "11,71,00,000" not
"11.71 Cr" — write the raw number 117100000; state the currency separately). Do not
scale, convert, or round beyond what's in the source — plain absolute numbers only, so
downstream code can format and compute without any risk of a transcription/arithmetic
error on your part:
- latestMonthRevenueValue + latestMonthLabel (the most recent single month with an actual
  reported revenue figure)
- ytdRevenueValue (year-to-date revenue as reported; state the FY basis)
- projectedYearEndRevenueValue + projectedYearEndRevenueBasis (ONLY if the source itself
  contains a management projection/plan line for the current fiscal year-end; otherwise
  null + "not available in source")
- cashInBankValue + cashInBankAsOfDate (the exact date/period this cash figure is as of —
  never assume it matches the revenue or burn reporting period; state it separately and
  explicitly)

BURN INTEGRITY (critical — a prior run got this wrong and silently mislabeled a burning
company as "cash-generative"; treat every rule below as load-bearing, not a formality):
- monthlyBurnValue + monthlyBurnPeriodLabel (the exact single month this burn figure is
  for — this may differ from latestMonthLabel used for revenue; state it explicitly) +
  monthlyBurnSourced (true only if this exact monthly figure is literally stated in the
  source, false if you are leaving it null) + burnSignConvention, one of:
  "burn-positive-stated" | "net-cash-flow-converted" | "not-applicable".
  1. SIGN RULE: monthlyBurnValue must ALWAYS be reported in "burn-positive" convention —
     POSITIVE = the company burned/lost cash that month, NEGATIVE or ZERO = the company
     was cash-generative/breakeven that month. Many MIS sheets instead present a "Net
     Cash Flow" or "Change in Cash" line, whose sign convention is the OPPOSITE of this
     (negative = cash went down = burning; positive = cash went up = generative). If the
     source gives you a net-cash-flow-style figure, you MUST FLIP ITS SIGN before writing
     it into monthlyBurnValue, and set burnSignConvention: "net-cash-flow-converted" so
     the flip is auditable downstream. If the source already states an actual "burn"
     figure directly in burn-positive convention, use it as-is and set
     burnSignConvention: "burn-positive-stated". Getting this backwards inverts the
     entire downstream runway calculation without raising any error — there is no
     safety net past this point, so verify the source's own convention before you write
     the number, don't assume.
  2. MONTHLY-VS-CUMULATIVE RULE: monthlyBurnValue must be the burn for that ONE reported
     month only — never a YTD/cumulative/multi-month total, and never a number you
     yourself divided down from a multi-month aggregate. If the source only gives an
     aggregate figure that cannot be cleanly isolated to a single month, leave
     monthlyBurnValue null and explain in dataGapsOrCaveats.
- quarterlyBurnValue + quarterlyBurnSourced (true only if an actual quarterly burn figure
  is stated in the source, in the SAME burn-positive sign convention as above; if not,
  leave both null — the workflow will derive an approximate quarterly figure from your
  monthly figure itself, clearly labeled as derived, so you do not need to compute that
  multiplication yourself)
Do NOT compute runway yourself — report cashInBankValue and monthlyBurnValue accurately
and in the correct sign/period per the rules above; runway is computed deterministically
downstream from those two numbers, so there is no room for a math error there — but only
if your two inputs are correctly signed and are genuinely single-month figures, which is
entirely on you to verify at extraction time.

KPIs: identify the 4-5 KPIs that actually matter for THIS company's business model and
sector (not generic SaaS metrics forced onto a hardware/biotech/spacetech company) —
think about what this company's economic engine runs on (units shipped, active
customers, ARR, utilization, conversion, order book, GMV, clinical/regulatory
milestones, contracted revenue, uptime, whatever is real for this business) and pull
those from the MIS/business update, with their value and period. Search thoroughly
across the whole MIS (not just a summary tab) before concluding a KPI is unavailable.
ONLY if, after a genuinely thorough search, you cannot muster ANY real operating KPI,
fall back to reporting customer pipeline details (leads/opportunities/stage) as the
single last-resort item, and set kpiFallbackUsedCustomerPipeline: true so this is
visible rather than silently treated as equivalent to a real KPI set.

TIME-SERIES ANALYSIS — Month-on-Month and Quarter-on-Quarter ONLY (a VC does not judge a
weekly-cadence early-stage portfolio company YoY; that timeframe is too slow to catch
what actually moved). For both MoM and QoQ (where quarterly data exists), go through the
MIS's own line items end-to-end and build the causal chain, not just the delta:
- What moved revenue (volume vs price vs mix vs one-off/lumpy invoice vs customer
  concentration vs timing/collections vs a genuinely new revenue stream)?
- What moved cost/burn (headcount vs one-off vs vendor/rate change vs R&D ramp vs
  working-capital timing)?
- Does the revenue story reconcile with other lines (e.g. revenue up but receivables/
  deferred revenue also jumped — is it collected cash or booked-only)?
- Any contradiction between the numbers and management's narrative/business update?
Also apply, wherever the source supports it: customer concentration & churn, unit
economics (CAC/LTV/payback — only if literally derivable from source numbers, never
estimated), backlog/order book and revenue visibility, gross margin trend and its
driver, working capital swings, fundraising/cap table events and dilution, and any
regulatory/certification/IP milestone relevant to this sector. Only fill a field where
you have real evidence; leave it null otherwise.

Every insight must ultimately answer, in the narrative fields: what happened -> why ->
why it matters -> investment implication -> one sharp next question for management that
can't be answered just by re-reading the financials.
`

const KPI_ITEM_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    value: { type: 'string' },
    period: { type: 'string' },
  },
  required: ['name', 'value'],
}

const VC_LENS_SCHEMA = {
  type: 'object',
  properties: {
    customerConcentration: { type: ['string', 'null'] },
    unitEconomics: { type: ['string', 'null'] },
    backlogOrderBook: { type: ['string', 'null'] },
    grossMarginDriver: { type: ['string', 'null'] },
    workingCapital: { type: ['string', 'null'] },
    fundraisingCapTable: { type: ['string', 'null'] },
    regulatoryCertificationIP: { type: ['string', 'null'] },
    headcountKeyHires: { type: ['string', 'null'] },
    other: { type: ['string', 'null'] },
  },
}

const COMPANY_SCHEMA = {
  type: 'object',
  properties: {
    cluster: { type: 'string' },
    company: { type: 'string' },
    legalEntityName: { type: ['string', 'null'] },
    dataAvailable: { type: 'boolean' },
    dataFormat: { type: 'string', enum: ['monthly-mis', 'annual-statutory-only', 'template-empty', 'mixed', 'unknown'] },
    reportingPeriod: { type: 'string' },
    sourceFile: { type: 'string' },
    currency: { type: 'string' },
    latestMonthLabel: { type: ['string', 'null'] },
    latestMonthRevenueValue: { type: ['number', 'null'] },
    ytdRevenueValue: { type: ['number', 'null'] },
    projectedYearEndRevenueValue: { type: ['number', 'null'] },
    projectedYearEndRevenueBasis: { type: ['string', 'null'] },
    cashInBankValue: { type: ['number', 'null'] },
    cashInBankAsOfDate: { type: ['string', 'null'] },
    monthlyBurnValue: { type: ['number', 'null'] },
    monthlyBurnPeriodLabel: { type: ['string', 'null'] },
    monthlyBurnSourced: { type: 'boolean' },
    burnSignConvention: { type: 'string', enum: ['burn-positive-stated', 'net-cash-flow-converted', 'not-applicable'] },
    quarterlyBurnValue: { type: ['number', 'null'] },
    quarterlyBurnSourced: { type: 'boolean' },
    kpis: { type: 'array', items: KPI_ITEM_SCHEMA },
    kpiFallbackUsedCustomerPipeline: { type: 'boolean' },
    momDrivers: { type: 'array', items: { type: 'string' } },
    qoqDrivers: { type: 'array', items: { type: 'string' } },
    vcLensNotes: VC_LENS_SCHEMA,
    thesisStatus: { type: 'string', enum: ['Strengthening', 'Stable', 'Weakening', 'Invalidated', 'Insufficient Data'] },
    financialHealth: { type: 'string', enum: ['Green', 'Amber', 'Red', 'Unknown'] },
    nextQuestion: { type: 'string' },
    dataGapsOrCaveats: { type: 'string' },
  },
  required: ['cluster', 'company', 'dataAvailable'],
}

const VALIDATED_COMPANY_SCHEMA = {
  ...COMPANY_SCHEMA,
  properties: { ...COMPANY_SCHEMA.properties, validationNotes: { type: 'string' } },
}

const VALIDATION_SCHEMA = {
  type: 'object',
  properties: {
    companies: { type: 'array', items: VALIDATED_COMPANY_SCHEMA },
    dataIntegrityNotes: { type: 'array', items: { type: 'string' }, description: 'Any figure you corrected or removed during validation, and why' },
  },
  required: ['companies'],
}
// NOTE: portfolioFlags (the "Flags this week" cross-portfolio summary) was
// intentionally removed from this schema and from the email — the user asked
// to drop it entirely to cut compute/tokens and runtime. Do not re-add it
// without being asked; every fact it used to surface (burn corrections,
// access gaps, weakening theses) is still fully present per-company in
// dataGapsOrCaveats/validationNotes and each company's own table row, so
// nothing is lost by removing the separate synthesis pass.

function companyPrompt(clusterName, companyInfo, a) {
  const secondary = SECONDARY_LENS[companyInfo.brand]
  return `${FRAMEWORK_CORE}

ASSIGNMENT: You are the ${clusterName} Cluster SubAgent for UIV Fund III, analyzing
exactly ONE company: ${companyInfo.brand}${companyInfo.legalEntityNameIfDifferent ? ` (legal entity: ${companyInfo.legalEntityNameIfDifferent})` : ''}.
${secondary ? `NOTE: this company also has real exposure to the "${secondary}" domain — apply that lens too where the source supports it, but this is still a single company analysis, not two.` : ''}

DRIVE FOLDER (use exactly this, read-only, do not search elsewhere): folder ID
"${companyInfo.folderId}" (${companyInfo.folderTitle ? `Drive folder title: "${companyInfo.folderTitle}"` : 'title unknown, trust the ID'}).
https://drive.google.com/drive/folders/${companyInfo.folderId}
${companyInfo.notesForAnalystPrompt ? `KNOWN SITUATION IN THIS FOLDER (from prior reconnaissance, treat as reliable context, not as a
substitute for opening the files yourself): ${companyInfo.notesForAnalystPrompt}` : ''}
${companyInfo.dataFormatHint ? `Expected dataFormat: ${companyInfo.dataFormatHint} (confirm by actually opening the latest substantive file).` : ''}

SECTOR LENS: interpret this company strictly through ${clusterName} economics — the
revenue model, cost structure, capital intensity, and sales/procurement/regulatory cycle
that actually apply here — not generic SaaS assumptions.

COVERAGE WEEK: ${a.coverageWeekLabel} (${a.coverageStart} to ${a.coverageEnd}). This is
for the email header only — always use the LATEST AVAILABLE substantive file in this
company's folder regardless of when it was uploaded, and report the reporting period
that is actually inside that file.

OUTPUT: Return the full result via the required structured schema only — plain numbers
for every monetary field (see FRAMEWORK_CORE), and null/false with an explanation in
dataGapsOrCaveats for anything genuinely unavailable. Do not leave dataAvailable true if
you found nothing usable.`
}

function validationPrompt(clusterName, companyResults, a) {
  return `${FRAMEWORK_CORE}

You are the MASTER AGENT for UIV Fund III's weekly portfolio intelligence email,
validating ONLY the "${clusterName}" cluster (validation runs per-cluster, in parallel,
so each call stays well under the response-size limit — do not worry about or reference
any other cluster). Cluster SubAgents have completed isolated, one-company-at-a-time
analyses for coverage week ${a.coverageWeekLabel} (${a.coverageStart} to
${a.coverageEnd}). Their raw structured outputs for THIS CLUSTER ONLY are below.

RAW SUBAGENT OUTPUTS (this cluster only):
${JSON.stringify(companyResults.filter(Boolean), null, 2)}

YOUR JOB — validate, do not blindly forward:
- Check each company's numbers for internal consistency (e.g. does a stated MoM growth
  percentage actually match the two revenue figures given; does a "Green" health flag
  make sense next to a shrinking cash balance and no runway visibility).
- If a figure is unsupported, implausible, or contradicts other fields from the SAME
  company's own output, correct it if the correct value is derivable from other fields
  already present, or null it out and explain in dataIntegrityNotes — never let an
  unsupported number pass through silently. Do not drop a company from the output for
  having gaps — every company must appear in the final email (this is a full portfolio
  one-pager, not a highlights-only digest); just be honest about what's missing.

BURN INTEGRITY CHECKS (mandatory, run these for every company with a non-null
monthlyBurnValue — this is the #1 source of a previously-shipped wrong output, do not
skip this even under time/token pressure):
  1. Sign check: if this company's own momDrivers/qoqDrivers/KPI narrative states cash
     grew that month while monthlyBurnValue is positive (or states cash fell while
     monthlyBurnValue is negative/zero), the sign is very likely wrong for the stated
     burnSignConvention — flip it if the correct direction is clearly determinable from
     the SubAgent's own output, otherwise null both monthlyBurnValue and
     quarterlyBurnValue and explain in dataIntegrityNotes.
  2. Sourced-flag contradiction: if monthlyBurnSourced or quarterlyBurnSourced is false
     but its paired value is non-null, that is a contradiction (an unlabeled estimate
     slipped through) — null the value and explain in dataIntegrityNotes.
  3. Plausibility check: mentally divide cashInBankValue by monthlyBurnValue (when both
     are non-null and burn is positive) — if that implies an obviously implausible
     runway (under ~0.1 months, i.e. cash is a tiny fraction of one month's burn, or over
     ~120 months, i.e. burn is a rounding error against cash), treat this as a likely
     scale or sign error in the underlying extraction; correct it if derivable from other
     fields in the same output, else null both cashInBankValue and monthlyBurnValue and
     explain in dataIntegrityNotes rather than letting an implausible runway reach the
     email silently.
  4. Period-alignment check: if cashInBankAsOfDate and monthlyBurnPeriodLabel clearly
     refer to periods more than about a month apart, keep both figures (don't null them)
     but add a short note in that company's dataGapsOrCaveats flagging the mismatch so
     it's visible to the reader rather than hidden.
  5. Monthly-vs-cumulative smell test: if monthlyBurnValue looks like it could plausibly
     be a multi-month or YTD aggregate rather than one month's figure (e.g. it is many
     multiples of what the company's own revenue or cost-line scale would suggest for a
     single month), null it and explain rather than let a mis-scaled figure pass.

- Do NOT recompute or restate runway — that is done deterministically downstream from
  cashInBankValue/monthlyBurnValue; do not touch those two fields' meaning beyond the
  integrity checks above.
- Tighten momDrivers/qoqDrivers/kpis/vcLensNotes text to be crisp, bullet-ready, and free
  of generic filler — every bullet must cite a real number or fact from that company's
  own SubAgent output, nothing invented at this stage either.
- Do NOT produce a separate cross-portfolio flags/summary section — none is needed;
  every material fact (burn corrections, access gaps, weakening theses, Red health)
  belongs in that company's own dataGapsOrCaveats/validationNotes and its table row.

Return via the required schema: companies (same objects, corrected/tightened, each with
a short validationNotes stating what if anything you changed), dataIntegrityNotes — all
scoped to this cluster's companies only.`
}

function emailSendPrompt(subject, htmlBody, plainText, a) {
  return `Send the following email using the Gmail MCP tool (search tools for "send" if
not already loaded, e.g. a tool named like "...send_message"). Send exactly this
content, do not alter it — pass the HTML as htmlBody and the plain text as body.

To: ${a.recipientEmail}
Subject: ${subject}

HTML body (send as htmlBody, verbatim):
${htmlBody}

Plain-text fallback (send as body, verbatim):
${plainText}

After sending, report back the message id or confirmation, or the exact error if it
failed.`
}

// ===========================================================================
// PART 2 — deterministic math/formatting (no LLM in this path, by design).
// v3 CHANGES: (a) computeRunway now distinguishes breakeven (burn===0) from
// cash-generative (burn<0) instead of conflating them; (b) cashInBankAsOfDate
// and monthlyBurnPeriodLabel are now surfaced in the output so a period
// mismatch is visible instead of hidden; (c) the HTML table is rebuilt as a
// 2-column-per-company layout (Revenue/Cashflow | KPIs/Business Updates) for
// mobile + laptop readability, replacing the old 9-column + 5-column table
// pair. The actual arithmetic (cash ÷ burn, ×3 for derived quarterly) is
// unchanged — it was already correct; only the upstream inputs and display
// were the problem, per the diagnosis this version fixes.
// ===========================================================================
function fmtMoney(value, currency) {
  if (value === null || value === undefined || Number.isNaN(value)) return 'N/A'
  const cur = String(currency || '').toUpperCase()
  const isINR = cur.includes('INR') || cur.includes('RS') || cur === '₹'
  if (isINR) {
    const abs = Math.abs(value)
    let scaled = value, suffix = ''
    if (abs >= 1e7) { scaled = value / 1e7; suffix = ' Cr' }
    else if (abs >= 1e5) { scaled = value / 1e5; suffix = ' L' }
    return `₹${scaled.toLocaleString('en-IN', { maximumFractionDigits: 2 })}${suffix}`
  }
  const symbol = cur.includes('USD') ? '$' : (currency ? `${currency} ` : '')
  return `${symbol}${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
}

function computeRunway(cash, burn) {
  if (cash === null || cash === undefined) return 'N/A (cash not disclosed)'
  if (burn === null || burn === undefined) return 'N/A (burn not disclosed)'
  if (burn < 0) return 'Cash-generative (building cash)'
  if (burn === 0) return 'Breakeven (no burn)'
  const months = cash / burn
  return `${months.toFixed(1)} mo`
}

function resolveQuarterlyBurn(c) {
  if (c.quarterlyBurnSourced && c.quarterlyBurnValue != null) {
    return { value: c.quarterlyBurnValue, derived: false }
  }
  if (c.monthlyBurnValue != null) {
    return { value: c.monthlyBurnValue * 3, derived: true }
  }
  return { value: null, derived: false }
}

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function healthBadge(h) {
  const colors = { Green: '#1a7f37', Amber: '#b98900', Red: '#c9184c', Unknown: '#6b7280' }
  const c = colors[h] || colors.Unknown
  return `<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;color:#fff;background:${c};white-space:nowrap;">${esc(h || 'Unknown')}</span>`
}

function bulletList(items) {
  const list = (items || []).filter(Boolean)
  if (!list.length) return '<span style="color:#9ca3af;font-style:italic;">None reported</span>'
  return `<ul style="margin:0;padding-left:16px;">${list.map(i => `<li style="margin-bottom:3px;">${esc(i)}</li>`).join('')}</ul>`
}

// One bold-label bullet, value pre-escaped by the caller field-by-field so we
// can safely mix a bold label with an escaped value without double-escaping.
function labelItem(label, valueHtml) {
  return `<li style="margin-bottom:3px;"><b>${esc(label)}:</b> ${valueHtml}</li>`
}

function financialsCellHtml(c) {
  const qb = resolveQuarterlyBurn(c)
  const items = []
  items.push(labelItem(
    `Latest Month Rev.${c.latestMonthLabel ? ` (${esc(c.latestMonthLabel)})` : ''}`,
    c.latestMonthRevenueValue != null ? fmtMoney(c.latestMonthRevenueValue, c.currency) : 'N/A'
  ))
  items.push(labelItem('YTD Rev.', fmtMoney(c.ytdRevenueValue, c.currency)))
  items.push(labelItem(
    'Proj. Year-End Rev.',
    c.projectedYearEndRevenueValue != null
      ? fmtMoney(c.projectedYearEndRevenueValue, c.currency)
      : '<span style="color:#9ca3af;font-style:italic;">N/A</span>'
  ))
  items.push(labelItem(
    `Cash in Bank${c.cashInBankAsOfDate ? ` (as of ${esc(c.cashInBankAsOfDate)})` : ''}`,
    fmtMoney(c.cashInBankValue, c.currency)
  ))
  items.push(labelItem(
    `Monthly Burn${c.monthlyBurnPeriodLabel ? ` (${esc(c.monthlyBurnPeriodLabel)})` : ''}`,
    fmtMoney(c.monthlyBurnValue, c.currency)
  ))
  items.push(labelItem(
    'Qtly Burn',
    qb.value != null ? fmtMoney(qb.value, c.currency) + (qb.derived ? ' <span style="color:#9ca3af;">(derived)</span>' : '') : 'N/A'
  ))
  items.push(labelItem('Runway', computeRunway(c.cashInBankValue, c.monthlyBurnValue)))
  return `<ul style="margin:0;padding-left:16px;">${items.join('')}</ul>`
}

// Bold-label bullet list, same visual style as financialsCellHtml — CRISP
// version: the SubAgent/Master Agent still compute the full kpis/momDrivers/
// qoqDrivers/nextQuestion arrays in full depth (that full analysis is what
// backs the burn-integrity/accuracy checks and still lives in the raw
// validated JSON) but the EMAIL CELL only surfaces the top few, highest-
// signal items — a straight selection/truncation of already-verified text,
// never a reworded or newly-generated summary, so this cannot introduce a
// new factual error or hallucination. Cap: up to 3 KPIs (name: value only,
// no period suffix), the single lead MoM driver, the single lead QoQ driver,
// and the next question — matching the crisp reference format the user
// approved, not the exhaustive one-bullet-per-item dump this replaced.
const KPI_CELL_MAX_KPIS = 3
function kpiCellHtml(c) {
  const items = []
  for (const k of (c.kpis || []).slice(0, KPI_CELL_MAX_KPIS)) {
    items.push(labelItem('KPI', `${esc(k.name)}: ${esc(k.value)}`))
  }
  if (c.kpiFallbackUsedCustomerPipeline) {
    items.push(`<li style="margin-bottom:3px;color:#b98900;">* No operating KPI could be found; customer pipeline shown as last resort.</li>`)
  }
  if ((c.momDrivers || []).length) items.push(labelItem('MoM', esc(c.momDrivers[0])))
  if ((c.qoqDrivers || []).length) items.push(labelItem('QoQ', esc(c.qoqDrivers[0])))
  if (c.nextQuestion) items.push(labelItem('Next Q', esc(c.nextQuestion)))
  if (!items.length) return '<span style="color:#9ca3af;font-style:italic;">None reported</span>'
  return `<ul style="margin:0;padding-left:16px;">${items.join('')}</ul>`
}

function buildHtmlEmail(validated, a) {
  const byCluster = new Map()
  for (const c of validated.companies) {
    if (!byCluster.has(c.cluster)) byCluster.set(c.cluster, [])
    byCluster.get(c.cluster).push(c)
  }
  const clusterOrder = CLUSTERS.map(cl => cl.name).filter(name => byCluster.has(name))
  for (const name of byCluster.keys()) if (!clusterOrder.includes(name)) clusterOrder.push(name)

  const sections = clusterOrder.map(clusterName => {
    const rows = byCluster.get(clusterName)
    const rowsHtml = rows.map(c => `<tr>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;vertical-align:top;width:16%;">
        <div style="font-weight:700;margin-bottom:6px;">${esc(c.company)}</div>
        ${healthBadge(c.financialHealth)}
      </td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;vertical-align:top;width:42%;font-size:12px;">${financialsCellHtml(c)}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;vertical-align:top;width:42%;font-size:12px;">${kpiCellHtml(c)}</td>
    </tr>`).join('')

    return `
    <h2 style="font-size:16px;margin:24px 0 8px;color:#111827;border-bottom:2px solid #111827;padding-bottom:4px;">${esc(clusterName)}</h2>
    <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:10px;table-layout:fixed;">
      <thead><tr style="background:#f3f4f6;text-align:left;">
        <th style="padding:8px;">Company</th>
        <th style="padding:8px;">Revenue / Cashflow</th>
        <th style="padding:8px;">KPIs / Business Updates</th>
      </tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>`
  }).join('')

  const gapNotes = validated.companies.filter(c => c.dataGapsOrCaveats).map(c => `${c.company}: ${c.dataGapsOrCaveats}`)
  const integrityNotes = validated.dataIntegrityNotes || []
  const footerNotes = [...integrityNotes, ...gapNotes]

  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;max-width:900px;margin:0 auto;">
    <style>
      @media (max-width: 600px) {
        table[data-fund3] { table-layout: auto !important; }
        table[data-fund3] td, table[data-fund3] th { display: block; width: 100% !important; box-sizing: border-box; }
        table[data-fund3] thead { display: none; }
        table[data-fund3] tr { display: block; border-bottom: 2px solid #d1d5db; padding-bottom: 6px; margin-bottom: 6px; }
      }
    </style>
    <h1 style="font-size:20px;margin-bottom:2px;">UIV Fund III — Weekly Portfolio Insights</h1>
    <div style="color:#6b7280;font-size:13px;margin-bottom:16px;">Coverage week: ${esc(a.coverageWeekLabel)}</div>
    ${sections.replaceAll('<table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:10px;table-layout:fixed;">', '<table data-fund3 style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:10px;table-layout:fixed;">')}
    <div style="margin-top:20px;padding-top:10px;border-top:1px solid #e5e7eb;font-size:11px;color:#6b7280;">
      <div><b>Runway</b> = Cash in Bank ÷ Monthly Burn, computed programmatically from the source-reported figures above (never hand-calculated by the analyst); burn is verified in a burn-positive sign convention and cross-checked for plausibility before it reaches this table. "(derived)" quarterly burn = 3× latest monthly burn where no separate quarterly figure was stated in source. * = no operating KPI could be found after a thorough check; customer pipeline shown as last resort.</div>
      ${footerNotes.length ? `<div style="margin-top:8px;"><b>Data quality notes:</b>${bulletList(footerNotes)}</div>` : ''}
      <div style="margin-top:8px;">All figures sourced read-only from Drive and the MIS Quarterly Business Updates sheet. No figure is estimated, extrapolated, or fabricated; unavailable data is shown as N/A.</div>
    </div>
  </div>`
}

function buildPlainTextFallback(validated, a) {
  const lines = [`UIV Fund III — Weekly Portfolio Insights | ${a.coverageWeekLabel}`, '']
  const byCluster = new Map()
  for (const c of validated.companies) {
    if (!byCluster.has(c.cluster)) byCluster.set(c.cluster, [])
    byCluster.get(c.cluster).push(c)
  }
  for (const [cluster, companies] of byCluster) {
    lines.push(`=== ${cluster} ===`)
    for (const c of companies) {
      const qb = resolveQuarterlyBurn(c)
      lines.push(`${c.company} [${c.financialHealth || 'Unknown'}]`)
      lines.push(`  REVENUE/CASHFLOW:`)
      lines.push(`    Latest month (${c.latestMonthLabel || 'N/A'}): ${fmtMoney(c.latestMonthRevenueValue, c.currency)} | YTD: ${fmtMoney(c.ytdRevenueValue, c.currency)} | Proj. YE: ${c.projectedYearEndRevenueValue != null ? fmtMoney(c.projectedYearEndRevenueValue, c.currency) : 'N/A'}`)
      lines.push(`    Cash (as of ${c.cashInBankAsOfDate || 'N/A'}): ${fmtMoney(c.cashInBankValue, c.currency)} | Monthly burn (${c.monthlyBurnPeriodLabel || 'N/A'}): ${fmtMoney(c.monthlyBurnValue, c.currency)} | Qtly burn: ${qb.value != null ? fmtMoney(qb.value, c.currency) + (qb.derived ? ' (derived)' : '') : 'N/A'} | Runway: ${computeRunway(c.cashInBankValue, c.monthlyBurnValue)}`)
      lines.push(`  KPIS/BUSINESS UPDATES:`)
      if ((c.kpis || []).length) lines.push(`    KPIs: ${c.kpis.map(k => `${k.name}: ${k.value}`).join('; ')}`)
      if ((c.momDrivers || []).length) lines.push(`    MoM: ${c.momDrivers.join(' | ')}`)
      if ((c.qoqDrivers || []).length) lines.push(`    QoQ: ${c.qoqDrivers.join(' | ')}`)
      if (c.nextQuestion) lines.push(`    Next Q: ${c.nextQuestion}`)
      lines.push('')
    }
  }
  return lines.join('\n')
}

// ===========================================================================
// PART 3 — main (unchanged control flow from v2)
// ===========================================================================
const a = args || {}
if (!a.coverageWeekLabel || !a.coverageStart || !a.coverageEnd || !a.recipientEmail) {
  throw new Error('Missing required args: recipientEmail, coverageWeekLabel, coverageStart, coverageEnd')
}

const workItems = []
const noSourceStubs = []
for (const cluster of CLUSTERS) {
  for (const brand of cluster.companies) {
    const info = COMPANY_SOURCE_MAP[brand]
    if (!info || !info.folderId || info.skipThisRun) {
      noSourceStubs.push({
        cluster: cluster.name,
        company: brand,
        dataAvailable: false,
        dataFormat: 'unknown',
        reportingPeriod: '',
        sourceFile: '',
        currency: '',
        kpis: [],
        kpiFallbackUsedCustomerPipeline: false,
        momDrivers: [],
        qoqDrivers: [],
        vcLensNotes: {},
        thesisStatus: 'Insufficient Data',
        financialHealth: 'Unknown',
        nextQuestion: '',
        dataGapsOrCaveats: info && info.skipThisRun
          ? 'Skipped for this run only at the user\'s request after repeated transient (spend-limit) failures — not a data problem with the company; will be analyzed normally next run.'
          : (info && info.notesForAnalystPrompt) || `No Drive folder could be located for ${brand} under the authorized portfolio root.`,
      })
      continue
    }
    workItems.push({ cluster: cluster.name, brand, info })
  }
}
if (noSourceStubs.length) {
  log(`No verified Drive source for ${noSourceStubs.length} companies — will appear in the email as explicit no-data rows: ${noSourceStubs.map(s => s.company).join(', ')}`)
}

phase('Analyze')
log(`Analyzing ${workItems.length} companies (with a live source) across ${CLUSTERS.length} clusters for ${a.coverageWeekLabel}`)
const analyzedResults = await parallel(
  workItems.map(item => () =>
    agent(companyPrompt(item.cluster, { brand: item.brand, ...item.info }, a), {
      label: `${item.cluster}:${item.brand}`,
      phase: 'Analyze',
      schema: COMPANY_SCHEMA,
    })
  )
)

const successfulResults = []
const failureStubs = []
analyzedResults.forEach((r, i) => {
  if (r) { successfulResults.push(r); return }
  const item = workItems[i]
  failureStubs.push({
    cluster: item.cluster,
    company: item.brand,
    dataAvailable: false,
    dataFormat: 'unknown',
    reportingPeriod: '',
    sourceFile: '',
    currency: '',
    kpis: [],
    kpiFallbackUsedCustomerPipeline: false,
    momDrivers: [],
    qoqDrivers: [],
    vcLensNotes: {},
    thesisStatus: 'Insufficient Data',
    financialHealth: 'Unknown',
    nextQuestion: '',
    dataGapsOrCaveats: 'Analysis failed this run due to a transient error (e.g. an API/usage-limit issue), not a data problem with the company itself. Re-run the workflow to retry.',
  })
})
if (failureStubs.length) {
  log(`${failureStubs.length}/${workItems.length} company analyses failed this run (transient error, not fabricated as "no news"): ${failureStubs.map(s => s.company).join(', ')}`)
}
const failureRate = workItems.length ? failureStubs.length / workItems.length : 0
if (failureRate > 0.5) {
  throw new Error(`${failureStubs.length} of ${workItems.length} company analyses failed this run (likely a transient API/usage-limit issue) — aborting before sending an incomplete digest instead of emailing it anyway. Re-run the workflow once the underlying issue is resolved.`)
}
const companyResults = [...noSourceStubs, ...successfulResults, ...failureStubs]

phase('Validate')
// Validate per-cluster (parallel) rather than one call across all ~19-23
// companies at once — a single monolithic call previously exceeded the
// 64,000 output-token response cap and killed the whole run. Splitting by
// cluster keeps each call's output small (at most ~6 companies) and lets
// clusters validate in parallel, which is also faster.
const resultsByCluster = new Map()
for (const c of companyResults) {
  if (!resultsByCluster.has(c.cluster)) resultsByCluster.set(c.cluster, [])
  resultsByCluster.get(c.cluster).push(c)
}
const clusterEntries = [...resultsByCluster.entries()]
const clusterValidations = await parallel(
  clusterEntries.map(([clusterName, companies]) => () =>
    agent(validationPrompt(clusterName, companies, a), {
      label: `Validate:${clusterName}`,
      phase: 'Validate',
      schema: VALIDATION_SCHEMA,
    })
  )
)

const validated = { companies: [], dataIntegrityNotes: [] }
let anyClusterValidated = false
clusterValidations.forEach((v, i) => {
  const [clusterName, companies] = clusterEntries[i]
  if (v && Array.isArray(v.companies) && v.companies.length) {
    anyClusterValidated = true
    validated.companies.push(...v.companies)
    validated.dataIntegrityNotes.push(...(v.dataIntegrityNotes || []))
  } else {
    // This one cluster's validation failed — fall back to its raw,
    // unvalidated SubAgent output rather than dropping those companies or
    // failing the entire run; flag it explicitly so it's visible.
    validated.companies.push(...companies.map(c => ({ ...c, validationNotes: 'Validation step failed for this cluster this run (transient error) — showing unvalidated SubAgent output as-is.' })))
    validated.dataIntegrityNotes.push(`Validation failed for cluster "${clusterName}" this run (transient error) — its companies are shown with unvalidated (SubAgent-reported, not cross-checked) figures below.`)
  }
})
if (!anyClusterValidated) {
  throw new Error('Every cluster validation call failed this run (likely a transient API/usage-limit issue) — no email was sent. Re-run the workflow.')
}
log(`Validated ${validated.companies.length} companies across ${clusterEntries.length} clusters.`)

phase('Email')
// Fixed subject, always exactly this — never date/week-suffixed — per user
// instruction, so the weekly email is easy to filter/recognize in the inbox.
const subject = `Revenue/Cashflows/KPIs Fund III`
const htmlBody = buildHtmlEmail(validated, a)
const plainText = buildPlainTextFallback(validated, a)
const sendResult = await agent(emailSendPrompt(subject, htmlBody, plainText, a), { phase: 'Email' })
if (!sendResult) {
  log('WARNING: the email-send agent call returned null (likely a transient error) — the email may not actually have been sent; verify the inbox before assuming it went out.')
}

return { subject, htmlBody, plainText, sendResult, companyResults: companyResults.filter(Boolean), validated }

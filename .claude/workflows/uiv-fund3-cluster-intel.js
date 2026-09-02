export const meta = {
  name: 'uiv-fund3-cluster-intel',
  description: 'UIV Fund III weekly portfolio intelligence, v2: cluster SubAgents analyze each company in full isolation (financials, burn/runway, KPIs, MoM/QoQ driver analysis) read-only from a verified Drive folder map + the MIS business-update Sheet, a Master Agent validates every figure, then a one-pager HTML digest (tabulated, cluster by cluster) is emailed.',
  whenToUse: 'Run weekly to produce and send the UIV Fund III Weekly Portfolio Insights email, clustered by the 9 Fund III sector clusters.',
  phases: [
    { title: 'Analyze' },
    { title: 'Validate' },
    { title: 'Email' },
  ],
}

// ===========================================================================
// PART 1 — verified source map. Every company here was resolved to an exact
// Drive folder ID by direct reconnaissance (not name-guessing at runtime) to
// eliminate the cross-contamination / wrong-folder bug seen in the v1 agent
// (root folder has NO "MIS - Portfolio Companies" / "MIS - Auto Upload"
// subfolders — company folders sit directly under the root; v1 told
// subagents to look for those subfolders, which don't exist, so subagents
// fell back to unscoped Drive-wide search and occasionally picked up
// unrelated content). Do not let a per-company SubAgent re-discover the
// folder by title search — always hand it the folderId directly.
// ===========================================================================
const DRIVE_ROOT_ID = '1uzeYKzH4uNIkUsN2yfYtGX-Gu2qwl2-Y'
const MIS_SHEET_ID = '1IcnFB3af0LmT3FkFYJu_R9KUJEgZvwz7fyLDfj3X6u0'

// Filled in from verified Drive reconnaissance (2026-08-19) — see notes for
// per-company quirks (legal-entity-name mismatches, annual-only filings,
// empty template files to ignore, etc.) that MUST be passed into that
// company's own prompt so its SubAgent doesn't misread the situation as an
// error or, worse, paper over it with an invented number.
// `folderId: null` means the company could NOT be located anywhere under the
// authorized portfolio root — those companies get a deterministic "no data"
// stub row in the email (see main loop below) rather than an agent call,
// since there is nothing to analyze and no source to search.
// CORRECTION (2026-08-19): the user's first cluster table mixed in Fund I/II
// companies. This map now covers ONLY the 23 confirmed Fund III companies the
// user re-shared. The 9-cluster taxonomy is unchanged — several clusters
// (Energy, Industry 4.0/Advanced Manufacturing) simply have zero Fund III
// members and so contribute no rows this run; that's expected, not a bug.
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
    // Skipped for this run only (user asked not to wait on it after repeated
    // transient spend-limit failures) — remove skipThisRun on the next run
    // so it gets analyzed normally again.
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
  { name: 'Fintech & B2B SaaS', companies: ['Kluisz', 'DeepAlgo', 'Pelocal', 'Qubehealth', 'StampMyVisa', 'Zealthix'] },
  { name: 'DefenceTech', companies: ['Qdit Labs', 'Eyerov', 'BonV Aero', 'Venttup'] },
  { name: 'SpaceTech', companies: ['OrbitAid', 'Takeme2Space', 'Satleo'] },
  { name: 'Semiconductors', companies: ['Netrasemi', 'Vervesemi'] },
  { name: 'HealthTech', companies: ['Piscium', 'BioScan', 'Exsure', 'Mediseva'] },
  { name: 'Energy', companies: [] },
  { name: 'AI (Vertical AI + AI Infra)', companies: ['Vodex'] },
  { name: 'Climate / Agri Tech', companies: ['Aurassure', 'Verdant Impact', 'Cropcoin'] },
  { name: 'Industry 4.0 / Advanced Manufacturing', companies: [] },
]
// Kluisz, StampMyVisa and Piscium were not named in the user's 9-cluster
// table at all (they predate it) — placed here by best fit against their
// prior sector tags (CloudTech->Fintech&B2BSaaS, TravelTech->Fintech&B2BSaaS,
// MedTech->HealthTech) since the user asked to keep the same 9 clusters
// rather than add new ones. Revisit if the user places them differently.
// Cross-listed in the source cluster table (appear under >1 cluster there):
// Venttup and Aurassure (also Industry 4.0), DeepAlgo (also AI). Each is
// analyzed ONCE under its primary cluster above, with its SubAgent told
// about the secondary sector lens so it can note cross-cutting exposure
// without a second full pass.
const SECONDARY_LENS = {
  Venttup: 'Industry 4.0 / Advanced Manufacturing',
  Aurassure: 'Industry 4.0 / Advanced Manufacturing',
  DeepAlgo: 'AI (Vertical AI + AI Infra)',
}

// ---------------------------------------------------------------------------
// Shared analytical framework injected into every per-company Cluster
// SubAgent's prompt.
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
- cashInBankValue + cashInBankAsOfDate
- monthlyBurnValue (net cash burn for the latest reported month; negative/zero means
  cash-generative) + monthlyBurnSourced (true only if this exact monthly figure is
  literally stated in the source, false if you are leaving it null)
- quarterlyBurnValue + quarterlyBurnSourced (true only if an actual quarterly burn figure
  is stated in the source; if not, leave both null — the workflow will derive an
  approximate quarterly figure from your monthly figure itself, clearly labeled as
  derived, so you do not need to compute that multiplication yourself)
Do NOT compute runway yourself — just report cashInBankValue and monthlyBurnValue
accurately; runway is computed deterministically downstream from those two numbers so
there is no room for a math error.

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
    monthlyBurnSourced: { type: 'boolean' },
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
    portfolioFlags: { type: 'array', items: { type: 'string' }, description: 'Short cross-portfolio callouts for this week (biggest movers, red flags), grounded only in the validated data' },
    dataIntegrityNotes: { type: 'array', items: { type: 'string' }, description: 'Any figure you corrected or removed during validation, and why' },
  },
  required: ['companies'],
}

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

function validationPrompt(companyResults, a) {
  return `${FRAMEWORK_CORE}

You are the MASTER AGENT for UIV Fund III's weekly portfolio intelligence email. Cluster
SubAgents have completed isolated, one-company-at-a-time analyses for coverage week
${a.coverageWeekLabel} (${a.coverageStart} to ${a.coverageEnd}). Their raw structured
outputs are below.

RAW SUBAGENT OUTPUTS:
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
- Do NOT recompute or restate runway — that is done deterministically downstream from
  cashInBankValue/monthlyBurnValue; do not touch those two fields' meaning.
- Tighten momDrivers/qoqDrivers/kpis/vcLensNotes text to be crisp, bullet-ready, and free
  of generic filler — every bullet must cite a real number or fact from that company's
  own SubAgent output, nothing invented at this stage either.
- Write portfolioFlags: a handful of the most decision-relevant cross-portfolio callouts
  for this week (biggest revenue movers, any Red financialHealth, any runway concern) —
  grounded only in the data present, not speculation.

Return via the required schema: companies (same objects, corrected/tightened, each with
a short validationNotes stating what if anything you changed), portfolioFlags,
dataIntegrityNotes.`
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
// PART 2 — deterministic math/formatting (no LLM in this path, by design: the
// user specifically flagged runway math and number fidelity as broken before,
// so every number that reaches the email is computed/formatted here in code
// from the validated JSON, never re-typed by a model).
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
  if (burn <= 0) return 'Cash-generative (no burn)'
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
  return `<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;color:#fff;background:${c};">${esc(h || 'Unknown')}</span>`
}

function bulletList(items) {
  const list = (items || []).filter(Boolean)
  if (!list.length) return '<span style="color:#9ca3af;font-style:italic;">None reported</span>'
  return `<ul style="margin:0;padding-left:16px;">${list.map(i => `<li style="margin-bottom:3px;">${esc(i)}</li>`).join('')}</ul>`
}

function buildHtmlEmail(validated, a) {
  const byCluster = new Map()
  for (const c of validated.companies) {
    if (!byCluster.has(c.cluster)) byCluster.set(c.cluster, [])
    byCluster.get(c.cluster).push(c)
  }
  const clusterOrder = CLUSTERS.map(cl => cl.name).filter(name => byCluster.has(name))
  for (const name of byCluster.keys()) if (!clusterOrder.includes(name)) clusterOrder.push(name)

  const flagsHtml = (validated.portfolioFlags || []).length
    ? `<div style="background:#fef9e7;border:1px solid #f0d878;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
         <div style="font-weight:700;font-size:13px;margin-bottom:6px;color:#5c4a00;">Flags this week</div>
         ${bulletList(validated.portfolioFlags)}
       </div>`
    : ''

  const sections = clusterOrder.map(clusterName => {
    const rows = byCluster.get(clusterName)
    const finRows = rows.map(c => {
      const qb = resolveQuarterlyBurn(c)
      return `<tr>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-weight:600;">${esc(c.company)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${esc(c.latestMonthLabel) || 'N/A'}${c.latestMonthRevenueValue != null ? `<br>${fmtMoney(c.latestMonthRevenueValue, c.currency)}` : '<br>N/A'}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${fmtMoney(c.ytdRevenueValue, c.currency)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${c.projectedYearEndRevenueValue != null ? fmtMoney(c.projectedYearEndRevenueValue, c.currency) : '<span style="color:#9ca3af;font-style:italic;">N/A</span>'}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${fmtMoney(c.cashInBankValue, c.currency)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${fmtMoney(c.monthlyBurnValue, c.currency)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${qb.value != null ? fmtMoney(qb.value, c.currency) + (qb.derived ? ' <span style="color:#9ca3af;">(derived)</span>' : '') : 'N/A'}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${computeRunway(c.cashInBankValue, c.monthlyBurnValue)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:center;">${healthBadge(c.financialHealth)}</td>
      </tr>`
    }).join('')

    const kpiRows = rows.map(c => `<tr>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-weight:600;vertical-align:top;">${esc(c.company)}${c.kpiFallbackUsedCustomerPipeline ? ' <span title="No operating KPI could be found; showing pipeline as last resort" style="color:#b98900;">*</span>' : ''}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;vertical-align:top;">${bulletList((c.kpis || []).map(k => `${k.name}: ${k.value}${k.period ? ` (${k.period})` : ''}`))}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;vertical-align:top;">${bulletList(c.momDrivers)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;vertical-align:top;">${bulletList(c.qoqDrivers)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;vertical-align:top;font-style:italic;">${esc(c.nextQuestion) || ''}</td>
    </tr>`).join('')

    return `
    <h2 style="font-size:16px;margin:24px 0 8px;color:#111827;border-bottom:2px solid #111827;padding-bottom:4px;">${esc(clusterName)}</h2>
    <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:10px;">
      <thead><tr style="background:#f3f4f6;text-align:left;">
        <th style="padding:6px 8px;">Company</th><th style="padding:6px 8px;">Latest Month Rev.</th>
        <th style="padding:6px 8px;">YTD Rev.</th><th style="padding:6px 8px;">Proj. Year-End Rev.</th>
        <th style="padding:6px 8px;">Cash in Bank</th><th style="padding:6px 8px;">Monthly Burn</th>
        <th style="padding:6px 8px;">Qtly Burn</th><th style="padding:6px 8px;">Runway</th>
        <th style="padding:6px 8px;text-align:center;">Health</th>
      </tr></thead>
      <tbody>${finRows}</tbody>
    </table>
    <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:10px;">
      <thead><tr style="background:#f9fafb;text-align:left;">
        <th style="padding:6px 8px;width:14%;">Company</th><th style="padding:6px 8px;width:22%;">Top KPIs</th>
        <th style="padding:6px 8px;width:20%;">MoM Drivers</th><th style="padding:6px 8px;width:20%;">QoQ Drivers</th>
        <th style="padding:6px 8px;width:24%;">Next Question</th>
      </tr></thead>
      <tbody>${kpiRows}</tbody>
    </table>`
  }).join('')

  const gapNotes = validated.companies.filter(c => c.dataGapsOrCaveats).map(c => `${c.company}: ${c.dataGapsOrCaveats}`)
  const integrityNotes = validated.dataIntegrityNotes || []
  const footerNotes = [...integrityNotes, ...gapNotes]

  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;max-width:1000px;margin:0 auto;">
    <h1 style="font-size:20px;margin-bottom:2px;">UIV Fund III — Weekly Portfolio Insights</h1>
    <div style="color:#6b7280;font-size:13px;margin-bottom:16px;">Coverage week: ${esc(a.coverageWeekLabel)}</div>
    ${flagsHtml}
    ${sections}
    <div style="margin-top:20px;padding-top:10px;border-top:1px solid #e5e7eb;font-size:11px;color:#6b7280;">
      <div><b>Runway</b> = Cash in Bank ÷ Monthly Burn, computed programmatically from the source-reported figures above (never hand-calculated by the analyst). "(derived)" quarterly burn = 3× latest monthly burn where no separate quarterly figure was stated in source. * = no operating KPI could be found after a thorough check; customer pipeline shown as last resort.</div>
      ${footerNotes.length ? `<div style="margin-top:8px;"><b>Data quality notes:</b>${bulletList(footerNotes)}</div>` : ''}
      <div style="margin-top:8px;">All figures sourced read-only from Drive and the MIS Quarterly Business Updates sheet. No figure is estimated, extrapolated, or fabricated; unavailable data is shown as N/A.</div>
    </div>
  </div>`
}

function buildPlainTextFallback(validated, a) {
  const lines = [`UIV Fund III — Weekly Portfolio Insights | ${a.coverageWeekLabel}`, '']
  if ((validated.portfolioFlags || []).length) {
    lines.push('FLAGS THIS WEEK:')
    validated.portfolioFlags.forEach(f => lines.push(`- ${f}`))
    lines.push('')
  }
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
      lines.push(`  Latest month (${c.latestMonthLabel || 'N/A'}): ${fmtMoney(c.latestMonthRevenueValue, c.currency)} | YTD: ${fmtMoney(c.ytdRevenueValue, c.currency)} | Proj. YE: ${c.projectedYearEndRevenueValue != null ? fmtMoney(c.projectedYearEndRevenueValue, c.currency) : 'N/A'}`)
      lines.push(`  Cash: ${fmtMoney(c.cashInBankValue, c.currency)} | Monthly burn: ${fmtMoney(c.monthlyBurnValue, c.currency)} | Qtly burn: ${qb.value != null ? fmtMoney(qb.value, c.currency) + (qb.derived ? ' (derived)' : '') : 'N/A'} | Runway: ${computeRunway(c.cashInBankValue, c.monthlyBurnValue)}`)
      if ((c.kpis || []).length) lines.push(`  KPIs: ${c.kpis.map(k => `${k.name}: ${k.value}`).join('; ')}`)
      if ((c.momDrivers || []).length) lines.push(`  MoM: ${c.momDrivers.join(' | ')}`)
      if ((c.qoqDrivers || []).length) lines.push(`  QoQ: ${c.qoqDrivers.join(' | ')}`)
      lines.push('')
    }
  }
  return lines.join('\n')
}

// ===========================================================================
// PART 3 — main
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
      // Either no verified Drive folder exists for this company under the
      // authorized root, or it was deliberately skipped for this run only
      // (e.g. repeated transient failures and the user wants the digest sent
      // now rather than waiting). Rather than silently drop it from a
      // one-pager meant to show every portfolio company every week, emit a
      // deterministic stub straight into the result set so it still gets an
      // honestly-labeled row.
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

// agent() returns null on a terminal error (e.g. an org spend-limit outage) —
// never let a null silently become "no material development"; convert it
// into an explicit, honestly-labeled failure stub instead, and if too many
// companies failed this run, abort before sending a misleadingly sparse
// digest rather than emailing it anyway.
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
const validated = await agent(validationPrompt(companyResults, a), { phase: 'Validate', schema: VALIDATION_SCHEMA })
if (!validated || !Array.isArray(validated.companies) || !validated.companies.length) {
  throw new Error('The Validate-phase agent call returned no usable result (likely a transient API/usage-limit issue) — no email was sent. Re-run the workflow.')
}
log(`Validated ${validated.companies.length} companies. Flags: ${(validated.portfolioFlags || []).join(' | ') || 'none'}`)

phase('Email')
const subject = `Revenue/Cashflow/KPIs Fund III | ${a.coverageWeekLabel}`
const htmlBody = buildHtmlEmail(validated, a)
const plainText = buildPlainTextFallback(validated, a)
const sendResult = await agent(emailSendPrompt(subject, htmlBody, plainText, a), { phase: 'Email' })
if (!sendResult) {
  log('WARNING: the email-send agent call returned null (likely a transient error) — the email may not actually have been sent; verify the inbox before assuming it went out.')
}

return { subject, htmlBody, plainText, sendResult, companyResults: companyResults.filter(Boolean), validated }

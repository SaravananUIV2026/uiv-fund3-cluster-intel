# UIV Fund III — Cluster Intel

Claude Code skill + workflow for the UIV Fund III weekly portfolio intelligence
pipeline (v2, cluster-based). See `.claude/skills/uiv-fund3-cluster-intel/SKILL.md`
for the full spec, and `.claude/workflows/uiv-fund3-cluster-intel.js` for the
orchestration script.

Runs read-only against a verified Google Drive folder map + a Google Sheet, and
emails a validated one-pager digest via Gmail. No source financial documents are
stored in this repo — only the pipeline logic and folder/sheet IDs.

Scheduled to run weekly via a Claude cloud routine (Friday 9:00 AM IST).

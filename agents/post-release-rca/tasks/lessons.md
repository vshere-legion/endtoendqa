# Lessons Learned

Self-improvement log. Updated after every user correction.
Review at the start of each session.

---

## Language & Framing

### Lesson 1: Never use first-person for code changes
**Date:** 2026-04-02
**Mistake:** Said "I deleted/removed" when describing PR changes.
**Correction:** Always use third-person: "The PR removed...", "The change added..."
**Rule:** The agent is READ-ONLY. Never imply the agent modified code.

### Lesson 2: Suppress MCP overflow messages
**Date:** 2026-04-02
**Mistake:** Showed "result exceeds maximum allowed tokens" message to user.
**Correction:** These are not errors — the data is saved to a file and processing continues seamlessly.
**Rule:** Never surface MCP overflow messages. Silently read from the saved file.

---

## Jira Connection

### Lesson 3: Use REST API as primary, MCP as fallback
**Date:** 2026-04-02
**Mistake:** Used MCP tools which require permission approval in VS Code, causing repeated blocks.
**Correction:** Always try Jira REST API via .env token first. Only fall back to MCP if .env not available.
**Rule:** `source .env && curl` is always faster and more reliable than MCP in VS Code extension.

---

## Report Generation

### Lesson 4: Always generate the Excel report
**Date:** 2026-04-02
**Mistake:** Completed RCA analysis but did not generate the Excel report.
**Correction:** Report generation is mandatory — never finish without running generate_report.py.
**Rule:** The last step of every RCA run MUST be: `python3 scripts/generate_report.py --input rca_results/ --output "RCA_<name>_report.xlsx"`

### Lesson 5: Archive previous results before each run
**Date:** 2026-04-02
**Mistake:** New results mixed with old results.
**Correction:** Archive both .xlsx and batch_*.json before each run.
**Rule:** First step of every RCA: move *.xlsx and rca_results/batch_*.json to Previous RCA Output Files/

---

## Analysis Quality

### Lesson 6: Only consider merged PRs
**Date:** 2026-04-02
**Mistake:** Could have included open/draft PRs in analysis.
**Correction:** The `--merged` flag is critical. Only committed/merged PRs are valid evidence.
**Rule:** `gh search prs --merged` — ignore open, draft, or closed-without-merge PRs.

### Lesson 7: Check if archive folder exists before creating
**Date:** 2026-04-02
**Mistake:** Used `mkdir -p` every time.
**Correction:** Check if "Previous RCA Output Files" exists first; only create if missing.
**Rule:** `ls -d "Previous RCA Output Files" 2>/dev/null && mv ...` — don't create unnecessarily.

---

## Template for New Lessons

```
### Lesson N: [Brief title]
**Date:** YYYY-MM-DD
**Mistake:** What went wrong
**Correction:** What the user said to do instead
**Rule:** The permanent rule to prevent recurrence
```

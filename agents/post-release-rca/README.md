# Defect RCA Agent v2.0

An AI-powered agent that autonomously performs Root Cause Analysis on production-leaked defects. It queries Jira, analyzes linked GitHub PRs and code diffs (read-only), applies industry-standard RCA frameworks (5 Whys, Ishikawa, Counterfactual Testing), and generates structured Excel reports with Pareto charts. Can also publish RCA reports to Confluence.

Built on [Claude Code](https://claude.ai/claude-code).

---

## Features

- **Interactive mode** — Say "hi" and the agent guides you through all available options
- **`/rca` slash command** — `/rca Summer Legion InstantPay` or `/rca LP-1433`
- **READ-ONLY on repositories** — Reads PR descriptions and code diffs, never modifies code
- **Jira REST API primary** — Uses API token for fast queries; MCP as fallback
- **Deep PR analysis** — Reads actual code diffs (`gh pr diff`) with 2-line per-PR summaries
- **Linked Jira tickets** — Auto-detects parent epics, related bugs, duplicates with 3-line context
- **Three-source analysis** — Separate descriptions from Defect (Jira), PR, and Code perspectives
- **5 Whys** — Chained root cause reasoning arriving at systemic/process gaps (max 50 words)
- **Ishikawa categories** — Man / Machine / Method / Material / Measurement
- **Causal classification** — Root Cause vs Contributing Factors vs Trigger
- **Evidence grading** — Confirmed / Probable / Hypothesized
- **Counterfactual testing** — "If this cause were absent, would it still happen?"
- **RCA Confidence scoring** — 1-10 across Completeness, Depth, Actionability
- **Blameless culture** — All language focuses on systems and processes, never individuals
- **Multi-persona review** — QA Lead → Tech Lead → Pressure Test pipeline
- **Self-improvement loop** — Captures every user correction as a permanent lesson; reviews lessons at session start
- **Confluence publishing** — Publish RCA reports directly to Confluence pages
- **Excel report** — QA-Pareto, Dev-Pareto, and Legends tabs with term definitions
- **Timeout & recovery** — Graceful handling of API failures with error logging

---

## Prerequisites

### 1. Claude Code CLI
```bash
npm install -g @anthropic-ai/claude-code
claude auth login
```

### 2. Jira API Token (Primary — recommended)
Create a `.env` file in the project root:
```bash
JIRA_EMAIL=your.email@legion.co
JIRA_API_TOKEN=your-token
```
Get a token at: https://id.atlassian.com/manage-profile/security/api-tokens

### 3. Atlassian MCP (Fallback)
Only needed if `.env` is not configured. Set up in Claude Code MCP settings.

### 4. GitHub CLI (`gh`)
```bash
brew install gh
gh auth login
```

### 5. Python 3 + openpyxl
```bash
pip3 install openpyxl
```

---

## How to Run

### Option A: Interactive Mode (Recommended)
```bash
cd /path/to/Claude-RCA-Agent
claude
```
Then say **"hi"** and the agent will show all available options.

### Option B: `/rca` Slash Command (CLI only)
```
/rca Summer Legion InstantPay
/rca LP-1433
/rca LP-1433, LP-1419, LP-1537
/rca ta summer prod
/rca scheduling winter
/rca Summer all
```

### Option C: Natural Language (VS Code or CLI)
```
do rca for LP-1433
do rca for time and attendance summer release
do rca for scheduling summer limit to 5 defects
```

### Option D: One-liner
```bash
claude "Do RCA of Summer release for Legion InstantPay"
```

---

## Input Modes

### Mode 1: Specific Defect IDs
```
do rca for LP-1433
do rca for LP-1433, LP-1419, LP-1537
```

### Mode 2: Team + Release (+ optional Environment)
```
do rca for Legion InstantPay Summer leaked defects
do rca for Time Attendance Production defects from Winter release
do rca for scheduling summer prod
```

### Mode 3: Shorthand
```
/rca ta summer
/rca lip winter prod
/rca sch summer
```

### Parameters

| Parameter | Options |
|-----------|---------|
| **Team** | Time Attendance (ta), Scheduling & Forecasting (sch), Platform, OPS Portal (ops), Employee Lifecycle Management (elm), Employee Performance and Rewards (epr), Legion InstantPay (lip), Communications (comms), Labor Planning, GenAI, Mobile (mob), Strategic Insights (si), or "all" |
| **Environment** | Production/Prod, UAT, EA, or All (default) |
| **Release** | Summer (Jun-Oct 2025), Winter (Jan 2025-Jan 2026), Spring (Feb-Apr 2026), or custom dates |

---

## Jira Connection Priority

| Priority | Method | When |
|----------|--------|------|
| **1st (default)** | Jira REST API via `.env` token | Always tried first — fast, no permission prompts |
| **2nd (fallback)** | Atlassian MCP tools | Only if `.env` not found or REST API fails |

---

## Output

### Excel Report
Generated as `RCA_{release}_{project}_report.xlsx` with 4 tabs:

**Tab 1: RCA Data (22 columns)**

| Column | Description |
|--------|-------------|
| Defect ID | Jira key |
| Environment Leaked | Production, UAT, or EA |
| Defect Summary | From Jira |
| Linked Jira Tickets | Related tickets with relationship type |
| Linked Ticket Description | 3-line summary of linked ticket context |
| PR 1...N | PR URL + 2-line summary (what changed & why) |
| Defect Description | 3-line from Jira: issue / change / reason |
| PR Description | 3-line from PR: issue / change / reason |
| Code Description | 3-line from diff: issue / change / reason |
| Why QA Missed | One-word category |
| QA Recommendation | Actionable next step for QA |
| Why Dev Missed | One-word category |
| Dev Recommendation | Actionable next step for Dev |
| 5 Whys | Chained reasoning (max 50 words) |
| Ishikawa Category | Man / Machine / Method / Material / Measurement |
| Causal Classification | Root Cause / Contributing / Trigger |
| Evidence Grade | Confirmed / Probable / Hypothesized |
| Counterfactual | "If absent, would it still happen?" |
| RCA Confidence | Score like "9/10 (C:9 D:9 A:9)" |

**Tab 2: QA-Pareto** — Bar chart of Why QA Missed frequency (descending)

**Tab 3: Dev-Pareto** — Bar chart of Why Dev Missed frequency (descending)

**Tab 4: Legends** — "What this IS" / "What this is NOT" definitions for all terms

### Confluence Publishing
The agent can publish RCA reports directly to Confluence pages:
```
create RCA report and update it in Confluence at https://legiontech.atlassian.net/wiki/spaces/DEV/pages/...
```

---

## Project Structure

```
Claude RCA Agent/
├── CLAUDE.md                      # Master config (references other files)
├── README.md                      # This file
├── .env                           # Jira credentials (gitignored)
├── .gitignore
│
├── .claude/
│   ├── commands/
│   │   └── rca.md                 # /rca slash command
│   ├── settings.local.json        # Tool permissions (read-only enforced)
│   └── PERMISSIONS.md             # Documents what each permission allows
│
├── tasks/
│   └── lessons.md                 # Self-improvement log (updated on every correction)
│
├── rules/                         # Behavioral constraints
│   ├── blameless-culture.md       # No blaming individuals
│   ├── read-only.md               # Never modify repositories
│   ├── self-improvement.md        # Review lessons at start, update on correction
│   ├── language-framing.md        # Systemic language, evidence rules
│   └── timeouts.md                # Timeout & error recovery rules
│
├── skills/
│   └── rca/
│       ├── SKILL.md               # RCA analysis pipeline (Steps 4-4b)
│       ├── classification.md      # Why QA/Dev missed categories + decision rules
│       └── frameworks.md          # 5 Whys, Ishikawa, Counterfactual, Confidence
│
├── agents/
│   ├── batch_analyzer.md          # Sub-agent for parallel batch processing
│   └── personas/
│       ├── qa-lead-reviewer.md    # QA persona validation pass
│       ├── tech-lead-reviewer.md  # Tech lead review pass
│       └── pressure-tester.md     # Challenge/pressure test pass
│
├── scripts/
│   ├── generate_report.py         # Excel report generator
│   ├── fetch_pr_links.py          # Jira dev-status API helper (fallback)
│   ├── run_rca.sh                 # Quick-start launcher
│   └── test_report.py             # Report generation tests
│
├── schemas/
│   └── batch_schema.json          # JSON schema for batch results
│
├── rca_results/                   # Current run output
│   └── batch_*.json
│
└── Previous RCA Output Files/     # Archived results
    ├── *.xlsx
    └── batch_results/
```

---

## Permissions

The agent enforces strict permissions (see `.claude/PERMISSIONS.md`):

| Allowed | Denied |
|---------|--------|
| Jira read (search, get issue) | Jira write (create, edit, comment, transition) |
| Confluence read + write (RCA reports only) | Slack send/schedule messages |
| GitHub read (PR search, diff) | GitHub write (push, commit, PR create) |
| Local file read/write (results, reports) | |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| MCP permission prompts blocking | Use `.env` token instead — agent tries REST API first |
| `gh: command not found` | `brew install gh` |
| `gh` auth error | `gh auth login` — select legionco org |
| No defects returned | Verify project name (case-sensitive) and date range |
| `openpyxl` not found | `pip3 install openpyxl` |
| Report not generated | Tell agent: "generate the excel report" |
| Jira REST API 401 | Check `.env` token is valid — regenerate at Atlassian |
| Defect skipped | Check `rca_results/errors.json` for the reason |

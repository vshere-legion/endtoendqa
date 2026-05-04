# QA End-to-End — AI QA SDLC Pipeline

AI-powered QA SDLC pipeline that takes a Jira story as input and produces Playwright tests, regression impact analysis, test results, and triaged bug reports — orchestrated as an Argo Workflows DAG with evaluation gates between stages.

## Architecture

```
Jira Story → [Node 1] → [1C Gate] → [Node 2] → [2C Gate] → [Node 3] → [3C Gate] →
             Fetch       Eval        Gherkin    Eval         Playwright  Eval

[Node 4] → [Node 5] → [Node 6] → [Node 7]
Execute    Regression  Report     Bug Triage
```

### Layers

| Layer | Component | Purpose |
|-------|-----------|---------|
| 1 | `layer1-trigger` | Webhook / Slack / cron entrypoint |
| 2 | `layer2-dag-conductor` | Argo Workflows DAG orchestrator with gate-loop logic |
| 3 | `layer3-observability` | Datadog metrics + Slack notifications + audit trail |

### Pipeline Nodes

| Node | Path | Output |
|------|------|--------|
| **1** Jira/PRD Review | [agents/node1-jira-prd-review/](agents/node1-jira-prd-review/) | Structured requirements JSON |
| **1C** Eval Review | [skills/node1c-evaluation-review/](skills/node1c-evaluation-review/) | Approval gate (manual) |
| **2** Test Planning | [agents/node2-test-planning/](agents/node2-test-planning/) | Gherkin `.feature` files |
| **2C** Gherkin Eval | [skills/node2c-gherkin-evaluation/](skills/node2c-gherkin-evaluation/) | Auto-loop max 3× |
| **3** Playwright Codegen | [agents/node3-playwright-codegen/](agents/node3-playwright-codegen/) | Step defs + page objects (TS) |
| **3C** Script Review | [skills/node3c-script-review/](skills/node3c-script-review/) | Auto-loop max 3× |
| **4** Test Execution | [agents/node4-test-execution/](agents/node4-test-execution/) | Playwright runs (chromium) |
| **5** Regression Analysis | [agents/node5-regression-analysis/](agents/node5-regression-analysis/) | Impacted features list |
| **6** Results Report | [agents/node6-results-report/](agents/node6-results-report/) | Metrics + GitHub issues |
| **7** Bug Triage | [agents/node7-bug-triage/](agents/node7-bug-triage/) | Severity-classified bug reports |

## Prerequisites

Set environment variables in [`.env`](.env.example):

```bash
# Jira
JIRA_BASE_URL=https://legiontech.atlassian.net
JIRA_EMAIL=<you>@legion.co
JIRA_API_TOKEN=<atlassian-api-token>

# Argo Workflows
ARGO_SERVER=argo.ops.dev.legion.work:443
ARGO_HTTP1=true
ARGO_SECURE=true
ARGO_TOKEN="Bearer v2:eyJhbGc..."     # Copy from Argo UI → User Info
ARGO_NAMESPACE=argo

# Confluence (for PRD search)
CONFLUENCE_BASE_URL=https://legiontech.atlassian.net/wiki

# Optional
ANTHROPIC_API_KEY=                     # For --engine claude on Node 2
GITHUB_TOKEN=                          # PAT for repo operations
DATADOG_API_KEY=
TESTRAIL_USER, TESTRAIL_PASSWORD       # For TestRail integration
```

## Usage

### Local Pipeline (single story, end-to-end on your machine)

```bash
./triggers/run-qa-pipeline.sh ER-2651
./triggers/run-qa-pipeline.sh ER-2651 --team SCH --env rc --enterprise cinemark-wkdy
./triggers/run-qa-pipeline.sh ER-2651 --dry-run            # simulate Node 4
./triggers/run-qa-pipeline.sh ER-2651 --autonomous         # no prompts at gates
./triggers/run-qa-pipeline.sh ER-2651 --skip-test          # skip Playwright execution
./triggers/run-qa-pipeline.sh ER-2651 --scenario "Auto-transition"   # grep filter
```

Run modes:
- **interactive** (default) — gates prompt for approval
- **autonomous** — auto-approves gates with override warnings
- **dry-run** — Node 4 simulates results without running real tests

### Argo Workflow (cluster-side, parallel-capable)

```bash
# Update the workflow template (one-time, after DAG changes)
argo template update argo/workflows/qa-pipeline-dag.yaml -n argo

# Submit a workflow
argo submit --from workflowtemplate/qaendtoend-vikas \
  -p story-id=ER-2651 \
  -p team=SCH \
  -p enterprise=cinemark-wkdy \
  -p grep="@ER-2651" \
  -p trigger-source=claude-project \
  -p requested-by=<you>@legion.co \
  -n argo

# Watch progress
argo get <workflow-name> -n argo
argo logs <workflow-name> -n argo --follow

# View in browser
open https://argo.ops.dev.legion.work/workflows/argo/<workflow-name>
```

#### Workflow parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `story-id` | `PROJ-1234` | Jira issue key |
| `team` | `SCH` | Test team (SCH / LRB / TA / Platform / PLT-Core / PLT-Int / etc.) |
| `enterprise` | `cinemark-wkdy` | Tenant name (cinemark-wkdy / carters / legioncoffee / etc.) |
| `grep` | `""` | Playwright `--grep` filter; defaults to `@<story-id>` |
| `trigger-source` | `slack` | Origin: `slack` / `claude-project` / `cron-scheduled` |
| `requested-by` | `vshere@legion.co` | Audit identity |
| `github-token` | `""` | Optional, kept for backward compat |

#### How Node 4 pulls source code

The Argo cluster has no egress to `github.com`. Node 4 uses **Argo's native git artifact** with the existing `git-repo-login` K8s secret managed by DevOps — same pattern as the framework's own `ci/argo/workflow-template.yaml`. The container does not run `git clone`; the Argo controller fetches the repo using cluster-internal Git infrastructure.

Branch pulled: `feat/sch-nishant` from `legionco/playwright-automation-framework`.

## Output Structure

Pipeline artifacts are organized by team under [`output/`](output/):

```
output/{TEAM}/
├── features/ui/{story_slug}.feature          # Node 2 — Gherkin scenarios
├── steps/{story_slug}.steps.ts               # Node 3 — Playwright step defs
├── pages/{StorySlug}Page.ts                  # Node 3 — Page object model
├── test-data/                                # Test users, locations
├── test-results/{STORY_ID}/html-report/      # Node 4 — Playwright HTML report
├── Regression-Impact/{story_slug}/           # Node 5 — impacted features
├── reports/{STORY_ID}/                       # Node 6 — metrics, GH issues
└── bugs/{STORY_ID}/                          # Node 7 — triaged bugs (md + json)
```

Active teams: `SCH`, `TA`, `Platform`, `PLT-Core`, `PLT-Int`, `PLT-Ops`, `LRB`, `EV-Com`, `EV-LIP`, `EV-ELM`, `GENAI`, `EPR`.

## Test Framework

Tests run against the [Playwright BDD framework](https://github.com/legionco/playwright-automation-framework) (separate repo).

- Locator strategy: **built-in only** (`getByRole`, `getByText`, `getByLabel`, `getByTestId`) — no CSS selectors or XPath
- BDD: `playwright-bdd` with `createBdd(test)`
- Auth: shared step `Given I am logged in as "{role}"` resolves users from `test-data/users/user_loc_<enterprise>_<env>.json` via DataService
- Tag taxonomy: `@Team-<NAME>`, `@P1-Critical`/`@P2-High`/`@P3-Medium`/`@P4-Low`, `@Regression`/`@NewFeature`, `@GA`/`@LA`, `@group-<NAME>Test`, `@<STORY-ID>`

## Pipeline Scripts

| Script | Purpose |
|--------|---------|
| [`triggers/run-qa-pipeline.sh`](triggers/run-qa-pipeline.sh) | All-in-one local runner (Nodes 1→7) |
| [`triggers/claude-trigger.sh`](triggers/claude-trigger.sh) | Claude entrypoint for natural-language triggers |
| [`triggers/slack-trigger.sh`](triggers/slack-trigger.sh) | Slack slash-command webhook |
| [`triggers/trigger-workflow.sh`](triggers/trigger-workflow.sh) | Programmatic Argo submitter |

## Troubleshooting

**`Connection refused` cloning github.com inside Node 4**
The cluster blocks egress to public GitHub. Make sure Node 4 uses the Argo `artifacts.git` block with the `git-repo-login` secret (see [argo/workflows/qa-pipeline-dag.yaml](argo/workflows/qa-pipeline-dag.yaml)) rather than running `git clone` from the container.

**Argo token expired**
Refresh from `https://argo.ops.dev.legion.work` → User Info → copy token. Update `ARGO_TOKEN` in `.env`.

**`No available UI_LOGIN user with userType: X, group: Y`**
The `test-data/users/user_loc_<enterprise>_<env>.json` file is missing a user matching the `@group-<NAME>Test` tag. Add or update the corresponding entry.

**Node 1C blocks in autonomous mode with "missing all NFRs"**
Run with default interactive mode — non-TTY contexts auto-override the gate. Or pass `--autonomous --override` to bypass.

**Playwright `page.goto` timeout against RC tenant**
The RC environment is intermittently slow on per-tenant URLs. Retry, or run against `cinemark-wkdy` which is generally more reliable than per-tenant SSO redirects.

## Argo Workflow Template

[`argo/workflows/qa-pipeline-dag.yaml`](argo/workflows/qa-pipeline-dag.yaml) — Full DAG definition.

Key config in Node 4:
- Image: `mcr.microsoft.com/playwright:v1.58.2-noble`
- Volume: `/dev/shm` 2 Gi Memory (Chromium requirement on K8s)
- Resources: 1–2 CPU, 2–4 Gi RAM
- `cleanup_on_error` trap ensures `/tmp/result.json` is always written, fixing the Datadog `executor error: open /var/run/argo/outputs/parameters/tmp/result.json` log

## Recent Verified Runs

| Workflow | Story | Result |
|----------|-------|--------|
| `qaendtoend-vikas-vw6fq` | ER-2651 | ✅ All 12/12 nodes passed (6m 2s) |
| `qaendtoend-vikas-qg7f2` | ER-3160 | ✅ Submitted (running) |
| `qaendtoend-vikas-5xpw9` | ER-2651 | ✅ All 12/12 nodes passed with real Playwright (6m 30s) — verified git-artifact approach |

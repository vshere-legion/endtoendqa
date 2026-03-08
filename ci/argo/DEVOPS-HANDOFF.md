# Playwright BDD Tests — Argo Workflow Integration

## Overview

Playwright runs as a **stage in the deployment pipeline**. DevOps passes the Docker image tag, Playwright runs tests, and the workflow exits with pass/fail status. No dynamic tag resolution, no build flagging — DevOps handles gating based on `workflow.status`.

## Pipeline Flow

```
Build → Docker Image → Deploy to Staging → Playwright Tests → Pipeline Completes
```

## DAG Execution Flow

```
quality-gate → bddgen → test-shards (parallel N pods) → merge-reports → rerun-failures
                                                                              ↓
                                                                     notify (exit handler, always runs)
```

| Step | What It Does |
|---|---|
| **quality-gate** | Runs `npm run lint` and `npm run typecheck` |
| **bddgen** | Generates Playwright specs from BDD feature files (`npx bddgen`) |
| **test-shards** | Runs Playwright tests in N parallel pods with `--reporter=blob` |
| **merge-reports** | Combines blob reports from all shards, identifies failures |
| **rerun-failures** | Reruns only failed tests (skips if none failed) |
| **notify** | Sends Slack notification (exit handler — always runs) |

## Files (2 files total)

| File | Purpose |
|---|---|
| `ci/argo/workflow-template.yaml` | 6 reusable templates (install once on cluster) |
| `ci/argo/playwright-workflow.yaml` | DAG workflow (submitted per run) |

## Setup (One-Time)

```bash
# Install the WorkflowTemplate on the cluster:
argo template create ci/argo/workflow-template.yaml

# Update after changes:
argo template create ci/argo/workflow-template.yaml --overwrite
```

## How to Submit

```bash
# Standard run (4 shards, all teams, staging):
argo submit ci/argo/playwright-workflow.yaml \
  -p image="<ECR_URI>:<TAG>" \
  -p team=all \
  -p environment=staging \
  -p shards=4

# Targeted run (specific team, specific tags):
argo submit ci/argo/playwright-workflow.yaml \
  -p image="<ECR_URI>:<TAG>" \
  -p tags="@P1-Critical" \
  -p team=SCH \
  -p shards=2

# Watch progress:
argo watch @latest
```

## Parameters

| Parameter | Default | Required | Description |
|---|---|---|---|
| `image` | — | **Yes** | Full ECR image URI with tag (e.g. `339205487463.dkr.ecr.us-west-2.amazonaws.com/playwright-legion:v1.2.3-abc`) |
| `team` | `all` | No | Team filter: all, SCH, TA, PLT-Core, PLT-Int, PLT-Ops, LRB, EV-Com, EV-LIP, EV-ELM, GENAI, EPR |
| `environment` | `staging` | No | Target environment: dev, staging, rc, uat, prod |
| `enterprise` | `LegionCoffee` | No | Enterprise tenant |
| `browser` | `chromium` | No | Browser: chromium, firefox, webkit, all |
| `tags` | `""` | No | BDD tag filter (e.g. `@P1-Critical`) |
| `workers` | `4` | No | Parallel workers per shard pod |
| `shards` | `4` | No | Number of parallel test pods |
| `retries` | `2` | No | Retry count for flaky tests |
| `timeout` | `60000` | No | Test timeout in milliseconds |

## K8s Secrets Required

A secret named `playwright-secrets` with these optional keys:

| Key | Purpose |
|---|---|
| `SLACK_WEBHOOK_URL` | Slack notification on completion |
| `TESTRAIL_ENABLED` | Enable TestRail reporting |
| `TESTRAIL_USER` | TestRail username |
| `TESTRAIL_PASSWORD` | TestRail password |

## Resource Requirements Per Pod

| Stage | CPU (request / limit) | Memory (request / limit) |
|---|---|---|
| quality-gate | 500m / 1 | 1Gi / 2Gi |
| bddgen | 500m / 1 | 1Gi / 2Gi |
| test-shard (x N) | 1 / 2 | 2Gi / 4Gi |
| merge-reports | 500m / 1 | 1Gi / 2Gi |
| rerun-failures | 1 / 2 | 2Gi / 4Gi |
| notify | 100m / 200m | 256Mi / 512Mi |

**Note:** Test shard pods require a 2Gi `/dev/shm` memory mount for headless Chromium in K8s.

## Workflow Lifecycle

| Setting | Value |
|---|---|
| Max duration | 2 hours (`activeDeadlineSeconds: 7200`) |
| Pod cleanup | On workflow completion (600s delay) |
| TTL after success | 1 hour |
| TTL after failure | 2 hours |
| Exit handler | Slack notification (always fires) |

## Integration Point for DevOps

The workflow exits with standard Argo status:

| Status | Meaning | Action |
|---|---|---|
| **Succeeded** | All tests passed | Safe to continue deployment |
| **Failed** | Tests failed | Block further deployments |
| **Error** | Infrastructure issue | Investigate |

```bash
# Check workflow result programmatically:
argo get <workflow-name> -o json | jq '.status.phase'
```

## What's NOT Included (By Design)

- **No cron/scheduled workflows** — tests run only as part of deployment pipeline
- **No RBAC/ServiceAccount** — no K8s API access needed
- **No dynamic tag resolution** — image passed as parameter by DevOps
- **No build flagging** — DevOps reads `workflow.status` directly to gate deployments

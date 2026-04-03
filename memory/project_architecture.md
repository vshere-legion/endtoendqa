---
name: QA Pipeline Architecture v6
description: AI QA SDLC multi-agent pipeline — Argo-native DAG with Claude Opus 4.6 agents and evaluation skills across 3 layers
type: project
---

AI QA SDLC pipeline using Argo Workflows + Argo Events + Claude Opus 4.6.

**Why:** Fully automated QA pipeline from Jira story intake to bug triage with human gates.

**How to apply:** All work in this repo follows the 3-layer, 10-node DAG architecture:

- **Layer 1** — Argo Events trigger (Claude Project / Slack / Cron at 11:30 PM)
- **Layer 2** — DAG Conductor orchestrating Nodes 1→1C→2→2C→3→3C→4→5→6→7
- **Layer 3** — Observability (Datadog, Slack alerts, S3 audit trail)

**Agents** (10 total): Layer 1, Layer 2 Conductor, Nodes 1/2/3/4/5/6/7, Layer 3
**Skills** (3 evaluation modules): Node 1C, 2C, 3C — review/evaluation nodes are skills, not agents
**Iteration loops**: Node 2C→Node 2 (max 3), Node 3C→Node 3 (max 3)

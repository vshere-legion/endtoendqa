# Layer 2 Agent — Argo Workflows DAG Conductor

## Identity
- **Name:** `layer2-dag-conductor-agent`
- **Model:** Claude Opus 4.6
- **Layer:** 2 — Argo Workflows
- **Type:** Orchestrator / DAG Controller

## Goal
Orchestrate the entire QA pipeline as a Directed Acyclic Graph (DAG) within Argo Workflows. This agent is responsible for:
- Managing execution order of Nodes 1 → 1C → 2 → 2C → 3 → 3C → 4 → 5 → 6 → 7
- Handling iteration loops (e.g., Node 2C rejects → re-submit Node 2)
- Passing artifacts between nodes (requirements, Gherkin files, test scripts, traces)
- Tracking pipeline state and progress
- Enforcing gates (evaluation modules must pass before proceeding)

## DAG Structure
```
Node 1 (Jira/PRD) → Node 1C (Eval) → Node 2 (Test Planning)
    → Node 2C (Gherkin Eval) → Node 3 (Script Gen)
    → Node 3C (Script Eval) → Node 4 (Execute)
    → Node 5 (Regression) → Node 6 (Report) → Node 7 (Bug Triage)
```

## Iteration Loops
| Evaluation Node | On Rejection | Max Iterations |
|----------------|-------------|----------------|
| Node 1C | Blocks pipeline, requests manual input | 1 (human gate) |
| Node 2C | Loops back to Node 2 | 3 |
| Node 3C | Loops back to Node 3 | 3 |

## Artifact Passing
| From | To | Artifact |
|------|----|----------|
| Node 1 | Node 1C, Node 2 | Structured requirements summary |
| Node 2 | Node 2C, Node 3 | Gherkin scenarios (.feature files) |
| Node 3 | Node 3C, Node 4 | Playwright test scripts |
| Node 4 | Node 5, Node 6 | Test results, traces, screenshots |
| Node 5 | Node 6 | Regression impact scope |
| Node 6 | Node 7 | Analysis report, GitHub Issues |

## Outputs
- Pipeline completion status
- Total execution time and per-node metrics
- Handoff to Layer 3 (Observability)

## Dependencies
- Argo Workflows engine
- S3/MinIO for artifact storage
- All Node agents and skills

## Downstream
→ **Layer 3** — Observability & Feedback

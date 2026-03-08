# Argo Workflows — Playwright BDD Tests on EKS

Replaces Jenkins and GitHub Actions pipelines with Argo Workflows running on AWS EKS.

## Prerequisites

1. **AWS EKS cluster** with Argo Workflows installed ([install guide](https://argo-workflows.readthedocs.io/en/latest/installation/))
2. **AWS ECR repository** for the Playwright Docker image
3. **S3 bucket** for Argo artifact storage (blob reports, HTML reports)
4. **K8s Secret** `playwright-secrets` for credentials (see below)
5. **Argo CLI** installed locally (`brew install argo`)

## Setup

### 1. Configure Argo Artifact Repository (S3)

Add to your Argo controller ConfigMap (`argo-workflows-config`):

```yaml
artifactRepository:
  s3:
    bucket: your-playwright-artifacts-bucket
    region: us-west-2
    endpoint: s3.amazonaws.com
    keyFormat: "{{workflow.name}}/{{pod.name}}"
    useSDKCreds: true   # Uses EKS IAM role for service account (IRSA)
```

### 2. Create K8s Secret

```bash
kubectl create secret generic playwright-secrets \
  --from-literal=SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..." \
  --from-literal=TESTRAIL_ENABLED="false" \
  --from-literal=TESTRAIL_USER="" \
  --from-literal=TESTRAIL_PASSWORD=""
```

### 3. Build and Push Docker Image

```bash
# Authenticate to ECR
aws ecr get-login-password --region <REGION> | \
  docker login --username AWS --password-stdin <AWS_ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com

# Build and push
docker build -t <AWS_ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/playwright-legion:latest .
docker push <AWS_ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/playwright-legion:latest
```

### 4. Update Image References

Replace `<AWS_ACCOUNT_ID>` and `<REGION>` in all workflow files:

```bash
sed -i 's/<AWS_ACCOUNT_ID>/123456789012/g; s/<REGION>/us-west-2/g' ci/argo/*.yaml
```

### 5. Install WorkflowTemplate

```bash
argo template create ci/argo/workflow-template.yaml
```

### 6. Install CronWorkflows

```bash
argo cron create ci/argo/cron-workflow.yaml
argo cron create ci/argo/smoke-cron-workflow.yaml
```

## Usage

### Manual Run (replaces Jenkins "Build with Parameters")

```bash
# Default: all teams, staging, chromium, 4 shards
argo submit ci/argo/playwright-workflow.yaml

# Specific team
argo submit ci/argo/playwright-workflow.yaml -p team=sch -p environment=rc

# Smoke tests only
argo submit ci/argo/playwright-workflow.yaml -p tags="@P1-Critical" -p shards=2

# Full regression with 8 shards
argo submit ci/argo/playwright-workflow.yaml -p tags="@Regression" -p shards=8

# Specific browser
argo submit ci/argo/playwright-workflow.yaml -p browser=firefox -p shards=2
```

### Monitor

```bash
# Watch latest workflow
argo watch @latest

# List running workflows
argo list --running

# View workflow details
argo get <workflow-name>

# View pod logs for a shard
argo logs <workflow-name> test-shards(0)

# View all logs
argo logs <workflow-name> --follow
```

### Cron Management

```bash
# List cron workflows
argo cron list

# Suspend nightly regression
argo cron suspend playwright-nightly-regression

# Resume
argo cron resume playwright-nightly-regression

# Manually trigger a cron workflow now
argo submit --from cronwf/playwright-nightly-regression
```

### Download Artifacts (Reports)

```bash
# List artifacts for a workflow
argo get <workflow-name> -o json | jq '.status.nodes[].outputs.artifacts'

# Download merged HTML report from S3
aws s3 cp s3://your-playwright-artifacts-bucket/<workflow-name>/merge-reports/merged-reports.tar.gz .
tar xzf merged-reports.tar.gz
open reports/merged/html/index.html
```

## Architecture

```
                    ┌───────────────┐
                    │ argo submit / │
                    │  CronWorkflow │
                    └──────┬────────┘
                           │
                    ┌──────▼────────┐
                    │ quality-gate  │  lint + typecheck
                    └──────┬────────┘
                           │
                    ┌──────▼────────┐
                    │    bddgen     │  generate .features-gen/
                    └──────┬────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────▼─────┐ ┌───▼───┐ ┌─────▼─────┐
        │  shard 1   │ │shard 2│ │  shard N   │   parallel K8s pods
        │ --shard=1/N│ │  2/N  │ │    N/N     │   each with /dev/shm
        └─────┬──────┘ └───┬───┘ └─────┬──────┘
              │            │            │
              └────────────┼────────────┘
                           │ blob-reports (S3 artifacts)
                    ┌──────▼────────┐
                    │ merge-reports │  combine → HTML + rerun.txt
                    └──────┬────────┘
                           │
                    ┌──────▼────────┐
                    │rerun-failures │  conditional (if failures)
                    └──────┬────────┘
                           │
                    ┌──────▼────────┐
                    │    notify     │  Slack (exit handler, always)
                    └───────────────┘
```

## Jenkins → Argo Mapping

| Jenkins Concept | Argo Equivalent |
|---|---|
| `parameters {}` | `spec.arguments.parameters` |
| `stage('...')` | DAG `tasks` or `steps` |
| `agent any` | Pod template with container image |
| `parallel {}` | DAG tasks without dependencies / `withSequence` |
| `when { expression }` | Conditional check in script (`if [ -s file ]`) |
| `post { always {} }` | `onExit` exit handler template |
| `archiveArtifacts` | Argo `outputs.artifacts` → S3 |
| `publishHTML` | Download from S3, or expose via presigned URL |
| Jenkins cron | `CronWorkflow` resource |
| Jenkins credentials | K8s Secrets (`valueFrom.secretKeyRef`) |

## Resource Requirements

| Pod | CPU Request | Memory Request | CPU Limit | Memory Limit |
|---|---|---|---|---|
| quality-gate | 500m | 1Gi | 1 | 2Gi |
| bddgen | 500m | 1Gi | 1 | 2Gi |
| test-shard | 1 | 2Gi | 2 | 4Gi |
| merge-reports | 500m | 1Gi | 1 | 2Gi |
| rerun-failures | 1 | 2Gi | 2 | 4Gi |
| notify | 100m | 256Mi | 200m | 512Mi |

**Total for 4-shard regression:** ~6 CPU, ~12Gi memory (peak, during test phase)

## Troubleshooting

### Pod OOMKilled
Increase memory limits in `workflow-template.yaml`. Chromium is memory-hungry.
```bash
kubectl describe pod <pod-name> | grep -A5 "Last State"
```

### Chromium crash in container
Verify `/dev/shm` is mounted. Check with:
```bash
kubectl exec <pod-name> -- df -h /dev/shm
# Should show ~2Gi tmpfs
```

### Artifacts not appearing in S3
Check Argo controller logs:
```bash
kubectl logs -n argo deploy/argo-workflows-server | grep artifact
```
Verify IRSA (IAM Role for Service Account) is configured for the Argo service account.

### Workflow stuck in Pending
Check node resources:
```bash
kubectl describe nodes | grep -A5 "Allocated resources"
```
Reduce shard count or scale EKS node group.

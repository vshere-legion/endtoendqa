# Node 4 Agent — Execute Test Suite

## Identity
- **Name:** `node4-test-execution-agent`
- **Model:** N/A (Playwright Runner)
- **Layer:** 2 — DAG Node 4
- **Type:** Test Execution Agent

## Goal
Execute the approved Playwright test suite with tracing enabled, auto-retry failed cases, and collect all artifacts (traces, screenshots, videos) for downstream analysis.

## Tasks
1. **Run Tests** — Execute Playwright tests with `--trace on`
   ```bash
   npx playwright test --trace on --reporter=json,html
   ```
2. **Auto-Retry** — Failed test cases auto-retry up to 2x with exponential backoff:
   - Retry 1: 5s delay
   - Retry 2: 15s delay
   - After 2 retries → mark as FAIL
3. **Collect Artifacts**:
   - Trace files (`.zip`) for every test
   - Screenshots on failure
   - Video recordings on failure
   - JSON test results report
4. **Upload Artifacts** — Push to S3/MinIO artifact store for Node 5 & 6

## Input
- Approved Playwright test scripts (from Node 3C)
- Test environment configuration
- Browser matrix (chromium, firefox, webkit)

## Output
```json
{
  "total": 42,
  "passed": 38,
  "failed": 3,
  "flaky": 1,
  "duration_ms": 180000,
  "artifacts": {
    "traces": "s3://qa-artifacts/run-123/traces/",
    "screenshots": "s3://qa-artifacts/run-123/screenshots/",
    "videos": "s3://qa-artifacts/run-123/videos/",
    "report": "s3://qa-artifacts/run-123/report.json"
  }
}
```

## Configuration
```yaml
retries: 2
backoff:
  initial: 5000
  multiplier: 3
trace: on
screenshot: only-on-failure
video: retain-on-failure
```

## Dependencies
- Playwright runtime environment
- Node 3C approved test scripts
- S3/MinIO artifact storage
- Test environment (staging/QA)

## Downstream
→ **Node 5** — Regression Impact Analysis
→ **Node 6** — Analyze Results & Report

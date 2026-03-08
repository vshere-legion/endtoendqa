# Feature-Level Sharded Execution Guide

> Complete reference for running tests in parallel — local, Docker, GitHub Actions, and Jenkins.
> Covers the sharding algorithm, every CLI option, CI/CD integration, troubleshooting, and performance tuning.

---

## Table of Contents

1. [What is Sharding and Why](#1-what-is-sharding-and-why)
2. [Quick Start](#2-quick-start)
3. [How Sharding Works — Step by Step](#3-how-sharding-works--step-by-step)
4. [The Greedy Load-Balancing Algorithm](#4-the-greedy-load-balancing-algorithm)
5. [All CLI Options — run-sharded.js](#5-all-cli-options--run-shardedjs)
6. [Report Merging — merge-reports.js](#6-report-merging--merge-reportsjs)
7. [Failure Rerun — rerun-failed.js](#7-failure-rerun--rerun-failedjs)
8. [Docker Sharded Execution](#8-docker-sharded-execution)
9. [GitHub Actions Sharded Pipeline](#9-github-actions-sharded-pipeline)
10. [Jenkins Sharded Pipeline](#10-jenkins-sharded-pipeline)
11. [Native Playwright Sharding vs Custom Sharding](#11-native-playwright-sharding-vs-custom-sharding)
12. [Performance Tuning & Benchmarks](#12-performance-tuning--benchmarks)
13. [Troubleshooting](#13-troubleshooting)
14. [Best Practices](#14-best-practices)

---

## 1. What is Sharding and Why

### The Problem

```
500 scenarios × 2 minutes each = 1000 minutes = 16.7 hours (sequential)
```

### The Solution

```
500 scenarios ÷ 15 workers = ~33 scenarios per worker × 2 minutes = 66 minutes
                                                                     ^^^^^^^^
                                                                     15x faster
```

### Why Feature-Level (Not Scenario-Level)

| Approach | Pros | Cons |
|---|---|---|
| **Scenario-level** | Perfect load balance | Breaks `Background` sharing, no shared browser context |
| **Feature-level** (our approach) | Preserves scenario order, shared BrowserContext + Page within feature (state carries over), shared `Background` setup | Slightly less balanced |

**Feature-level is the right choice** because:
- Scenarios within a feature share the same BrowserContext and Page (state carries over)
- No re-login or re-navigation between scenarios — each scenario's Given steps navigate
- If a scenario fails → recovery (navigate to dashboard), never skip
- The greedy algorithm achieves near-perfect balance anyway (~5% variance)

### Three Ways to Shard

```
┌─────────────────────────────────────────────────────────────┐
│  Option 1: Native Playwright (WORKERS env var)               │
│  npm test (WORKERS=4)                                        │
│  → Playwright distributes features across 4 worker processes │
│  → Good for: local dev, CI with 1 machine                   │
├─────────────────────────────────────────────────────────────┤
│  Option 2: Custom Sharding Script (run-sharded.js)           │
│  node scripts/run-sharded.js --workers 15                    │
│  → Feature discovery → tag filter → greedy balance → execute │
│  → Good for: CI, large suites, fine-grained control          │
├─────────────────────────────────────────────────────────────┤
│  Option 3: CI-Level Sharding (GitHub Actions / Jenkins)      │
│  --shard=1/4, --shard=2/4, --shard=3/4, --shard=4/4         │
│  → Each shard runs on a separate CI machine                  │
│  → Good for: massive parallelism across machines             │
├─────────────────────────────────────────────────────────────┤
│  Option 4: Tag-Based Scenario Splitting (run-split-scenarios.js)│
│  node scripts/run-split-scenarios.js --feature <f> --tags <g>  │
│  → Splits one long feature into N tag groups, each on own proc │
│  → Good for: features that take ~1 hour when run sequentially  │
└─────────────────────────────────────────────────────────────┘
```

> See [PARALLEL_MODES.md](./PARALLEL_MODES.md) for detailed documentation on all parallelism modes including the scenario-splitting script and hybrid mode.

---

## 2. Quick Start

### Local — Run Smoke Tests with 15 Workers

```bash
# 1. Install
npm install
npx playwright install --with-deps

# 2. Run
npm run test:sharded:smoke

# 3. Merge reports
npm run merge-reports:failures

# 4. Open report
npm run report:open

# 5. Rerun failures (if any)
npm run rerun-failed
```

### Docker — Run All Tests in Container

```bash
# Build once
npm run docker:build

# Run smoke tests
npm run docker:test:smoke

# Run sharded (4 containers)
npm run docker:sharded
```

### GitHub Actions — Triggered via UI

```
Go to Actions → "Playwright BDD Tests" → Run workflow
  environment: staging
  enterprise: LegionCoffee
  team: all
  browser: chromium
  workers: 4
  shards: 4
```

---

## 3. How Sharding Works — Step by Step

### Complete Flow Diagram

```
node scripts/run-sharded.js --tags "@Regression" --team sch --workers 15
                │
                ▼
┌───────────────────────────────────────────────────────────────┐
│  STEP 1: FEATURE DISCOVERY                                     │
│                                                                │
│  Glob: teams/sch/features/**/*.feature                         │
│    → Found 30 .feature files                                   │
│                                                                │
│  For each file:                                                │
│    1. Read file content                                        │
│    2. Parse Gherkin (extract Feature tags, Scenario tags)       │
│    3. Count scenarios                                          │
│    4. Store: { path, tags, scenarioCount }                     │
└───────────────────────────────┬───────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────┐
│  STEP 2: TAG FILTERING                                         │
│                                                                │
│  Tag expression: "@Regression"                                 │
│                                                                │
│  For each feature:                                             │
│    - Does the Feature have @Regression? → include all scenarios │
│    - Does any Scenario have @Regression? → include that feature │
│    - Neither? → exclude this feature                           │
│                                                                │
│  Filter result:                                                │
│    Before: 30 features, 280 scenarios                          │
│    After:  22 features, 210 scenarios                          │
│                                                                │
│  Tag expression parsing supports:                              │
│    @smoke              → single tag                            │
│    @smoke or @regression → OR                                  │
│    @smoke and @P1      → AND                                   │
│    not @flaky          → NOT                                   │
│    (@smoke or @regression) and not @flaky → complex            │
└───────────────────────────────┬───────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────┐
│  STEP 3: GREEDY LOAD BALANCING                                 │
│                                                                │
│  Sort features by scenario count (descending):                 │
│    Feature X: 25 scenarios                                     │
│    Feature Y: 20 scenarios                                     │
│    Feature Z: 18 scenarios                                     │
│    ...                                                         │
│                                                                │
│  Assign each to worker with fewest scenarios:                  │
│    Feature X (25) → Worker 1  [total: 25]                      │
│    Feature Y (20) → Worker 2  [total: 20]                      │
│    Feature Z (18) → Worker 3  [total: 18]                      │
│    Feature W (15) → Worker 4  [total: 15]                      │
│    Feature V (12) → Worker 5  [total: 12]                      │
│    Feature U (10) → Worker 5  [total: 22]  ← W5 had fewest    │
│    ...                                                         │
│                                                                │
│  Result: 15 workers, ~14 scenarios each (±2)                   │
└───────────────────────────────┬───────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────┐
│  STEP 4: DRY RUN OUTPUT (if --dry-run)                         │
│                                                                │
│  ═══════════════════════════════════════════════════            │
│  Feature Shard Distribution                                    │
│  ═══════════════════════════════════════════════════            │
│  Shard 1: 2 features, 25 scenarios, ~50 min                   │
│  Shard 2: 2 features, 22 scenarios, ~44 min                   │
│  Shard 3: 2 features, 20 scenarios, ~40 min                   │
│  ...                                                           │
│  Shard 15: 1 features, 8 scenarios, ~16 min                   │
│  ───────────────────────────────────────────────               │
│  Total: 22 features, 210 scenarios                             │
│  ═══════════════════════════════════════════════════            │
│                                                                │
│  (exit — nothing executed)                                     │
└───────────────────────────────┬───────────────────────────────┘
                                │ (if not --dry-run)
                                ▼
┌───────────────────────────────────────────────────────────────┐
│  STEP 5: PARALLEL EXECUTION                                    │
│                                                                │
│  Spawn 15 child processes:                                     │
│                                                                │
│  Worker 1 (pid 11001):                                         │
│    npx playwright test                                         │
│      --shard=1/15                                              │
│      --reporter=blob                                           │
│      --output=blob-reports/shard-1                              │
│    → runs Feature X (25 scenarios) + Feature Q (3 scenarios)   │
│    → generates blob-reports/shard-1/report.zip                 │
│                                                                │
│  Worker 2 (pid 11002):                                         │
│    npx playwright test --shard=2/15 --reporter=blob            │
│    → runs Feature Y (20 scenarios) + Feature P (2 scenarios)   │
│    → generates blob-reports/shard-2/report.zip                 │
│                                                                │
│  ...15 workers running in parallel...                          │
│                                                                │
│  Each worker:                                                  │
│    - Separate Node.js process (full isolation)                 │
│    - Own browser instance                                      │
│    - Own DataService (own copy of test data)                   │
│    - Pre-loaded storageState (no login needed)                 │
│    - Generates blob-report fragment                            │
│                                                                │
│  Live output:                                                  │
│  [worker-0] Starting with 2 features (28 scenarios)            │
│  [worker-1] Starting with 2 features (22 scenarios)            │
│  ...                                                           │
│  [worker-3] ✅ Completed successfully in 1850.34s              │
│  [worker-0] ✅ Completed successfully in 1925.12s              │
│  ...                                                           │
│  All workers completed.                                        │
└───────────────────────────────┬───────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────┐
│  STEP 6: REPORT MERGING                                        │
│                                                                │
│  node scripts/merge-reports.js --capture-failures              │
│                                                                │
│  1. Collect: blob-reports/shard-{1..15}/report.zip             │
│  2. Merge:  npx playwright merge-reports → single report       │
│  3. Generate:                                                  │
│     ├── reports/merged/html/index.html (Playwright HTML)       │
│     ├── reports/merged/results.json    (JSON)                  │
│     └── reports/merged/junit.xml       (JUnit for CI)          │
│  4. Extract failures → reports/rerun.txt                       │
│     (one test location per line, for npx playwright test)      │
└───────────────────────────────┬───────────────────────────────┘
                                │ (if failures exist)
                                ▼
┌───────────────────────────────────────────────────────────────┐
│  STEP 7: FAILURE RERUN                                         │
│                                                                │
│  node scripts/rerun-failed.js --retries 2 --workers 5          │
│                                                                │
│  1. Read reports/rerun.txt → 5 failed test locations           │
│  2. npx playwright test --last-failed                          │
│     → runs only those 5 tests with 5 workers                  │
│  3. Results:                                                   │
│     ✓ 4 now pass (were flaky)                                  │
│     ✗ 1 still fails (real bug)                                 │
└───────────────────────────────────────────────────────────────┘
```

---

## 4. The Greedy Load-Balancing Algorithm

### How It Works

```
Input:
  Features with scenario counts: [50, 35, 30, 25, 20, 18, 15, 12, 10, 8, 7, 5, 3, 2]
  Workers: 4

Step 1 — Sort descending (already done):
  [50, 35, 30, 25, 20, 18, 15, 12, 10, 8, 7, 5, 3, 2]

Step 2 — Assign each to the worker with the fewest scenarios:

  Feature(50) → Worker 1  ← all empty, pick first
  Worker loads: [50, 0, 0, 0]

  Feature(35) → Worker 2  ← 0 is lowest
  Worker loads: [50, 35, 0, 0]

  Feature(30) → Worker 3  ← 0 is lowest
  Worker loads: [50, 35, 30, 0]

  Feature(25) → Worker 4  ← 0 is lowest
  Worker loads: [50, 35, 30, 25]

  Feature(20) → Worker 4  ← 25 is lowest
  Worker loads: [50, 35, 30, 45]

  Feature(18) → Worker 3  ← 30 is lowest
  Worker loads: [50, 35, 48, 45]

  Feature(15) → Worker 2  ← 35 is lowest
  Worker loads: [50, 50, 48, 45]

  Feature(12) → Worker 4  ← 45 is lowest
  Worker loads: [50, 50, 48, 57]

  Feature(10) → Worker 3  ← 48 is lowest
  Worker loads: [50, 50, 58, 57]

  Feature(8) → Worker 1  ← 50 is lowest (tied, pick first)
  Worker loads: [58, 50, 58, 57]

  Feature(7) → Worker 2  ← 50 is lowest
  Worker loads: [58, 57, 58, 57]

  Feature(5) → Worker 2  ← 57 is lowest (tied)
  Worker loads: [58, 62, 58, 57]

  Feature(3) → Worker 4  ← 57 is lowest
  Worker loads: [58, 62, 58, 60]

  Feature(2) → Worker 1  ← 58 is lowest (tied)
  Worker loads: [60, 62, 58, 60]

Final distribution:
  Worker 1: 60 scenarios  (3 features)
  Worker 2: 62 scenarios  (4 features)
  Worker 3: 58 scenarios  (3 features)
  Worker 4: 60 scenarios  (4 features)

  Total: 240 scenarios
  Average: 60 per worker
  Max deviation: 2 scenarios (3.3%) → excellent balance
```

### Pseudocode

```javascript
function shardFeatures(features, workerCount) {
  // Sort features by scenario count (largest first)
  features.sort((a, b) => b.scenarioCount - a.scenarioCount);

  // Initialize workers
  const workers = Array.from({ length: workerCount }, () => ({
    features: [],
    totalScenarios: 0,
  }));

  // Assign each feature to least-loaded worker
  for (const feature of features) {
    const leastLoaded = workers.reduce((min, w) =>
      w.totalScenarios < min.totalScenarios ? w : min
    );
    leastLoaded.features.push(feature);
    leastLoaded.totalScenarios += feature.scenarioCount;
  }

  return workers;
}
```

### Why Greedy Works Well

| Algorithm | Balance Quality | Complexity | Note |
|---|---|---|---|
| Round-robin | Poor (ignores sizes) | O(n) | Feature A=50, Feature B=2 on same worker |
| **Greedy (our approach)** | **Near-optimal** | **O(n log n)** | **Within 5% of perfect in practice** |
| Optimal (NP-hard) | Perfect | O(2^n) | Impractical for >20 features |

---

## 5. All CLI Options — run-sharded.js

```bash
node scripts/run-sharded.js [options]
```

| Option | Description | Default | Example |
|---|---|---|---|
| `--workers <n>` | Number of parallel workers | 15 | `--workers 20` |
| `--tags <expr>` | Cucumber tag expression | (none = all) | `--tags "@smoke and not @flaky"` |
| `--team <name>` | Team name filter | (all teams) | `--team sch` |
| `--features <glob>` | Feature file glob | `teams/**/features/**/*.feature` | `--features "teams/sch/**/*.feature"` |
| `--dry-run` | Show plan, don't execute | false | `--dry-run` |
| `--report-dir <path>` | Report output directory | `reports` | `--report-dir custom-reports` |
| `--retries <n>` | Retries per test | 2 | `--retries 3` |
| `--timeout <ms>` | Test timeout | 60000 | `--timeout 120000` |
| `--headed` | Show browser | false | `--headed` |
| `--verbose`, `-v` | Verbose output | false | `-v` |
| `--split-feature <path>` | Feature to split by tags (repeatable) | (none) | `--split-feature teams/sch/features/ui/overtime.feature` |
| `--split-tags <expr>` | Tag groups for split feature | (none) | `--split-tags "overtime.feature:@part1,@part2,@part3"` |

### Examples

```bash
# Smoke tests, 15 workers
node scripts/run-sharded.js --tags "@P1-Critical" --workers 15

# Regression for SCH team, 20 workers
node scripts/run-sharded.js --tags "@Regression" --team sch --workers 20

# P1 + P2 tests, exclude flaky
node scripts/run-sharded.js --tags "(@P1-Critical or @P2-High) and not @flaky" --workers 15

# Dry run — see plan without executing
node scripts/run-sharded.js --tags "@smoke" --dry-run

# Debug mode — 1 worker, headed, verbose
node scripts/run-sharded.js --tags "@debug-scenario" --workers 1 --headed --verbose

# Slow tests with increased timeout
node scripts/run-sharded.js --tags "@slow" --timeout 180000 --workers 5
```

---

## 6. Report Merging — merge-reports.js

```bash
node scripts/merge-reports.js [options]
```

| Option | Description | Default |
|---|---|---|
| `--blob-dir <path>` | Blob reports directory | `blob-reports` |
| `--output-dir <path>` | Merged report output | `reports/merged` |
| `--capture-failures` | Extract failed tests to rerun file | false |
| `--rerun-file <path>` | Rerun file path | `reports/rerun.txt` |
| `--reporters <list>` | Reporters (comma-separated) | `html,json,junit` |

### What It Produces

```
After merging:

reports/
├── merged/
│   ├── html/
│   │   └── index.html           ← Open in browser — full interactive report
│   ├── results.json             ← Machine-readable results
│   └── junit.xml                ← JUnit XML for CI dashboards
├── cucumber/
│   ├── report.html              ← Cucumber HTML report
│   └── report.json              ← Cucumber JSON report
├── logs/
│   ├── worker-0-1708214625.jsonl  ← Structured logs (per worker)
│   ├── worker-1-1708214626.jsonl
│   └── ...
└── rerun.txt                    ← Failed test locations (if --capture-failures)
```

### Failure Summary Output

```
════════════════════════════════════════════════════════════════
Failed Scenarios Summary
════════════════════════════════════════════════════════════════

📄 teams/sch/features/scheduling.feature (2 failures)
  1. Create schedule [failed] (45.23s)
  2. Edit schedule   [failed] (32.10s)

📄 teams/sch/features/forecasting.feature (1 failure)
  1. Generate forecast [timedOut] (60.00s)

════════════════════════════════════════════════════════════════
Total Failures: 3
════════════════════════════════════════════════════════════════

📝 Rerun file: reports/rerun.txt
   Run: node scripts/rerun-failed.js
```

---

## 7. Failure Rerun — rerun-failed.js

```bash
node scripts/rerun-failed.js [options]
```

| Option | Description | Default |
|---|---|---|
| `--rerun-file <path>` | Path to rerun file | `reports/rerun.txt` |
| `--retries <n>` | Retries per test | 1 |
| `--workers <n>` | Workers for rerun | 5 |
| `--headed` | Show browser | false |

### How It Works

```
reports/rerun.txt contains:
  teams/sch/features/scheduling.feature:12:5
  teams/sch/features/scheduling.feature:24:5
  teams/sch/features/forecasting.feature:8:5

rerun-failed.js:
  1. Reads rerun.txt
  2. Extracts unique test locations
  3. Runs: npx playwright test --last-failed --retries 1 --workers 5
  4. Reports:
     ✓ 2/3 now pass (were flaky)
     ✗ 1/3 still fails (real bug → investigate)
```

### Rerun Strategy

```
Run 1: Full suite (15 workers)
  → 200 pass, 5 fail
  → captures failures to rerun.txt

Run 2: Rerun failures (5 workers, 1 retry)
  → 3 now pass (were flaky)
  → 2 still fail

Decision:
  - 3 flaky tests → tag with @flaky and investigate
  - 2 real failures → file bugs
  - Overall result: 203/205 = 99% pass rate
```

---

## 8. Docker Sharded Execution

### Single Container (Quick)

```bash
# Build image
docker build -t playwright-legion .

# Run all tests in one container
docker compose up test-chromium

# Run smoke tests
docker compose up test-smoke

# Run specific team
TEST_TEAM=sch docker compose up test-team
```

### Multi-Container Sharding (4 Shards)

```bash
docker compose --profile sharded up
```

This starts:

```
┌──────────────────────────────────────────────────────────────┐
│  docker compose --profile sharded up                          │
│                                                               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────┐│
│  │ test-shard-1 │ │ test-shard-2 │ │ test-shard-3 │ │shard-4 ││
│  │ --shard=1/4  │ │ --shard=2/4  │ │ --shard=3/4  │ │=4/4    ││
│  │ (container)  │ │ (container)  │ │ (container)  │ │(cont.) ││
│  │              │ │              │ │              │ │        ││
│  │ Features A-E │ │ Features F-J │ │ Features K-O │ │Feat P-T││
│  │ blob-report  │ │ blob-report  │ │ blob-report  │ │blob-rep││
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └───┬────┘│
│         │                │                │              │     │
│         └────────────────┴────────┬───────┴──────────────┘     │
│                                   │                            │
│                    ┌──────────────▼──────────────┐             │
│                    │ merge-reports (container)    │             │
│                    │ waits for all 4 shards      │             │
│                    │ npx playwright merge-reports │             │
│                    │ → ./reports/html/            │             │
│                    └─────────────────────────────┘             │
└──────────────────────────────────────────────────────────────┘

Host machine:
  ./reports/          ← mounted volume, reports available on host
  ./test-data/        ← mounted read-only into containers
  ./config/           ← mounted read-only into containers
```

### Docker Environment Variables

```yaml
# docker-compose.yml environment section
environment:
  TEST_ENV: ${TEST_ENV:-staging}
  ENTERPRISE: ${ENTERPRISE:-LegionCoffee}
  WORKERS: ${WORKERS:-4}
  TEST_TAGS: ${TEST_TAGS:-}
  TEST_TEAM: ${TEST_TEAM:-all}
  CI: true
  LOG_LEVEL: INFO
  LOG_TO_FILE: true
```

Override from host:
```bash
TEST_ENV=uat ENTERPRISE=panda2bts docker compose up test-chromium
```

---

## 9. GitHub Actions Sharded Pipeline

### How It Works

```
┌─────────────────────────────────────────────────────────┐
│  Manual trigger: "Run workflow"                          │
│    environment: staging                                  │
│    shards: 4                                             │
│    workers: 4 (per shard)                                │
│    browser: chromium                                     │
└─────────────────────┬───────────────────────────────────┘
                      │
     ┌────────────────┼────────────────┐
     │                │                │
┌────▼───┐      ┌────▼───┐      ┌────▼───┐
│ Machine│      │ Machine│      │ Machine│
│ 1      │      │ 2      │      │ N      │
│        │      │        │      │        │
│ npm ci │      │ npm ci │      │ npm ci │
│ install│      │ install│      │ install│
│ bddgen │      │ bddgen │      │ bddgen │
│        │      │        │      │        │
│ test   │      │ test   │      │ test   │
│--shard │      │--shard │      │--shard │
│ =1/4   │      │ =2/4   │      │ =4/4   │
│        │      │        │      │        │
│ upload │      │ upload │      │ upload │
│ blob   │      │ blob   │      │ blob   │
└────┬───┘      └────┬───┘      └────┬───┘
     │               │               │
     └───────────────┼───────────────┘
                     │
          ┌──────────▼──────────┐
          │  Merge Reports      │
          │  (separate machine) │
          │                     │
          │  download all blobs │
          │  merge → HTML       │
          │  upload artifact    │
          └──────────┬──────────┘
                     │
          ┌──────────▼──────────┐
          │  Slack Notification  │
          │  PASSED / FAILED    │
          └─────────────────────┘
```

### Key Configuration

```yaml
# .github/workflows/playwright-tests.yml

# Shard matrix is generated dynamically:
prepare:
  outputs:
    shard-matrix: ${{ steps.set-matrix.outputs.matrix }}
  steps:
    - id: set-matrix
      run: |
        SHARDS=${{ github.event.inputs.shards || '1' }}
        MATRIX=$(python3 -c "import json; print(json.dumps([i+1 for i in range($SHARDS)]))")
        echo "matrix=$MATRIX" >> $GITHUB_OUTPUT

# Each shard runs as a separate job:
test:
  strategy:
    fail-fast: false   # Don't cancel other shards on failure
    matrix:
      shard: ${{ fromJson(needs.prepare.outputs.shard-matrix) }}
  steps:
    - run: |
        npx playwright test \
          --shard=${{ matrix.shard }}/${{ github.event.inputs.shards || '1' }}
```

### Cost/Time Comparison

| Shards | Machines | Time (500 scenarios) | GitHub Minutes |
|---|---|---|---|
| 1 | 1 machine | ~65 min | 65 min |
| 2 | 2 machines | ~33 min | 66 min |
| 4 | 4 machines | ~17 min | 68 min |
| 8 | 8 machines | ~9 min | 72 min |

**Sweet spot:** 4 shards (4x faster, only 5% more total compute)

---

## 10. Jenkins Sharded Pipeline

```groovy
// ci/Jenkinsfile

pipeline {
    agent any
    parameters {
        choice(name: 'TEAM', choices: ['all', 'TA', 'SCH', ...], description: 'Team')
        choice(name: 'ENVIRONMENT', choices: ['staging', 'uat', 'prod'], description: 'Env')
        choice(name: 'BROWSER', choices: ['chromium', 'firefox', 'webkit'], description: 'Browser')
        string(name: 'TAGS', defaultValue: '', description: 'Tag expression')
        string(name: 'WORKERS', defaultValue: '4', description: 'Workers per shard')
    }

    stages {
        stage('Install')    { steps { sh 'npm ci && npx playwright install --with-deps' } }
        stage('BDD Gen')    { steps { sh 'npx bddgen' } }
        stage('Test')       { steps { sh "npx playwright test --project=${BROWSER}" } }
        stage('Merge')      { steps { sh 'node scripts/merge-reports.js --capture-failures' } }
        stage('Rerun')      {
            when { expression { currentBuild.result == 'UNSTABLE' } }
            steps { sh 'node scripts/rerun-failed.js --retries 2' }
        }
    }
}
```

---

## 11. Native Playwright Sharding vs Custom Sharding

| Feature | Native (`WORKERS=N`) | Custom (`run-sharded.js`) |
|---|---|---|
| **Setup** | Zero — built-in | Requires script |
| **Load balancing** | Playwright's internal heuristic | Greedy algorithm (better) |
| **Tag filtering** | Via `--grep` (regex) | Full Cucumber tag expressions |
| **Team filtering** | Via `--project` | Built-in `--team` flag |
| **Dry run** | No | Yes (`--dry-run`) |
| **Shard distribution view** | No | Yes (shows which features go where) |
| **Report** | Single report | Blob → merge required |
| **CI cross-machine** | `--shard=1/N` | Same `--shard=1/N` |
| **When to use** | Local dev, simple CI | Large suites, CI, fine control |

### Recommendation

```
Local development:   npm test  (uses native Playwright workers)
CI smoke tests:      npm run test:sharded:smoke  (custom sharding)
CI full regression:  GitHub Actions with --shard=1/4 across 4 machines
Docker:              docker compose --profile sharded up
```

---

## 12. Performance Tuning & Benchmarks

### Benchmark Results

```
Test Suite: 500 scenarios across 50 features
Machine: 16-core, 32GB RAM
Average scenario: 2 minutes

| Workers | Total Time | Speedup | CPU Usage |
|---------|-----------|---------|-----------|
| 1       | 1000 min  | 1x      | 6%        |
| 2       | 500 min   | 2x      | 12%       |
| 4       | 250 min   | 4x      | 25%       |
| 8       | 130 min   | 7.7x    | 50%       |
| 10      | 105 min   | 9.5x    | 62%       |
| 15      | 70 min    | 14.3x   | 90%       |
| 20      | 65 min    | 15.4x   | 95%       |  ← diminishing returns
| 25      | 68 min    | 14.7x   | 100%      |  ← worse (thrashing)
```

### Optimal Worker Count Formula

```
Optimal Workers = min(
  Available CPU Cores - 1,     ← leave 1 core for OS
  Number of Features,          ← more workers than features = wasted
  Available RAM (GB) / 0.5,    ← each worker needs ~500MB
  20                           ← practical maximum
)
```

### Memory Requirements

```
Per worker:
  Node.js process:     ~100MB
  Chromium browser:    ~300MB
  Page content:        ~100MB
  ──────────────────────────
  Total per worker:    ~500MB

For 15 workers: ~7.5GB RAM recommended
For 20 workers: ~10GB RAM recommended
```

### Tips for Faster Execution

```
1. Session reuse (storageState)
   Before: Each scenario logs in (3-5s)
   After:  Cookies pre-loaded (0s)
   Savings: 3-5s × 500 scenarios = 25-40 minutes

2. Network idle → DOM content loaded
   Change: waitUntil: 'networkidle' → 'domcontentloaded'
   Savings: ~1s per navigation × ~1000 navigations = 16 minutes

3. Disable video/trace on CI
   Change: video: 'on-first-retry' → 'off'
   Savings: ~15% total time

4. Right-size features (5-15 scenarios each)
   Before: 1 feature with 100 scenarios → bottleneck
   After:  10 features with 10 scenarios → balanced

5. Use SSD for reports
   HDD I/O becomes bottleneck at 15+ workers
```

---

## 13. Troubleshooting

### "No features found matching criteria"

```bash
# Check what tags exist
grep -r "@" teams/**/features/**/*.feature | cut -d: -f2 | sort | uniq

# Try without tags
node scripts/run-sharded.js --dry-run

# Check specific team
node scripts/run-sharded.js --team sch --dry-run
```

### "Blob reports directory not found"

```bash
# Check if tests ran
ls -la blob-reports/

# Run with verbose
node scripts/run-sharded.js --tags "@smoke" --verbose

# Clean and retry
npm run clean && node scripts/run-sharded.js --tags "@smoke"
```

### Workers timeout or hang

```bash
# Increase timeout
node scripts/run-sharded.js --timeout 180000

# Reduce workers (less resource contention)
node scripts/run-sharded.js --workers 8

# Debug with 1 worker in headed mode
node scripts/run-sharded.js --workers 1 --headed --verbose
```

### Load imbalance (some workers finish much earlier)

```bash
# Check distribution
node scripts/run-sharded.js --dry-run

# If one feature has 100 scenarios → split it into smaller features
# The greedy algorithm can only balance as well as the input allows
```

### Report merge fails

```bash
# Check Playwright version
npx playwright --version

# Clean and retry
rm -rf blob-reports && node scripts/run-sharded.js --tags "@smoke"

# Manual merge
npx playwright merge-reports --reporter html blob-reports
```

### Docker OOM kills

```bash
# Increase shared memory (default 64MB too small for Chromium)
# docker-compose.yml: shm_size: 2gb

# Reduce workers inside container
WORKERS=2 docker compose up test-chromium

# Check memory usage
docker stats
```

---

## 14. Best Practices

### Feature File Sizing

```
✅ GOOD: 5-15 scenarios per feature file
   teams/sch/features/
     create-schedule.feature    (8 scenarios)
     edit-schedule.feature      (6 scenarios)
     publish-schedule.feature   (10 scenarios)
     delete-schedule.feature    (4 scenarios)

❌ BAD: Monster features or tiny features
   teams/sch/features/
     all-scheduling.feature     (100 scenarios) ← bottleneck
     one-test.feature           (1 scenario)    ← wasted overhead
```

### Tag Strategy for Sharding

```gherkin
@Team-SCH @Regression @P1-Critical
Feature: Schedule Publishing

  Background:
    Given I login as 'StoreManager1'.
    And I select location 'Automation1'.

  @smoke
  Scenario: Publish current week
    ...

  @edge-case
  Scenario: Publish with no employees
    ...
```

Run commands:
```bash
# All P1 tests across all teams
node scripts/run-sharded.js --tags "@P1-Critical" --workers 15

# SCH team regression only
node scripts/run-sharded.js --tags "@Regression" --team sch --workers 10

# Smoke tests, no flaky
node scripts/run-sharded.js --tags "@smoke and not @flaky" --workers 15
```

### Data File Sizing for Parallel

```
Rule: Number of users per type ≥ Number of workers

If you have 15 workers and each needs an Admin user:
  → Your data file needs at least 15 Admin users
  → Or use storageState session reuse (all share one session)

Recommended data file sizes:
  Workers  | Admin users | StoreManager users | TeamMember users
  4        | 4           | 4                  | 4
  10       | 10          | 10                 | 5
  15       | 15          | 15                 | 8
  20       | 20          | 20                 | 10
```

### Scenario Independence

```gherkin
✅ GOOD — Each scenario is self-contained:
  Scenario: Create and verify schedule
    Given I login as 'StoreManager1'.
    And I create a new schedule
    When I publish the schedule
    Then the schedule should be published

✅ GOOD — Shared Background for common setup:
  Background:
    Given I login as 'StoreManager1'.
    And I select location 'Automation1'.

  Scenario: View schedule
    When I navigate to schedule page
    Then I should see the schedule

❌ BAD — Scenario depends on previous scenario's side effects:
  Scenario: Create user
    When I create user "john"

  Scenario: Edit user (depends on "Create user" running first!)
    When I edit user "john"
```

> **Note:** In this framework, scenarios within a feature DO share a browser session
> for efficiency. However, each scenario's Given steps must navigate to the page it
> needs — they should not rely on a previous scenario leaving the browser in a specific
> state. Scenarios are **independent in outcome** (failure in one never skips others)
> but **share a session** for performance.

---

## Summary

| Execution Mode | Command | Best For |
|---|---|---|
| **Local (native)** | `npm test` | Development, debugging |
| **Local (sharded)** | `npm run test:sharded:smoke` | Pre-commit smoke tests |
| **Docker (single)** | `docker compose up test-chromium` | Consistent local CI |
| **Docker (sharded)** | `docker compose --profile sharded up` | Multi-container parallel |
| **GitHub Actions** | Push to PR / Manual trigger | Team CI/CD |
| **Jenkins** | Parameterized build | Enterprise CI/CD |

**Key numbers:**
- 15 workers on 16-core machine → 14x speedup
- Session reuse saves 25-40 minutes per 500 scenarios
- 4 CI shards = 4x faster with only 5% more compute
- Greedy algorithm achieves ~5% variance (near-perfect balance)

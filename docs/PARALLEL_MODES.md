# Parallel Execution Modes

This framework supports two parallelism modes designed for different use cases:
feature-level parallelism (default) and tag-based scenario splitting (for long features).

---

## Table of Contents

1. [Overview](#overview)
2. [Default Mode: Feature-Level Parallelism](#default-mode-feature-level-parallelism)
3. [Special Case Mode: Scenario Splitting by Tags](#special-case-mode-scenario-splitting-by-tags)
4. [Hybrid Mode: Features + Split in One Run](#hybrid-mode-features--split-in-one-run)
5. [How It Works Under the Hood](#how-it-works-under-the-hood)
6. [CLI Reference](#cli-reference)
7. [Tagging Conventions for Splitting](#tagging-conventions-for-splitting)
8. [Edge Cases & Troubleshooting](#edge-cases--troubleshooting)
9. [Performance Comparison](#performance-comparison)

---

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    PARALLEL EXECUTION MODES                     │
├─────────────────────────┬───────────────────────────────────────┤
│     DEFAULT MODE        │       SPECIAL CASE MODE               │
│  (Feature-Level)        │    (Scenario Split by Tags)           │
├─────────────────────────┼───────────────────────────────────────┤
│ Each feature file =     │ One big feature file is split         │
│ 1 worker process.       │ into N tag groups.                    │
│                         │                                       │
│ Scenarios inside run    │ Each tag group runs on its            │
│ SEQUENTIALLY.           │ own worker process.                   │
│                         │                                       │
│ Multiple features run   │ Scenarios within each group           │
│ in PARALLEL across      │ still run sequentially.               │
│ workers.                │                                       │
├─────────────────────────┼───────────────────────────────────────┤
│ Use for: most runs      │ Use for: features that take           │
│                         │ ~1 hour+ when run sequentially        │
├─────────────────────────┼───────────────────────────────────────┤
│ npm test                │ node scripts/run-split-scenarios.js   │
│ PARALLEL_MODE=feature   │ --feature <path> --tags "<groups>"    │
└─────────────────────────┴───────────────────────────────────────┘
```

### Key Environment Variable

```
PARALLEL_MODE=feature   (default) → fullyParallel: false
PARALLEL_MODE=scenario            → fullyParallel: true
```

---

## Default Mode: Feature-Level Parallelism

**When to use:** Most test runs. This is the default.

**How it works:**

1. `playwright-bdd` generates one `.spec.ts` file per `.feature` file
2. `fullyParallel: false` ensures Playwright assigns each spec file to exactly one worker
3. Scenarios inside that spec file execute sequentially (preserving order)
4. Multiple spec files run in parallel across the configured number of workers

```
npm test  (PARALLEL_MODE=feature, fullyParallel=false, WORKERS=4)
│
├─ Worker 1: overtime.spec.ts
│    └─ OT1 → OT2 → OT3 → OT4 → ... (sequential)
│
├─ Worker 2: mealbreaks.spec.ts
│    └─ MB1 → MB2 → MB3 → ... (sequential)
│
├─ Worker 3: payfile.spec.ts
│    └─ PF1 → PF2 → PF3 → ... (sequential)
│
└─ Worker 4: nextday.spec.ts → [finishes] → picks up accruals.spec.ts
     └─ ND1 → ND2 (sequential)      └─ AC1 → AC2 → ... (sequential)
```

### Shared Browser Session Within a Feature

In default mode, all scenarios within a feature share the **same BrowserContext and Page**. This is a key design decision:

```
Feature: Schedule Management       ← ONE BrowserContext for entire feature
  Scenario 1: Create schedule      ← uses shared page
  Scenario 2: Publish schedule     ← same page, state carries over from Scenario 1
  Scenario 3: Verify published     ← same page, state carries over
[Feature ends → context closed → next feature gets fresh context]
```

**Why shared?**
- Avoids re-login + re-navigation for every scenario (~3-5 seconds saved per scenario)
- Matches the existing Selenium framework behavior (WebDriver shared within feature)
- Each scenario's Given steps navigate to wherever it needs — independence preserved

**Failure Recovery:**
If a scenario fails, the framework automatically:
1. Takes a screenshot (attached to Playwright report)
2. Dismisses any blocking JS dialogs
3. Navigates to base URL (dashboard) — clean starting point
4. Next scenario's Given steps navigate from there — no skipping

Scenarios are **independent in outcome** — failure in one **never** skips others.

**Commands:**

```bash
# Default: 2 workers locally, 4 in CI
npm test

# Explicit feature-parallel mode
PARALLEL_MODE=feature npm test

# More workers for faster execution
WORKERS=8 npm test

# Filter by tags (only generate matching scenarios)
TEST_TAGS="@P1-Critical" npm test

# Filter by team
TEAM=sch npm test
```

**What happens internally:**

```
playwright.config.ts
  │
  ├─ PARALLEL_MODE = process.env.PARALLEL_MODE || 'feature'
  ├─ fullyParallel = (PARALLEL_MODE === 'scenario')  → false
  │
  ├─ defineBddConfig({
  │     features: ['teams/*/features/**/*.feature'],
  │     outputDir: '.features-gen',
  │     tags: process.env.TEST_TAGS || undefined,
  │   })
  │
  └─ workers = process.env.WORKERS || (CI ? 4 : 2)
```

---

## Special Case Mode: Scenario Splitting by Tags

**When to use:** A single feature file takes too long (~1 hour) when scenarios run
sequentially. You want to split its scenarios across multiple workers.

**Prerequisites:** Scenarios in the long feature must be tagged with partition tags
(e.g., `@part1`, `@part2`, `@part3` or individual tags like `@OT1`, `@OT2`).

**How it works:**

1. `run-split-scenarios.js` takes a feature file path and comma-separated tag groups
2. For each tag group, it spawns a separate child process
3. Each child process sets `TEST_TAGS=<group>` so `defineBddConfig` generates only matching scenarios
4. Each child process gets a unique `SHARD_ID` for isolated `.features-gen-*` output
5. All processes run in parallel, then blob reports are merged

```
node scripts/run-split-scenarios.js \
  --feature teams/sch/features/ui/overtime.feature \
  --tags "@OT1 or @OT2 or @OT3, @OT4 or @OT5 or @OT6, @OT7 or @OT8 or @OT9"
│
├─ Process 0: TEST_TAGS="@OT1 or @OT2 or @OT3"
│    SHARD_ID="split-overtime-group0"
│    └─ .features-gen-split-overtime-group0/overtime.spec.ts
│         └─ OT1 → OT2 → OT3 (sequential, workers=1)
│         └─ blob-reports/split-overtime-group0/
│
├─ Process 1: TEST_TAGS="@OT4 or @OT5 or @OT6"
│    SHARD_ID="split-overtime-group1"
│    └─ .features-gen-split-overtime-group1/overtime.spec.ts
│         └─ OT4 → OT5 → OT6 (sequential, workers=1)
│         └─ blob-reports/split-overtime-group1/
│
└─ Process 2: TEST_TAGS="@OT7 or @OT8 or @OT9"
     SHARD_ID="split-overtime-group2"
     └─ .features-gen-split-overtime-group2/overtime.spec.ts
          └─ OT7 → OT8 → OT9 (sequential, workers=1)
          └─ blob-reports/split-overtime-group2/
│
└─ Merge blob reports → unified HTML report
```

**Commands:**

```bash
# Split a feature into 3 tag groups
node scripts/run-split-scenarios.js \
  --feature teams/sch/features/ui/overtime.feature \
  --tags "@part1, @part2, @part3"

# Dry run — see the plan without executing
node scripts/run-split-scenarios.js \
  --feature teams/sch/features/ui/overtime.feature \
  --tags "@part1, @part2, @part3" \
  --dry-run

# Validate no overlapping scenarios between groups
node scripts/run-split-scenarios.js \
  --feature teams/sch/features/ui/overtime.feature \
  --tags "@part1, @part2, @part3" \
  --validate

# Using 'or' expressions for grouping individual scenario tags
node scripts/run-split-scenarios.js \
  --feature teams/sch/features/ui/overtime.feature \
  --tags "@OT1 or @OT2 or @OT3 or @OT4, @OT5 or @OT6 or @OT7 or @OT8, @OT9 or @OT10"

# With retries and verbose output
node scripts/run-split-scenarios.js \
  --feature teams/sch/features/ui/overtime.feature \
  --tags "@part1, @part2, @part3" \
  --retries 2 --verbose

# npm shorthand
npm run test:split -- --feature teams/sch/features/ui/overtime.feature --tags "@part1, @part2"
```

---

## Hybrid Mode: Features + Split in One Run

**When to use:** You want to shard ALL features across workers (normal sharding)
AND split one or more long features by tags — all in one execution.

**How it works:**

1. `run-sharded.js` discovers all features and distributes them with greedy load-balancing
2. Split features are removed from the normal pool
3. Each tag group of a split feature becomes a "virtual shard" (work item)
4. Virtual shards are mixed into the unified work pool and distributed
5. Normal features run as feature files; split groups run with `TEST_TAGS` + `FEATURE_PATHS`

```
node scripts/run-sharded.js --workers 6 \
  --split-feature teams/sch/features/ui/overtime.feature \
  --split-tags "teams/sch/features/ui/overtime.feature:@part1,@part2,@part3"
│
├─ Normal features: 49 features (overtime.feature removed from pool)
├─ Split groups: 3 virtual shards from overtime.feature
├─ Total work items: 52
│
├─ Shard 1: [mealbreaks.feature, payfile.feature]        (normal)
├─ Shard 2: [overtime-part1]                              (split, TEST_TAGS=@part1)
├─ Shard 3: [overtime-part2, smallfeature.feature]        (mix!)
├─ Shard 4: [overtime-part3]                              (split, TEST_TAGS=@part3)
├─ Shard 5: [accruals.feature, nextday.feature, ...]     (normal)
└─ Shard 6: [smaller features...]                         (normal)
│
└─ All run in parallel → merge blob reports
```

**Commands:**

```bash
# Hybrid: 8 workers, split one feature
node scripts/run-sharded.js --workers 8 \
  --split-feature teams/sch/features/ui/overtime.feature \
  --split-tags "teams/sch/features/ui/overtime.feature:@part1,@part2,@part3"

# Hybrid: split two features
node scripts/run-sharded.js --workers 10 \
  --split-feature teams/sch/features/ui/overtime.feature \
  --split-tags "teams/sch/features/ui/overtime.feature:@part1,@part2,@part3" \
  --split-feature teams/sch/features/ui/mealbreaks.feature \
  --split-tags "teams/sch/features/ui/mealbreaks.feature:@mb-part1,@mb-part2"

# Dry run
node scripts/run-sharded.js --workers 8 \
  --split-feature teams/sch/features/ui/overtime.feature \
  --split-tags "teams/sch/features/ui/overtime.feature:@part1,@part2,@part3" \
  --dry-run
```

**`--split-tags` format:**
```
"<feature-path>:<tag-group-1>,<tag-group-2>,<tag-group-3>"
                ^             ^              ^
                colon         commas separate groups
```

Each tag group is a Cucumber tag expression (supports `@tag`, `@a or @b`, `@a and @b`, `not @x`).

---

## How It Works Under the Hood

### The `PARALLEL_MODE` Switch

In `playwright.config.ts`:

```typescript
const PARALLEL_MODE = process.env.PARALLEL_MODE || 'feature';

export default defineConfig({
  fullyParallel: PARALLEL_MODE === 'scenario',
  // ...
});
```

| `PARALLEL_MODE` | `fullyParallel` | Behavior |
|-----------------|-----------------|----------|
| `feature` (default) | `false` | Each spec file = 1 worker, scenarios sequential |
| `scenario` | `true` | Individual scenarios distributed across workers |

### The `FEATURE_PATHS` Override

When `FEATURE_PATHS` is set, `getTestPaths()` uses it instead of resolving by `TEAM`/`TYPE`:

```typescript
if (process.env.FEATURE_PATHS) {
  const featurePaths = process.env.FEATURE_PATHS.split(',').map(p => p.trim());
  return { features: featurePaths, steps };
}
```

This lets `run-split-scenarios.js` point each child process at a specific feature file.

### Per-Shard Output Directory Isolation

When multiple processes run simultaneously (split mode), they each call `defineBddConfig()`
which generates files into the output directory. Without isolation, processes overwrite each
other's generated spec files.

```typescript
const outputDir = process.env.SHARD_ID
  ? `.features-gen-${process.env.SHARD_ID}`
  : '.features-gen';
```

Each child process sets a unique `SHARD_ID`, resulting in isolated directories:
```
.features-gen-split-overtime-group0/
.features-gen-split-overtime-group1/
.features-gen-split-overtime-group2/
```

### The `TEST_TAGS` Filter

`defineBddConfig({ tags })` filters at generation time. Only scenarios matching the
tag expression are generated into spec files:

```typescript
const testDir = defineBddConfig({
  features,
  steps,
  outputDir,
  tags: process.env.TEST_TAGS || undefined,  // Cucumber tag expression
});
```

When `TEST_TAGS=@part1`, only scenarios tagged `@part1` get generated.

### Shared Session Architecture

Each worker process maintains module-level shared variables:

```typescript
// These persist across all scenarios in a feature (within one worker)
let _sharedContext: BrowserContext | null = null;  // Shared within feature
let _sharedPage: Page | null = null;               // Shared within feature
let _sharedTestContext: TestContext | null = null;  // Shared within feature
let _currentFeature: string | null = null;         // Tracks feature boundary
let _previousScenarioFailed = false;               // Triggers recovery
```

**Feature boundary detection:** The `context` fixture checks `testInfo.titlePath[0]` (the feature name). When it changes, the old context is closed and a fresh one is created.

**Recovery flow on failure:**
```
Scenario 3 FAILS
  → screenshot saved to reports/screenshots/
  → _previousScenarioFailed = true

Scenario 4 starts
  → page fixture detects _previousScenarioFailed
  → Dismisses any open dialogs
  → Navigates to base URL (dashboard)
  → _previousScenarioFailed = false
  → Scenario 4's Given steps navigate to where it needs
```

This means each scenario's Given steps must include navigation to the page it needs (e.g., "Given I go to the schedule page"). They should NOT assume the page is already in a specific state from a previous scenario.

---

## CLI Reference

### `run-split-scenarios.js`

Split a single long feature file by tag groups.

```
node scripts/run-split-scenarios.js [options]

Required:
  --feature <path>       Path to the feature file to split
  --tags <groups>        Comma-separated tag groups (Cucumber expressions)

Optional:
  --dry-run              Show execution plan without running
  --validate             Check for overlapping scenarios across groups
  --retries <N>          Retry count (default: 1)
  --timeout <ms>         Timeout per scenario (default: 60000)
  --headed               Run with visible browser
  --verbose / -v         Show full output from each worker
  --report-dir <path>    Report output directory (default: reports)
```

### `run-sharded.js` (Enhanced)

Feature-level sharding with optional hybrid scenario splitting.

```
node scripts/run-sharded.js [options]

Standard Options:
  --workers <N>          Number of parallel workers (default: 15)
  --tags <expression>    Cucumber tag expression filter
  --team <name>          Team filter
  --features <glob>      Feature file glob pattern
  --dry-run              Show execution plan without running
  --retries <N>          Retry count (default: 2)
  --timeout <ms>         Timeout per scenario (default: 60000)
  --headed               Run with visible browser
  --verbose / -v         Show full output from each worker

Hybrid Split Options:
  --split-feature <path>         Feature to split (repeatable)
  --split-tags "<path>:<groups>" Tag groups for a split feature
```

### npm Scripts

```bash
npm test                    # Default mode (feature-level parallel)
npm run test:feature-parallel  # Explicit feature-level parallel
npm run test:split -- --feature <path> --tags "<groups>"  # Split mode
npm run test:sharded        # Feature-level sharding
npm run test:dry-run        # Dry run sharding plan
```

---

## Tagging Conventions for Splitting

### Option A: Partition Tags (Recommended)

Add `@part1`, `@part2`, `@part3` tags to divide scenarios into balanced groups:

```gherkin
@overtime
Feature: Overtime Calculations

  @part1
  Scenario: Calculate daily overtime
    Given ...

  @part1
  Scenario: Calculate weekly overtime
    Given ...

  @part2
  Scenario: Overtime with meal break deduction
    Given ...

  @part2
  Scenario: Overtime across midnight
    Given ...

  @part3
  Scenario: Overtime with holiday multiplier
    Given ...
```

Split command:
```bash
node scripts/run-split-scenarios.js \
  --feature overtime.feature \
  --tags "@part1, @part2, @part3"
```

### Option B: Individual Scenario Tags

Use existing unique scenario tags to build groups:

```gherkin
@overtime
Feature: Overtime Calculations

  @OT1
  Scenario: Calculate daily overtime
    ...

  @OT2
  Scenario: Calculate weekly overtime
    ...

  @OT3
  Scenario: Overtime with meal break deduction
    ...
```

Split command (group individual tags with `or`):
```bash
node scripts/run-split-scenarios.js \
  --feature overtime.feature \
  --tags "@OT1 or @OT2 or @OT3, @OT4 or @OT5 or @OT6, @OT7 or @OT8 or @OT9"
```

### Best Practices

1. **Use mutually exclusive tags** — Each scenario should match exactly one group
2. **Balance the groups** — Try to have roughly equal scenarios per group
3. **Keep related scenarios together** — Scenarios within a group share a browser session, so they should be from the same feature file. Each scenario's Given steps must navigate to where it needs.
4. **Use `--validate`** to check for overlaps before running
5. **Use `--dry-run`** to preview the distribution

---

## Edge Cases & Troubleshooting

### Scenario Appears in Multiple Groups

**Problem:** A scenario tagged `@OT5 @regression` matches both `--tags "@OT5"` and
another group using `@regression`.

**Result:** The scenario runs in BOTH groups (duplicate execution).

**Fix:** Use mutually exclusive partition tags (`@part1`, `@part2`) or individual
scenario tags. Run `--validate` to detect overlaps.

### Scenario Not Covered by Any Group

**Problem:** A scenario exists in the feature but doesn't match any tag group.

**Result:** It won't run. The script shows a warning:
```
WARNING: 3 scenario(s) not covered by any tag group:
  - Line 45: Overtime with holiday pay [@OT10 @holiday]
```

**Fix:** Add the missing tag to one of your groups.

### Empty Tag Group (0 Matching Scenarios)

**Problem:** A tag expression matches no scenarios in the feature.

**Result:** The process runs with `--pass-with-no-tests` and exits cleanly.
A warning is logged.

### Concurrent `.features-gen` Conflicts

**Problem:** Multiple processes overwrite each other's generated spec files.

**Result:** Already solved. Each process uses `SHARD_ID` for isolated output:
`.features-gen-split-overtime-group0/`, `.features-gen-split-overtime-group1/`, etc.

### Scenario Outline with Examples

Each `Examples` row generates a separate test. Tags on `Scenario Outline` apply
to all rows. To split by examples, tag each `Examples:` table separately:

```gherkin
  Scenario Outline: Calculate overtime for <type>
    Given the overtime type is "<type>"
    ...

    @part1
    Examples:
      | type   |
      | daily  |
      | weekly |

    @part2
    Examples:
      | type     |
      | monthly  |
      | annual   |
```

---

## Performance Comparison

### Example: 30-Scenario Feature (Overtime)

Assume each scenario takes ~2 minutes.

| Mode | Workers | Wall-Clock Time | Speedup |
|------|---------|-----------------|---------|
| Default (sequential within feature) | 4 | ~60 min | 1x |
| Split into 3 groups (10 scenarios each) | 4 | ~20 min | 3x |
| Split into 6 groups (5 scenarios each) | 6 | ~10 min | 6x |
| Split into 10 groups (3 scenarios each) | 10 | ~6 min | 10x |

### Example: 50 Features + 1 Long Feature

Without splitting:
```
50 features across 8 workers → ~25 min
BUT: the 30-scenario feature takes 60 min on its worker
Total wall-clock: 60 min (bottleneck!)
```

With hybrid splitting:
```
49 features + 3 split groups across 8 workers → ~25 min
The 30-scenario feature is split: 3 groups × 10 scenarios × 2 min = ~20 min each
Total wall-clock: ~25 min (no bottleneck!)
```

---

## Summary Decision Table

| Scenario | Mode | Command |
|----------|------|---------|
| Normal run, all features | Default | `npm test` |
| Run with more workers | Default | `WORKERS=8 npm test` |
| Run specific team | Default | `TEAM=sch npm test` |
| Run by tag | Default | `TEST_TAGS="@smoke" npm test` |
| Split one big feature | Split | `node scripts/run-split-scenarios.js --feature <path> --tags "<groups>"` |
| Shard all features (CI) | Sharded | `node scripts/run-sharded.js --workers 15` |
| Shard features + split a big one | Hybrid | `node scripts/run-sharded.js --workers 8 --split-feature <path> --split-tags "<path>:<groups>"` |
| See execution plan | Any | Add `--dry-run` to any command |

# Root Cause Analysis — SCH-22428

**Defect:** Staging | DataDog log limit | Massive ShiftOPVariableContainer Logs
**Status:** Released
**Priority:** Medium
**Reporter:** Stoneman Huang
**Assignee:** Valentin Tutunaru
**Fix PR:** [legionco/enterprise#45223](https://github.com/legionco/enterprise/pull/45223)

---

## 4.0 Problem Statement

The `forac` enterprise on staging was generating **2.2 million log entries** in Datadog from `ShiftOPVariableContainer.createDailyShift()`, causing excessive log volume and associated cost/noise. The logging occurred for every rejected invalid shift across every combination of worker, day, role, and shift duration during guidance refresh.

---

## 4.1 Timeline of Events

| Event | Date | Detail |
|-------|------|--------|
| Defect introduced | Unknown (latent) | `logger.info()` existed since shift validation was added |
| Defect detected | ~2026-02-28 | Stoneman Huang noticed massive Datadog log volume for forac staging |
| Jira created | 2026-02-28 | SCH-22428 filed |
| Fix PR opened | 2026-03-03 | enterprise#45223 — Remove excessive invalid shift logging |
| Fix merged | 2026-03-03 | PR merged same day |
| Released | 2026-03-03+ | Labels: released-to-ea, released-to-uat, released-to-production |

**Time to Detect:** Unknown (latent issue, only surfaced under specific configuration)
**Time to Fix:** Same day

---

## 4.2 Three-Source Analysis

### Defect Description (from Jira)
1. **What:** Massive volume of ShiftOPVariableContainer logs flooding Datadog on staging
2. **What changed:** The `forac` enterprise configuration with 6AM-6AM operating hours created a dead zone generating millions of rejected shift attempts
3. **Why:** Each rejected invalid shift triggered a `logger.info()` call, producing 2.2M log entries

### PR Description (from enterprise#45223)
1. **What:** Removed `logger.info()` call for invalid shift validation failures in `ShiftOPVariableContainer.createDailyShift()`
2. **What changed:** Single line removal — `logger.info(msg)` deleted; `addCodeDiagnostics(msg)` preserved for scheduling digest
3. **Why:** The logging was producing 2.2M entries for the forac enterprise due to a dead zone in the 6AM-6AM operating hours configuration

### Code Description (from PR diff)
1. **What:** File `ShiftOPVariableContainer.java` — removed line 509: `logger.info(msg)` in the shift validation error path
2. **What changed:** The diagnostic message is no longer sent to the application logger; it's still captured via `sp().addCodeDiagnostics(msg)` for scheduling digest
3. **Why:** The info-level log was firing for every invalid shift attempt, which is expected behavior during optimization but not useful as application logs

---

## 4.3 Causal Chain Mapping

### Root Cause
The `logger.info()` call in the shift validation rejection path was at an inappropriate log level for a high-frequency code path. During optimization, thousands of shifts are generated and validated per worker/day/role combination — rejected shifts are expected behavior, not exceptional events worthy of info-level logging.

### Contributing Factors
1. **Configuration trigger:** The `forac` enterprise has 6AM-6AM operating hours (24-hour window) with `continuousOperation=false` and `enableShiftCrossBoundary=false`, creating a dead zone (midnight to 6AM) that generates many invalid shifts
2. **Secondary start-time paths:** `DynamicShifts.getPossibleStartTimes()` secondary paths (lines 276-297) check against `businessEndMinutes` (1800) instead of `dayEnd` (1440), generating start times that are always rejected
3. **Scale multiplier:** The log fires for every combination of worker × day × role × shift duration across multiple businesses and 8+ weeks of guidance refresh

### Trigger
Guidance refresh execution on the `forac` enterprise on staging, which has the specific 6AM-6AM operating hours configuration.

---

## 4.4 Classification

| Dimension | Classification |
|-----------|---------------|
| **Defect Type** | Performance / Observability |
| **Root Cause Category** | Inappropriate Log Level |
| **Phase Introduced** | Development (original implementation) |
| **Phase Detected** | Operations (Datadog monitoring) |
| **Severity** | Medium — no functional impact, cost/noise impact |
| **Escape Reason** | No log volume testing for edge-case configurations |

---

## 4.5 Five-Why Analysis

1. **Why** were 2.2M logs generated? → Every rejected invalid shift was logged at info level
2. **Why** were so many shifts rejected? → The 6AM-6AM operating hours config created a dead zone generating start times that always fail validation
3. **Why** did the secondary path generate invalid start times? → It checks `businessEndMinutes` (1800) instead of the capped `dayEnd` (1440)
4. **Why** was `logger.info()` used for expected rejections? → The logging was added for debugging during development and never adjusted for production volume
5. **Why** wasn't this caught earlier? → No performance/log-volume testing exists for optimizer hot paths under edge-case configurations

---

## 4.6 Impact Assessment

| Impact Area | Detail |
|-------------|--------|
| **Functional** | None — shift validation logic was correct, shifts were properly rejected |
| **Performance** | Minimal — logging overhead on hot path, but not a bottleneck |
| **Observability** | HIGH — 2.2M log entries polluted Datadog, masked real issues, increased cost |
| **Cost** | Datadog ingestion cost for 2.2M unnecessary log entries |

---

## 4.7 Fix Validation

| Check | Status |
|-------|--------|
| Fix is minimal (1 line removal) | PASS |
| Diagnostic info preserved (`addCodeDiagnostics`) | PASS |
| No functional logic changed | PASS |
| Shift validation still works | PASS |
| Scheduling digest still has diagnostic data | PASS |

---

## 4.8 Preventive Recommendations

| # | Recommendation | Type | Priority |
|---|---------------|------|----------|
| 1 | **Add log-level review gate for optimizer hot paths** — Any `logger.info()` or higher in optimization loops should be flagged in code review | Process | High |
| 2 | **Add Datadog log volume alerts** — Alert when a single logger generates >100K entries/hour | Tooling | High |
| 3 | **Use `logger.debug()` or `logger.trace()` for expected validation failures** — Reserve `info` for business events, not optimization internals | Standard | Medium |
| 4 | **Add performance test for edge-case configurations** — Test optimizer with 6AM-6AM, 24-hour, and cross-boundary operating hours configs | Testing | Medium |
| 5 | **Review secondary start-time paths in DynamicShifts** — Lines 276-297 should cap against `dayEnd` not `businessEndMinutes` to avoid generating always-invalid start times | Code Fix | Low (functional is correct, just wasteful) |

---

## 4.9 Reviewer Assessments

### QA Lead Perspective
The defect was a latent observability issue that only surfaced under a specific operating hours configuration. No functional impact, but it highlights a gap in our performance/observability testing. We should add log-volume monitoring as a standard regression check.

### Tech Lead Perspective
The fix is clean — single line removal with diagnostics preserved. The deeper issue is the secondary start-time path in `DynamicShifts` that generates mathematically impossible start times. While not a bug (they're correctly rejected), it's wasteful computation that should be addressed in a follow-up optimization.

### Pressure Test
- Could this happen again with a different logger? **Yes** — any info-level log in the optimizer hot path would have the same issue. Recommendation #1 (code review gate) addresses this.
- Is the fix complete? **Yes for the symptom, no for the root cause** — the dead-zone start-time generation in `DynamicShifts` still occurs, it's just no longer logged.

---

*Generated by Post-Release RCA Agent | Blameless analysis — focused on systems and processes*

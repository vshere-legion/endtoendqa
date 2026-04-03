# Impact in Automation Code — Regression Impact Analysis | ER-2600

**Source:** Playwright automation framework `/teams/sch/`
**Feature:** Cross-location employee shift transition across peer locations and location groups

---

## Critical Page Objects Impacted

| Page Object | Lines | Impact Reason |
|-------------|-------|---------------|
| `Er2600Page.ts` | 190 | Direct — transition verification, auto-scheduler, location/group selectors |
| `P2PSchedulePage.ts` | 300+ | Schedule generation, filtering, navigation — parent location view affected |
| `P2PShiftPage.ts` | 500+ | Shift creation, assignment, drag/drop — transition shifts touch this |
| `P2PLocationSelectorPage.ts` | 150+ | Location/peer location/district selection — scope definition for transitions |

## Critical Step Definitions Impacted

| Step File | Steps | Impact Reason |
|-----------|-------|---------------|
| `er_2600.steps.ts` | 48 | Direct — all transition scenario steps |
| `p2p-schedule.steps.ts` | 50+ | Schedule gen, filtering, smart cards — location-level operations |
| `p2p-shifts.steps.ts` | 60+ | Shift assignment, drag/drop, open shifts — cross-location moves |
| `p2p-navigation.steps.ts` | 24 | DM/SM view switching, peer location operations |
| `p2p-employee.steps.ts` | 45+ | Employee shift offers/swaps — multi-location qualifications |

## Impacted Feature Files (by scenario count)

| Feature File | Scenarios | Tags | Impact Level |
|-------------|-----------|------|-------------|
| `p2p-drag-drop-shifts.feature` | 7 | `@p2p-shifts` | HIGH — shift movement across locations |
| `p2p-budget.feature` | 6 | `@p2p-budget` | MEDIUM — budget across peer locations |
| `p2p-dm-views.feature` | 6 | `@p2p-dm` | MEDIUM — district-level views |
| `p2p-shift-editing.feature` | 6 | `@p2p-shifts` | HIGH — shift edits may affect transitions |
| `p2p-schedule-generation.feature` | 4 | `@p2p-schedule` | HIGH — schedule gen with transitions |
| `p2p-shift-assignment.feature` | 4 | `@p2p-shifts` | HIGH — assignment constraints |
| `p2p-employee-self-service.feature` | 4 | `@p2p-employee` | MEDIUM — shift offers/swaps |
| `p2p-peer-locations.feature` | 4 | `@p2p-schedule` | HIGH — peer location operations |
| `p2p-permissions.feature` | 3 | `@p2p-permissions` | LOW — permission checks |
| `p2p-new-shift-creation.feature` | 3 | `@p2p-shifts` | MEDIUM — new shift creation UI |
| `p2p-open-shifts.feature` | 4 | `@p2p-shifts` | MEDIUM — auto/manual open shifts |
| `p2p-master-template.feature` | 7 | `@p2p-template` | MEDIUM — template integration |
| `p2p-drag-drop-employees.feature` | 2 | `@p2p-shifts` | HIGH — employee reassignment across locations |
| `p2p-copy-schedule.feature` | 2 | `@p2p-schedule` | LOW — copy schedule |
| `schedule-shift-flow.feature` | 5 | `@shift-flow` | MEDIUM — shift creation/validation |
| `schedule-creation-two-weeks.feature` | 3 | `@schedule` | LOW — future week scheduling |

**Total impacted scenarios:** 70

---

## Key UI Elements / Locators Affected

### Location & Group Selection
- `locationSelector()` — combobox for location selection
- `groupSelector()` — combobox for group selection
- `districtSelector()` — combobox for district selection
- `changeLocation(name)` — method to switch location context
- `changeDistrict(name)` — method to switch district context
- `getChildLocationNames()` — retrieves peer location names

### Shift & Transition
- `transitionIndicator()` — visual indicator for cross-location transitions
- `weekShiftWrappers()` — shift display in week view
- `assignedShifts()` / `openShifts()` — shift type filtering
- `dragDropShifts(dayType, locationType)` — drag between locations
- `editLocationDropdown()` — location change during shift edit

### Auto-Scheduler
- `autoScheduleButton()` — trigger auto-scheduler
- `generateScheduleButton()` — generate schedule
- `waitForScheduleGeneration()` — wait for optimizer completion (120s timeout)

### Violations & Constraints
- `violationMessage()` — constraint violation display
- `assignErrors()` — assignment error messages
- `copyMoveErrors()` — cross-location move errors

---

## Data Dependencies

### Test Data Entities
- **ShiftInput:** `{ workRole, startTime, endTime, dayIndex, headcount, isOpenShift }`
- **ScheduleParams:** `{ startTime, endTime, weekOffset, clearExisting }`
- **FilterConfig:** `{ locationFilter, workRoleFilter, employeeFilter, openShiftsOnly }`

### Context Variables (shared across scenarios via @mode:serial)
- `locationName`, `locationSelected` — current location context
- `scheduleGenerated` — schedule state
- `shiftCount`, `shiftDetails` — shift inventory
- `childLocations` — peer location list
- `tmName`, `firstTMWorkRole`, `secondTMWorkRole` — employee data

### Test Environment
- **Enterprise:** cinemark-wkdy
- **Locations:** P2P_Test (parent), Peer001, Peer02 (children)
- **Users:** StoreManager (nora+mose@legion.co), TeamMember (nora+dejah@legion.co)

---

## Regression Recommendation

### Must Run (HIGH impact — 6 features, 31 scenarios)
1. `p2p-drag-drop-shifts.feature` — 7 scenarios
2. `p2p-shift-editing.feature` — 6 scenarios
3. `p2p-schedule-generation.feature` — 4 scenarios
4. `p2p-shift-assignment.feature` — 4 scenarios
5. `p2p-peer-locations.feature` — 4 scenarios
6. `p2p-drag-drop-employees.feature` — 2 scenarios
7. `er_2600.feature` — 11 scenarios (new)

### Should Run (MEDIUM impact — 6 features, 29 scenarios)
1. `p2p-budget.feature` — 6 scenarios
2. `p2p-dm-views.feature` — 6 scenarios
3. `p2p-employee-self-service.feature` — 4 scenarios
4. `p2p-open-shifts.feature` — 4 scenarios
5. `p2p-new-shift-creation.feature` — 3 scenarios
6. `p2p-master-template.feature` — 7 scenarios

### Can Skip (LOW impact — 4 features, 13 scenarios)
1. `p2p-permissions.feature` — 3 scenarios
2. `p2p-copy-schedule.feature` — 2 scenarios
3. `schedule-creation-two-weeks.feature` — 3 scenarios
4. `forecast-*.feature` — 5 scenarios

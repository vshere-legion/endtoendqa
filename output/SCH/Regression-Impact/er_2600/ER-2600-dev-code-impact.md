# Impact in Development Code — Regression Impact Analysis | ER-2600

**Story:** Ability to automatically transition an employee within a shift across locations in a group and across location groups in a district
**Mode:** READ ONLY — no code modifications
**Repos Analyzed:**
- Frontend: `/Users/vshere/Documents/Projects/UI/console-ui-selenium` (Selenium test automation / UI page objects)
- Backend: `/Users/vshere/Documents/Projects/Enterprise-28Nov25/enterprise`

---

## BACKEND — Critical Components

### 1. Location Hierarchy & Grouping (CRITICAL)

| File | Type | Impact |
|------|------|--------|
| `core/src/.../business/BusinessUtil.java` | Core Utility | **CRITICAL** — `getLocationGroupCluster()` returns all peer locations for transition scope |
| `core/src/.../business/LocationHierarchy.java` | Entity Model | HIGH — parent-child relationships enabling cross-location shifts |
| `core/src/.../business/LocationHierarchyImpl.java` | Service | HIGH — `updateLocationLH()`, `findParentByExternalId()` |
| `core/src/.../business/LocationGroup.java` | Entity Model | MEDIUM — location group definitions (P2P, MasterSlave) |
| `core/src/.../business/LocationGroupImpl.java` | Service | MEDIUM — peer location discovery within groups |

**What to Test:**
- [ ] `getLocationGroupCluster()` correctly returns all peer locations for an employee
- [ ] MasterSlave group: child locations can transition to parent and siblings
- [ ] PeerToPeer group: all peers accessible for transition
- [ ] District-level grouping returns correct locations
- [ ] Hierarchy changes propagate to scheduling immediately

### 2. Auto-Scheduler & Optimization Engine (CRITICAL)

| File | Type | Impact |
|------|------|--------|
| `core/src/.../schedule/optimization/GroupSchedulingProblem.java` | Optimizer | **CRITICAL** — core class for scheduling within location groups |
| `core/src/.../schedule/GroupSchedulingManager.java` | Manager | HIGH — orchestrates schedule gen and reporting for groups |
| `core/src/.../schedule/autoschedule/AutoScheduleTask.java` | Task | MEDIUM — triggers auto-schedule generation |
| `core/src/.../schedule/optimization/assignment/AssignmentTransitions.java` | Algorithm | HIGH — work role transition logic (similar pattern for location transitions) |
| `core/src/.../schedule/optimization/staffing/costfunction/RoleTransitionCostFunction.java` | Cost Function | MEDIUM — penalty calculations for transitions |

**What to Test:**
- [ ] Auto-scheduler generates cross-location shifts within a location group
- [ ] MasterSlave scheduling: workers assigned across parent-child locations
- [ ] PeerToPeer scheduling: workers assigned across peer locations
- [ ] Optimizer respects location group boundaries (no cross-district transitions)
- [ ] Worker qualifications checked across ALL group locations
- [ ] Cross-location schedule conflict detection works
- [ ] Cost function correctly penalizes unnecessary transitions

### 3. Scheduling Policy & Configuration (CRITICAL)

| File | Type | Impact |
|------|------|--------|
| `core/src/.../config/template/broker/SchedulePolicyBroker.java` | Config Broker | **CRITICAL** — transition enablement flags and restrictions |
| `core/src/.../config/template/content/SchedulePolicyContent.java` | Config Content | HIGH — schedule policy structure |

**Key Config Methods:**
- `isWorkRoleTransitionsEnabled()` — must be extended for location transitions
- `isWorkRoleTransitionsEnabledAutoSchedule()` — auto-schedule transition toggle
- `getTransitionRestrictionApi()` — time restrictions between transitions
- `isLimitTransitionsEnabled()` — transition limit enforcement

**What to Test:**
- [ ] Location-based transition enablement flags exist and function
- [ ] Transition time restrictions apply correctly across locations
- [ ] Configuration inheritance from parent to child locations
- [ ] Toggle ON/OFF doesn't break existing single-location scheduling
- [ ] Configuration changes take effect without restart

### 4. Shift Assignment & Worker Validation (HIGH)

| File | Type | Impact |
|------|------|--------|
| `core/src/.../schedule/shift/WorkerShiftServiceImpl.java` | Service | HIGH — worker eligibility validation |
| `core/src/.../schedule/shift/ShiftAssignmentException.java` | Exception | LOW — error handling |

**What to Test:**
- [ ] Worker qualification checks work across all locations in group
- [ ] Multi-skill workers correctly identified across locations
- [ ] Shift assignment constraints (hours, consecutive days) apply across group
- [ ] Proper error messages for invalid cross-location assignments

### 5. Shift Swap & Offer Services (HIGH)

| File | Type | Impact |
|------|------|--------|
| `core/src/.../schedule/shift/shiftSwapOffers/ShiftSwapOfferServiceImpl.java` | Service | HIGH — cross-location swap validation |
| `core/src/.../schedule/shift/openShifts/GroupOfferApi.java` | API Model | MEDIUM — multi-location offer representation |
| `core/src/.../schedule/shift/openShifts/LocationOffer.java` | Entity | MEDIUM — location-level offers |

**What to Test:**
- [ ] Workers can swap shifts across locations in a group
- [ ] Location group constraints enforced during swap validation
- [ ] Worker eligibility checks work across locations
- [ ] Shift offer generation for multiple locations in a group

### 6. Schedule API Endpoints (MEDIUM)

| File | Type | Impact |
|------|------|--------|
| `integration/src/.../apiv2/schedules/SchedulesV2Resource.java` | REST API | MEDIUM — v2 schedule endpoints |
| `integration/src/.../partner/api/shift/ShiftResource.java` | REST API | MEDIUM — partner shift API |

**Endpoints to Test:**
- [ ] `GET /v2/schedules` — returns cross-location shifts correctly
- [ ] `POST /v2/schedules/{id}/publish` — publishes multi-location schedule
- [ ] `GET /v2/schedules/schedule-overview` — overview includes all group locations
- [ ] `GET /api/shifts` — location filtering for multi-location schedules

### 7. Data Structures (MEDIUM)

| File | Type | Impact |
|------|------|--------|
| `core/src/.../schedule/ScheduleForDistrictsApi.java` | API Model | MEDIUM — district-level schedule data |

**What to Test:**
- [ ] Schedule entries include all locations in district
- [ ] Worker display info correct for cross-location assignments
- [ ] Shift segment data preserved across locations

---

## FRONTEND — Critical Components

### 1. Shift Transition UI (HIGH)

| File | Type | Impact |
|------|------|--------|
| `ConsoleScheduleMainPage.java` | Page Object | HIGH — schedule main view |
| `ConsoleNewShiftPage.java` | Page Object | HIGH — new shift creation |
| `ConsoleEditShiftPage.java` | Page Object | HIGH — shift editing |
| `ConsoleShiftOperatePage.java` | Page Object | HIGH — shift operations |

**Key Methods:**
- `createLocationTransitionsShiftsWithSpecificValues()` — multi-location shift creation
- `addSegmentbyEditShift()` — add location segments
- `selectFirstLocationChildLocInCreateShiftWindow()` — location selection
- `updateLocationTransitionsFirstTime()` — time slider for segments
- `verifyDeleteLocationTransitionsShift()` — transition deletion

**What to Test:**
- [ ] Auto-scheduled shifts display transitions correctly
- [ ] Segment creation/editing respects location group constraints
- [ ] Location selector shows valid peer locations only
- [ ] Transition time sliders work correctly
- [ ] Delete transition removes the correct segment

### 2. Location Group Management (HIGH)

| File | Type | Impact |
|------|------|--------|
| `ConsoleLocationSelectorPage.java` | Page Object | HIGH — location/district/group selection |
| `OpsPortalLocationsPage.java` | Page Object | MEDIUM — location configuration |

**Supported Group Types:** P2P (Peer-to-Peer), Parent-Child, MS (Multi-Store), NSO (Non-Store)
**Hierarchy:** District → Region → Business Unit → Location

**What to Test:**
- [ ] Location selector filters by group type correctly
- [ ] District-level view shows all location groups
- [ ] P2P vs Parent-Child group boundaries respected in UI
- [ ] Location hierarchy configuration changes reflected immediately

### 3. Schedule Generation UI (HIGH)

| File | Type | Impact |
|------|------|--------|
| `ConsoleScheduleNewUIPage.java` | Page Object | HIGH — schedule view |
| `ConsoleCreateSchedulePage.java` | Page Object | HIGH — schedule creation |

**What to Test:**
- [ ] Schedule generation for location groups includes transitions
- [ ] Day view displays transition shifts correctly
- [ ] Week view displays transition shifts correctly
- [ ] Group-by-location filter shows transition segments under correct locations
- [ ] Smart cards reflect cross-location coverage

### 4. Drag & Drop (MEDIUM)

**What to Test:**
- [ ] Drag-drop restrictions prevent invalid cross-group transitions
- [ ] Valid cross-location drags within group are allowed
- [ ] Copy shifts across locations in group works

### 5. District Manager View (MEDIUM)

**What to Test:**
- [ ] DM view shows cross-group transitions
- [ ] DM can view transitions across all location groups in district
- [ ] Permission checks for cross-location operations

---

## Existing Test Suites to Run

### Selenium Test Suite
- `testngSCH_LocationTransitions.xml` — 6 location transition tests
- `LocationGroupAutoTCs.xml` — location group automated tests
- `LocationsAutoTCs.xml` — location management tests

### Key Selenium Tests
| Test | File | What it Covers |
|------|------|----------------|
| `verifyCopiedScheduleOfLocationTransitionsAsInternalAdmin` | `LocationTransitionsScheduleTest.java` | Copy schedules with transitions |
| `verifyEditShiftOfLocationTransitionsByDayViewAsInternalAdmin` | Same | Day view CRUD for transitions |
| `verifyEditShiftOfLocationTransitionsByWeekViewAsInternalAdmin` | Same | Week view CRUD for transitions |
| `verifyDragAndDropShiftOfLocationTransitionsAsInternalAdmin` | Same | Drag-drop restrictions |
| `verifyShiftWithMealBreakOfLocationTransitionsAsInternalAdmin` | Same | Transitions with meal breaks |
| `verifyAddSegmentsOfLocationTransitionsByEditShiftAsInternalAdmin` | Same | Add/remove segments |

---

## Comprehensive Testing Checklist

### API-Level Tests
- [ ] `POST /v2/locationhierarchy` — Create district with multiple location groups
- [ ] `POST /v2/schedules/generate` — Generate schedules for location groups with transitions
- [ ] `POST /v2/shifts/{id}/assign` — Assign worker to shift in different location within group
- [ ] `POST /v2/shift-offers` — Create swap offer between locations in group
- [ ] Reject assignments outside location group boundaries
- [ ] Reject cross-district transitions

### Integration Tests
- [ ] `GroupSchedulingProblem` — MasterSlave and PeerToPeer scheduling
- [ ] `BusinessUtil.getLocationGroupCluster()` — returns all valid locations
- [ ] `SchedulePolicyBroker` — transition configuration toggles
- [ ] `WorkerShiftServiceImpl` — qualification checks across group

### Backward Compatibility
- [ ] Existing single-location schedules work unchanged
- [ ] Location group features don't break when transitions disabled
- [ ] Schedule publishing works for multi-location groups
- [ ] Worker data integrity across locations
- [ ] Audit logs correctly record cross-location operations

### Performance
- [ ] Schedule generation time for large location groups (10+ locations)
- [ ] API response time for district-level schedule queries
- [ ] Worker qualification lookup across many locations

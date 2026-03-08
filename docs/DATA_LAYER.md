# Data Layer Deep Dive

> How test data (users, passwords, locations, employees) flows through the framework —
> from JSON files to feature steps to test execution, with cross-process safety.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Data File Format](#2-data-file-format)
3. [How the DataService Selects Users — Step by Step](#3-how-the-dataservice-selects-users--step-by-step)
4. [TestContext — Sharing Data Between Steps](#4-testcontext--sharing-data-between-steps)
5. [Cross-Process Data Safety (File Locks)](#5-cross-process-data-safety-file-locks)
6. [Complete Data Flow — End to End](#6-complete-data-flow--end-to-end)
7. [Setting Up Your Data](#7-setting-up-your-data)
8. [Adding a New Enterprise](#8-adding-a-new-enterprise)
9. [Java vs TypeScript Comparison](#9-java-vs-typescript-comparison)

---

## 1. Overview

```
.env                          config/env.config.json
  ENTERPRISE=panda2bts          { "ENVIRONMENT": "STG" }
  TEST_ENV=EA
         │                              │
         └──────────┬───────────────────┘
                    │
            environment.ts
           getEnvironmentConfig()
                    │
                    ▼
            ┌───────────────┐
            │  DataService   │ ← loads: test-data/users/user_loc_panda2bts_EA.json
            │                │
            │  .users[]      │ → getUILoginUserBy('StoreManager1')
            │  .locations[]  │ → selectLocation('DolarGeneral')
            │  .employees[]  │ → selectEmployee('TestQA1')
            └───────┬───────┘
                    │
            ┌───────┴───────┐
            │  TestContext    │ ← setContext(USER_NAME, 'julie+sm@legion.co')
            │                │ → getContext(USER_NAME)  // returns 'julie+sm@legion.co'
            │  .dataService  │ ← lazy-loaded DataService instance
            │  .cleanup()    │ → releases users/locations + clears context
            └───────┬───────┘
                    │
            ┌───────┴───────┐
            │  FileLock      │ ← cross-process safety when multiple workers
            │  (optional)    │   select users simultaneously
            │                │ → withFileLock('user-select', () => { ... })
            └───────────────┘
```

---

## 2. Data File Format

### File Naming Convention

```
test-data/users/user_loc_{ENTERPRISE}_{ENVIRONMENT}{FILENUMBER}.json
```

| Variable | Source | Example |
|---|---|---|
| `{ENTERPRISE}` | `ENTERPRISE` env var or `config/env.config.json` | `panda2bts`, `LegionCoffee` |
| `{ENVIRONMENT}` | `TEST_ENV` env var or `config/env.config.json` | `STG`, `EA`, `EPH` |
| `{FILENUMBER}` | `FILE_NUMBER` env var (optional, usually empty) | ``, `1`, `2` |

**Examples:**
```
user_loc_LegionCoffee_STG.json    ← ENTERPRISE=LegionCoffee, TEST_ENV=STG
user_loc_panda2bts_EA.json        ← ENTERPRISE=panda2bts, TEST_ENV=EA
user_loc_panda2bts_EA1.json       ← ENTERPRISE=panda2bts, TEST_ENV=EA, FILE_NUMBER=1
```

### Complete File Structure

```json
{
  "enterpriseId": "69f1f181-e311-45ec-b2ab-0a37d90cfba9",
  "token": "d8f55a6903eda9290dcd10c5171deaabc18e6fdc",

  "users": [
    {
      "name": "julie+admin@legion.co",
      "password": "Legionco1",
      "usedAs": ["API_LOGIN_GENERAL", "UI_LOGIN", "API_LOGIN"],
      "isUsed": false,
      "userType": "Admin",
      "isLocal": false,
      "locations": ["Automation1", "Automation2"]
    },
    {
      "name": "julie+sm1@legion.co",
      "password": "Legionco1",
      "usedAs": ["UI_LOGIN", "API_LOGIN"],
      "isUsed": false,
      "userType": "StoreManager1",
      "isLocal": false,
      "locations": ["Automation1"]
    },
    {
      "name": "julie+tm@legion.co",
      "password": "Legionco1",
      "usedAs": ["UI_LOGIN"],
      "isUsed": false,
      "userType": "TeamMember",
      "isLocal": false,
      "locations": ["Automation1"]
    }
  ],

  "locations": [
    {
      "name": "Automation1",
      "isLocal": false,
      "isUsed": false,
      "conf": "DolarGeneral"
    },
    {
      "name": "Automation2",
      "isLocal": false,
      "isUsed": false,
      "conf": "Retail"
    }
  ],

  "employees": [
    {
      "name": "TestQA1",
      "lastName": "Automation",
      "role": "GENERAL MANAGER",
      "id": "uuid-1",
      "engagementId": "uuid-2",
      "workerId": "uuid-3",
      "pinNumber": "1234"
    }
  ]
}
```

### Field Reference

#### User Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Username or email for login |
| `password` | string | Yes | Login password |
| `usedAs` | string[] | Yes | Roles: `"API_LOGIN_GENERAL"`, `"UI_LOGIN"`, `"API_LOGIN"` |
| `isUsed` | boolean | Yes | Always `false` in file. Set to `true` in-memory when selected |
| `userType` | string | Yes | Role: `"Admin"`, `"StoreManager1"`, `"StoreManager2"`, `"TeamMember"` |
| `isLocal` | boolean | Yes | `true` for local/on-prem, `false` for federated/cloud |
| `locations` | string[] | No | Location names this user can access |

#### `usedAs` Values Explained

| Value | Meaning | Method That Uses It |
|---|---|---|
| `API_LOGIN_GENERAL` | Admin-level API access | `getAdminGeneralUser()` — for setup/teardown API calls |
| `UI_LOGIN` | Can login via browser UI | `getUILoginUserBy()` — for `Given I login as '...'` steps |
| `API_LOGIN` | Can login via API | `getAPILoginUserBy()` — for API test steps |

A user can have multiple roles: `["API_LOGIN_GENERAL", "UI_LOGIN", "API_LOGIN"]` = can do everything.

#### `userType` Values (from Selenium Framework)

| userType | Description | Feature File Usage |
|---|---|---|
| `Admin` | Internal administrator | `Given I login as 'Admin'.` |
| `StoreManager1` | Store manager (primary) | `Given I login as 'StoreManager1'.` |
| `StoreManager2` | Store manager (secondary) | `Given I login as 'StoreManager2'.` |
| `StoreManager3` | Store manager (tertiary) | `Given I login as 'StoreManager3'.` |
| `TeamMember` | Regular team member | `Given I login as 'TeamMember'.` |

You can add any `userType` value. DataService matches by exact string (case-insensitive).

#### Location Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Location display name |
| `isLocal` | boolean | Yes | Local vs cloud location |
| `isUsed` | boolean | Yes | Usage tracking (same as users) |
| `conf` | string | Yes | Configuration/template name (used for filtering) |

#### Employee Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | First name |
| `lastName` | string | Yes | Last name |
| `role` | string | Yes | Job role (e.g., `"GENERAL MANAGER"`, `"TEAM MEMBER"`) |
| `id` | string | Yes | UUID identifier |
| `engagementId` | string | Yes | Engagement UUID |
| `workerId` | string | Yes | Worker UUID |
| `pinNumber` | string | No | PIN for time clock |

---

## 3. How the DataService Selects Users — Step by Step

### `getUILoginUserBy(userType)` — The Primary Method

**Called from:** `Given I login as 'StoreManager1'.`

```
Step 1: Check cache
  → If selectedUILoginUser already set → return it (same user for entire scenario)

Step 2: Filter chain
  users.find(u =>
    !u.isUsed                                        ← not already claimed
    && u.userType === 'StoreManager1'                 ← matches requested type (case-insensitive)
    && u.usedAs.includes('UI_LOGIN')                  ← user can login via UI
    && (envConfig.isLocal ? u.isLocal : true)          ← respects local flag
  )

Step 3: If no match found
  → throw Error('No available UI_LOGIN user with userType: StoreManager1')
  → This means your data file doesn't have enough users!

Step 4: Mark as used
  → user.isUsed = true   (prevents this scenario from re-selecting the same user)

Step 5: Cache
  → this.selectedUILoginUser = user   (subsequent calls in same scenario return same user)

Step 6: Return
  → { name: 'julie+sm1@legion.co', password: 'Legionco1', userType: 'StoreManager1', ... }
```

### `getUILoginUser(locationName?)` — By Location

**Called from:** `Given I login as admin in location: 'Automation1'.`

```
Filter chain:
  1. isUsed === false
  2. usedAs includes 'UI_LOGIN'
  3. isLocal matches config
  4. If locationName provided: user.locations includes locationName
  → Returns first match
  → Sets isUsed = true
```

### `getAdminGeneralUser()` — For API Setup

**Called from:** API authentication before UI tests

```
Filter chain:
  1. isUsed === false
  2. usedAs includes 'API_LOGIN_GENERAL'
  3. isLocal matches config
  → Returns first match
  → Sets isUsed = true
```

### `getAPILoginUserBy(userType)` — For API Tests

**Called from:** `Given I have an API token for 'Admin'`

```
Filter chain:
  1. isUsed === false
  2. userType matches (case-insensitive)
  3. usedAs includes 'API_LOGIN'
  4. isLocal matches config
  → Returns first match
  → Sets isUsed = true
```

### `selectLocation(conf)` — By Configuration

**Called from:** `And I select location 'DolarGeneral'.`

```
Filter chain:
  1. isUsed === false
  2. conf matches (e.g., 'DolarGeneral')
  3. isLocal matches config
  → Returns first match
  → Sets isUsed = true
```

### Usage Tracking Lifecycle

```
┌─ Feature Start (first scenario triggers creation) ────────┐
│                                                            │
│  1. Fixture creates shared TestContext (once per feature)  │
│     → TestContext creates DataService                      │
│     → DataService loads user_loc_LegionCoffee_STG.json    │
│     → All users: isUsed = false (fresh copy)              │
│     → setContext(ENTERPRISE_NAME, 'LegionCoffee')         │
│                                                            │
├─ Scenario 1 ──────────────────────────────────────────────┤
│                                                            │
│  2. Step: Given I login as 'Admin'.                       │
│     → dataService.getUILoginUserBy('Admin')               │
│     → finds user[0] with userType='Admin'                 │
│     → user[0].isUsed = true  ✓ LOCKED                    │
│     → setContext(USER_NAME, 'julie+admin@legion.co')      │
│                                                            │
│  3. Step: And I select location 'DolarGeneral'.           │
│     → dataService.selectLocation('DolarGeneral')          │
│     → location[0].isUsed = true  ✓ LOCKED                │
│     → setContext(LOCATION_NAME, 'Automation1')            │
│                                                            │
│  4. Remaining steps run... Scenario 1 ends.               │
│     → context/page/testContext NOT cleaned up              │
│     → Data carries over to next scenario                  │
│                                                            │
├─ Scenario 2 (same feature, shared session) ───────────────┤
│                                                            │
│  5. Shared TestContext still has data from Scenario 1     │
│     → USER_NAME = 'julie+admin@legion.co' (still set)    │
│     → LOCATION_NAME = 'Automation1' (still set)          │
│     → Scenario 2's Given steps can override if needed     │
│                                                            │
│  6. Browser page is the same — no re-login needed         │
│     → Scenario 2's Given steps navigate to where needed   │
│                                                            │
├─ Feature End (all scenarios done, worker moves on) ───────┤
│                                                            │
│  7. context.close() → closes browser session              │
│     → _sharedPage = null                                  │
│     → _sharedTestContext = null                            │
│     → DataService released, users/locations freed         │
│                                                            │
│  8. Next feature gets a fresh context/page/testContext     │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 4. TestContext — Sharing Data Between Steps

### The Problem

In Cucumber BDD, each step is a separate function. How do you pass data from one step to another — and between scenarios within the same feature?

```gherkin
Given I login as 'StoreManager1'.     ← This step knows the username
And I select location 'Automation1'.  ← This step needs the username too
When I navigate to schedule page      ← This step needs the location
```

### The Solution: Context Map

TestContext is a `Map<string, unknown>` that lives for the entire scenario.

```typescript
// Step 1: Login stores credentials in context
Given('I login as {string}.', async ({ testContext, page }, userType) => {
  const user = testContext.dataService.getUILoginUserBy(userType);
  testContext.setContext(ContextKey.USER_NAME, user.name);
  testContext.setContext(ContextKey.USER_PASSWORD, user.password);
  // ... perform login
});

// Step 2: Location step reads username, stores location
Given('I select location {string}.', async ({ testContext, page }, location) => {
  const username = testContext.getContext<string>(ContextKey.USER_NAME);
  testContext.setContext(ContextKey.LOCATION_NAME, location);
  // ... select location in UI
});

// Step 3: Navigation step reads location
When('I navigate to schedule page', async ({ testContext, page }) => {
  const location = testContext.getContext<string>(ContextKey.LOCATION_NAME);
  // ... navigate using location
});
```

### Available Context Keys

The `ContextKey` enum provides 35+ pre-defined keys:

```
Auth:       USER_NAME, USER_PASSWORD, ACCESS_TOKEN
Location:   LOCATION_NAME, BUSINESS_ID, HOME_LOCATION_NAME, WORK_LOCATION_NAME
Team:       TM_NAME, TM_ID, TM_ROLE, TM_FULL_NAME, TM_WORKER_ID, TM_ENGAGEMENT_ID
Schedule:   SHIFT_ID, SCHEDULE_ID, WEEK_START_DATE, WEEK_END_DATE
Timesheet:  TIMESHEET_ID, CLOCKIN_TIME, CLOCKOUT_TIME
Config:     CONFIGURATION, DATE_SELECTED, ENTERPRISE_NAME
API:        API_LAST_RESPONSE_MAP
Generic:    TEMP_DATA_1, TEMP_DATA_2, TEMP_DATA_3
```

You can also use custom string keys: `testContext.setContext('MY_CUSTOM_KEY', value)`.

### Context Persistence Within a Feature

Because TestContext is **shared within a feature** (not fresh per scenario), data set by
Scenario 1 is still available in Scenario 2. This is by design:

```
Feature: Schedule Management
  Scenario 1: Create schedule
    Given I login as 'Admin'.          ← sets USER_NAME in testContext
    And I select location 'Auto1'.     ← sets LOCATION_NAME in testContext
    When I create a schedule
    Then the schedule is created

  Scenario 2: Publish schedule
    # testContext still has USER_NAME and LOCATION_NAME from Scenario 1
    # Browser is still on the same page — no re-login needed
    When I publish the schedule
    Then the schedule is published
```

If Scenario 2 needs different data, its Given steps can override:
```typescript
Given('I switch to location {string}', async ({ testContext }, location) => {
  testContext.setContext(ContextKey.LOCATION_NAME, location);  // Overrides previous value
});
```

### Convenience Getters

```typescript
testContext.userName       // → getContext(ContextKey.USER_NAME)
testContext.userPassword   // → getContext(ContextKey.USER_PASSWORD)
testContext.locationName   // → getContext(ContextKey.LOCATION_NAME)
testContext.enterpriseName // → getContext(ContextKey.ENTERPRISE_NAME)
testContext.tmName         // → getContext(ContextKey.TM_NAME)
testContext.accessToken    // → getContext(ContextKey.ACCESS_TOKEN)
```

---

## 5. Cross-Process Data Safety (File Locks)

### The Problem

Playwright workers are separate OS processes. Each loads its own copy of the JSON data.

```
Worker 1 (pid 11001):
  DataService loads user_loc_LegionCoffee_STG.json
  → has its OWN copy of users[] in memory
  → user[0].isUsed = false

Worker 2 (pid 11002):
  DataService loads user_loc_LegionCoffee_STG.json
  → has its OWN copy of users[] in memory
  → user[0].isUsed = false  (same user, separate copy!)
```

If both workers call `getUILoginUserBy('Admin')` at the same time:
```
Worker 1: finds user[0] (isUsed=false) → marks true → uses julie+admin@legion.co
Worker 2: finds user[0] (isUsed=false) → marks true → uses julie+admin@legion.co
COLLISION: Both workers log in as the same Admin!
```

### When This Matters

- If your app **allows concurrent sessions** with the same credentials → no problem
- If your app **blocks concurrent logins** (e.g., session invalidation) → you need file locks OR enough users per role

### Solution 1: Enough Users (Simple)

```json
{
  "users": [
    { "name": "admin1@legion.co", "userType": "Admin", ... },
    { "name": "admin2@legion.co", "userType": "Admin", ... },
    { "name": "admin3@legion.co", "userType": "Admin", ... },
    { "name": "admin4@legion.co", "userType": "Admin", ... }
  ]
}
```

With 4 Admin users and 4 workers, each worker gets a different Admin (because each has its own copy with fresh `isUsed=false` for all, but they call `getUILoginUserBy` at slightly different times, so each process picks user[0] in its own copy — which is the SAME user). This only works if concurrent sessions are OK.

### Solution 2: File Locks (Guaranteed Unique)

```typescript
import { withFileLock } from '../data/file-lock';

// In DataService, wrap selection in a file lock:
async getUILoginUserBySafe(userType: string): Promise<UserData> {
  return withFileLock('user-selection', () => {
    // Only one worker can execute this at a time
    return this.getUILoginUserBy(userType);
  });
}
```

### How File Locks Work — Step by Step

```
Worker 1: withFileLock('user-selection', fn)
  │
  ├─→ 1. Try to create .locks/user-selection.lock
  │      → fs.openSync(lockFile, 'wx')   ('wx' = create exclusive)
  │      → SUCCESS: file created (only one process can create it)
  │      → Write: { "pid": 11001, "timestamp": 1708214400000 }
  │
  ├─→ 2. Execute fn()
  │      → reads user data
  │      → selects Admin user
  │      → marks isUsed=true
  │
  ├─→ 3. Release: delete .locks/user-selection.lock
  │
  └─→ Return user

Worker 2: withFileLock('user-selection', fn)     (at the same time)
  │
  ├─→ 1. Try to create .locks/user-selection.lock
  │      → fs.openSync(lockFile, 'wx')
  │      → FAILS: EEXIST (file already exists — Worker 1 holds the lock)
  │
  ├─→ 2. Poll every 50ms:
  │      → Try create again → EEXIST → wait 50ms → try again → ...
  │      → Also checks: is lock stale? (>30 seconds old or dead PID → auto-remove)
  │
  ├─→ 3. Worker 1 releases → lock file deleted
  │
  ├─→ 4. Worker 2's next attempt:
  │      → fs.openSync(lockFile, 'wx') → SUCCESS
  │      → Execute fn() → selects NEXT available Admin user
  │      → Release lock
  │
  └─→ Return different user

RESULT: Worker 1 and Worker 2 get DIFFERENT Admin users ✓
```

### Stale Lock Detection

```
Scenario: Worker 1 acquires lock, then crashes (lock file remains).

Worker 2 tries to acquire lock:
  1. Lock file exists → check contents
  2. Read: { "pid": 11001, "timestamp": 1708214400000 }
  3. Check age: current_time - timestamp > 30 seconds? → STALE → remove
  4. Check PID: process.kill(11001, 0) → throws? → process dead → STALE → remove
  5. Lock removed → Worker 2 acquires fresh lock

Global cleanup (in globalTeardown):
  cleanAllLocks() → rm -rf .locks/
```

---

## 6. Complete Data Flow — End to End

```
USER STARTS TEST:
  ENTERPRISE=LegionCoffee TEST_ENV=STG npm test
                │
                ▼
CONFIG LOADING:
  environment.ts: getEnvironmentConfig()
  → reads config/env.config.json + process.env
  → resolves: { enterprise: 'LegionCoffee', environment: 'STG', isLocal: false }
                │
                ▼
FIXTURE CREATION (once per feature, reused across scenarios):
  test-fixtures.ts: testContext fixture
  → new TestContext() [only if _sharedTestContext is null or feature changed]
    → new DataService(envConfig)
      → resolves filename: user_loc_LegionCoffee_STG.json
      → reads: test-data/users/user_loc_LegionCoffee_STG.json
      → parses: { users: [5 users], locations: [2 locations], employees: [2 employees] }
      → all users: isUsed = false
  → setContext(ENTERPRISE_NAME, 'LegionCoffee')
                │
                ▼
FEATURE FILE:
  @smoke @Team-SCH
  Feature: Schedule Management

    Background:
      Given I login as 'StoreManager1'.
      And I select location 'Automation1'.

    Scenario: View weekly schedule
      When I navigate to schedule page
      Then I should see the weekly schedule
                │
                ▼
STEP 1: Given I login as 'StoreManager1'.
  │
  ├─→ dataService.getUILoginUserBy('StoreManager1')
  │     Filter: !isUsed && userType='StoreManager1' && usedAs.includes('UI_LOGIN')
  │     Match: { name: 'julie+sm1@legion.co', password: 'Legionco1', ... }
  │     Action: user.isUsed = true
  │
  ├─→ testContext.setContext(ContextKey.USER_NAME, 'julie+sm1@legion.co')
  │   testContext.setContext(ContextKey.USER_PASSWORD, 'Legionco1')
  │
  └─→ loginPage.login('julie+sm1@legion.co', 'Legionco1')
        → BasePage.fillField('#username', ...) → logs: "Fill: #username (32ms)"
        → BasePage.fillField('#password', ...) → logs: "Fill: #password (28ms)"
        → BasePage.clickElement('.login-btn')  → logs: "Click: .login-btn (45ms)"
        → BasePage.waitForNetworkIdle()        → waits for dashboard
                │
                ▼
STEP 2: And I select location 'Automation1'.
  │
  ├─→ dataService.selectLocationByName('Automation1')
  │     Filter: !isUsed && name='Automation1'
  │     Match: { name: 'Automation1', conf: 'DolarGeneral', ... }
  │     Action: location.isUsed = true
  │
  ├─→ testContext.setContext(ContextKey.LOCATION_NAME, 'Automation1')
  │
  └─→ dashboardPage.selectLocation('Automation1')
                │
                ▼
STEP 3: When I navigate to schedule page
  │
  ├─→ const location = testContext.getContext<string>(ContextKey.LOCATION_NAME)
  │   // → 'Automation1'
  │
  └─→ schedulePage.navigateTo(`/schedule?location=${location}`)
        → BasePage logs: "Navigating to: /schedule?location=Automation1"
        → BasePage waits for networkidle
                │
                ▼
STEP 4: Then I should see the weekly schedule
  │
  └─→ expect(page.locator('.schedule-grid')).toBeVisible()
                │
                ▼
PER-SCENARIO TEARDOWN:
  logger.close()                   (flushes file stream)
  If FAILED: screenshot saved, recovery triggered for next scenario
  context/page/testContext NOT cleaned up (shared within feature)

FEATURE END (all scenarios done, worker moves to next feature):
  context.close()                  (closes browser session)
  _sharedPage = null
  _sharedTestContext = null         (DataService released, users/locations freed)
```

---

## 7. Setting Up Your Data

### Step 1: Copy Data Files from Selenium

```bash
# From the Selenium Cucumber framework:
cp /path/to/CucumberTA/console-ui-selenium/src/test/resources/TaConfigurations/users/user_loc_*.json \
   test-data/users/
```

### Step 2: Set Environment Variables

In `.env`:
```env
ENTERPRISE=LegionCoffee
TEST_ENV=STG
FILE_NUMBER=
IS_LOCAL=false
```

### Step 3: Verify Data Loading

Run a test and check the logs:
```
[DataService] Loading test data from: user_loc_LegionCoffee_STG.json
[DataService] Loaded: 5 users, 2 locations, 2 employees
```

### Step 4: Ensure Enough Users for Parallel Execution

```
Rule: users_per_type >= number_of_workers

Workers | Admin users needed | StoreManager users needed
4       | 4                  | 4
10      | 10                 | 10
15      | 15                 | 15

OR: Use feature-level session sharing (@mode:serial, idempotent login in Background)
    → Reduces login overhead per scenario within a feature
```

### Step 5: Write Feature Steps

```gherkin
Feature: Schedule Management

  Background:
    Given I login as 'Admin'.
    And I select location 'Automation1'.

  Scenario: View weekly schedule
    When I navigate to schedule page
    Then I should see the weekly schedule
```

---

## 8. Adding a New Enterprise

1. **Create the data file:**
   ```
   test-data/users/user_loc_NewEnterprise_STG.json
   ```

2. **Fill in users, locations, employees** following the schema in section 2.

3. **Set the env var:**
   ```env
   ENTERPRISE=NewEnterprise
   TEST_ENV=STG
   ```

4. **Run tests.** DataService automatically loads the correct file.

### Checklist for a New Data File

```
✅ Has at least 1 Admin user with usedAs: ["API_LOGIN_GENERAL", "UI_LOGIN"]
✅ Has at least 1 StoreManager user with usedAs: ["UI_LOGIN"]
✅ Has at least 1 location with a valid conf value
✅ All users have isUsed: false
✅ All locations have isUsed: false
✅ Passwords are correct for the target environment
✅ File named: user_loc_{ENTERPRISE}_{ENV}.json (exact match)
```

---

## 9. Java vs TypeScript Comparison

| Aspect | Java (Selenium) | TypeScript (Playwright) |
|---|---|---|
| **File location** | `src/test/resources/TaConfigurations/users/` | `test-data/users/` |
| **File format** | Same JSON structure | Same JSON structure |
| **Loading** | Gson + classpath resource | `fs.readFileSync` + `JSON.parse` |
| **Thread safety** | `synchronized` methods + `ThreadLocal` | Process isolation (no sync needed) |
| **DI** | Guice `@Inject DataService` | Fixture: `testContext.dataService` |
| **Context** | `StepsBase.setContext(key, value)` | `testContext.setContext(key, value)` |
| **Cleanup** | `Hook.@After` → manual call | Fixture teardown → automatic |
| **Config** | `PropertyMap.getEnterprise()` | `getEnvironmentConfig().enterprise` |
| **Cross-thread safety** | `synchronized` + `ThreadLocal` | File locks (optional) |
| **Lines of code** | DataService: 1405 lines | DataService: 395 lines (72% reduction) |
| **Key method** | `getUILoginUserBy(userType)` | `getUILoginUserBy(userType)` (same name!) |

### Same Feature Step, Two Frameworks

**Java (Selenium + Cucumber):**
```java
@Given("I login as {string}.")
public void loginAs(String userType) {
    UserData user = dataService.getUILoginUserBy(userType);
    stepsBase.setContext(ContextKey.USER_NAME, user.getName());
    loginPage.login(user.getName(), user.getPassword());
}
```

**TypeScript (Playwright + Cucumber):**
```typescript
Given('I login as {string}.', async ({ testContext, loginPage }, userType: string) => {
  const user = testContext.dataService.getUILoginUserBy(userType);
  testContext.setContext(ContextKey.USER_NAME, user.name);
  await loginPage.login(user.name, user.password);
});
```

Almost identical — the porting is 1:1.

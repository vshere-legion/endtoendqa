/**
 * Test Data Models
 *
 * Port of Java data model classes from the Selenium framework.
 * Mirrors the JSON structure in test-data/users/user_loc_*.json
 *
 * Original:
 *   - com.legion.api.util.UserData
 *   - com.legion.tests.data (Location, EmployeeData, Data)
 */

/**
 * User Data
 *
 * Port of UserData.java
 * Represents a test user with credentials and role info.
 *
 * JSON example:
 *   {
 *     "name": "Cortez.P",
 *     "password": "Cortez.P",
 *     "usedAs": ["API_LOGIN_GENERAL", "UI_LOGIN", "API_LOGIN"],
 *     "isUsed": false,
 *     "userType": "Admin",
 *     "isLocal": false,
 *     "locations": ["Automation1", "Automation2"],
 *     "group": "P2PLGTest"
 *   }
 */
export interface UserData {
  name: string;
  password: string;
  usedAs: UserRole[];
  isUsed: boolean;
  userType: string;
  isLocal: boolean;
  locations?: string[];
  /** Scopes user to a test class for group-based credential lookup.
   *  E.g., "P2PLGTest", "MasterTemplateP2PTest". Users without a group
   *  are available to any test via ungrouped lookup. */
  group?: string;
}

/**
 * User roles - matches the Java "usedAs" field values
 */
export type UserRole =
  | 'API_LOGIN_GENERAL'
  | 'UI_LOGIN'
  | 'API_LOGIN';

/**
 * Location
 *
 * Port of Location model from DataService.java
 * Represents a test location.
 *
 * JSON example:
 *   {
 *     "name": "Automation1",
 *     "isLocal": false,
 *     "isUsed": false,
 *     "conf": "Dolar General2"
 *   }
 */
export interface Location {
  name: string;
  isLocal: boolean;
  isUsed: boolean;
  conf: string;
}

/**
 * Employee Data
 *
 * Port of EmployeeData model from DataService.java
 * Represents a test employee.
 *
 * JSON example:
 *   {
 *     "name": "xavi",
 *     "lastName": "xander",
 *     "role": "GENERAL MANAGER",
 *     "id": "uuid-string",
 *     "engagementId": "uuid-string",
 *     "workerId": "uuid-string",
 *     "pinNumber": "1234"
 *   }
 */
export interface EmployeeData {
  name: string;
  lastName: string;
  role: string;
  id: string;
  engagementId: string;
  workerId: string;
  pinNumber?: string;
}

/**
 * Top-level Data model
 *
 * Port of Data.java (TypeToken<Data> used by Gson)
 * This is the structure of user_loc_[ENTERPRISE]_[ENVIRONMENT].json
 */
export interface TestDataFile {
  users: UserData[];
  locations: Location[];
  employees: EmployeeData[];
  enterpriseId: string;
  token: string;
}

/**
 * Context keys for sharing data between steps
 *
 * Port of StepsBase.ContextKey enum (41 keys)
 * Original: com.legion.tests.testframework.bdd.StepsBase.ContextKey
 */
export enum ContextKey {
  // Auth & User
  ENTERPRISE_NAME = 'ENTERPRISE_NAME',
  USER_NAME = 'USER_NAME',
  USER_PASSWORD = 'USER_PASSWORD',
  ACCESS_TOKEN = 'ACCESS_TOKEN',

  // Location
  LOCATION_NAME = 'LOCATION_NAME',
  BUSINESS_ID = 'BUSINESS_ID',
  HOME_LOCATION_NAME = 'HOME_LOCATION_NAME',
  WORK_LOCATION_NAME = 'WORK_LOCATION_NAME',
  OPENING_LOCATION_NAME = 'OPENING_LOCATION_NAME',
  CLOSING_LOCATION_NAME = 'CLOSING_LOCATION_NAME',
  HOME_LOCATION_ID = 'HOME_LOCATION_ID',
  WORK_LOCATION_ID = 'WORK_LOCATION_ID',
  OPENING_LOCATION_ID = 'OPENING_LOCATION_ID',
  CLOSING_LOCATION_ID = 'CLOSING_LOCATION_ID',

  // Team Member
  TM_NAME = 'TM_NAME',
  TM_ID = 'TM_ID',
  TM_WITH_SHIFT = 'TM_WITH_SHIFT',
  TM_ROLE = 'TM_ROLE',
  TM_FULL_NAME = 'TM_FULL_NAME',
  TM_WORKER_ID = 'TM_WORKER_ID',
  TM_ENGAGEMENT_ID = 'TM_ENGAGEMENT_ID',

  // Configuration
  CONFIGURATION = 'CONFIGURATION',
  DATE_SELECTED = 'DATE_SELECTED',

  // API
  API_LAST_RESPONSE_MAP = 'API_LAST_RESPONSE_MAP',

  // Schedule / Shift
  SHIFT_ID = 'SHIFT_ID',
  SCHEDULE_ID = 'SCHEDULE_ID',
  WEEK_START_DATE = 'WEEK_START_DATE',
  WEEK_END_DATE = 'WEEK_END_DATE',

  // Timesheet
  TIMESHEET_ID = 'TIMESHEET_ID',
  CLOCKIN_TIME = 'CLOCKIN_TIME',
  CLOCKOUT_TIME = 'CLOCKOUT_TIME',

  // Violation
  VIOLATION_COUNT = 'VIOLATION_COUNT',
  VIOLATION_TYPE = 'VIOLATION_TYPE',

  // Generic
  TEMP_DATA_1 = 'TEMP_DATA_1',
  TEMP_DATA_2 = 'TEMP_DATA_2',
  TEMP_DATA_3 = 'TEMP_DATA_3',
}

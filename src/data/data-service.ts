/**
 * Data Service
 *
 * Port of DataService.java from the Selenium + Cucumber framework.
 * Loads test data (users, locations, employees) from JSON files
 * and provides thread-safe data selection with usage tracking.
 *
 * Original: com.legion.tests.data.DataService (1405 lines)
 *
 * Data file pattern:
 *   test-data/users/user_loc_[ENTERPRISE]_[ENVIRONMENT][FILENUMBER].json
 *
 * Example:
 *   test-data/users/user_loc_panda2auto_EA.json
 *
 * Key difference from Java:
 *   - Java uses ThreadLocal for parallel isolation
 *   - Playwright uses process isolation (each worker = separate process)
 *   - So we don't need ThreadLocal — each worker has its own DataService instance
 */

import * as fs from 'fs';
import * as path from 'path';
import { UserData, Location, EmployeeData, TestDataFile, UserRole } from './models';
import { getEnvironmentConfig, EnvironmentConfig } from '../config/environment';

export class DataService {
  private data: TestDataFile;
  private envConfig: EnvironmentConfig;

  // Currently selected data (equivalent to Java ThreadLocal fields)
  private selectedAdminGeneral: UserData | null = null;
  private selectedUILoginUser: UserData | null = null;
  private selectedAPILoginUser: UserData | null = null;
  private selectedLocations: Location[] = [];

  constructor(envConfig?: EnvironmentConfig) {
    this.envConfig = envConfig || getEnvironmentConfig();
    this.data = this.loadTestData();
  }

  // =========================================================================
  // Data Loading (Port of DataService static initialization)
  // =========================================================================

  /**
   * Load test data from JSON file
   *
   * Port of: DataService static block
   *   String resourcePath = "/TaConfigurations/users/user_loc_" +
   *     PropertyMap.getEnterprise() + "_" +
   *     PropertyMap.getEnvironment() +
   *     PropertyMap.getFileNumber() + ".json";
   */
  private loadTestData(): TestDataFile {
    const enterprise = this.envConfig.enterprise;
    const environment = this.envConfig.environment;
    const fileNumber = this.envConfig.fileNumber || '';

    const fileName = `user_loc_${enterprise}_${environment}${fileNumber}.json`;
    const filePath = path.resolve(process.cwd(), 'test-data', 'users', fileName);

    console.log(`[DataService] Loading test data from: ${fileName}`);

    if (!fs.existsSync(filePath)) {
      console.warn(`[DataService] Data file not found: ${filePath}`);
      console.warn('[DataService] Using empty data. Create the file or set correct ENTERPRISE/TEST_ENV.');

      return {
        users: [],
        locations: [],
        employees: [],
        enterpriseId: '',
        token: '',
      };
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data: TestDataFile = JSON.parse(content);

      // Reset isUsed flags (in case file was edited manually)
      data.users.forEach(u => u.isUsed = false);
      data.locations.forEach(l => l.isUsed = false);

      console.log(
        `[DataService] Loaded: ${data.users.length} users, ` +
        `${data.locations.length} locations, ` +
        `${data.employees.length} employees`
      );

      return data;
    } catch (error: any) {
      console.error(`[DataService] Failed to load data file: ${error.message}`);
      throw error;
    }
  }

  // =========================================================================
  // User Selection (Port of DataService user methods)
  // =========================================================================

  /**
   * Get admin general user (for API login)
   *
   * Port of: DataService.getAdminGeneralUser()
   *   Filters users with usedAs containing "API_LOGIN_GENERAL"
   */
  getAdminGeneralUser(): UserData {
    if (this.selectedAdminGeneral) {
      return this.selectedAdminGeneral;
    }

    const user = this.data.users.find(u =>
      !u.isUsed &&
      u.usedAs.includes('API_LOGIN_GENERAL') &&
      (this.envConfig.isLocal ? u.isLocal : true)
    );

    if (!user) {
      throw new Error('[DataService] No available API_LOGIN_GENERAL user found');
    }

    user.isUsed = true;
    this.selectedAdminGeneral = user;

    console.log(`[DataService] Selected admin general user: ${user.name}`);
    return user;
  }

  /**
   * Get UI login user for a specific location
   *
   * Port of: DataService.getAdminUILoginUser(String locationName)
   *   Filters users with usedAs containing "UI_LOGIN"
   *   and matching location
   */
  getUILoginUser(locationName?: string): UserData {
    if (this.selectedUILoginUser) {
      return this.selectedUILoginUser;
    }

    const user = this.data.users.find(u => {
      if (u.isUsed) return false;
      if (!u.usedAs.includes('UI_LOGIN')) return false;
      if (this.envConfig.isLocal && !u.isLocal) return false;

      // If location specified, check user has access to it
      if (locationName && u.locations) {
        return u.locations.includes(locationName);
      }

      return true;
    });

    if (!user) {
      throw new Error(
        `[DataService] No available UI_LOGIN user found` +
        (locationName ? ` for location: ${locationName}` : '')
      );
    }

    user.isUsed = true;
    this.selectedUILoginUser = user;

    console.log(`[DataService] Selected UI login user: ${user.name}`);
    return user;
  }

  /**
   * Get API login user
   *
   * Port of: DataService.getUserAPIByUserType(String userType)
   */
  getAPILoginUser(userType?: string): UserData {
    if (this.selectedAPILoginUser) {
      return this.selectedAPILoginUser;
    }

    const user = this.data.users.find(u => {
      if (u.isUsed) return false;
      if (!u.usedAs.includes('API_LOGIN')) return false;
      if (this.envConfig.isLocal && !u.isLocal) return false;
      if (userType && u.userType !== userType) return false;
      return true;
    });

    if (!user) {
      throw new Error('[DataService] No available API_LOGIN user found');
    }

    user.isUsed = true;
    this.selectedAPILoginUser = user;

    console.log(`[DataService] Selected API login user: ${user.name}`);
    return user;
  }

  /**
   * Get UI login user by userType (e.g. 'Admin', 'StoreManager1', 'TeamMember')
   *
   * Port of: DataService.getUILoginUserBy(String userType)
   *   Filters by userType + usedAs containing "UI_LOGIN" + isUsed + isLocal
   *
   * This is the KEY method used by Cucumber login steps:
   *   Given I login as 'StoreManager1'.
   *   → dataService.getUILoginUserBy('StoreManager1')
   */
  getUILoginUserBy(userType: string): UserData {
    if (this.selectedUILoginUser) {
      return this.selectedUILoginUser;
    }

    const user = this.data.users.find(u => {
      if (u.isUsed) return false;
      if (!u.userType || u.userType.toLowerCase() !== userType.toLowerCase()) return false;
      if (!u.usedAs.includes('UI_LOGIN')) return false;
      if (this.envConfig.isLocal && !u.isLocal) return false;
      return true;
    });

    if (!user) {
      throw new Error(`[DataService] No available UI_LOGIN user with userType: ${userType}`);
    }

    user.isUsed = true;
    this.selectedUILoginUser = user;

    console.log(`[DataService] Selected UI login user by type '${userType}': ${user.name}`);
    return user;
  }

  /**
   * Get UI login user by userType scoped to a specific group (test class).
   *
   * Solves the composite-key problem: multiple test suites use the same
   * role name (e.g., "InternalAdmin") but need different credentials.
   * The `group` field on UserData scopes the lookup.
   *
   * Fallback: if no grouped match is found, tries ungrouped users
   * (users without a `group` field).
   *
   * Usage in step definitions:
   *   Given the test class is "P2PLGTest"        → sets group
   *   And I am logged in as "InternalAdmin"      → calls this with group
   *   → resolves to mary+admin8@legion.co (group: P2PLGTest)
   *   not eric.wang+Auto1@legion.co (group: MasterTemplateP2PTest)
   */
  getUILoginUserByTypeAndGroup(userType: string, group: string): UserData {
    if (this.selectedUILoginUser) {
      return this.selectedUILoginUser;
    }

    // First: try to find a user matching both userType and group
    let user = this.data.users.find(u => {
      if (u.isUsed) return false;
      if (!u.userType || u.userType.toLowerCase() !== userType.toLowerCase()) return false;
      if (!u.usedAs.includes('UI_LOGIN')) return false;
      if (u.group !== group) return false;
      if (this.envConfig.isLocal && !u.isLocal) return false;
      return true;
    });

    // Fallback: try ungrouped users (no group field)
    if (!user) {
      user = this.data.users.find(u => {
        if (u.isUsed) return false;
        if (!u.userType || u.userType.toLowerCase() !== userType.toLowerCase()) return false;
        if (!u.usedAs.includes('UI_LOGIN')) return false;
        if (u.group) return false; // skip grouped users
        if (this.envConfig.isLocal && !u.isLocal) return false;
        return true;
      });
    }

    if (!user) {
      throw new Error(
        `[DataService] No available UI_LOGIN user with userType: ${userType}, group: ${group}`,
      );
    }

    user.isUsed = true;
    this.selectedUILoginUser = user;

    console.log(
      `[DataService] Selected UI login user by type '${userType}' + group '${group}': ${user.name}`,
    );
    return user;
  }

  /**
   * Get API login user by userType
   *
   * Port of: DataService.getUserAPIByUserType(String userType)
   */
  getAPILoginUserBy(userType: string): UserData {
    if (this.selectedAPILoginUser) {
      return this.selectedAPILoginUser;
    }

    const user = this.data.users.find(u => {
      if (u.isUsed) return false;
      if (!u.userType || u.userType.toLowerCase() !== userType.toLowerCase()) return false;
      if (!u.usedAs.includes('API_LOGIN')) return false;
      if (this.envConfig.isLocal && !u.isLocal) return false;
      return true;
    });

    if (!user) {
      throw new Error(`[DataService] No available API_LOGIN user with userType: ${userType}`);
    }

    user.isUsed = true;
    this.selectedAPILoginUser = user;

    console.log(`[DataService] Selected API login user by type '${userType}': ${user.name}`);
    return user;
  }

  /**
   * Get API login user by userType scoped to a specific group.
   *
   * Mirrors getUILoginUserByTypeAndGroup() but filters by API_LOGIN instead of UI_LOGIN.
   * Falls back to ungrouped users if no grouped match is found.
   *
   * Usage (from @ApiLogin hook or "via api" step):
   *   @group-P2PLGTest
   *   Feature: P2P Schedule
   *     Given I login as "InternalAdmin" via api
   *     -> dataService.getAPILoginUserByTypeAndGroup("InternalAdmin", "P2PLGTest")
   */
  getAPILoginUserByTypeAndGroup(userType: string, group: string): UserData {
    if (this.selectedAPILoginUser) {
      return this.selectedAPILoginUser;
    }

    const workerIndex = parseInt(process.env.TEST_WORKER_INDEX || '0', 10);

    // First: try grouped users matching both userType and group
    let available = this.data.users.filter(u => {
      if (u.isUsed) return false;
      if (!u.userType || u.userType.toLowerCase() !== userType.toLowerCase()) return false;
      if (!u.usedAs.includes('API_LOGIN')) return false;
      if (u.group !== group) return false;
      if (this.envConfig.isLocal && !u.isLocal) return false;
      return true;
    });

    // Fallback: try ungrouped users (no group field)
    if (available.length === 0) {
      available = this.data.users.filter(u => {
        if (u.isUsed) return false;
        if (!u.userType || u.userType.toLowerCase() !== userType.toLowerCase()) return false;
        if (!u.usedAs.includes('API_LOGIN')) return false;
        if (u.group) return false; // skip grouped users
        if (this.envConfig.isLocal && !u.isLocal) return false;
        return true;
      });
    }

    if (available.length === 0) {
      throw new Error(
        `[DataService] No available API_LOGIN user with userType: ${userType}, group: ${group}`,
      );
    }

    const user = available[workerIndex % available.length];
    user.isUsed = true;
    this.selectedAPILoginUser = user;

    console.log(
      `[DataService] Worker ${workerIndex} selected API login user by type '${userType}' + group '${group}': ${user.name}`,
    );
    return user;
  }

  /**
   * Get any available user by role
   */
  getUserByRole(role: UserRole): UserData {
    const user = this.data.users.find(u =>
      !u.isUsed && u.usedAs.includes(role)
    );

    if (!user) {
      throw new Error(`[DataService] No available user with role: ${role}`);
    }

    user.isUsed = true;
    console.log(`[DataService] Selected user (${role}): ${user.name}`);
    return user;
  }

  // =========================================================================
  // Location Selection (Port of DataService location methods)
  // =========================================================================

  /**
   * Select an available location
   *
   * Port of: DataService.selectLocation()
   *   Filters locations by isLocal and isUsed flags
   */
  selectLocation(configuration?: string): Location {
    const location = this.data.locations.find(l => {
      if (l.isUsed) return false;
      if (this.envConfig.isLocal && !l.isLocal) return false;
      if (configuration && l.conf !== configuration) return false;
      return true;
    });

    if (!location) {
      throw new Error(
        `[DataService] No available location found` +
        (configuration ? ` with configuration: ${configuration}` : '')
      );
    }

    location.isUsed = true;
    this.selectedLocations.push(location);

    console.log(`[DataService] Selected location: ${location.name} (conf: ${location.conf})`);
    return location;
  }

  /**
   * Select location by name
   */
  selectLocationByName(name: string): Location {
    const location = this.data.locations.find(l => l.name === name);

    if (!location) {
      throw new Error(`[DataService] Location not found: ${name}`);
    }

    location.isUsed = true;
    this.selectedLocations.push(location);

    console.log(`[DataService] Selected location by name: ${location.name}`);
    return location;
  }

  /**
   * Get all selected locations
   */
  getSelectedLocations(): Location[] {
    return [...this.selectedLocations];
  }

  // =========================================================================
  // Employee Selection (Port of DataService employee methods)
  // =========================================================================

  /**
   * Select employee by name
   *
   * Port of: DataService.selectEmployee(String name)
   */
  selectEmployee(name: string): EmployeeData {
    const employee = this.data.employees.find(e =>
      e.name.toLowerCase() === name.toLowerCase() ||
      `${e.name} ${e.lastName}`.toLowerCase() === name.toLowerCase()
    );

    if (!employee) {
      throw new Error(`[DataService] Employee not found: ${name}`);
    }

    console.log(`[DataService] Selected employee: ${employee.name} ${employee.lastName} (${employee.role})`);
    return employee;
  }

  /**
   * Select employee by role
   */
  selectEmployeeByRole(role: string): EmployeeData {
    const employee = this.data.employees.find(e =>
      e.role.toLowerCase() === role.toLowerCase()
    );

    if (!employee) {
      throw new Error(`[DataService] No employee with role: ${role}`);
    }

    console.log(`[DataService] Selected employee by role: ${employee.name} ${employee.lastName} (${employee.role})`);
    return employee;
  }

  /**
   * Get all employees
   */
  getAllEmployees(): EmployeeData[] {
    return [...this.data.employees];
  }

  // =========================================================================
  // Enterprise & Token (Port of DataService getters)
  // =========================================================================

  /**
   * Get enterprise ID
   *
   * Port of: DataService.getEnterpriseId()
   */
  getEnterpriseId(): string {
    return this.data.enterpriseId;
  }

  /**
   * Get authentication token
   */
  getToken(): string {
    return this.data.token;
  }

  // =========================================================================
  // Cleanup (Port of DataService.releaseLocationAndUsers())
  // =========================================================================

  /**
   * Release all selected resources
   *
   * Port of: DataService.releaseLocationAndUsers()
   *   Sets isUsed = false for all selected resources
   *   Clears selected references
   */
  releaseLocationAndUsers(): void {
    if (this.selectedAdminGeneral) {
      this.selectedAdminGeneral.isUsed = false;
      this.selectedAdminGeneral = null;
    }

    if (this.selectedUILoginUser) {
      this.selectedUILoginUser.isUsed = false;
      this.selectedUILoginUser = null;
    }

    if (this.selectedAPILoginUser) {
      this.selectedAPILoginUser.isUsed = false;
      this.selectedAPILoginUser = null;
    }

    this.selectedLocations.forEach(l => l.isUsed = false);
    this.selectedLocations = [];

    console.log('[DataService] Released users and locations');
  }

  // =========================================================================
  // Raw Data Access
  // =========================================================================

  /**
   * Get all users (read-only)
   */
  getAllUsers(): UserData[] {
    return [...this.data.users];
  }

  /**
   * Get all locations (read-only)
   */
  getAllLocations(): Location[] {
    return [...this.data.locations];
  }

  /**
   * Get the raw data object
   */
  getRawData(): TestDataFile {
    return { ...this.data };
  }

  /**
   * Check if the DataService has loaded any user data.
   * Returns false when no data file was found for the configured enterprise/environment.
   */
  hasData(): boolean {
    return this.data.users.length > 0;
  }

  /**
   * Factory method that returns null if no enterprise is configured
   * or if the data file doesn't exist. Use this for optional DataService
   * initialization in credential resolution.
   */
  static createIfAvailable(envConfig?: EnvironmentConfig): DataService | null {
    const config = envConfig || getEnvironmentConfig();
    if (!config.enterprise) {
      return null;
    }
    const ds = new DataService(config);
    return ds.hasData() ? ds : null;
  }
}

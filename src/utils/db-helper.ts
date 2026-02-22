/**
 * Database Helper Interface
 *
 * Provides a future-proof interface for direct database access in tests
 * that require DB-level validation (e.g., verifying schedule records were
 * persisted, confirming extract file data matches DB state).
 *
 * Usage pattern:
 *   - Connection details come from env vars: DB_HOST, DB_PORT, DB_NAME
 *   - Teams needing DB access implement a concrete DbHelper using this interface
 *   - Inject via testContext or instantiate directly in step definitions
 *
 * Why interface not concrete class:
 *   Legion uses multiple DB technologies across teams (Postgres, MySQL).
 *   Each team can provide their own implementation without changing shared code.
 *
 * Current status: Interface defined, concrete implementations pending per-team need.
 */

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username?: string;
  password?: string;
}

/**
 * Core database operations interface.
 * Concrete implementations plug in any DB driver (pg, mysql2, etc.).
 */
export interface DatabaseHelper {
  /**
   * Open a connection to the database.
   * Call once before running queries in a test scenario.
   */
  connect(): Promise<void>;

  /**
   * Close the database connection.
   * Call in After hooks to release resources.
   */
  disconnect(): Promise<void>;

  /**
   * Run a SELECT query and return typed rows.
   *
   * @param sql   Parameterized SQL string (use $1/$2/... for Postgres, ? for MySQL)
   * @param params Query parameters (prevents SQL injection)
   * @returns Array of typed result rows
   *
   * @example
   *   const rows = await db.query<ScheduleRow>(
   *     'SELECT id, status FROM schedules WHERE location_id = $1',
   *     [locationId]
   *   );
   */
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;

  /**
   * Run an INSERT / UPDATE / DELETE statement.
   *
   * @param sql    Parameterized SQL string
   * @param params Query parameters
   */
  execute(sql: string, params?: unknown[]): Promise<void>;

  /**
   * Check if the database connection is alive.
   * Useful in global-setup health checks alongside the HTTP health check.
   */
  isConnected(): boolean;
}

/**
 * Build a DatabaseConfig from environment variables.
 * Reads DB_HOST, DB_PORT, DB_NAME, DB_USERNAME, DB_PASSWORD.
 *
 * Returns null if DB_HOST is not set (DB access is optional).
 */
export function buildDbConfigFromEnv(): DatabaseConfig | null {
  const host = process.env.DB_HOST;
  if (!host) return null;

  return {
    host,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || '',
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
  };
}

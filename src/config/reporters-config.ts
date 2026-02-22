/**
 * Reporters Configuration — Single Source of Truth
 *
 * Centralises the reporter list so that playwright.config.ts does not
 * diverge from scripts/merge-reports.js when a reporter is added or removed.
 *
 * Usage in playwright.config.ts:
 *   import { getReporters } from './src/config/reporters-config';
 *   reporter: getReporters(),
 *
 * Adding a new reporter (e.g. Allure):
 *   1. Install: npm install allure-playwright
 *   2. Add an entry to getReporters() below.
 *   3. Add a matching case to MERGE_REPORTER_ARGS in merge-reports.js.
 *   That's it — playwright.config.ts and merge-reports.js both stay consistent.
 */

import { cucumberReporter } from 'playwright-bdd';

/**
 * Returns the full reporter array for playwright.config.ts.
 * @param reportDir Root directory for all report output (default: 'reports')
 */
export function getReporters(reportDir = 'reports'): any[] {
  return [
    ['list'],
    ['html', { outputFolder: `${reportDir}/html`, open: 'never' }],
    ['json', { outputFile: `${reportDir}/json/results.json` }],
    ['junit', { outputFile: `${reportDir}/junit/results.xml` }],
    cucumberReporter('html', { outputFile: `${reportDir}/cucumber/cucumber-report.html` }),
    cucumberReporter('json', { outputFile: `${reportDir}/cucumber/cucumber-report.json` }),
  ];
}

/**
 * Standard reporter names — mirrors the switch table in merge-reports.js.
 * When merge-reports.js uses --reporters, it validates against this set.
 */
export const STANDARD_REPORTERS = ['html', 'json', 'junit', 'list'] as const;
export type ReporterName = (typeof STANDARD_REPORTERS)[number];

#!/usr/bin/env node

/**
 * Merge Reports from Sharded Test Execution
 *
 * Merges blob reports from multiple Playwright workers into a single
 * unified HTML and JSON report. Optionally captures failed scenarios
 * for rerun.
 *
 * Usage:
 *   node scripts/merge-reports.js [options]
 *
 * Options:
 *   --blob-dir <path>          Blob reports directory (default: blob-reports)
 *   --output-dir <path>        Merged report output directory (default: reports/merged)
 *   --capture-failures         Extract failed scenarios to rerun file
 *   --rerun-file <path>        Rerun file output path (default: reports/rerun.txt)
 *   --reporters <list>         Comma-separated reporters (default: html,json,junit)
 *   --verbose                  Verbose output
 *
 * Examples:
 *   # Merge reports with default settings
 *   node scripts/merge-reports.js
 *
 *   # Merge and capture failures
 *   node scripts/merge-reports.js --capture-failures
 *
 *   # Custom paths
 *   node scripts/merge-reports.js --blob-dir custom-blobs --output-dir custom-reports
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// ============================================================================
// Configuration
// ============================================================================

class MergeConfig {
  constructor() {
    this.blobDir = this.getArg('--blob-dir', 'blob-reports');
    this.outputDir = this.getArg('--output-dir', 'reports/merged');
    this.captureFailures = this.hasFlag('--capture-failures');
    this.rerunFile = this.getArg('--rerun-file', 'reports/rerun.txt');
    this.reporters = this.getArg('--reporters', 'html,json,junit').split(',');
    this.verbose = this.hasFlag('--verbose') || this.hasFlag('-v');

    // Derived paths
    this.rootDir = path.join(__dirname, '..');
    this.blobReportPath = path.join(this.rootDir, this.blobDir);
    this.mergedReportPath = path.join(this.rootDir, this.outputDir);
    this.rerunFilePath = path.join(this.rootDir, this.rerunFile);
  }

  getArg(name, defaultValue) {
    const index = process.argv.indexOf(name);
    if (index === -1) return defaultValue;

    const value = process.argv[index + 1];
    if (!value || value.startsWith('--')) return defaultValue;

    return value;
  }

  hasFlag(name) {
    return process.argv.includes(name);
  }
}

// ============================================================================
// Report Merger (Using Playwright's Built-in)
// ============================================================================

class ReportMerger {
  constructor(config) {
    this.config = config;
  }

  /**
   * Merge blob reports using Playwright's merge-reports command
   */
  async mergeBlobs() {
    console.log('📊 Merging Playwright blob reports...\n');

    // Check if blob reports exist
    if (!fs.existsSync(this.config.blobReportPath)) {
      console.error(`❌ Blob reports directory not found: ${this.config.blobReportPath}`);
      return false;
    }

    const blobFiles = fs.readdirSync(this.config.blobReportPath);
    if (blobFiles.length === 0) {
      console.error('❌ No blob reports found');
      return false;
    }

    console.log(`Found ${blobFiles.length} blob reports`);

    // Ensure output directory exists
    if (!fs.existsSync(this.config.mergedReportPath)) {
      fs.mkdirSync(this.config.mergedReportPath, { recursive: true });
    }

    // Build reporters argument
    const reporterArgs = this.buildReporterArgs();

    // Execute Playwright merge-reports
    const success = await this.executePlaywrightMerge(reporterArgs);

    if (success) {
      console.log('\n✅ Reports merged successfully');
      this.printReportLocations();
    }

    return success;
  }

  /**
   * Build reporter arguments for Playwright merge-reports.
   *
   * Lookup table mirrors src/config/reporters-config.ts STANDARD_REPORTERS.
   * To add a reporter: add an entry here AND in reporters-config.ts getReporters().
   */
  buildReporterArgs() {
    const args = [];

    // Lookup table: reporter name → Playwright --reporter arg string
    const REPORTER_ARGS = {
      html:  (outDir) => `html={ outputFolder: '${outDir}/html' }`,
      json:  (outDir) => `json={ outputFile: '${outDir}/results.json' }`,
      junit: (outDir) => `junit={ outputFile: '${outDir}/junit.xml' }`,
      list:  ()       => 'list',
      // Add new reporters here (keep in sync with reporters-config.ts getReporters()):
      // allure: (outDir) => `allure-playwright={ outputFolder: '${outDir}/allure-results' }`,
    };

    this.config.reporters.forEach(reporter => {
      const name = reporter.trim();
      const builder = REPORTER_ARGS[name];
      if (!builder) {
        console.warn(`Unknown reporter: ${name} (add it to REPORTER_ARGS in merge-reports.js)`);
        return;
      }
      args.push('--reporter', builder(this.config.mergedReportPath));
    });

    return args;
  }

  /**
   * Execute Playwright merge-reports command
   */
  async executePlaywrightMerge(reporterArgs) {
    return new Promise((resolve) => {
      const args = ['playwright', 'merge-reports', ...reporterArgs, this.config.blobReportPath];

      if (this.config.verbose) {
        console.log(`\nCommand: npx ${args.join(' ')}\n`);
      }

      const child = spawn('npx', args, {
        cwd: this.config.rootDir,
        stdio: 'inherit',
      });

      child.on('close', (exitCode) => {
        resolve(exitCode === 0);
      });

      child.on('error', (error) => {
        console.error('Error executing merge-reports:', error.message);
        resolve(false);
      });
    });
  }

  /**
   * Print report file locations
   */
  printReportLocations() {
    console.log('\n📁 Report Locations:');

    if (this.config.reporters.includes('html')) {
      const htmlPath = path.join(this.config.mergedReportPath, 'html', 'index.html');
      console.log(`  HTML:  ${htmlPath}`);
    }

    if (this.config.reporters.includes('json')) {
      const jsonPath = path.join(this.config.mergedReportPath, 'results.json');
      console.log(`  JSON:  ${jsonPath}`);
    }

    if (this.config.reporters.includes('junit')) {
      const junitPath = path.join(this.config.mergedReportPath, 'junit.xml');
      console.log(`  JUnit: ${junitPath}`);
    }
  }
}

// ============================================================================
// Failure Capture (Extract Failed Scenarios)
// ============================================================================

class FailureCapture {
  constructor(config) {
    this.config = config;
  }

  /**
   * Parse JSON report and extract failed scenarios
   */
  async captureFailures() {
    console.log('\n🔍 Capturing failed scenarios...\n');

    const jsonReportPath = path.join(this.config.mergedReportPath, 'results.json');

    // Check if JSON report exists
    if (!fs.existsSync(jsonReportPath)) {
      console.error('❌ JSON report not found. Make sure "json" is in reporters list.');
      return false;
    }

    try {
      // Read and parse JSON report
      const reportContent = fs.readFileSync(jsonReportPath, 'utf-8');
      const report = JSON.parse(reportContent);

      // Extract failures
      const failures = this.extractFailures(report);

      console.log(`Found ${failures.length} failed scenarios`);

      if (failures.length === 0) {
        console.log('✅ No failures to capture');
        return true;
      }

      // Generate rerun file
      this.generateRerunFile(failures);

      // Print failure summary
      this.printFailureSummary(failures);

      return true;

    } catch (error) {
      console.error('Error capturing failures:', error.message);
      return false;
    }
  }

  /**
   * Extract failed scenarios from Playwright JSON report
   */
  extractFailures(report) {
    const failures = [];

    // Playwright report structure
    if (!report.suites || !Array.isArray(report.suites)) {
      console.warn('Unexpected report structure');
      return failures;
    }

    this.traverseSuites(report.suites, failures);

    return failures;
  }

  /**
   * Recursively traverse suites to find failed tests
   */
  traverseSuites(suites, failures) {
    for (const suite of suites) {
      // Check specs in this suite
      if (suite.specs && Array.isArray(suite.specs)) {
        for (const spec of suite.specs) {
          const failure = this.extractFailureFromSpec(spec);
          if (failure) {
            failures.push(failure);
          }
        }
      }

      // Recursively process nested suites
      if (suite.suites && Array.isArray(suite.suites)) {
        this.traverseSuites(suite.suites, failures);
      }
    }
  }

  /**
   * Extract failure information from a spec
   */
  extractFailureFromSpec(spec) {
    // Check if spec has failed tests
    if (!spec.tests || !Array.isArray(spec.tests)) {
      return null;
    }

    for (const test of spec.tests) {
      const result = test.results && test.results[0];

      if (result && (result.status === 'failed' || result.status === 'timedOut')) {
        return {
          file: spec.file,
          title: spec.title,
          line: spec.location?.line || 0,
          column: spec.location?.column || 0,
          status: result.status,
          error: result.error?.message || '',
          duration: result.duration || 0,
          retry: result.retry || 0,
        };
      }
    }

    return null;
  }

  /**
   * Generate rerun file with failed scenario locations
   */
  generateRerunFile(failures) {
    // Ensure directory exists
    const rerunDir = path.dirname(this.config.rerunFilePath);
    if (!fs.existsSync(rerunDir)) {
      fs.mkdirSync(rerunDir, { recursive: true });
    }

    // Format: file:line for each failure
    const rerunEntries = failures.map(f => {
      const line = f.line || '';
      return line ? `${f.file}:${line}` : f.file;
    });

    // Write to file
    fs.writeFileSync(this.config.rerunFilePath, rerunEntries.join('\n'), 'utf-8');

    console.log(`\n📝 Rerun file created: ${this.config.rerunFilePath}`);
  }

  /**
   * Print failure summary
   */
  printFailureSummary(failures) {
    console.log('\n' + '='.repeat(80));
    console.log('Failed Scenarios Summary');
    console.log('='.repeat(80));

    // Group by file
    const byFile = {};
    for (const failure of failures) {
      const relPath = path.relative(this.config.rootDir, failure.file);
      if (!byFile[relPath]) {
        byFile[relPath] = [];
      }
      byFile[relPath].push(failure);
    }

    // Print grouped failures
    Object.entries(byFile).forEach(([file, fileFailures]) => {
      console.log(`\n📄 ${file} (${fileFailures.length} failures)`);
      fileFailures.forEach((f, i) => {
        const durationSec = (f.duration / 1000).toFixed(2);
        console.log(`  ${i + 1}. ${f.title} [${f.status}] (${durationSec}s)`);
        if (this.config.verbose && f.error) {
          console.log(`     Error: ${f.error.substring(0, 100)}...`);
        }
      });
    });

    console.log('\n' + '='.repeat(80));
    console.log(`Total Failures: ${failures.length}`);
    console.log('='.repeat(80) + '\n');

    console.log('To rerun failed tests:');
    console.log(`  npx playwright test --grep-invert ".*" $(cat ${this.config.rerunFilePath})\n`);
  }
}

// ============================================================================
// Main Execution
// ============================================================================

class MergeReportsRunner {
  constructor(config) {
    this.config = config;
    this.merger = new ReportMerger(config);
    this.failureCapture = new FailureCapture(config);
  }

  async run() {
    console.log('📊 Playwright Report Merger\n');
    this.printConfig();

    try {
      // Step 1: Merge blob reports
      const mergeSuccess = await this.merger.mergeBlobs();

      if (!mergeSuccess) {
        console.error('\n❌ Report merging failed');
        return false;
      }

      // Step 2: Capture failures (if requested)
      if (this.config.captureFailures) {
        const captureSuccess = await this.failureCapture.captureFailures();

        if (!captureSuccess) {
          console.error('\n⚠️  Failure capture encountered issues');
        }
      }

      console.log('\n✅ Report processing complete');
      return true;

    } catch (error) {
      console.error('\n❌ Fatal error:', error.message);
      if (this.config.verbose) {
        console.error(error.stack);
      }
      return false;
    }
  }

  printConfig() {
    console.log('Configuration:');
    console.log(`  Blob Dir:         ${this.config.blobDir}`);
    console.log(`  Output Dir:       ${this.config.outputDir}`);
    console.log(`  Reporters:        ${this.config.reporters.join(', ')}`);
    console.log(`  Capture Failures: ${this.config.captureFailures}`);
    if (this.config.captureFailures) {
      console.log(`  Rerun File:       ${this.config.rerunFile}`);
    }
    console.log('');
  }
}

// ============================================================================
// Entry Point
// ============================================================================

async function main() {
  const config = new MergeConfig();
  const runner = new MergeReportsRunner(config);

  const success = await runner.run();

  process.exit(success ? 0 : 1);
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { MergeReportsRunner, ReportMerger, FailureCapture, MergeConfig };

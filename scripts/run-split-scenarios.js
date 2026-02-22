#!/usr/bin/env node

/**
 * Scenario-Split Runner for Long-Running Feature Files
 *
 * Splits a single feature file by tag groups and runs each group as a
 * separate parallel process. Each process gets its own TEST_TAGS so
 * playwright-bdd generates only matching scenarios.
 *
 * Usage:
 *   node scripts/run-split-scenarios.js [options]
 *
 * Required:
 *   --feature <path>       Path to the feature file to split
 *   --tags <groups>        Comma-separated tag groups (each group is a Cucumber tag expression)
 *
 * Optional:
 *   --dry-run              Show execution plan without running tests
 *   --validate             Check for overlapping scenarios across tag groups
 *   --retries <number>     Retry count per scenario (default: 1)
 *   --timeout <ms>         Timeout per scenario in ms (default: 60000)
 *   --headed               Run with visible browser
 *   --verbose / -v         Show full output from each worker process
 *   --report-dir <path>    Report output directory (default: reports)
 *
 * Examples:
 *   # Split overtime.feature into 3 groups by scenario tags
 *   node scripts/run-split-scenarios.js \
 *     --feature teams/sch/features/ui/overtime.feature \
 *     --tags "@OT1 or @OT2 or @OT3, @OT4 or @OT5 or @OT6, @OT7 or @OT8 or @OT9"
 *
 *   # Dry run to see the plan
 *   node scripts/run-split-scenarios.js \
 *     --feature teams/sch/features/ui/overtime.feature \
 *     --tags "@part1, @part2, @part3" \
 *     --dry-run
 *
 *   # Validate no scenario overlaps between groups
 *   node scripts/run-split-scenarios.js \
 *     --feature teams/sch/features/ui/overtime.feature \
 *     --tags "@part1, @part2, @part3" \
 *     --validate
 */

const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

// ============================================================================
// CLI Argument Parsing
// ============================================================================

class SplitConfig {
  constructor() {
    this.feature = this.getArg('--feature', null);
    this.tagGroups = this.parseTagGroups();
    this.dryRun = this.hasFlag('--dry-run');
    this.validate = this.hasFlag('--validate');
    this.retries = this.getArg('--retries', 1);
    this.timeout = this.getArg('--timeout', 60000);
    this.headed = this.hasFlag('--headed');
    this.verbose = this.hasFlag('--verbose') || this.hasFlag('-v');
    this.reportDir = this.getArg('--report-dir', 'reports');

    this.rootDir = path.join(__dirname, '..');
    this.blobReportDir = path.join(this.rootDir, 'blob-reports');

    this.validateRequired();
  }

  getArg(name, defaultValue) {
    const index = process.argv.indexOf(name);
    if (index === -1) return defaultValue;
    const value = process.argv[index + 1];
    if (!value || value.startsWith('--')) return defaultValue;
    const num = Number(value);
    return isNaN(num) ? value : num;
  }

  hasFlag(name) {
    return process.argv.includes(name);
  }

  parseTagGroups() {
    const raw = this.getArg('--tags', null);
    if (!raw) return [];
    return raw.split(',').map(g => g.trim()).filter(g => g.length > 0);
  }

  validateRequired() {
    const errors = [];

    if (!this.feature) {
      errors.push('--feature <path> is required');
    } else {
      // Resolve relative to rootDir
      const resolved = path.isAbsolute(this.feature)
        ? this.feature
        : path.join(this.rootDir, this.feature);
      if (!fs.existsSync(resolved)) {
        errors.push(`Feature file not found: ${resolved}`);
      }
      this.featureAbsolute = resolved;
    }

    if (this.tagGroups.length === 0) {
      errors.push('--tags "<group1>, <group2>, ..." is required (comma-separated tag expressions)');
    }

    if (errors.length > 0) {
      console.error('\nError:');
      errors.forEach(e => console.error(`  - ${e}`));
      console.error('\nUsage:');
      console.error('  node scripts/run-split-scenarios.js --feature <path> --tags "<group1>, <group2>"');
      console.error('\nExample:');
      console.error('  node scripts/run-split-scenarios.js \\');
      console.error('    --feature teams/sch/features/ui/overtime.feature \\');
      console.error('    --tags "@OT1 or @OT2 or @OT3, @OT4 or @OT5 or @OT6, @OT7 or @OT8"');
      process.exit(1);
    }
  }
}

// ============================================================================
// Feature File Parser
// ============================================================================

class FeatureParser {
  /**
   * Parse a feature file to extract scenarios with their tags.
   * Returns an array of { name, line, tags[] } objects.
   */
  static parseScenarios(featurePath) {
    const content = fs.readFileSync(featurePath, 'utf-8');
    const lines = content.split('\n');
    const scenarios = [];
    let featureTags = [];
    let pendingTags = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Collect feature-level tags (before Feature: keyword)
      if (line.startsWith('Feature:')) {
        featureTags = [...pendingTags];
        pendingTags = [];
        continue;
      }

      // Collect tags above scenarios
      if (line.startsWith('@')) {
        const tags = line.match(/@[\w-]+/g) || [];
        pendingTags.push(...tags);
        continue;
      }

      // Match Scenario or Scenario Outline
      const scenarioMatch = line.match(/^(Scenario|Scenario Outline|Scenario Template):\s*(.*)/);
      if (scenarioMatch) {
        scenarios.push({
          name: scenarioMatch[2].trim(),
          line: i + 1,
          tags: [...featureTags, ...pendingTags],
        });
        pendingTags = [];
        continue;
      }

      // Reset pending tags if we hit a non-tag, non-scenario, non-empty line
      if (line.length > 0 && !line.startsWith('#') && !line.startsWith('|') &&
          !line.startsWith('Given') && !line.startsWith('When') && !line.startsWith('Then') &&
          !line.startsWith('And') && !line.startsWith('But') && !line.startsWith('Background') &&
          !line.startsWith('Examples') && !line.startsWith('*')) {
        // Don't reset — tags may span multiple lines before a scenario
      }
    }

    return scenarios;
  }

  /**
   * Simple Cucumber tag expression evaluator.
   * Supports: @tag, @tag1 or @tag2, @tag1 and @tag2, not @tag
   * Parentheses not supported (keep expressions simple).
   */
  static matchesTagExpression(scenarioTags, expression) {
    if (!expression) return true;

    const normalizedTags = scenarioTags.map(t => t.toLowerCase());
    const expr = expression.trim().toLowerCase();

    // Handle "not" at the start
    if (expr.startsWith('not ')) {
      const inner = expr.slice(4).trim();
      return !this.matchesTagExpression(scenarioTags, inner);
    }

    // Handle "and"
    if (expr.includes(' and ')) {
      const parts = expr.split(' and ').map(p => p.trim());
      return parts.every(part => this.matchesTagExpression(scenarioTags, part));
    }

    // Handle "or"
    if (expr.includes(' or ')) {
      const parts = expr.split(' or ').map(p => p.trim());
      return parts.some(part => this.matchesTagExpression(scenarioTags, part));
    }

    // Single tag
    return normalizedTags.includes(expr);
  }

  /**
   * Count how many scenarios in a feature match a tag expression.
   */
  static countMatchingScenarios(scenarios, tagExpression) {
    return scenarios.filter(s => this.matchesTagExpression(s.tags, tagExpression));
  }

  /**
   * Validate that tag groups don't overlap (no scenario in multiple groups).
   */
  static validateNoOverlap(scenarios, tagGroups) {
    const overlaps = [];

    for (const scenario of scenarios) {
      const matchingGroups = tagGroups
        .map((group, i) => ({ group, index: i }))
        .filter(({ group }) => this.matchesTagExpression(scenario.tags, group));

      if (matchingGroups.length > 1) {
        overlaps.push({
          scenario: scenario.name,
          line: scenario.line,
          tags: scenario.tags,
          groups: matchingGroups.map(g => g.index),
        });
      }
    }

    return overlaps;
  }

  /**
   * Find scenarios not covered by any tag group.
   */
  static findUncovered(scenarios, tagGroups) {
    return scenarios.filter(s =>
      !tagGroups.some(group => this.matchesTagExpression(s.tags, group))
    );
  }
}

// ============================================================================
// Worker Process Manager
// ============================================================================

class SplitWorkerExecutor {
  constructor(config) {
    this.config = config;
    this.runningProcesses = new Map();
  }

  /**
   * Execute all tag groups in parallel.
   */
  async executeAll(tagGroups) {
    const featureName = path.basename(this.config.feature, '.feature');

    // Clean blob reports
    if (fs.existsSync(this.config.blobReportDir)) {
      fs.rmSync(this.config.blobReportDir, { recursive: true });
    }
    fs.mkdirSync(this.config.blobReportDir, { recursive: true });

    console.log(`\nStarting ${tagGroups.length} parallel worker processes...\n`);
    const overallStart = Date.now();

    // Spawn all groups in parallel
    const results = await Promise.allSettled(
      tagGroups.map((tagExpr, index) =>
        this.executeGroup(index, tagExpr, featureName)
      )
    );

    const overallDuration = ((Date.now() - overallStart) / 1000).toFixed(1);

    // Print results
    console.log('\n' + '='.repeat(80));
    console.log('Split Execution Results');
    console.log('='.repeat(80));

    let allPassed = true;
    const groupResults = [];

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.log(`  Group ${index}: ERRORED - ${result.reason.message}`);
        allPassed = false;
        groupResults.push({ index, status: 'error', exitCode: -1, duration: 0 });
      } else {
        const { exitCode, duration } = result.value;
        const status = exitCode === 0 ? 'PASSED' : 'FAILED';
        const durationSec = (duration / 1000).toFixed(1);
        const icon = exitCode === 0 ? 'PASS' : 'FAIL';
        console.log(`  Group ${index} [${tagGroups[index]}]: ${icon} (${durationSec}s)`);
        if (exitCode !== 0) allPassed = false;
        groupResults.push({ index, status, exitCode, duration });
      }
    });

    console.log('-'.repeat(80));
    console.log(`  Total wall-clock time: ${overallDuration}s`);

    // Estimate sequential time for comparison
    const totalSequentialMs = groupResults.reduce((sum, r) => sum + r.duration, 0);
    const sequentialSec = (totalSequentialMs / 1000).toFixed(1);
    const timeSaved = ((totalSequentialMs - (Date.now() - overallStart)) / 1000).toFixed(1);
    console.log(`  Estimated sequential time: ${sequentialSec}s`);
    if (Number(timeSaved) > 0) {
      console.log(`  Time saved by splitting: ${timeSaved}s`);
    }
    console.log('='.repeat(80) + '\n');

    return allPassed;
  }

  /**
   * Execute a single tag group as a child process.
   */
  async executeGroup(groupIndex, tagExpression, featureName) {
    const shardId = `split-${featureName}-group${groupIndex}`;
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const args = ['playwright', 'test', '--reporter=blob', '--workers=1'];

      if (this.config.retries) {
        args.push(`--retries=${this.config.retries}`);
      }
      if (this.config.timeout) {
        args.push(`--timeout=${this.config.timeout}`);
      }
      if (this.config.headed) {
        args.push('--headed');
      }
      args.push('--pass-with-no-tests');

      const childEnv = {
        ...process.env,
        TEST_TAGS: tagExpression,
        FEATURE_PATHS: this.config.feature,
        SHARD_ID: shardId,
        PARALLEL_MODE: 'feature',
        WORKERS: '1',
      };

      if (this.config.verbose) {
        console.log(`[Group ${groupIndex}] Command: npx ${args.join(' ')}`);
        console.log(`[Group ${groupIndex}] TEST_TAGS="${tagExpression}"`);
        console.log(`[Group ${groupIndex}] FEATURE_PATHS="${this.config.feature}"`);
        console.log(`[Group ${groupIndex}] SHARD_ID="${shardId}"`);
      }

      console.log(`[Group ${groupIndex}] Starting: tags="${tagExpression}"`);

      const child = spawn('npx', args, {
        cwd: this.config.rootDir,
        env: childEnv,
        stdio: this.config.verbose ? 'inherit' : 'pipe',
      });

      this.runningProcesses.set(groupIndex, child);

      let output = '';
      if (!this.config.verbose) {
        child.stdout?.on('data', (data) => { output += data.toString(); });
        child.stderr?.on('data', (data) => { output += data.toString(); });
      }

      child.on('close', (exitCode) => {
        const duration = Date.now() - startTime;
        this.runningProcesses.delete(groupIndex);

        if (exitCode === 0) {
          console.log(`[Group ${groupIndex}] Completed in ${(duration / 1000).toFixed(1)}s`);
        } else {
          console.log(`[Group ${groupIndex}] Failed (exit ${exitCode}) after ${(duration / 1000).toFixed(1)}s`);
          if (!this.config.verbose && output) {
            console.log(`[Group ${groupIndex}] Output:\n${output.slice(-2000)}`);
          }
        }

        resolve({ exitCode, duration, output });
      });

      child.on('error', (err) => {
        this.runningProcesses.delete(groupIndex);
        reject(err);
      });
    });
  }

  /**
   * Merge blob reports from all groups into a unified HTML report.
   */
  mergeReports() {
    const blobDir = this.config.blobReportDir;
    if (!fs.existsSync(blobDir)) {
      console.log('\nNo blob reports to merge.');
      return;
    }

    const reportOutput = path.join(this.config.rootDir, this.config.reportDir, 'split-merged');
    console.log(`\nMerging blob reports from ${blobDir}...`);

    try {
      execSync(
        `npx playwright merge-reports --reporter=html "${blobDir}"`,
        { cwd: this.config.rootDir, stdio: 'inherit' }
      );
      console.log(`Merged report: ${reportOutput}`);
    } catch (err) {
      console.error('Report merge failed:', err.message);
    }
  }

  /**
   * Kill all running worker processes.
   */
  killAll() {
    for (const [index, child] of this.runningProcesses) {
      console.log(`Killing group ${index}...`);
      child.kill('SIGTERM');
    }
    this.runningProcesses.clear();
  }
}

// ============================================================================
// Main Runner
// ============================================================================

class SplitScenarioRunner {
  constructor(config) {
    this.config = config;
    this.executor = new SplitWorkerExecutor(config);
  }

  async run() {
    console.log('Playwright + Cucumber Scenario-Split Runner\n');

    // Step 1: Parse the feature file
    const relPath = path.relative(this.config.rootDir, this.config.featureAbsolute);
    console.log(`Feature:    ${relPath}`);
    console.log(`Tag groups: ${this.config.tagGroups.length}`);

    const scenarios = FeatureParser.parseScenarios(this.config.featureAbsolute);
    console.log(`Scenarios:  ${scenarios.length} total in feature\n`);

    if (scenarios.length === 0) {
      console.log('No scenarios found in feature file.');
      return true;
    }

    // Step 2: Show distribution per group
    console.log('Tag Group Distribution:');
    console.log('-'.repeat(70));

    this.config.tagGroups.forEach((tagExpr, index) => {
      const matching = FeatureParser.countMatchingScenarios(scenarios, tagExpr);
      console.log(
        `  Group ${index}: ${matching.length} scenarios  [${tagExpr}]`
      );
      if (this.config.verbose) {
        matching.forEach(s => console.log(`    - Line ${s.line}: ${s.name}`));
      }
    });

    // Check for uncovered scenarios
    const uncovered = FeatureParser.findUncovered(scenarios, this.config.tagGroups);
    if (uncovered.length > 0) {
      console.log(`\n  WARNING: ${uncovered.length} scenario(s) not covered by any tag group:`);
      uncovered.forEach(s => console.log(`    - Line ${s.line}: ${s.name} [${s.tags.join(' ')}]`));
    }

    console.log('-'.repeat(70));

    // Step 3: Validate overlaps if requested
    if (this.config.validate) {
      const overlaps = FeatureParser.validateNoOverlap(scenarios, this.config.tagGroups);
      if (overlaps.length > 0) {
        console.log(`\n  WARNING: ${overlaps.length} scenario(s) appear in multiple groups:`);
        overlaps.forEach(o => {
          console.log(`    - Line ${o.line}: ${o.scenario}`);
          console.log(`      Tags: ${o.tags.join(' ')}`);
          console.log(`      Matched groups: ${o.groups.join(', ')}`);
        });
        console.log('\n  These scenarios will run in MULTIPLE groups (duplicate execution).');
        console.log('  Use mutually exclusive tags to avoid this.\n');
      } else {
        console.log('\n  Validation passed: no overlapping scenarios between groups.\n');
      }
    }

    // Step 4: Dry run — just show plan
    if (this.config.dryRun) {
      console.log('\nDry run mode — showing execution plan only.');
      console.log('Each group would run as a separate parallel process with:');
      this.config.tagGroups.forEach((tagExpr, i) => {
        const shardId = `split-${path.basename(this.config.feature, '.feature')}-group${i}`;
        console.log(`\n  Process ${i}:`);
        console.log(`    TEST_TAGS="${tagExpr}"`);
        console.log(`    FEATURE_PATHS="${this.config.feature}"`);
        console.log(`    SHARD_ID="${shardId}"`);
        console.log(`    Command: npx playwright test --reporter=blob --workers=1`);
      });
      return true;
    }

    // Step 5: Execute all groups in parallel
    const allPassed = await this.executor.executeAll(this.config.tagGroups);

    // Step 6: Merge reports
    this.executor.mergeReports();

    return allPassed;
  }
}

// ============================================================================
// Entry Point
// ============================================================================

async function main() {
  const config = new SplitConfig();
  const runner = new SplitScenarioRunner(config);

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\nReceived SIGINT, terminating workers...');
    runner.executor.killAll();
    process.exit(130);
  });

  process.on('SIGTERM', () => {
    console.log('\n\nReceived SIGTERM, terminating workers...');
    runner.executor.killAll();
    process.exit(143);
  });

  const success = await runner.run();

  if (success) {
    console.log('\nAll groups completed successfully.');
    process.exit(0);
  } else {
    console.log('\nSome groups failed.');
    console.log('To view failures: node scripts/merge-reports.js --capture-failures\n');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { SplitScenarioRunner, SplitConfig, FeatureParser };

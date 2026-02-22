#!/usr/bin/env node

/**
 * Feature-Level Sharding Runner with Hybrid Scenario-Split Support
 *
 * Distributes Cucumber feature files across multiple Playwright workers
 * with intelligent load balancing and tag-based filtering.
 *
 * HYBRID MODE: Long-running features can be split by tag groups so their
 * scenarios run in parallel across workers instead of sequentially.
 *
 * Usage:
 *   node scripts/run-sharded.js [options]
 *
 * Options:
 *   --workers <number>             Number of parallel workers (default: 15)
 *   --tags <expression>            Cucumber tag expression (default: no filter)
 *   --team <name>                  Team name filter (default: all)
 *   --features <glob>              Feature file glob pattern
 *   --dry-run                      Show execution plan without running tests
 *   --report-dir <path>            Report output directory (default: reports)
 *   --retries <number>             Retry count (default: 2)
 *   --timeout <ms>                 Timeout per test (default: 60000)
 *   --headed                       Run with visible browser
 *   --verbose / -v                 Show full output from each worker
 *
 * Hybrid Split Options:
 *   --split-feature <path>         Feature file to split by tags (repeatable)
 *   --split-tags "<path>:<groups>" Tag groups for a split feature (comma-separated)
 *
 * Examples:
 *   # Standard: shard all features across 15 workers
 *   node scripts/run-sharded.js --tags "@smoke" --workers 15
 *
 *   # Hybrid: shard features + split one big feature by tags
 *   node scripts/run-sharded.js --workers 8 \
 *     --split-feature teams/sch/features/ui/overtime.feature \
 *     --split-tags "teams/sch/features/ui/overtime.feature:@OT1 or @OT2 or @OT3,@OT4 or @OT5 or @OT6,@OT7 or @OT8 or @OT9"
 *
 *   # Dry run to see execution plan
 *   node scripts/run-sharded.js --tags "@smoke" --dry-run
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const glob = require('glob');

// ============================================================================
// Configuration & CLI Arguments
// ============================================================================

class Config {
  constructor() {
    this.workers = this.getArg('--workers', 15);
    this.tags = this.getArg('--tags', null);
    this.team = this.getArg('--team', null);
    this.featuresGlob = this.getArg('--features', null);
    this.dryRun = this.hasFlag('--dry-run');
    this.reportDir = this.getArg('--report-dir', 'reports');
    this.verbose = this.hasFlag('--verbose') || this.hasFlag('-v');
    this.headless = !this.hasFlag('--headed');
    this.retries = this.getArg('--retries', 2);
    this.timeout = this.getArg('--timeout', 60000);

    // Hybrid split configuration
    this.splitConfig = this.parseSplitConfig();

    // Derived paths
    this.rootDir = path.join(__dirname, '..');
    this.blobReportDir = path.join(this.rootDir, 'blob-reports');
    this.mergedReportDir = path.join(this.rootDir, this.reportDir, 'merged');
  }

  getArg(name, defaultValue) {
    const index = process.argv.indexOf(name);
    if (index === -1) return defaultValue;

    const value = process.argv[index + 1];
    if (!value || value.startsWith('--')) return defaultValue;

    // Try to parse as number
    const num = Number(value);
    return isNaN(num) ? value : num;
  }

  /**
   * Collect all occurrences of a repeated flag (e.g., --split-feature used multiple times).
   */
  getAllArgs(name) {
    const values = [];
    for (let i = 0; i < process.argv.length; i++) {
      if (process.argv[i] === name && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) {
        values.push(process.argv[i + 1]);
      }
    }
    return values;
  }

  hasFlag(name) {
    return process.argv.includes(name);
  }

  getFeatureGlob() {
    if (this.featuresGlob) {
      return this.featuresGlob;
    }

    if (this.team) {
      return `teams/${this.team}/features/**/*.feature`;
    }

    return 'teams/**/features/**/*.feature';
  }

  /**
   * Parse --split-feature and --split-tags into a Map<featurePath, tagGroups[]>.
   *
   * --split-feature can appear multiple times.
   * --split-tags format: "path/to/feature.feature:@tag1 or @tag2,@tag3 or @tag4"
   */
  parseSplitConfig() {
    const splitMap = new Map();

    // Collect all --split-feature paths
    const splitFeatures = this.getAllArgs('--split-feature');

    // Collect all --split-tags entries
    const splitTagEntries = this.getAllArgs('--split-tags');

    // Parse --split-tags entries (format: "path:group1,group2,group3")
    for (const entry of splitTagEntries) {
      const colonIndex = entry.indexOf(':');
      if (colonIndex === -1) {
        console.error(`Invalid --split-tags format: "${entry}"`);
        console.error('Expected: "path/to/feature.feature:@tag1 or @tag2,@tag3 or @tag4"');
        process.exit(1);
      }

      const featurePath = entry.substring(0, colonIndex).trim();
      const tagsRaw = entry.substring(colonIndex + 1).trim();
      const tagGroups = tagsRaw.split(',').map(g => g.trim()).filter(g => g.length > 0);

      if (tagGroups.length === 0) {
        console.error(`No tag groups found in --split-tags for: ${featurePath}`);
        process.exit(1);
      }

      splitMap.set(featurePath, tagGroups);
    }

    // For --split-feature without --split-tags, they need corresponding --split-tags
    for (const featurePath of splitFeatures) {
      if (!splitMap.has(featurePath)) {
        console.error(`--split-feature "${featurePath}" has no corresponding --split-tags entry.`);
        console.error('Usage: --split-tags "path/to/feature.feature:@group1,@group2"');
        process.exit(1);
      }
    }

    return splitMap;
  }

  get isHybridMode() {
    return this.splitConfig.size > 0;
  }
}

// ============================================================================
// Feature File Analysis
// ============================================================================

class FeatureAnalyzer {
  /**
   * Parse a feature file to extract tags and count scenarios
   */
  static analyzeFeature(featurePath) {
    try {
      const content = fs.readFileSync(featurePath, 'utf-8');

      return {
        path: featurePath,
        tags: this.extractTags(content),
        scenarioCount: this.countScenarios(content),
        estimatedDuration: this.estimateDuration(content),
      };
    } catch (error) {
      console.error(`Error analyzing ${featurePath}:`, error.message);
      return null;
    }
  }

  /**
   * Extract all tags from feature file
   */
  static extractTags(content) {
    const tags = new Set();

    // Match @tag patterns
    const tagMatches = content.match(/@[\w-]+/g);
    if (tagMatches) {
      tagMatches.forEach(tag => tags.add(tag));
    }

    return Array.from(tags);
  }

  /**
   * Count scenarios in feature file
   */
  static countScenarios(content) {
    // Match "Scenario:" and "Scenario Outline:"
    const scenarioMatches = content.match(/^\s*(Scenario|Scenario Outline):/gm);
    let count = scenarioMatches ? scenarioMatches.length : 0;

    // For Scenario Outlines, count example rows
    const outlineMatches = content.match(/^\s*Scenario Outline:/gm);
    if (outlineMatches) {
      // Find Examples tables
      const examplesBlocks = content.match(/Examples:[\s\S]*?(?=\n\s*(?:Scenario|Feature|$))/g);
      if (examplesBlocks) {
        examplesBlocks.forEach(block => {
          // Count data rows (exclude header row)
          const rows = block.match(/^\s*\|.*\|/gm);
          if (rows && rows.length > 1) {
            count += rows.length - 1; // Subtract header row
          }
        });
      }
    }

    return Math.max(count, 1); // At least 1 scenario
  }

  /**
   * Estimate feature duration based on scenario count
   * Average scenario duration: 2 minutes
   */
  static estimateDuration(content) {
    const scenarioCount = this.countScenarios(content);
    const avgDurationPerScenario = 2 * 60 * 1000; // 2 minutes in ms
    return scenarioCount * avgDurationPerScenario;
  }

  /**
   * Check if feature tags match the given tag expression
   */
  static matchesTagExpression(featureTags, tagExpression) {
    if (!tagExpression) return true;

    // Convert Cucumber tag expression to boolean logic
    // Supports: @tag, @tag1 and @tag2, @tag1 or @tag2, not @tag

    // Simple implementation for common cases
    const expr = tagExpression.toLowerCase();

    // Handle "not" operator
    if (expr.includes('not ')) {
      const notTag = expr.match(/not\s+(@[\w-]+)/);
      if (notTag) {
        const tag = notTag[1];
        return !featureTags.some(t => t.toLowerCase() === tag.toLowerCase());
      }
    }

    // Handle "and" operator
    if (expr.includes(' and ')) {
      const tags = expr.split(' and ').map(t => t.trim());
      return tags.every(tag =>
        featureTags.some(ft => ft.toLowerCase() === tag.toLowerCase())
      );
    }

    // Handle "or" operator
    if (expr.includes(' or ')) {
      const tags = expr.split(' or ').map(t => t.trim());
      return tags.some(tag =>
        featureTags.some(ft => ft.toLowerCase() === tag.toLowerCase())
      );
    }

    // Single tag
    return featureTags.some(t => t.toLowerCase() === expr.toLowerCase());
  }
}

// ============================================================================
// Feature Sharding Algorithm (Enhanced with Hybrid Split Support)
// ============================================================================

class FeatureSharder {
  /**
   * Distribute work items across workers using greedy load-balancing algorithm.
   * In hybrid mode, work items include both normal features and split tag groups.
   *
   * @param {Array} workItems - Array of { type, path, scenarioCount, estimatedDuration, ... }
   * @param {number} workerCount
   */
  static distributeWorkItems(workItems, workerCount) {
    // Sort by estimated duration (descending) for better distribution
    const sorted = [...workItems].sort((a, b) => b.estimatedDuration - a.estimatedDuration);

    // Initialize shards
    const shards = Array.from({ length: workerCount }, () => ({
      items: [],
      totalScenarios: 0,
      totalDuration: 0,
    }));

    // Greedy algorithm: assign each item to least-loaded shard
    for (const item of sorted) {
      const leastLoadedIndex = shards.reduce((minIndex, shard, index, arr) =>
        shard.totalDuration < arr[minIndex].totalDuration ? index : minIndex
      , 0);

      shards[leastLoadedIndex].items.push(item);
      shards[leastLoadedIndex].totalScenarios += item.scenarioCount;
      shards[leastLoadedIndex].totalDuration += item.estimatedDuration;
    }

    return shards;
  }

  /**
   * Legacy method: distribute features only (no hybrid).
   */
  static distributeFeatures(features, workerCount) {
    const workItems = features.map(f => ({
      type: 'feature',
      path: f.path,
      scenarioCount: f.scenarioCount,
      estimatedDuration: f.estimatedDuration,
      tags: f.tags,
      feature: f,
    }));
    return this.distributeWorkItems(workItems, workerCount);
  }

  /**
   * Build a unified work item list for hybrid mode.
   * Normal features become 'feature' items; split features become 'split-group' items.
   */
  static buildHybridWorkItems(normalFeatures, splitConfig, rootDir) {
    const workItems = [];

    // Add normal features
    for (const feature of normalFeatures) {
      workItems.push({
        type: 'feature',
        path: feature.path,
        scenarioCount: feature.scenarioCount,
        estimatedDuration: feature.estimatedDuration,
        tags: feature.tags,
        feature,
      });
    }

    // Add split tag groups as individual work items
    for (const [featurePath, tagGroups] of splitConfig) {
      const absPath = path.isAbsolute(featurePath)
        ? featurePath
        : path.join(rootDir, featurePath);

      const feature = FeatureAnalyzer.analyzeFeature(absPath);
      if (!feature) {
        console.error(`Could not analyze split feature: ${featurePath}`);
        continue;
      }

      // Estimate each group gets an equal share of the feature's scenarios
      const scenariosPerGroup = Math.ceil(feature.scenarioCount / tagGroups.length);
      const durationPerGroup = scenariosPerGroup * 2 * 60 * 1000;

      tagGroups.forEach((tagExpr, groupIndex) => {
        workItems.push({
          type: 'split-group',
          path: absPath,
          featurePath,
          tagExpression: tagExpr,
          groupIndex,
          scenarioCount: scenariosPerGroup,
          estimatedDuration: durationPerGroup,
          featureName: path.basename(featurePath, '.feature'),
        });
      });
    }

    return workItems;
  }

  /**
   * Print distribution summary for hybrid shards.
   */
  static printHybridDistribution(shards, rootDir) {
    console.log('\n' + '='.repeat(80));
    console.log('Hybrid Shard Distribution (Features + Split Groups)');
    console.log('='.repeat(80));

    shards.forEach((shard, index) => {
      const featureCount = shard.items.filter(i => i.type === 'feature').length;
      const splitCount = shard.items.filter(i => i.type === 'split-group').length;
      const durationMin = Math.ceil(shard.totalDuration / 60000);

      let label = `${featureCount} features`;
      if (splitCount > 0) label += ` + ${splitCount} split groups`;

      console.log(
        `  Shard ${index + 1}: ${label}, ` +
        `${shard.totalScenarios} scenarios, ` +
        `~${durationMin} min`
      );
    });

    const totalItems = shards.reduce((sum, s) => sum + s.items.length, 0);
    const totalScenarios = shards.reduce((sum, s) => sum + s.totalScenarios, 0);
    const maxDuration = Math.max(...shards.map(s => s.totalDuration));
    const maxDurationMin = Math.ceil(maxDuration / 60000);

    console.log('-'.repeat(80));
    console.log(
      `  Total: ${totalItems} work items, ` +
      `${totalScenarios} scenarios, ` +
      `estimated ~${maxDurationMin} min (slowest shard)`
    );
    console.log('='.repeat(80) + '\n');
  }

  /**
   * Print shard distribution summary (standard mode)
   */
  static printDistribution(shards) {
    console.log('\n' + '='.repeat(80));
    console.log('Feature Shard Distribution');
    console.log('='.repeat(80));

    shards.forEach((shard, index) => {
      const durationMin = Math.ceil(shard.totalDuration / 60000);
      const featureCount = shard.items ? shard.items.length : shard.features?.length || 0;
      console.log(
        `  Shard ${index + 1}: ` +
        `${featureCount} features, ` +
        `${shard.totalScenarios} scenarios, ` +
        `~${durationMin} min`
      );
    });

    const totalItems = shards.reduce((sum, s) => sum + (s.items?.length || s.features?.length || 0), 0);
    const totalScenarios = shards.reduce((sum, s) => sum + s.totalScenarios, 0);
    const avgDuration = shards.reduce((sum, s) => sum + s.totalDuration, 0) / shards.length;
    const avgDurationMin = Math.ceil(avgDuration / 60000);

    console.log('-'.repeat(80));
    console.log(
      `  Total: ${totalItems} features, ` +
      `${totalScenarios} scenarios, ` +
      `avg ~${avgDurationMin} min per worker`
    );
    console.log('='.repeat(80) + '\n');
  }
}

// ============================================================================
// Playwright Worker Execution (Enhanced for Hybrid Mode)
// ============================================================================

class WorkerExecutor {
  constructor(config) {
    this.config = config;
    this.runningWorkers = new Map();
    this.completedWorkers = new Map();
  }

  /**
   * Execute all shards in parallel (supports both standard and hybrid mode).
   */
  async executeShards(shards) {
    console.log(`\nStarting ${shards.length} parallel workers...\n`);

    // Ensure blob report directory exists
    if (fs.existsSync(this.config.blobReportDir)) {
      fs.rmSync(this.config.blobReportDir, { recursive: true });
    }
    fs.mkdirSync(this.config.blobReportDir, { recursive: true });

    // Execute all workers in parallel
    const workerPromises = shards.map((shard, index) =>
      this.executeHybridWorker(index, shard)
    );

    const results = await Promise.allSettled(workerPromises);

    // Check for failures
    const errors = results.filter(r => r.status === 'rejected');
    if (errors.length > 0) {
      console.error(`\n${errors.length} workers errored out`);
      return false;
    }

    const failedTests = results.filter(r => r.value.exitCode !== 0);
    if (failedTests.length > 0) {
      console.log(`\n${failedTests.length} workers had test failures`);
    }

    return failedTests.length === 0;
  }

  /**
   * Execute a single hybrid shard. A shard may contain a mix of:
   *   - 'feature' items: run as normal feature files
   *   - 'split-group' items: run with TEST_TAGS + FEATURE_PATHS env vars
   *
   * If the shard has ONLY standard features, run them all in one Playwright process.
   * If the shard has split groups, each split group gets its own sub-process
   * (because each needs a unique TEST_TAGS + SHARD_ID for bddgen isolation).
   */
  async executeHybridWorker(workerIndex, shard) {
    const items = shard.items || [];
    if (items.length === 0) {
      console.log(`[worker-${workerIndex}] No work items, skipping`);
      return { workerId: `worker-${workerIndex}`, exitCode: 0, duration: 0 };
    }

    const featureItems = items.filter(i => i.type === 'feature');
    const splitItems = items.filter(i => i.type === 'split-group');

    // If only standard features, use the efficient single-process path
    if (splitItems.length === 0) {
      return this.executeFeatureWorker(workerIndex, featureItems);
    }

    // Hybrid: run each item as a separate sub-process
    const startTime = Date.now();
    const subResults = [];

    // Run feature items together in one process (if any)
    if (featureItems.length > 0) {
      const result = await this.executeFeatureWorker(workerIndex, featureItems);
      subResults.push(result);
    }

    // Run each split group as a separate process
    for (const splitItem of splitItems) {
      const result = await this.executeSplitGroupWorker(workerIndex, splitItem);
      subResults.push(result);
    }

    const duration = Date.now() - startTime;
    const hasFailure = subResults.some(r => r.exitCode !== 0);

    return {
      workerId: `worker-${workerIndex}`,
      exitCode: hasFailure ? 1 : 0,
      duration,
    };
  }

  /**
   * Execute standard feature files in a single Playwright process.
   */
  async executeFeatureWorker(workerIndex, featureItems) {
    const workerId = `worker-${workerIndex}`;
    const startTime = Date.now();
    const totalScenarios = featureItems.reduce((sum, f) => sum + f.scenarioCount, 0);

    return new Promise((resolve, reject) => {
      const featurePaths = featureItems.map(f => f.path);
      const shardId = `shard-${workerIndex}`;
      const args = this.buildPlaywrightArgs(featurePaths, shardId);

      console.log(`[${workerId}] Starting: ${featureItems.length} features (${totalScenarios} scenarios)`);

      if (this.config.verbose) {
        console.log(`[${workerId}] Command: npx playwright test ${args.join(' ')}`);
      }

      const child = spawn('npx', ['playwright', 'test', ...args], {
        cwd: this.config.rootDir,
        env: {
          ...process.env,
          WORKER_INDEX: workerIndex.toString(),
          SHARD_INDEX: workerIndex.toString(),
          SHARD_ID: shardId,
          PARALLEL_MODE: 'feature',
        },
        stdio: this.config.verbose ? 'inherit' : 'pipe',
      });

      this.runningWorkers.set(workerId, child);
      let output = '';
      if (!this.config.verbose) {
        child.stdout?.on('data', (data) => { output += data.toString(); });
        child.stderr?.on('data', (data) => { output += data.toString(); });
      }

      child.on('close', (exitCode) => {
        const duration = Date.now() - startTime;
        const durationSec = (duration / 1000).toFixed(2);
        this.runningWorkers.delete(workerId);
        this.completedWorkers.set(workerId, { exitCode, duration, output });

        if (exitCode === 0) {
          console.log(`[${workerId}] Completed in ${durationSec}s`);
        } else {
          console.log(`[${workerId}] Failed (exit ${exitCode}) after ${durationSec}s`);
          if (!this.config.verbose && output) {
            console.log(`[${workerId}] Output:\n${output.slice(-2000)}`);
          }
        }

        resolve({ workerId, exitCode, duration, output });
      });

      child.on('error', (error) => {
        console.error(`[${workerId}] Error:`, error.message);
        reject(error);
      });
    });
  }

  /**
   * Execute a split tag group as a separate Playwright process.
   * Uses TEST_TAGS + FEATURE_PATHS + unique SHARD_ID for bddgen isolation.
   */
  async executeSplitGroupWorker(workerIndex, splitItem) {
    const workerId = `worker-${workerIndex}-split-${splitItem.featureName}-g${splitItem.groupIndex}`;
    const shardId = `split-${splitItem.featureName}-group${splitItem.groupIndex}`;
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const args = [
        'playwright', 'test',
        '--reporter=blob',
        '--workers=1',
        '--pass-with-no-tests',
      ];

      if (this.config.retries) args.push(`--retries=${this.config.retries}`);
      if (this.config.timeout) args.push(`--timeout=${this.config.timeout}`);
      if (!this.config.headless) args.push('--headed');

      const childEnv = {
        ...process.env,
        TEST_TAGS: splitItem.tagExpression,
        FEATURE_PATHS: splitItem.featurePath,
        SHARD_ID: shardId,
        PARALLEL_MODE: 'feature',
        WORKERS: '1',
      };

      console.log(`[${workerId}] Starting: tags="${splitItem.tagExpression}" (~${splitItem.scenarioCount} scenarios)`);

      if (this.config.verbose) {
        console.log(`[${workerId}] TEST_TAGS="${splitItem.tagExpression}"`);
        console.log(`[${workerId}] FEATURE_PATHS="${splitItem.featurePath}"`);
        console.log(`[${workerId}] SHARD_ID="${shardId}"`);
      }

      const child = spawn('npx', args, {
        cwd: this.config.rootDir,
        env: childEnv,
        stdio: this.config.verbose ? 'inherit' : 'pipe',
      });

      this.runningWorkers.set(workerId, child);
      let output = '';
      if (!this.config.verbose) {
        child.stdout?.on('data', (data) => { output += data.toString(); });
        child.stderr?.on('data', (data) => { output += data.toString(); });
      }

      child.on('close', (exitCode) => {
        const duration = Date.now() - startTime;
        const durationSec = (duration / 1000).toFixed(2);
        this.runningWorkers.delete(workerId);

        if (exitCode === 0) {
          console.log(`[${workerId}] Completed in ${durationSec}s`);
        } else {
          console.log(`[${workerId}] Failed (exit ${exitCode}) after ${durationSec}s`);
          if (!this.config.verbose && output) {
            console.log(`[${workerId}] Output:\n${output.slice(-2000)}`);
          }
        }

        resolve({ workerId, exitCode, duration, output });
      });

      child.on('error', (error) => {
        console.error(`[${workerId}] Error:`, error.message);
        reject(error);
      });
    });
  }

  /**
   * Build Playwright CLI arguments for standard feature execution.
   */
  buildPlaywrightArgs(featurePaths, shardId) {
    const args = [];

    // Feature files to test (passed via FEATURE_PATHS env var instead)
    // We set FEATURE_PATHS so playwright.config.ts picks them up through defineBddConfig

    // Blob reporter for merging
    args.push('--reporter=blob');

    // Configuration
    if (this.config.retries) {
      args.push(`--retries=${this.config.retries}`);
    }

    if (this.config.timeout) {
      args.push(`--timeout=${this.config.timeout}`);
    }

    if (!this.config.headless) {
      args.push('--headed');
    }

    // Single worker per process (we're handling parallelism at process level)
    args.push('--workers=1');

    return args;
  }

  /**
   * Kill all running workers
   */
  killAll() {
    console.log('\nTerminating all workers...');

    for (const [workerId, child] of this.runningWorkers) {
      console.log(`Killing ${workerId}...`);
      child.kill('SIGTERM');
    }

    this.runningWorkers.clear();
  }
}

// ============================================================================
// Main Execution
// ============================================================================

class ShardedTestRunner {
  constructor(config) {
    this.config = config;
    this.executor = new WorkerExecutor(config);
  }

  async run() {
    console.log('Playwright + Cucumber Feature-Level Sharding Runner');
    if (this.config.isHybridMode) {
      console.log('(Hybrid Mode: feature sharding + scenario splitting)\n');
    } else {
      console.log('(Standard Mode: feature-level sharding)\n');
    }
    this.printConfig();

    try {
      // Step 1: Discover features
      const allFeatures = await this.discoverFeatures();
      console.log(`\nDiscovered ${allFeatures.length} feature files`);

      if (allFeatures.length === 0 && !this.config.isHybridMode) {
        console.log('No features found matching criteria');
        return false;
      }

      // Step 2: Filter by tags
      const filteredFeatures = this.filterByTags(allFeatures);
      console.log(`Filtered to ${filteredFeatures.length} features (tag: ${this.config.tags || 'none'})`);

      // Step 3: Hybrid or standard sharding
      let shards;

      if (this.config.isHybridMode) {
        shards = this.buildHybridShards(filteredFeatures);
      } else {
        if (filteredFeatures.length === 0) {
          console.log('No features match tag filter');
          return false;
        }

        shards = FeatureSharder.distributeFeatures(
          filteredFeatures,
          Math.min(this.config.workers, filteredFeatures.length)
        );
        FeatureSharder.printDistribution(shards);
      }

      // Dry run - just show plan
      if (this.config.dryRun) {
        console.log('Dry run mode - showing execution plan only\n');
        this.printShardDetails(shards);
        return true;
      }

      // Step 4: Execute all shards in parallel
      const success = await this.executor.executeShards(shards);

      return success;

    } catch (error) {
      console.error('\nFatal error:', error.message);
      if (this.config.verbose) {
        console.error(error.stack);
      }
      return false;
    }
  }

  /**
   * Build hybrid shards: remove split features from normal pool,
   * create virtual work items for tag groups, distribute together.
   */
  buildHybridShards(filteredFeatures) {
    // Resolve split feature paths to absolute
    const splitAbsPaths = new Set();
    for (const featurePath of this.config.splitConfig.keys()) {
      const absPath = path.isAbsolute(featurePath)
        ? featurePath
        : path.join(this.config.rootDir, featurePath);
      splitAbsPaths.add(absPath);
    }

    // Remove split features from the normal pool
    const normalFeatures = filteredFeatures.filter(f => !splitAbsPaths.has(f.path));

    const removedCount = filteredFeatures.length - normalFeatures.length;
    if (removedCount > 0) {
      console.log(`Removed ${removedCount} feature(s) from normal pool (will be split by tags)`);
    }

    // Build unified work items
    const workItems = FeatureSharder.buildHybridWorkItems(
      normalFeatures,
      this.config.splitConfig,
      this.config.rootDir
    );

    const workerCount = Math.min(this.config.workers, workItems.length);
    console.log(`Total work items: ${workItems.length} (${normalFeatures.length} features + ${workItems.length - normalFeatures.length} split groups)`);

    const shards = FeatureSharder.distributeWorkItems(workItems, workerCount);
    FeatureSharder.printHybridDistribution(shards, this.config.rootDir);

    return shards;
  }

  /**
   * Discover all feature files matching the glob pattern
   */
  async discoverFeatures() {
    const pattern = path.join(this.config.rootDir, this.config.getFeatureGlob());

    return new Promise((resolve, reject) => {
      glob(pattern, (err, files) => {
        if (err) {
          reject(err);
          return;
        }

        // Analyze each feature file
        const features = files
          .map(file => FeatureAnalyzer.analyzeFeature(file))
          .filter(f => f !== null);

        resolve(features);
      });
    });
  }

  /**
   * Filter features by tag expression
   */
  filterByTags(features) {
    if (!this.config.tags) {
      return features;
    }

    return features.filter(feature =>
      FeatureAnalyzer.matchesTagExpression(feature.tags, this.config.tags)
    );
  }

  /**
   * Print configuration
   */
  printConfig() {
    console.log('Configuration:');
    console.log(`  Workers:      ${this.config.workers}`);
    console.log(`  Tags:         ${this.config.tags || '(none)'}`);
    console.log(`  Team:         ${this.config.team || '(all teams)'}`);
    console.log(`  Features:     ${this.config.getFeatureGlob()}`);
    console.log(`  Retries:      ${this.config.retries}`);
    console.log(`  Headless:     ${this.config.headless}`);
    console.log(`  Report Dir:   ${this.config.reportDir}`);
    console.log(`  Dry Run:      ${this.config.dryRun}`);

    if (this.config.isHybridMode) {
      console.log(`  Split Features:`);
      for (const [featurePath, tagGroups] of this.config.splitConfig) {
        console.log(`    ${featurePath} -> ${tagGroups.length} tag groups`);
        tagGroups.forEach((g, i) => console.log(`      Group ${i}: ${g}`));
      }
    }
  }

  /**
   * Print detailed shard information (for dry run)
   */
  printShardDetails(shards) {
    shards.forEach((shard, index) => {
      const items = shard.items || [];
      if (items.length === 0) return;

      console.log(`\n${'-'.repeat(80)}`);
      console.log(`Shard ${index + 1} (${shard.totalScenarios} scenarios):`);
      console.log(`${'-'.repeat(80)}`);

      items.forEach((item, i) => {
        if (item.type === 'feature') {
          const relPath = path.relative(this.config.rootDir, item.path);
          console.log(`  ${i + 1}. [FEATURE] ${relPath} (${item.scenarioCount} scenarios)`);
          if (this.config.verbose && item.tags?.length > 0) {
            console.log(`     Tags: ${item.tags.join(', ')}`);
          }
        } else if (item.type === 'split-group') {
          console.log(`  ${i + 1}. [SPLIT]   ${item.featureName} group ${item.groupIndex} (~${item.scenarioCount} scenarios)`);
          console.log(`     Tags: ${item.tagExpression}`);
        }
      });
    });
    console.log(`\n${'='.repeat(80)}\n`);
  }
}

// ============================================================================
// Entry Point
// ============================================================================

async function main() {
  const config = new Config();
  const runner = new ShardedTestRunner(config);

  // Handle Ctrl+C gracefully
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

  // Run the sharded test execution
  const success = await runner.run();

  if (success) {
    console.log('\nAll workers completed successfully');
    console.log('\nNext step: Merge reports with:');
    console.log(`   node scripts/merge-reports.js\n`);
    process.exit(0);
  } else {
    console.log('\nSome workers failed');
    console.log('\nTo view failures and generate rerun file:');
    console.log(`   node scripts/merge-reports.js --capture-failures\n`);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { ShardedTestRunner, Config, FeatureAnalyzer, FeatureSharder };

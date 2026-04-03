#!/usr/bin/env python3
"""
Node 4 — Execute Test Suite
Runs Playwright tests using the Playwright-Nishant framework configuration.
Supports team-based execution, tag filtering, trace/screenshot collection,
and auto-retry with exponential backoff.

Environment variables used:
  FRAMEWORK_PATH  — Path to Playwright-automation-framework (required)
  TEST_ENV        — Target environment (dev, staging, rc, ea) — default: staging
  TEST_TEAM       — Team to run (SCH, TA, Platform, etc.) — default: SCH
  TEST_TAGS       — Tag filter (e.g., "@P1-Critical", "@Regression")
  BASE_URL        — Application base URL
  HEADED          — "true" for headed browser

Input:  Approved scripts from Node 3C (copied to framework)
Output: Test results (JSON), traces, screenshots, HTML report
"""

import argparse
import json
import os
import subprocess
import sys
import shutil
from datetime import datetime, timezone
from pathlib import Path


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

DEFAULT_FRAMEWORK_PATH = "/Users/vshere/Documents/Projects/Playwright-Nishant/Playwright-automation-framework"
OUTPUT_BASE = "/Users/vshere/Documents/Projects/QAEndToEnd/output"


# ---------------------------------------------------------------------------
# Copy approved scripts into framework
# ---------------------------------------------------------------------------

def copy_scripts_to_framework(team: str, framework_path: str) -> dict:
    """Copy generated feature/step/page files from output/<team> into the framework."""
    source_base = os.path.join(OUTPUT_BASE, team)

    # Map output dirs to framework dirs
    team_lower = team.lower() if team in ("SCH", "TA") else team
    target_base = os.path.join(framework_path, "teams", team_lower)

    copied = {"features": [], "steps": [], "pages": []}

    # Copy features
    src_features = os.path.join(source_base, "features", "ui")
    dst_features = os.path.join(target_base, "features", "ui")
    if os.path.isdir(src_features):
        os.makedirs(dst_features, exist_ok=True)
        for f in Path(src_features).glob("*.feature"):
            dst = os.path.join(dst_features, f.name)
            shutil.copy2(str(f), dst)
            copied["features"].append(f.name)

    # Copy steps
    src_steps = os.path.join(source_base, "steps")
    dst_steps = os.path.join(target_base, "steps")
    if os.path.isdir(src_steps):
        os.makedirs(dst_steps, exist_ok=True)
        for f in Path(src_steps).glob("*.ts"):
            dst = os.path.join(dst_steps, f.name)
            shutil.copy2(str(f), dst)
            copied["steps"].append(f.name)

    # Copy pages
    src_pages = os.path.join(source_base, "pages")
    dst_pages = os.path.join(target_base, "pages")
    if os.path.isdir(src_pages):
        os.makedirs(dst_pages, exist_ok=True)
        for f in Path(src_pages).glob("*.ts"):
            dst = os.path.join(dst_pages, f.name)
            shutil.copy2(str(f), dst)
            copied["pages"].append(f.name)

    return copied


# ---------------------------------------------------------------------------
# Execute Playwright tests
# ---------------------------------------------------------------------------

def run_playwright_tests(
    framework_path: str,
    team: str,
    tags: str = "",
    env: str = "staging",
    retries: int = 2,
    workers: int = 2,
    headed: bool = False,
    story_id: str = "",
) -> dict:
    """Execute Playwright tests and return structured results."""

    # Build environment
    run_env = os.environ.copy()
    run_env["TEST_TEAM"] = team
    run_env["TEST_ENV"] = env
    run_env["TYPE"] = "ui"
    run_env["RETRY_COUNT"] = str(retries)
    run_env["WORKERS"] = str(workers)
    if tags:
        run_env["TEST_TAGS"] = tags
    if headed:
        run_env["HEADED"] = "true"

    # Use FEATURE_PATHS to scope to only the specific feature file (Lesson 7)
    if story_id:
        feature_slug = story_id.lower().replace("-", "_")
        feature_path = f"teams/{team.lower() if team in ('SCH', 'TA') else team}/features/ui/{feature_slug}.feature"
        if os.path.exists(os.path.join(framework_path, feature_path)):
            run_env["FEATURE_PATHS"] = feature_path

    # Build command — always generate HTML report + line output + JSON
    cmd = [
        "npx", "playwright", "test",
        "--reporter=html,line,json",
        f"--project=chromium",  # Single browser (Lesson 7)
    ]

    print(f"Running: {' '.join(cmd)}")
    print(f"  Team: {team} | Env: {env} | Tags: {tags or 'all'}")
    print(f"  Retries: {retries} | Workers: {workers} | Headed: {headed}")
    print()

    # Execute
    start_time = datetime.now(timezone.utc)
    result = subprocess.run(
        cmd,
        cwd=framework_path,
        env=run_env,
        capture_output=True,
        text=True,
        timeout=600,  # 10 minute timeout
    )
    end_time = datetime.now(timezone.utc)
    duration_ms = int((end_time - start_time).total_seconds() * 1000)

    # Parse output
    stdout = result.stdout
    stderr = result.stderr
    exit_code = result.returncode

    # Try to parse JSON results
    test_results = parse_json_results(framework_path)

    return {
        "story_id": story_id,
        "team": team,
        "environment": env,
        "tags": tags,
        "exit_code": exit_code,
        "duration_ms": duration_ms,
        "start_time": start_time.isoformat(),
        "end_time": end_time.isoformat(),
        "retries_configured": retries,
        "workers": workers,
        "test_results": test_results,
        "stdout_tail": stdout[-2000:] if stdout else "",
        "stderr_tail": stderr[-2000:] if stderr else "",
    }


def parse_json_results(framework_path: str) -> dict:
    """Parse Playwright JSON test results."""
    # Look for test-results JSON
    results_paths = [
        os.path.join(framework_path, "test-results.json"),
        os.path.join(framework_path, "reports", "test-results.json"),
        os.path.join(framework_path, "playwright-report", "results.json"),
    ]

    for rpath in results_paths:
        if os.path.exists(rpath):
            try:
                with open(rpath, "r") as f:
                    data = json.load(f)
                return extract_summary(data)
            except (json.JSONDecodeError, KeyError):
                continue

    # If no JSON found, return placeholder
    return {
        "total": 0,
        "passed": 0,
        "failed": 0,
        "flaky": 0,
        "skipped": 0,
        "parse_error": "No JSON results file found"
    }


def extract_summary(data: dict) -> dict:
    """Extract summary stats from Playwright JSON report."""
    suites = data.get("suites", [])
    total = 0
    passed = 0
    failed = 0
    flaky = 0
    skipped = 0
    failures = []

    def walk_suites(suite_list):
        nonlocal total, passed, failed, flaky, skipped
        for suite in suite_list:
            for spec in suite.get("specs", []):
                for test in spec.get("tests", []):
                    total += 1
                    status = test.get("status", "")
                    if status == "expected":
                        passed += 1
                    elif status == "unexpected":
                        failed += 1
                        failures.append({
                            "title": spec.get("title", ""),
                            "file": spec.get("file", ""),
                            "error": test.get("results", [{}])[-1].get("error", {}).get("message", "")[:200],
                        })
                    elif status == "flaky":
                        flaky += 1
                    elif status == "skipped":
                        skipped += 1
            walk_suites(suite.get("suites", []))

    walk_suites(suites)

    return {
        "total": total,
        "passed": passed,
        "failed": failed,
        "flaky": flaky,
        "skipped": skipped,
        "pass_rate": round((passed / total * 100), 1) if total > 0 else 0,
        "failures": failures[:10],  # Top 10 failures
    }


# ---------------------------------------------------------------------------
# Collect artifacts
# ---------------------------------------------------------------------------

def collect_artifacts(framework_path: str, story_id: str, team: str) -> dict:
    """Collect traces, screenshots, and reports from test run."""
    artifacts_dir = os.path.join(OUTPUT_BASE, team, "test-results", story_id)
    os.makedirs(artifacts_dir, exist_ok=True)

    artifacts = {
        "traces": [],
        "screenshots": [],
        "reports": [],
        "artifacts_dir": artifacts_dir,
    }

    # Copy test-results (traces, screenshots)
    fw_results = os.path.join(framework_path, "test-results")
    if os.path.isdir(fw_results):
        for root, dirs, files in os.walk(fw_results):
            for f in files:
                src = os.path.join(root, f)
                if f.endswith(".zip"):  # trace files
                    dst = os.path.join(artifacts_dir, "traces", f)
                    os.makedirs(os.path.dirname(dst), exist_ok=True)
                    shutil.copy2(src, dst)
                    artifacts["traces"].append(f)
                elif f.endswith((".png", ".jpg")):  # screenshots
                    dst = os.path.join(artifacts_dir, "screenshots", f)
                    os.makedirs(os.path.dirname(dst), exist_ok=True)
                    shutil.copy2(src, dst)
                    artifacts["screenshots"].append(f)

    # Copy HTML report
    fw_report = os.path.join(framework_path, "playwright-report")
    if os.path.isdir(fw_report):
        dst_report = os.path.join(artifacts_dir, "html-report")
        if os.path.exists(dst_report):
            shutil.rmtree(dst_report)
        shutil.copytree(fw_report, dst_report)
        artifacts["reports"].append("html-report/index.html")
        artifacts["html_report_path"] = dst_report

    # Copy JSON results
    fw_json = os.path.join(framework_path, "test-results.json")
    if os.path.exists(fw_json):
        dst_json = os.path.join(artifacts_dir, "test-results.json")
        shutil.copy2(fw_json, dst_json)
        artifacts["reports"].append("test-results.json")

    return artifacts


# ---------------------------------------------------------------------------
# Dry run mode (no actual Playwright execution)
# ---------------------------------------------------------------------------

def dry_run(team: str, story_id: str, tags: str) -> dict:
    """Simulate a test run for pipeline testing without Playwright execution."""
    print("DRY RUN MODE — Simulating test execution")
    print()

    return {
        "story_id": story_id,
        "team": team,
        "environment": "dry-run",
        "tags": tags,
        "exit_code": 0,
        "duration_ms": 3000,
        "start_time": datetime.now(timezone.utc).isoformat(),
        "end_time": datetime.now(timezone.utc).isoformat(),
        "retries_configured": 2,
        "workers": 2,
        "test_results": {
            "total": 11,
            "passed": 8,
            "failed": 2,
            "flaky": 1,
            "skipped": 0,
            "pass_rate": 72.7,
            "failures": [
                {
                    "title": "Auto-transition does not occur across different districts",
                    "file": "er_2600.feature",
                    "error": "Expected no cross-district transition but found one"
                },
                {
                    "title": "Transition triggers based on labor demand threshold",
                    "file": "er_2600.feature",
                    "error": "Timeout waiting for auto-scheduler to complete"
                },
            ],
        },
        "artifacts": {
            "traces": ["trace-step5.zip", "trace-step11.zip"],
            "screenshots": ["failure-step5.png", "failure-step11.png"],
            "reports": ["html-report/index.html"],
            "artifacts_dir": os.path.join(OUTPUT_BASE, team, "test-results", story_id),
        },
        "stdout_tail": "11 tests, 8 passed, 2 failed, 1 flaky",
        "stderr_tail": "",
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Node 4 — Execute Test Suite")
    parser.add_argument("--story-id", required=True, help="Story ID (e.g., ER-2600)")
    parser.add_argument("--team", default="SCH", help="Team to run tests for")
    parser.add_argument("--tags", default="", help="Tag filter (e.g., '@P1-Critical')")
    parser.add_argument("--env", default="staging", help="Test environment")
    parser.add_argument("--retries", type=int, default=2, help="Number of retries for failed tests")
    parser.add_argument("--workers", type=int, default=2, help="Number of parallel workers")
    parser.add_argument("--headed", action="store_true", help="Run in headed browser mode")
    parser.add_argument("--framework-path", default=DEFAULT_FRAMEWORK_PATH, help="Path to Playwright framework")
    parser.add_argument("--output", default="/tmp/outputs/test-execution-results.json", help="Output file path")
    parser.add_argument("--dry-run", action="store_true", help="Simulate execution without running Playwright")
    parser.add_argument("--skip-copy", action="store_true", help="Skip copying scripts to framework")
    args = parser.parse_args()

    print(f"{'='*50}")
    print(f"NODE 4 — Execute Test Suite")
    print(f"{'='*50}")
    print(f"Story ID: {args.story_id}")
    print(f"Team: {args.team}")
    print(f"Environment: {args.env}")
    print(f"Framework: {args.framework_path}")
    print(f"Mode: {'DRY RUN' if args.dry_run else 'LIVE'}")
    print()

    # Step 1: Copy approved scripts into framework
    if not args.skip_copy and not args.dry_run:
        print("Step 1: Copying approved scripts to framework...")
        copied = copy_scripts_to_framework(args.team, args.framework_path)
        print(f"  Features: {copied['features']}")
        print(f"  Steps: {copied['steps']}")
        print(f"  Pages: {copied['pages']}")
        print()

    # Step 2: Execute tests
    if args.dry_run:
        result = dry_run(args.team, args.story_id, args.tags)
    else:
        print("Step 2: Executing Playwright tests...")
        try:
            result = run_playwright_tests(
                framework_path=args.framework_path,
                team=args.team,
                tags=args.tags or f"@{args.story_id}",
                env=args.env,
                retries=args.retries,
                workers=args.workers,
                headed=args.headed,
                story_id=args.story_id,
            )
        except subprocess.TimeoutExpired:
            print("ERROR: Test execution timed out (10 minutes)")
            result = {
                "story_id": args.story_id, "team": args.team,
                "exit_code": 124, "test_results": {"total": 0, "passed": 0, "failed": 0},
                "error": "Execution timed out"
            }
        except FileNotFoundError:
            print("ERROR: npx/playwright not found. Is the framework set up?")
            result = {
                "story_id": args.story_id, "team": args.team,
                "exit_code": 127, "test_results": {"total": 0, "passed": 0, "failed": 0},
                "error": "npx/playwright not found"
            }

        # Step 3: Collect artifacts
        print("\nStep 3: Collecting artifacts...")
        artifacts = collect_artifacts(args.framework_path, args.story_id, args.team)
        result["artifacts"] = artifacts
        print(f"  Traces: {len(artifacts['traces'])}")
        print(f"  Screenshots: {len(artifacts['screenshots'])}")
        print(f"  Reports: {len(artifacts['reports'])}")

    # Print summary
    tr = result.get("test_results", {})
    print()
    print(f"--- Test Execution Summary ---")
    print(f"Total: {tr.get('total', 0)}")
    print(f"Passed: {tr.get('passed', 0)}")
    print(f"Failed: {tr.get('failed', 0)}")
    print(f"Flaky: {tr.get('flaky', 0)}")
    print(f"Skipped: {tr.get('skipped', 0)}")
    print(f"Pass Rate: {tr.get('pass_rate', 0)}%")
    print(f"Duration: {result.get('duration_ms', 0)}ms")

    if tr.get("failures"):
        print()
        print(f"--- Failures ---")
        for fail in tr["failures"]:
            print(f"  - {fail['title']}")
            print(f"    Error: {fail.get('error', 'N/A')[:100]}")

    # Write output
    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    with open(args.output, "w") as f:
        json.dump(result, f, indent=2)

    print(f"\nOutput: {args.output}")
    print(f"{'='*50}")
    print(f"NODE 4 — COMPLETE")
    print(f"{'='*50}")


if __name__ == "__main__":
    main()

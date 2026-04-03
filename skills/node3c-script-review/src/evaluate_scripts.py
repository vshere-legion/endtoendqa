#!/usr/bin/env python3
"""
Node 3C — Test Script Review Evaluation (Skill)
Reviews Playwright test scripts for locator quality, maintainability,
and adherence to the strict built-in locator priority rules.

Rejects scripts with banned locators and loops back to Node 3.
Max iterations: 3

Input:  .steps.ts and Page .ts files from Node 3
Output: Approved scripts or rejection with fix instructions
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path


# ---------------------------------------------------------------------------
# Built-in Playwright Locators (in priority order)
# ---------------------------------------------------------------------------

BUILTIN_LOCATORS = [
    "getByRole",
    "getByText",
    "getByLabel",
    "getByPlaceholder",
    "getByAltText",
    "getByTitle",
    "getByTestId",
]

# Allowed CSS patterns (semantic, not fragile)
ALLOWED_CSS_PATTERNS = [
    r"\.locator\('[.#]?[\w-]+'\)",           # Simple class/id
    r"\.locator\('\[data-[\w-]+=",           # data-* attributes
    r"\.locator\('[\w]+\[[\w-]+=",           # element[attr=val]
]

# Banned patterns
BANNED_PATTERNS = {
    "xpath": [
        (r"page\.locator\(['\"]//", "XPath selector detected"),
        (r"page\.locator\(['\"]xpath=", "Explicit XPath selector"),
        (r"\.xpath\(", "XPath method call"),
    ],
    "hardcoded_id": [
        (r"page\.locator\(['\"]#[a-zA-Z]+-\d+['\"]", "Hardcoded ID with number suffix"),
        (r"page\.locator\(['\"]#[a-z]+_[a-z]+_\d+", "Hardcoded ID with numeric suffix"),
    ],
    "fragile_selector": [
        (r"nth-child\(\d+\)", "Positional nth-child selector"),
        (r"nth-of-type\(\d+\)", "Positional nth-of-type selector"),
        (r"> div > div > div", "Deep nesting selector (3+ levels)"),
        (r"\.locator\(['\"]div\s*>\s*span\s*>\s*", "Fragile positional chain"),
    ],
    "hardcoded_wait": [
        (r"waitForTimeout\(\d+\)", "Hardcoded wait (use auto-waiting or waitForSelector)"),
        (r"page\.waitForTimeout", "Hardcoded timeout"),
        (r"setTimeout\(", "Manual setTimeout"),
    ],
    "hardcoded_value": [
        (r"page\.goto\(['\"]https?://(?!.*\{)", "Hardcoded URL (use env variable)"),
        (r"password\s*[:=]\s*['\"][^'\"]+['\"]", "Hardcoded password"),
    ],
}


# ---------------------------------------------------------------------------
# Evaluation Rules
# ---------------------------------------------------------------------------

def rule_locator_priority(content: str, filename: str) -> list:
    """Rule 1: Check locator usage follows built-in priority."""
    issues = []
    lines = content.split("\n")

    # Count locator usage
    builtin_count = 0
    css_count = 0
    total_locators = 0

    for i, line in enumerate(lines, 1):
        stripped = line.strip()

        # Count built-in locators
        for loc in BUILTIN_LOCATORS:
            count = stripped.count(loc)
            builtin_count += count
            total_locators += count

        # Count CSS locators (page.locator(...))
        css_matches = re.findall(r'\.locator\([\'"](?!//)', stripped)
        css_count += len(css_matches)
        total_locators += len(css_matches)

    # Flag ANY CSS selector usage — built-in locators should always be preferred
    if css_count > 0:
        # Find specific lines with CSS selectors
        for i, line in enumerate(lines, 1):
            if re.search(r'\.locator\([\'"](?!//)', line) and not line.strip().startswith("//"):
                css_match = re.search(r"\.locator\(['\"]([^'\"]+)['\"]", line)
                selector = css_match.group(1) if css_match else "unknown"
                issues.append({
                    "file": filename,
                    "line": i,
                    "rule": "css-selector-found",
                    "severity": "CRITICAL",
                    "current": f"CSS selector: `{selector}`",
                    "suggested": "Replace with getByRole(), getByText(), getByLabel(), getByPlaceholder(), getByAltText(), getByTitle(), or getByTestId()",
                    "message": f"CSS selector `{selector}` at line {i}. MUST use built-in Playwright locator instead."
                })

    return issues


def rule_banned_locators(content: str, filename: str) -> list:
    """Rule 2: Detect and reject banned locator patterns."""
    issues = []
    lines = content.split("\n")

    for category, patterns in BANNED_PATTERNS.items():
        for pattern, description in patterns:
            for i, line in enumerate(lines, 1):
                if re.search(pattern, line):
                    issues.append({
                        "file": filename,
                        "line": i,
                        "rule": f"banned-{category}",
                        "severity": "CRITICAL",
                        "current": line.strip()[:100],
                        "suggested": _suggest_replacement(category, line.strip()),
                        "message": f"{description} at line {i}"
                    })

    return issues


def _suggest_replacement(category: str, line: str) -> str:
    """Suggest a built-in locator replacement."""
    suggestions = {
        "xpath": "Use page.getByRole(), page.getByText(), or page.getByTestId() instead of XPath",
        "hardcoded_id": "Use page.getByTestId('semantic-name') or page.getByRole('button', { name: '...' })",
        "fragile_selector": "Use page.getByRole() or page.getByText() for resilient element selection",
        "hardcoded_wait": "Remove waitForTimeout. Use Playwright auto-waiting or page.waitForSelector()",
        "hardcoded_value": "Use environment variables or test fixtures for URLs and credentials",
    }
    return suggestions.get(category, "Replace with a built-in Playwright locator")


def rule_assertions(content: str, filename: str) -> list:
    """Rule 3: Every step with 'Then' should have an expect() assertion."""
    issues = []

    # Find Then step implementations
    then_blocks = re.finditer(
        r"Then\(['\"](.+?)['\"],\s*async\s*\([^)]*\)\s*=>\s*\{(.*?)\}\);",
        content, re.DOTALL
    )

    for match in then_blocks:
        step_name = match.group(1)[:60]
        body = match.group(2)

        if "expect(" not in body and "TODO" not in body:
            issues.append({
                "file": filename,
                "line": 0,
                "rule": "assertion-quality",
                "severity": "WARNING",
                "current": f"Then step '{step_name}' has no expect() assertion",
                "suggested": "Add expect(element).toBeVisible() or similar assertion",
                "message": f"Missing assertion in Then step: '{step_name}'"
            })

    return issues


def rule_test_structure(content: str, filename: str) -> list:
    """Rule 4: Check test structure conventions."""
    issues = []

    # Check for createBdd import
    if "createBdd" not in content:
        issues.append({
            "file": filename,
            "line": 0,
            "rule": "test-structure",
            "severity": "CRITICAL",
            "current": "Missing createBdd import",
            "suggested": "import { createBdd } from 'playwright-bdd';",
            "message": "Step file must import createBdd from playwright-bdd"
        })

    # Check for test fixtures import
    if "test-fixtures" not in content and "test, expect" not in content:
        issues.append({
            "file": filename,
            "line": 0,
            "rule": "test-structure",
            "severity": "WARNING",
            "current": "Missing test fixtures import",
            "suggested": "import { test, expect } from '../../../src/fixtures/test-fixtures';",
            "message": "Step file should import test fixtures"
        })

    # Check for Logger usage
    if "Logger" not in content:
        issues.append({
            "file": filename,
            "line": 0,
            "rule": "test-structure",
            "severity": "WARNING",
            "current": "No Logger usage found",
            "suggested": "Import and use Logger.step() for step logging",
            "message": "Step file should use Logger for step tracing"
        })

    return issues


def rule_page_object_structure(content: str, filename: str) -> list:
    """Rule 5: Check page object conventions."""
    issues = []

    if not filename.endswith("Page.ts"):
        return issues

    # Check extends BasePage
    if "extends BasePage" not in content:
        issues.append({
            "file": filename,
            "line": 0,
            "rule": "page-structure",
            "severity": "WARNING",
            "current": "Page object does not extend BasePage",
            "suggested": "export class MyPage extends BasePage {",
            "message": "Page objects should extend BasePage"
        })

    # Check for locators object pattern
    if "private readonly locators" not in content and "readonly locators" not in content:
        issues.append({
            "file": filename,
            "line": 0,
            "rule": "page-structure",
            "severity": "WARNING",
            "current": "No locators object found",
            "suggested": "private readonly locators = { ... }",
            "message": "Page objects should define locators in a structured object"
        })

    # Check for Page import
    if "import { Page" not in content and "import {Page" not in content:
        issues.append({
            "file": filename,
            "line": 0,
            "rule": "page-structure",
            "severity": "CRITICAL",
            "current": "Missing Playwright Page import",
            "suggested": "import { Page, Locator, expect } from '@playwright/test';",
            "message": "Page object must import Page from @playwright/test"
        })

    return issues


def rule_no_hardcoded_waits(content: str, filename: str) -> list:
    """Rule 6: No hardcoded waits — use Playwright auto-waiting."""
    issues = []
    lines = content.split("\n")

    for i, line in enumerate(lines, 1):
        if "waitForTimeout" in line and "// " not in line.split("waitForTimeout")[0]:
            issues.append({
                "file": filename,
                "line": i,
                "rule": "no-hardcoded-wait",
                "severity": "CRITICAL",
                "current": line.strip()[:100],
                "suggested": "Use page.waitForSelector(), page.waitForResponse(), or Playwright auto-waiting",
                "message": f"Hardcoded wait at line {i}. Use Playwright auto-waiting instead."
            })

    return issues


# ---------------------------------------------------------------------------
# Evaluator
# ---------------------------------------------------------------------------

def evaluate_file(filepath: str) -> dict:
    """Run all rules against a single TypeScript file."""
    filename = os.path.basename(filepath)
    with open(filepath, "r") as f:
        content = f.read()

    all_issues = []

    if filename.endswith(".steps.ts"):
        all_issues.extend(rule_locator_priority(content, filename))
        all_issues.extend(rule_banned_locators(content, filename))
        all_issues.extend(rule_assertions(content, filename))
        all_issues.extend(rule_test_structure(content, filename))
        all_issues.extend(rule_no_hardcoded_waits(content, filename))
    elif filename.endswith("Page.ts"):
        all_issues.extend(rule_locator_priority(content, filename))
        all_issues.extend(rule_banned_locators(content, filename))
        all_issues.extend(rule_page_object_structure(content, filename))
        all_issues.extend(rule_no_hardcoded_waits(content, filename))

    critical = [i for i in all_issues if i["severity"] == "CRITICAL"]
    warnings = [i for i in all_issues if i["severity"] == "WARNING"]

    # Locator stats
    stats = {loc: content.count(loc) for loc in BUILTIN_LOCATORS}
    stats["css_selector"] = len(re.findall(r'\.locator\([\'"](?!//)', content))
    stats["xpath"] = len(re.findall(r'\.locator\([\'"](?://|xpath=)', content))

    return {
        "file": filename,
        "path": filepath,
        "status": "REJECTED" if critical else "APPROVED",
        "critical_count": len(critical),
        "warning_count": len(warnings),
        "issues": all_issues,
        "locator_stats": stats,
    }


def evaluate_all(input_path: str) -> dict:
    """Evaluate all .ts files in a team output directory."""
    results = []

    if os.path.isfile(input_path):
        results.append(evaluate_file(input_path))
    elif os.path.isdir(input_path):
        # Scan steps/ and pages/ subdirectories
        for subdir in ["steps", "pages"]:
            dir_path = os.path.join(input_path, subdir)
            if os.path.isdir(dir_path):
                for fpath in sorted(Path(dir_path).glob("*.ts")):
                    results.append(evaluate_file(str(fpath)))
    else:
        print(f"ERROR: Path not found: {input_path}")
        sys.exit(1)

    if not results:
        print(f"ERROR: No .ts files found at {input_path}")
        sys.exit(1)

    total_critical = sum(r["critical_count"] for r in results)
    total_warnings = sum(r["warning_count"] for r in results)
    approved = [r for r in results if r["status"] == "APPROVED"]
    rejected = [r for r in results if r["status"] == "REJECTED"]

    # Aggregate locator stats
    agg_stats = {loc: 0 for loc in BUILTIN_LOCATORS}
    agg_stats["css_selector"] = 0
    agg_stats["xpath"] = 0
    for r in results:
        for k, v in r["locator_stats"].items():
            agg_stats[k] = agg_stats.get(k, 0) + v

    return {
        "status": "REJECTED" if rejected else "APPROVED",
        "files_reviewed": len(results),
        "approved_files": len(approved),
        "rejected_files": len(rejected),
        "total_critical": total_critical,
        "total_warnings": total_warnings,
        "locator_stats": agg_stats,
        "file_results": results,
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Node 3C — Test Script Review Evaluation")
    parser.add_argument("--input", required=True, help="Path to team output dir (e.g., output/SCH) or single .ts file")
    parser.add_argument("--output", default="/tmp/outputs/script-evaluation.json", help="Output file path")
    parser.add_argument("--iteration", type=int, default=1, help="Current iteration (max 3)")
    parser.add_argument("--max-iterations", type=int, default=3, help="Max allowed iterations")
    parser.add_argument("--mode", choices=["autonomous", "interactive"], default="autonomous",
                        help="autonomous = reject on CRITICAL; interactive = ask user for CSS/XPath approval")
    args = parser.parse_args()

    print(f"{'='*50}")
    print(f"NODE 3C — Script Review [SKILL]")
    print(f"{'='*50}")
    print(f"Input: {args.input}")
    print(f"Mode: {args.mode.upper()}")
    print(f"Iteration: {args.iteration}/{args.max_iterations}")
    print()

    # Run evaluation
    result = evaluate_all(args.input)
    result["iteration"] = args.iteration
    result["max_iterations"] = args.max_iterations
    result["mode"] = args.mode

    # Print results
    print(f"--- Evaluation Results ---")
    for fr in result["file_results"]:
        icon = "PASS" if fr["status"] == "APPROVED" else "FAIL"
        print(f"  [{icon}] {fr['file']} — {fr['critical_count']} critical, {fr['warning_count']} warnings")
        for issue in fr["issues"]:
            sev = "BLOCK" if issue["severity"] == "CRITICAL" else "WARN "
            print(f"    [{sev}] {issue['rule']}: {issue['message']}")
            if issue.get("suggested"):
                print(f"           Suggested: {issue['suggested']}")

    # Locator summary
    ls = result["locator_stats"]
    print()
    print(f"--- Locator Stats ---")
    for loc in BUILTIN_LOCATORS:
        count = ls.get(loc, 0)
        if count > 0:
            print(f"  {loc}: {count}")
    print(f"  CSS selectors: {ls.get('css_selector', 0)}")
    print(f"  XPath: {ls.get('xpath', 0)}")

    print()
    print(f"Files reviewed: {result['files_reviewed']}")
    print(f"Approved: {result['approved_files']} | Rejected: {result['rejected_files']}")
    print(f"Critical: {result['total_critical']} | Warnings: {result['total_warnings']}")
    print(f"Gate Status: {result['status']}")

    # Interactive mode: ask user about CSS/XPath if found
    if args.mode == "interactive" and ls.get("css_selector", 0) > 0:
        print()
        print(f"INTERACTIVE MODE — {ls['css_selector']} CSS selector(s) found.")
        print("Unable to find built-in Playwright locators for some elements.")
        user_input = input("Is it OK to use CSS selectors as fallback? (yes/no): ").strip().lower()
        if user_input in ("yes", "y"):
            # Downgrade CSS-related criticals to warnings
            for fr in result["file_results"]:
                for issue in fr["issues"]:
                    if "css" in issue["rule"].lower() and issue["severity"] == "CRITICAL":
                        issue["severity"] = "WARNING"
                        issue["message"] += " (user-approved fallback)"
                fr["critical_count"] = len([i for i in fr["issues"] if i["severity"] == "CRITICAL"])
                fr["status"] = "REJECTED" if fr["critical_count"] > 0 else "APPROVED"
            result["status"] = "REJECTED" if any(fr["status"] == "REJECTED" for fr in result["file_results"]) else "APPROVED"
            print("CSS selectors approved by user.")

    # Write output
    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    with open(args.output, "w") as f:
        json.dump(result, f, indent=2)

    print(f"\nOutput: {args.output}")
    print(f"{'='*50}")

    if result["status"] == "APPROVED":
        print(f"APPROVED — Proceeding to Node 4 (Execute Test Suite)")
    elif args.iteration >= args.max_iterations:
        print(f"BLOCKED — Max iterations ({args.max_iterations}) reached.")
        print(f"Escalating to #qa-end-to-end-vikas for manual review.")
        sys.exit(1)
    else:
        print(f"REJECTED — Returning fix instructions to Node 3 (iteration {args.iteration + 1}/{args.max_iterations})")
        sys.exit(1)

    print(f"{'='*50}")


if __name__ == "__main__":
    main()

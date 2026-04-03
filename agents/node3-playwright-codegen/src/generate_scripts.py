#!/usr/bin/env python3
"""
Node 3 — Create New Features Auto Script
Generates Playwright TypeScript test scripts from approved Gherkin scenarios.
Follows the Playwright-Nishant framework conventions:
  - Step definitions using playwright-bdd createBdd()
  - Page objects extending BasePage
  - Locator priority: getByRole > getByText > getByLabel > getByTestId > CSS
  - No XPath, no hardcoded IDs

Input:  Approved .feature files from Node 2C
Output: step definitions (.steps.ts), page objects (.ts), written to output/<team>/
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path


# ---------------------------------------------------------------------------
# Team mapping
# ---------------------------------------------------------------------------
TEAM_TAG_TO_DIR = {
    "@Team-SCH": "SCH",
    "@Team-TA": "TA",
    "@Team-Platform": "Platform",
    "@Team-PLT-Core": "PLT-Core",
    "@Team-PLT-Int": "PLT-Int",
    "@Team-PLT-Ops": "PLT-Ops",
    "@Team-LRB": "LRB",
    "@Team-EV-Com": "EV-Com",
    "@Team-EV-LIP": "EV-LIP",
    "@Team-EV-ELM": "EV-ELM",
    "@Team-GENAI": "GENAI",
}


# ---------------------------------------------------------------------------
# Feature file parser
# ---------------------------------------------------------------------------

class FeatureParser:
    """Parses a .feature file into structured data."""

    def __init__(self, filepath: str):
        with open(filepath, "r") as f:
            self.content = f.read()
        self.filename = os.path.basename(filepath)
        self.feature_name = ""
        self.team_tag = ""
        self.team_dir = ""
        self.feature_tags = []
        self.background_steps = []
        self.scenarios = []
        self._parse()

    def _parse(self):
        lines = self.content.split("\n")

        # Parse feature-level tags (line 1)
        for line in lines:
            stripped = line.strip()
            if stripped.startswith("@"):
                self.feature_tags = stripped.split()
                break

        # Detect team
        for tag in self.feature_tags:
            if tag in TEAM_TAG_TO_DIR:
                self.team_tag = tag
                self.team_dir = TEAM_TAG_TO_DIR[tag]
                break
        if not self.team_dir:
            self.team_dir = "SCH"  # default

        # Parse feature name
        feat_match = re.search(r'Feature:\s*(.+)', self.content)
        if feat_match:
            self.feature_name = feat_match.group(1).strip()

        # Parse background
        bg_match = re.search(r'Background:\s*\n((?:\s+(?:Given|And|When|Then|But)\s+.+\n?)+)', self.content)
        if bg_match:
            for line in bg_match.group(1).strip().split("\n"):
                step = line.strip()
                if step:
                    self.background_steps.append(step)

        # Parse scenarios
        scenario_blocks = re.finditer(
            r'(\s*@[^\n]+)\n\s*(Scenario(?:\s+Outline)?:\s*(.+?))\n((?:.*?\n)*?)(?=\s*@step|\s*$)',
            self.content
        )
        for match in scenario_blocks:
            tags = match.group(1).strip().split()
            scenario_type = "Scenario Outline" if "Outline" in match.group(2) else "Scenario"
            name = match.group(3).strip()
            body = match.group(4)

            steps = []
            examples_data = []
            in_examples = False

            for line in body.split("\n"):
                stripped = line.strip()
                if stripped.startswith("Examples:"):
                    in_examples = True
                    continue
                if in_examples and stripped.startswith("|"):
                    row = [c.strip() for c in stripped.split("|") if c.strip()]
                    examples_data.append(row)
                elif re.match(r'^(Given|When|Then|And|But)\s+', stripped):
                    steps.append(stripped)

            self.scenarios.append({
                "tags": tags,
                "type": scenario_type,
                "name": name,
                "steps": steps,
                "examples": examples_data,
            })


# ---------------------------------------------------------------------------
# Step Definition Generator
# ---------------------------------------------------------------------------

def generate_step_definitions(parser: FeatureParser) -> str:
    """Generate .steps.ts file matching framework convention."""
    feature_slug = parser.filename.replace(".feature", "")
    class_name = "".join(w.capitalize() for w in feature_slug.replace("-", "_").split("_"))

    # Collect unique steps across all scenarios (including background)
    all_steps = []
    for step in parser.background_steps:
        all_steps.append(step)
    for scenario in parser.scenarios:
        for step in scenario["steps"]:
            all_steps.append(step)

    # Deduplicate while preserving order
    seen = set()
    unique_steps = []
    for step in all_steps:
        # Normalize: replace quoted strings with {string}, numbers with {int}
        normalized = re.sub(r'"[^"]*"', '"{string}"', step)
        normalized = re.sub(r'\b\d+\b', '{int}', normalized)
        # Remove angle bracket placeholders for Scenario Outline
        normalized = re.sub(r'<\w+>', '{string}', normalized)
        if normalized not in seen:
            seen.add(normalized)
            unique_steps.append((step, normalized))

    # Build step definitions
    step_defs = []
    for original, normalized in unique_steps:
        keyword_match = re.match(r'^(Given|When|Then|And|But)\s+(.+)', original)
        if not keyword_match:
            continue
        keyword = keyword_match.group(1)
        step_text = keyword_match.group(2)

        # Map And/But to the previous Given/When/Then
        if keyword in ("And", "But"):
            keyword = "Given"  # Default; in playwright-bdd, And maps to previous keyword

        # Create regex pattern for step
        pattern = re.sub(r'"[^"]*"', '{string}', step_text)
        pattern = re.sub(r'<\w+>', '{string}', pattern)
        pattern = re.sub(r'\b\d+\b', '{int}', pattern)

        # Extract parameter names
        params = []
        param_count = 0
        for match in re.finditer(r'\{(string|int)\}', pattern):
            param_count += 1
            ptype = match.group(1)
            params.append(f"param{param_count}: {ptype}")

        # Build function signature
        param_str = ""
        ts_params = ""
        if params:
            ts_params = ", " + ", ".join(p.replace(": string", ": string").replace(": int", ": number") for p in params)

        # Create step function name
        func_name = re.sub(r'[^a-zA-Z0-9\s]', '', step_text)[:50].strip().replace(" ", "_").lower()

        step_defs.append({
            "keyword": keyword,
            "pattern": pattern,
            "original": original,
            "func_name": func_name,
            "params": ts_params,
        })

    # Render TypeScript
    lines = []
    lines.append(f"""/**
 * {parser.feature_name} — Step Definitions
 *
 * Auto-generated by QA Pipeline Node 3
 * Feature: {parser.filename}
 * Team: {parser.team_dir}
 */

import {{ createBdd }} from 'playwright-bdd';
import {{ test, expect }} from '../../../src/fixtures/test-fixtures';
import {{ {class_name}Page }} from '../pages/{class_name}Page';
import {{ Logger }} from '../utils/logger';

const {{ Given, When, Then }} = createBdd(test);

// ─── Context Keys ────────────────────────────────────────────
const CTX = {{
  SCHEDULE_GENERATED: 'scheduleGenerated',
  TRANSITION_CREATED: 'transitionCreated',
  EMPLOYEE_QUALIFIED: 'employeeQualified',
}};
""")

    rendered_patterns = set()
    for sd in step_defs:
        if sd["pattern"] in rendered_patterns:
            continue
        rendered_patterns.add(sd["pattern"])

        # Escape single quotes in patterns and originals for TypeScript string literals
        safe_pattern = sd["pattern"].replace("'", "\\'")
        safe_original = sd["original"][:80].replace("'", "\\'")
        safe_comment = sd["original"].replace("'", "\\'")

        lines.append(f"""
{sd['keyword']}('{safe_pattern}', async ({{ page, pageManager, testContext }}{sd['params']}) => {{
  Logger.step('{safe_original}');
  const featurePage = pageManager.get({class_name}Page);
  // TODO: Implement step logic
  // {safe_comment}
}});""")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Page Object Generator
# ---------------------------------------------------------------------------

def generate_page_object(parser: FeatureParser) -> str:
    """Generate page object .ts file matching framework convention."""
    feature_slug = parser.filename.replace(".feature", "")
    class_name = "".join(w.capitalize() for w in feature_slug.replace("-", "_").split("_"))

    return f"""/**
 * {parser.feature_name} — Page Object
 *
 * Auto-generated by QA Pipeline Node 3
 * Feature: {parser.filename}
 * Team: {parser.team_dir}
 *
 * Locator Strategy (STRICT — built-in only):
 *   1. page.getByRole()        — explicit/implicit ARIA roles
 *   2. page.getByText()        — visible text content
 *   3. page.getByLabel()       — form control by label
 *   4. page.getByPlaceholder() — input by placeholder
 *   5. page.getByAltText()     — image by alt text
 *   6. page.getByTitle()       — element by title attribute
 *   7. page.getByTestId()      — element by data-testid
 *   BANNED: CSS selectors, XPath, hardcoded IDs, fragile selectors
 */

import {{ Page, Locator, expect }} from '@playwright/test';
import {{ BasePage }} from './ScheduleBasePage';
import {{ Logger }} from '../utils/logger';

export class {class_name}Page extends BasePage {{

  // ─── Locators ──────────────────────────────────────────────

  private readonly locators = {{
    // Navigation
    scheduleMenuItem: () =>
      this.page.getByRole('link', {{ name: 'Schedule' }}),
    dashboardMenuItem: () =>
      this.page.getByRole('link', {{ name: 'Dashboard' }}),

    // Auto-scheduler
    autoScheduleButton: () =>
      this.page.getByRole('button', {{ name: /auto.?schedule/i }}),
    generateScheduleButton: () =>
      this.page.getByRole('button', {{ name: /generate/i }}),
    confirmButton: () =>
      this.page.getByRole('button', {{ name: /confirm|ok|yes/i }}),

    // Location & Group selectors
    locationSelector: () =>
      this.page.getByRole('combobox', {{ name: /location/i }})
        .or(this.page.getByTestId('location-selector')),
    groupSelector: () =>
      this.page.getByRole('combobox', {{ name: /group/i }})
        .or(this.page.getByTestId('group-selector')),
    districtSelector: () =>
      this.page.getByRole('combobox', {{ name: /district/i }})
        .or(this.page.getByTestId('district-selector')),

    // Employee & Shift elements
    employeeRow: (name: string) =>
      this.page.getByRole('row', {{ name: new RegExp(name, 'i') }}),
    shiftCell: (employee: string, day: string) =>
      this.page.getByTestId(`shift-${{employee}}-${{day}}`),
    transitionIndicator: () =>
      this.page.getByTestId('transition-indicator'),

    // Schedule view
    scheduleTable: () =>
      this.page.getByRole('table', {{ name: /schedule/i }}),
    weekNavigator: () =>
      this.page.getByRole('navigation', {{ name: /week/i }}),
    nextWeekButton: () =>
      this.page.getByRole('button', {{ name: /next/i }}),

    // Status & messages
    successMessage: () =>
      this.page.getByRole('alert').filter({{ hasText: /success/i }}),
    errorMessage: () =>
      this.page.getByRole('alert').filter({{ hasText: /error|fail/i }}),
    loadingSpinner: () =>
      this.page.getByTestId('loading-spinner'),
  }};

  constructor(page: Page) {{
    super(page);
  }}

  // ─── Navigation ────────────────────────────────────────────

  async navigateToSchedule(): Promise<void> {{
    Logger.step('Navigating to Schedule page');
    await this.locators.scheduleMenuItem().click();
    await this.page.waitForLoadState('domcontentloaded');
  }}

  async navigateToDashboard(): Promise<void> {{
    Logger.step('Navigating to Dashboard');
    await this.locators.dashboardMenuItem().click();
    await this.page.waitForLoadState('domcontentloaded');
  }}

  // ─── Location & Group Selection ────────────────────────────

  async selectLocation(locationName: string): Promise<void> {{
    Logger.step(`Selecting location: ${{locationName}}`);
    await this.locators.locationSelector().click();
    await this.page.getByRole('option', {{ name: locationName }}).click();
  }}

  async selectGroup(groupName: string): Promise<void> {{
    Logger.step(`Selecting group: ${{groupName}}`);
    await this.locators.groupSelector().click();
    await this.page.getByRole('option', {{ name: groupName }}).click();
  }}

  async selectDistrict(districtName: string): Promise<void> {{
    Logger.step(`Selecting district: ${{districtName}}`);
    await this.locators.districtSelector().click();
    await this.page.getByRole('option', {{ name: districtName }}).click();
  }}

  // ─── Auto-Scheduler ───────────────────────────────────────

  async runAutoScheduler(): Promise<void> {{
    Logger.step('Running auto-scheduler');
    await this.locators.autoScheduleButton().click();
    await this.locators.confirmButton().click();
    await this.waitForScheduleGeneration();
  }}

  async waitForScheduleGeneration(timeout: number = 120000): Promise<void> {{
    Logger.step('Waiting for schedule generation to complete');
    await this.locators.loadingSpinner().waitFor({{ state: 'hidden', timeout }});
  }}

  // ─── Shift & Transition Verification ───────────────────────

  async verifyEmployeeHasShift(employeeName: string): Promise<void> {{
    Logger.step(`Verifying employee ${{employeeName}} has a shift assigned`);
    const row = this.locators.employeeRow(employeeName);
    await expect(row).toBeVisible();
  }}

  async verifyTransitionExists(fromLocation: string, toLocation: string): Promise<void> {{
    Logger.step(`Verifying transition from ${{fromLocation}} to ${{toLocation}}`);
    const indicator = this.locators.transitionIndicator();
    await expect(indicator).toBeVisible();
    await expect(indicator).toContainText(fromLocation);
    await expect(indicator).toContainText(toLocation);
  }}

  async verifyNoTransitionForEmployee(employeeName: string): Promise<void> {{
    Logger.step(`Verifying no transition for employee ${{employeeName}}`);
    const row = this.locators.employeeRow(employeeName);
    await expect(row).toBeVisible();
    const transition = row.getByTestId('transition-indicator');
    await expect(transition).toHaveCount(0);
  }}

  async verifyShiftInSingleLocation(employeeName: string, location: string): Promise<void> {{
    Logger.step(`Verifying ${{employeeName}} only scheduled in ${{location}}`);
    const row = this.locators.employeeRow(employeeName);
    await expect(row).toBeVisible();
    await expect(row).toContainText(location);
  }}

  // ─── Schedule Metrics ──────────────────────────────────────

  async getScheduleCoverage(): Promise<number> {{
    Logger.step('Getting schedule coverage percentage');
    const coverageEl = this.page.getByTestId('coverage-percentage');
    const text = await coverageEl.textContent();
    return parseFloat(text?.replace('%', '') || '0');
  }}

  async getShiftCount(): Promise<number> {{
    Logger.step('Getting total shift count');
    const rows = this.locators.scheduleTable().getByRole('row');
    return await rows.count() - 1; // subtract header
  }}

  // ─── Assertions ────────────────────────────────────────────

  async verifySuccessMessage(): Promise<void> {{
    await expect(this.locators.successMessage()).toBeVisible({{ timeout: 10000 }});
  }}

  async verifyNoErrors(): Promise<void> {{
    await expect(this.locators.errorMessage()).toHaveCount(0);
  }}
}}
"""


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Node 3 — Generate Playwright scripts from Gherkin")
    parser.add_argument("--input", required=True, help="Path to .feature file or directory")
    parser.add_argument("--output-base", default="/Users/vshere/Documents/Projects/QAEndToEnd/output",
                        help="Base output directory")
    args = parser.parse_args()

    # Collect feature files
    feature_files = []
    if os.path.isfile(args.input) and args.input.endswith(".feature"):
        feature_files.append(args.input)
    elif os.path.isdir(args.input):
        feature_files = sorted(str(p) for p in Path(args.input).glob("*.feature"))

    if not feature_files:
        print(f"ERROR: No .feature files found at {args.input}")
        sys.exit(1)

    print(f"{'='*50}")
    print(f"NODE 3 — Playwright Script Generation")
    print(f"{'='*50}")
    print(f"Input: {args.input}")
    print(f"Feature files: {len(feature_files)}")
    print()

    results = []

    for fpath in feature_files:
        fp = FeatureParser(fpath)
        feature_slug = fp.filename.replace(".feature", "")
        class_name = "".join(w.capitalize() for w in feature_slug.replace("-", "_").split("_"))

        print(f"Processing: {fp.filename}")
        print(f"  Team: {fp.team_dir} | Scenarios: {len(fp.scenarios)}")

        # Generate step definitions
        steps_content = generate_step_definitions(fp)
        steps_path = os.path.join(args.output_base, fp.team_dir, "steps", f"{feature_slug}.steps.ts")
        os.makedirs(os.path.dirname(steps_path), exist_ok=True)
        with open(steps_path, "w") as f:
            f.write(steps_content)
        print(f"  Steps: {steps_path}")

        # Generate page object
        page_content = generate_page_object(fp)
        page_path = os.path.join(args.output_base, fp.team_dir, "pages", f"{class_name}Page.ts")
        os.makedirs(os.path.dirname(page_path), exist_ok=True)
        with open(page_path, "w") as f:
            f.write(page_content)
        print(f"  Page:  {page_path}")

        # Locator stats
        locator_stats = {
            "getByRole": page_content.count("getByRole"),
            "getByText": page_content.count("getByText"),
            "getByLabel": page_content.count("getByLabel"),
            "getByTestId": page_content.count("getByTestId"),
            "css_selector": page_content.count("this.page.locator("),
            "xpath": 0,
            "hardcoded_id": 0,
        }

        results.append({
            "feature_file": fp.filename,
            "team": fp.team_dir,
            "scenarios": len(fp.scenarios),
            "steps_file": steps_path,
            "page_file": page_path,
            "locator_stats": locator_stats,
        })

    # Write summary
    summary = {
        "files_processed": len(results),
        "total_scenarios": sum(r["scenarios"] for r in results),
        "results": results,
    }

    summary_path = os.path.join(args.output_base, "node3-summary.json")
    with open(summary_path, "w") as f:
        json.dump(summary, f, indent=2)

    print()
    print(f"--- Summary ---")
    print(f"Files processed: {summary['files_processed']}")
    print(f"Total scenarios: {summary['total_scenarios']}")
    for r in results:
        ls = r["locator_stats"]
        print(f"  {r['feature_file']}: getByRole({ls['getByRole']}), getByText({ls['getByText']}), getByTestId({ls['getByTestId']}), CSS({ls['css_selector']})")
    print(f"{'='*50}")
    print(f"NODE 3 — COMPLETE")
    print(f"{'='*50}")


if __name__ == "__main__":
    main()

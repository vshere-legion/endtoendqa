#!/usr/bin/env python3
"""
Node 5 — Regression Impact Analysis Agent
Analyzes the story under test (from Node 1) and identifies impacted test cases
from the existing regression suite based on:
  - Component/feature area overlap
  - Tag matching (team, feature tags)
  - Keyword matching in scenario names and steps

Classifies impacted tests as automated (has .feature + .steps.ts) or manual.
Selects automated cases for targeted regression run.

Input:  Test execution results from Node 4 + requirements from Node 1
Output: Regression scope (impacted automated, impacted manual, coverage gaps)
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

FRAMEWORK_PATH = "/Users/vshere/Documents/Projects/Playwright-Nishant/Playwright-automation-framework"


# ---------------------------------------------------------------------------
# Build regression test inventory
# ---------------------------------------------------------------------------

def build_test_inventory(framework_path: str) -> list:
    """Scan the framework for all .feature files and build an inventory."""
    inventory = []
    teams_dir = os.path.join(framework_path, "teams")

    for feature_path in sorted(Path(teams_dir).rglob("*.feature")):
        rel_path = str(feature_path.relative_to(framework_path))
        content = feature_path.read_text()

        # Extract tags from first line
        tags = []
        for line in content.split("\n"):
            stripped = line.strip()
            if stripped.startswith("@"):
                tags = stripped.split()
                break

        # Extract feature name
        feat_match = re.search(r'Feature:\s*(.+)', content)
        feature_name = feat_match.group(1).strip() if feat_match else feature_path.stem

        # Extract team from path
        parts = rel_path.split("/")
        team = parts[1] if len(parts) > 1 else "unknown"

        # Extract scenario names
        scenarios = re.findall(r'Scenario(?:\s+Outline)?:\s*(.+)', content)

        # Extract keywords from scenarios and steps
        keywords = set()
        for word in re.findall(r'\b[a-z]{4,}\b', content.lower()):
            keywords.add(word)

        # Check if steps exist
        steps_dir = os.path.join(framework_path, "teams", team, "steps")
        step_files = list(Path(steps_dir).glob("*.steps.ts")) if os.path.isdir(steps_dir) else []
        has_steps = len(step_files) > 0

        # Determine test type
        test_type = "api" if "/api/" in rel_path else "ui"

        inventory.append({
            "feature_file": rel_path,
            "feature_name": feature_name,
            "team": team,
            "test_type": test_type,
            "tags": tags,
            "scenarios": scenarios,
            "scenario_count": len(scenarios),
            "keywords": list(keywords)[:50],  # Cap to prevent huge output
            "has_automation": has_steps,
        })

    return inventory


# ---------------------------------------------------------------------------
# Impact analysis
# ---------------------------------------------------------------------------

def analyze_impact(
    requirements: dict,
    test_results: dict,
    inventory: list,
) -> dict:
    """Identify impacted test cases based on the story requirements."""

    story_id = requirements.get("story_id", "")
    title = requirements.get("title", "").lower()
    description = requirements.get("description_raw", "").lower()
    components = [c.lower() for c in requirements.get("components", [])]
    labels = [l.lower() for l in requirements.get("labels", [])]

    # Build impact keywords from the story
    impact_keywords = set()

    # From title
    for word in re.findall(r'\b[a-z]{4,}\b', title):
        if word not in ("that", "this", "with", "from", "into", "have", "been", "would", "should", "could"):
            impact_keywords.add(word)

    # From components
    for comp in components:
        for word in re.findall(r'\b[a-z]{3,}\b', comp.lower()):
            impact_keywords.add(word)

    # Domain-specific keywords
    domain_keywords = {
        "schedule", "shift", "location", "transition", "employee",
        "group", "district", "peer", "assign", "role", "optimizer",
        "auto-schedule", "p2p", "generation", "demand", "labor",
    }
    story_domain = impact_keywords & domain_keywords

    impacted_automated = []
    impacted_manual = []
    not_impacted = []

    for test in inventory:
        # Skip the story's own feature file
        if story_id.lower().replace("-", "_") in test["feature_file"].lower():
            continue

        # Calculate impact score
        score = 0
        reasons = []

        # 1. Tag overlap (team, feature tags)
        test_tags_lower = [t.lower() for t in test["tags"]]
        for comp in components:
            for tag in test_tags_lower:
                if comp.replace("-", "").replace("_", "") in tag.replace("-", "").replace("_", ""):
                    score += 3
                    reasons.append(f"Component match: {comp} ~ {tag}")

        # 2. Feature tag overlap (e.g., @p2p, @schedule)
        for tag in test_tags_lower:
            tag_clean = tag.lstrip("@")
            if tag_clean in story_domain:
                score += 2
                reasons.append(f"Domain tag: {tag}")

        # 3. Keyword overlap in scenario names
        test_keywords = set(test.get("keywords", []))
        keyword_overlap = story_domain & test_keywords
        if keyword_overlap:
            score += len(keyword_overlap)
            reasons.append(f"Keyword overlap: {', '.join(list(keyword_overlap)[:5])}")

        # 4. Scenario name relevance
        for scenario in test.get("scenarios", []):
            scenario_lower = scenario.lower()
            if any(kw in scenario_lower for kw in ["schedule", "shift", "location", "transition", "p2p", "peer"]):
                score += 2
                reasons.append(f"Scenario: {scenario[:60]}")
                break

        # Classify
        if score >= 3:
            entry = {
                "feature_file": test["feature_file"],
                "feature_name": test["feature_name"],
                "team": test["team"],
                "scenario_count": test["scenario_count"],
                "impact_score": score,
                "reasons": reasons[:5],
            }
            if test["has_automation"]:
                impacted_automated.append(entry)
            else:
                impacted_manual.append(entry)
        else:
            not_impacted.append({
                "feature_file": test["feature_file"],
                "team": test["team"],
            })

    # Sort by impact score descending
    impacted_automated.sort(key=lambda x: x["impact_score"], reverse=True)
    impacted_manual.sort(key=lambda x: x["impact_score"], reverse=True)

    # Identify coverage gaps
    coverage_gaps = []
    if not any("transition" in t.get("feature_name", "").lower() for t in impacted_automated):
        coverage_gaps.append("No existing automated test for cross-location transition flow")
    if not any("district" in t.get("feature_name", "").lower() for t in impacted_automated):
        coverage_gaps.append("No existing automated test for cross-district scheduling")

    total_impacted_scenarios = sum(t["scenario_count"] for t in impacted_automated)

    return {
        "story_id": story_id,
        "impact_keywords": list(story_domain),
        "impacted_automated": impacted_automated,
        "impacted_manual": impacted_manual,
        "not_impacted_count": len(not_impacted),
        "coverage_gaps": coverage_gaps,
        "summary": {
            "total_regression_suite": len(inventory),
            "impacted_automated_features": len(impacted_automated),
            "impacted_automated_scenarios": total_impacted_scenarios,
            "impacted_manual_features": len(impacted_manual),
            "not_impacted": len(not_impacted),
            "coverage_gaps": len(coverage_gaps),
        },
        "recommendation": (
            f"Run {len(impacted_automated)} automated feature(s) "
            f"({total_impacted_scenarios} scenarios) + "
            f"flag {len(impacted_manual)} manual feature(s) for coverage"
        ),
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Node 5 — Regression Impact Analysis")
    parser.add_argument("--requirements", required=True, help="Path to requirements-summary.json from Node 1")
    parser.add_argument("--test-results", default="", help="Path to test-execution-results.json from Node 4")
    parser.add_argument("--framework-path", default=FRAMEWORK_PATH, help="Path to Playwright framework")
    parser.add_argument("--output", default="/tmp/outputs/regression-scope.json", help="Output file path")
    args = parser.parse_args()

    print(f"{'='*50}")
    print(f"NODE 5 — Regression Impact Analysis")
    print(f"{'='*50}")

    # Load requirements
    with open(args.requirements, "r") as f:
        req_data = json.load(f)
    # Handle Node 1C wrapper format
    requirements = req_data.get("validated_requirements", req_data)
    print(f"Story ID: {requirements.get('story_id', 'unknown')}")
    print(f"Components: {requirements.get('components', [])}")
    print()

    # Load test results (optional)
    test_results = {}
    if args.test_results and os.path.exists(args.test_results):
        with open(args.test_results, "r") as f:
            test_results = json.load(f)

    # Build regression test inventory
    print("Scanning regression suite...")
    inventory = build_test_inventory(args.framework_path)
    print(f"Total feature files in suite: {len(inventory)}")
    print()

    # Analyze impact
    print("Analyzing impact...")
    result = analyze_impact(requirements, test_results, inventory)

    # Print results
    print()
    print(f"--- Impact Analysis Results ---")
    print(f"Impact keywords: {', '.join(result['impact_keywords'][:10])}")
    print()

    print(f"Impacted Automated ({len(result['impacted_automated'])} features):")
    for t in result["impacted_automated"]:
        print(f"  [{t['impact_score']}] {t['feature_name'][:70]}")
        print(f"      File: {t['feature_file']}")
        print(f"      Scenarios: {t['scenario_count']} | Reasons: {', '.join(t['reasons'][:3])}")

    if result["impacted_manual"]:
        print(f"\nImpacted Manual ({len(result['impacted_manual'])} features):")
        for t in result["impacted_manual"]:
            print(f"  [{t['impact_score']}] {t['feature_name'][:70]}")

    print(f"\nNot Impacted: {result['not_impacted_count']} features")

    if result["coverage_gaps"]:
        print(f"\nCoverage Gaps:")
        for gap in result["coverage_gaps"]:
            print(f"  - {gap}")

    print(f"\nRecommendation: {result['recommendation']}")

    # Write output
    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    with open(args.output, "w") as f:
        json.dump(result, f, indent=2)

    print(f"\nOutput: {args.output}")
    print(f"{'='*50}")
    print(f"NODE 5 — COMPLETE")
    print(f"{'='*50}")


if __name__ == "__main__":
    main()

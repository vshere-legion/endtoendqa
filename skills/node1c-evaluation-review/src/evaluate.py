#!/usr/bin/env python3
"""
Node 1C — Evaluation Review (Skill)
Validates the structured requirements summary from Node 1.
Flags missing acceptance criteria, user story format issues,
and missing NFRs. Acts as a quality gate.

Input:  requirements-summary.json (from Node 1)
Output: validated-requirements.json + gate-status (APPROVED/BLOCKED)
"""

import argparse
import json
import os
import sys


# ---------------------------------------------------------------------------
# Evaluation Rules
# ---------------------------------------------------------------------------

def check_acceptance_criteria(summary: dict) -> list:
    """Rule 1: Every story MUST have at least one acceptance criterion."""
    annotations = []
    ac = summary.get("acceptance_criteria", [])
    if not ac:
        annotations.append({
            "story_id": summary["story_id"],
            "tag": "@missing-acceptance-criteria",
            "severity": "CRITICAL",
            "rule": "acceptance-criteria",
            "message": "No acceptance criteria found. Story must have explicit AC for test generation.",
            "recommendation": "Add acceptance criteria in 'Given/When/Then' or numbered list format."
        })
    elif len(ac) < 2:
        annotations.append({
            "story_id": summary["story_id"],
            "tag": "@insufficient-acceptance-criteria",
            "severity": "WARNING",
            "rule": "acceptance-criteria",
            "message": f"Only {len(ac)} acceptance criterion found. Consider adding more for comprehensive coverage.",
            "recommendation": "Add at least 2-3 acceptance criteria covering happy path and edge cases."
        })
    return annotations


def check_user_story_format(summary: dict) -> list:
    """Rule 2: Story should follow 'As a [role], I want [action], so that [benefit]' format."""
    annotations = []
    user_story = summary.get("user_story", "")
    title = summary.get("title", "")
    description = summary.get("description_raw", "")

    # Check if description or title has user story format
    has_format = False
    for text in [user_story, title, description]:
        lower = text.lower()
        if "as a" in lower and ("i want" in lower or "i need" in lower) and "so that" in lower:
            has_format = True
            break

    if not has_format:
        annotations.append({
            "story_id": summary["story_id"],
            "tag": "@missing-information",
            "severity": "WARNING",
            "rule": "user-story-format",
            "message": "Story does not follow 'As a [user], I want [action], so that [benefit]' format.",
            "recommendation": "Rewrite story title or description using standard user story format."
        })
    return annotations


def check_nfrs(summary: dict) -> list:
    """Rule 3: Flag stories missing NFRs (performance, security, accessibility)."""
    annotations = []
    nfrs = summary.get("nfrs", {})
    missing_categories = []

    if not nfrs.get("performance"):
        missing_categories.append("performance")
    if not nfrs.get("security"):
        missing_categories.append("security")
    if not nfrs.get("accessibility"):
        missing_categories.append("accessibility")

    for cat in missing_categories:
        annotations.append({
            "story_id": summary["story_id"],
            "tag": f"@missing-nfr-{cat}",
            "severity": "WARNING",
            "rule": f"nfr-{cat}",
            "message": f"No {cat} requirements mentioned in story.",
            "recommendation": f"Consider adding {cat} requirements (e.g., response time targets, auth requirements, WCAG level)."
        })

    # If ALL three are missing, escalate severity
    if len(missing_categories) == 3:
        annotations.append({
            "story_id": summary["story_id"],
            "tag": "@missing-all-nfrs",
            "severity": "CRITICAL",
            "rule": "nfr-completeness",
            "message": "No non-functional requirements found (performance, security, accessibility all missing).",
            "recommendation": "Add at least one NFR category before proceeding to test planning."
        })

    return annotations


def check_completeness(summary: dict) -> list:
    """Rule 4: Story must have title, description, priority, at least one label."""
    annotations = []

    if not summary.get("title"):
        annotations.append({
            "story_id": summary["story_id"],
            "tag": "@incomplete-story",
            "severity": "CRITICAL",
            "rule": "completeness-title",
            "message": "Story has no title.",
            "recommendation": "Add a descriptive title."
        })

    if not summary.get("description_raw", "").strip():
        annotations.append({
            "story_id": summary["story_id"],
            "tag": "@incomplete-story",
            "severity": "CRITICAL",
            "rule": "completeness-description",
            "message": "Story has no description.",
            "recommendation": "Add a detailed description with context, use cases, and expected behavior."
        })

    if not summary.get("priority"):
        annotations.append({
            "story_id": summary["story_id"],
            "tag": "@incomplete-story",
            "severity": "WARNING",
            "rule": "completeness-priority",
            "message": "Story has no priority set.",
            "recommendation": "Set priority (Highest/High/Medium/Low)."
        })

    if not summary.get("labels"):
        annotations.append({
            "story_id": summary["story_id"],
            "tag": "@incomplete-story",
            "severity": "WARNING",
            "rule": "completeness-labels",
            "message": "Story has no labels.",
            "recommendation": "Add at least one label for categorization."
        })

    if not summary.get("components"):
        annotations.append({
            "story_id": summary["story_id"],
            "tag": "@incomplete-story",
            "severity": "WARNING",
            "rule": "completeness-components",
            "message": "Story has no components assigned.",
            "recommendation": "Assign a component for routing and traceability."
        })

    return annotations


def check_linked_issues(summary: dict) -> list:
    """Rule 5: Check if story has related epics or dependencies."""
    annotations = []
    linked = summary.get("linked_issues", [])

    if not linked:
        annotations.append({
            "story_id": summary["story_id"],
            "tag": "@no-linked-issues",
            "severity": "WARNING",
            "rule": "linked-issues",
            "message": "No linked issues found. Story may lack context for regression impact analysis.",
            "recommendation": "Link to parent epic, related stories, or dependencies."
        })

    return annotations


# ---------------------------------------------------------------------------
# Gate Decision
# ---------------------------------------------------------------------------

def evaluate(summary: dict) -> dict:
    """Run all evaluation rules and determine gate status."""
    all_annotations = []
    all_annotations.extend(check_acceptance_criteria(summary))
    all_annotations.extend(check_user_story_format(summary))
    all_annotations.extend(check_nfrs(summary))
    all_annotations.extend(check_completeness(summary))
    all_annotations.extend(check_linked_issues(summary))

    critical_issues = [a for a in all_annotations if a["severity"] == "CRITICAL"]
    warning_issues = [a for a in all_annotations if a["severity"] == "WARNING"]

    # Gate decision
    if critical_issues:
        gate_status = "BLOCKED"
    else:
        gate_status = "APPROVED"

    return {
        "story_id": summary["story_id"],
        "gate_status": gate_status,
        "blocking_issues": len(critical_issues),
        "warning_issues": len(warning_issues),
        "total_issues": len(all_annotations),
        "annotations": all_annotations,
        "summary": {
            "title": summary.get("title", ""),
            "status": summary.get("status", ""),
            "priority": summary.get("priority", ""),
            "acceptance_criteria_count": len(summary.get("acceptance_criteria", [])),
            "nfr_coverage": {
                k: len(v) > 0
                for k, v in summary.get("nfrs", {}).items()
            },
            "has_linked_issues": len(summary.get("linked_issues", [])) > 0,
        },
        # Pass through the original requirements for downstream nodes
        "validated_requirements": summary,
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Node 1C — Evaluation Review")
    parser.add_argument("--input", required=True, help="Path to requirements-summary.json from Node 1")
    parser.add_argument("--output", default="/tmp/outputs/validated-requirements.json", help="Output file path")
    parser.add_argument("--gate-output", default="/tmp/outputs/gate-status.txt", help="Gate status output file")
    parser.add_argument("--strict", action="store_true", help="Treat all warnings as blockers")
    parser.add_argument("--mode", choices=["autonomous", "interactive"], default="autonomous",
                        help="autonomous = block on CRITICAL; interactive = ask user for override approval")
    args = parser.parse_args()

    # Load input
    with open(args.input, "r") as f:
        summary = json.load(f)

    print(f"{'='*50}")
    print(f"NODE 1C — Evaluation Review [SKILL]")
    print(f"{'='*50}")
    print(f"Story ID: {summary.get('story_id', 'unknown')}")
    print(f"Mode: {args.mode.upper()}")
    print(f"Evaluating requirements quality...")
    print()

    # Run evaluation
    result = evaluate(summary)

    # In strict mode, warnings also block
    if args.strict and result["warning_issues"] > 0:
        result["gate_status"] = "BLOCKED"

    # Print results
    print(f"--- Evaluation Results ---")
    for ann in result["annotations"]:
        icon = "BLOCK" if ann["severity"] == "CRITICAL" else "WARN "
        print(f"  [{icon}] {ann['tag']}: {ann['message']}")

    print()
    print(f"Critical Issues: {result['blocking_issues']}")
    print(f"Warnings: {result['warning_issues']}")
    print(f"Gate Status: {result['gate_status']}")

    # --- Mode handling ---
    if result["gate_status"] == "BLOCKED" and args.mode == "interactive":
        print()
        print("INTERACTIVE MODE — Requesting user approval to override...")
        print("Waiting for user input...")

        # Build issue summary for user prompt
        issues_text = "\n".join(
            f"  - [{a['severity']}] {a['tag']}: {a['message']}"
            for a in result["annotations"]
        )

        # Ask user for override
        print()
        print(f"{'='*50}")
        print(f"GATE BLOCKED — {result['blocking_issues']} critical issue(s) found:")
        print(issues_text)
        print(f"{'='*50}")
        user_input = input("\nDo you want to OVERRIDE and proceed? (yes/no): ").strip().lower()

        if user_input in ("yes", "y"):
            result["gate_status"] = "APPROVED_WITH_OVERRIDE"
            result["override"] = {
                "overridden": True,
                "reason": "User approved override in interactive mode",
                "original_status": "BLOCKED",
            }
            print("OVERRIDE ACCEPTED — Proceeding to Node 2 (Test Planning)")
        else:
            print("OVERRIDE REJECTED — Pipeline remains BLOCKED.")

    # Add mode to result
    result["mode"] = args.mode

    # Write outputs
    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    with open(args.output, "w") as f:
        json.dump(result, f, indent=2)

    os.makedirs(os.path.dirname(args.gate_output), exist_ok=True)
    with open(args.gate_output, "w") as f:
        f.write(result["gate_status"])

    print(f"\nOutput: {args.output}")
    print(f"Gate: {args.gate_output} → {result['gate_status']}")
    print(f"{'='*50}")

    if result["gate_status"] in ("APPROVED", "APPROVED_WITH_OVERRIDE"):
        print(f"{result['gate_status']} — Proceeding to Node 2 (Test Planning)")
    else:
        print(f"BLOCKED — Pipeline paused. Resolve {result['blocking_issues']} critical issue(s).")
        print(f"Notify #qa-end-to-end-vikas for manual resolution.")

    print(f"{'='*50}")

    # Exit with error code if blocked (for Argo to detect)
    if result["gate_status"] == "BLOCKED":
        sys.exit(1)


if __name__ == "__main__":
    main()

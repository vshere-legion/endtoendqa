# Skill: Node 1C — Evaluation Review

## Identity
- **Name:** `node1c-evaluation-review`
- **Type:** Evaluation Module (Skill)
- **Layer:** 2 — DAG Node 1C
- **Invoked by:** Layer 2 DAG Conductor after Node 1 completes

## Purpose
Validate the structured requirements summary produced by Node 1 before it flows to downstream test planning. Acts as a quality gate to ensure all stories have sufficient detail for test generation.

## Evaluation Rules

### 1. Missing Acceptance Criteria
- **Check:** Every user story MUST have at least one acceptance criterion
- **Action on fail:** Flag with `@missing-acceptance-criteria`
- **Severity:** CRITICAL — blocks pipeline

### 2. User Story Format Validation
- **Check:** Story must follow "As a [user/role], I want [action], so that [benefit]" format
- **Action on fail:** Tag `@missing-information`
- **Severity:** WARNING — annotates but does not block

### 3. Non-Functional Requirements (NFRs)
- **Check:** Flags stories missing NFRs in these categories:
  - **Performance** — response time, throughput, load targets
  - **Security** — authentication, authorization, data handling
  - **Accessibility** — WCAG compliance level, screen reader support
- **Action on fail:** Flag with `@missing-nfr-[category]`
- **Severity:** WARNING — annotates, blocks only if all three are missing

### 4. Completeness Check
- **Check:** Story must have: title, description, priority, at least one label
- **Action on fail:** Flag with `@incomplete-story`
- **Severity:** WARNING

## Input
- Structured requirements summary (JSON) from Node 1

## Output
```json
{
  "status": "APPROVED | BLOCKED",
  "annotations": [
    {
      "story_id": "PROJ-1234",
      "tag": "@missing-acceptance-criteria",
      "severity": "CRITICAL",
      "message": "No acceptance criteria found"
    }
  ],
  "blocking_issues": 1,
  "warning_issues": 2,
  "pass_through_stories": ["PROJ-1235", "PROJ-1236"]
}
```

## Gate Behavior
| Condition | Action |
|-----------|--------|
| Zero CRITICAL issues | APPROVED — proceed to Node 2 |
| Any CRITICAL issue | BLOCKED — pipeline paused, Slack alert sent |
| Warnings only | APPROVED with annotations — proceed with tags |

## Downstream
- **On APPROVED** → Node 2 (Test Planning)
- **On BLOCKED** → Slack notification to `#qa-alerts`, awaits manual resolution

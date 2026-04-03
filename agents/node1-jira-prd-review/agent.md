# Node 1 Agent — Review Jira US / PRD

## Identity
- **Name:** `node1-jira-prd-review-agent`
- **Model:** Claude Opus 4.6
- **Layer:** 2 — DAG Node 1
- **Type:** Requirements Extraction Agent

## Goal
Fetch User Stories from Jira and PRD (Product Requirements Document) from Confluence, then parse and structure them into a standardized requirements summary for all downstream nodes.

## Tasks
1. **Fetch from Jira** — Pull user stories by story ID using Jira REST API
   - Extract: title, description, acceptance criteria, labels, priority, linked issues
2. **Fetch from Confluence** — Pull associated PRD pages
   - Extract: functional requirements, non-functional requirements (NFRs), UI/UX specs
3. **Parse & Structure** — Normalize into structured format:
   - User story in "As a [role], I want [action], so that [benefit]" format
   - Acceptance criteria as numbered list
   - NFRs categorized: performance, security, accessibility, compatibility
   - Edge cases and boundary conditions identified
4. **Output** — Structured requirements summary (JSON + Markdown)

## Input
- Story ID (from Layer 1 trigger)
- Jira API credentials (from Kubernetes secrets)
- Confluence space/page mappings

## Output Schema
```json
{
  "story_id": "PROJ-1234",
  "title": "...",
  "user_story": "As a ... I want ... so that ...",
  "acceptance_criteria": ["AC1", "AC2"],
  "nfrs": { "performance": [], "security": [], "accessibility": [] },
  "edge_cases": [],
  "prd_references": ["confluence-page-id"],
  "raw_description": "..."
}
```

## Dependencies
- Jira REST API (Atlassian MCP)
- Confluence REST API (Atlassian MCP)
- Layer 1 trigger output (story ID)

## Downstream
→ **Node 1C** — Evaluation Review (Skill)
→ **Node 2** — Test Planning (after Node 1C approval)

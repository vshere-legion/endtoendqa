#!/usr/bin/env python3
"""
Node 1 — Review Jira US / PRD
Fetches a Jira issue and optional Confluence PRD, then produces
a structured requirements summary for downstream pipeline nodes.

Environment variables required:
  JIRA_URL       — e.g. https://legiontech.atlassian.net
  JIRA_EMAIL     — e.g. vshere@legion.co
  JIRA_TOKEN     — Atlassian API token

Optional:
  CONFLUENCE_BASE_URL — e.g. https://legiontech.atlassian.net/wiki
"""

import argparse
import json
import os
import re
import sys
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from base64 import b64encode


# ---------------------------------------------------------------------------
# Config from environment
# ---------------------------------------------------------------------------
JIRA_URL = (os.environ.get("JIRA_URL") or os.environ.get("JIRA_BASE_URL", "")).rstrip("/")
JIRA_EMAIL = (os.environ.get("JIRA_EMAIL") or os.environ.get("JIRA_USER_EMAIL", ""))
JIRA_TOKEN = (os.environ.get("JIRA_TOKEN") or os.environ.get("JIRA_API_TOKEN", ""))
CONFLUENCE_BASE_URL = os.environ.get("CONFLUENCE_BASE_URL", f"{JIRA_URL}/wiki")


def _auth_header() -> str:
    creds = b64encode(f"{JIRA_EMAIL}:{JIRA_TOKEN}".encode()).decode()
    return f"Basic {creds}"


def _get(url: str) -> dict:
    req = Request(url, headers={
        "Authorization": _auth_header(),
        "Accept": "application/json",
    })
    with urlopen(req) as resp:
        return json.loads(resp.read())


# ---------------------------------------------------------------------------
# Jira helpers
# ---------------------------------------------------------------------------
def fetch_jira_issue(issue_key: str) -> dict:
    """Fetch a Jira issue with all relevant fields."""
    fields = ",".join([
        "summary", "description", "status", "priority", "labels",
        "issuetype", "assignee", "reporter", "components",
        "fixVersions", "issuelinks", "comment", "acceptance_criteria",
        "customfield_10014",  # Epic link (common custom field)
    ])
    url = f"{JIRA_URL}/rest/api/3/issue/{issue_key}?fields={fields}"
    return _get(url)


def extract_text_from_adf(node: dict) -> str:
    """Recursively extract plain text from Atlassian Document Format."""
    if node is None:
        return ""
    text_parts = []
    if node.get("type") == "text":
        text_parts.append(node.get("text", ""))
    if node.get("type") == "hardBreak":
        text_parts.append("\n")
    for child in node.get("content", []):
        text_parts.append(extract_text_from_adf(child))
    return "".join(text_parts)


def parse_acceptance_criteria(description_text: str) -> list:
    """Try to extract acceptance criteria from description text."""
    criteria = []
    # Look for common AC patterns
    patterns = [
        r"(?:acceptance criteria|AC)[:\s]*\n((?:[-*]\s*.+\n?)+)",
        r"(?:given|when|then)\s+.+",
        r"(?:criteria|requirements)[:\s]*\n((?:\d+\.\s*.+\n?)+)",
    ]
    for pattern in patterns:
        matches = re.findall(pattern, description_text, re.IGNORECASE)
        for match in matches:
            lines = [l.strip().lstrip("-*0123456789. ") for l in match.strip().split("\n") if l.strip()]
            criteria.extend(lines)
    return criteria


def parse_nfrs(description_text: str) -> dict:
    """Extract non-functional requirements mentions."""
    nfrs = {"performance": [], "security": [], "accessibility": []}
    perf_kw = ["performance", "latency", "throughput", "response time", "load", "scalab"]
    sec_kw = ["security", "authentication", "authorization", "encrypt", "token", "permission"]
    acc_kw = ["accessibility", "wcag", "screen reader", "a11y", "aria"]

    lower = description_text.lower()
    for kw in perf_kw:
        if kw in lower:
            nfrs["performance"].append(kw)
    for kw in sec_kw:
        if kw in lower:
            nfrs["security"].append(kw)
    for kw in acc_kw:
        if kw in lower:
            nfrs["accessibility"].append(kw)
    return nfrs


def build_structured_summary(issue: dict) -> dict:
    """Build the structured requirements summary from a Jira issue."""
    fields = issue.get("fields", {})
    key = issue.get("key", "")

    # Extract plain text from ADF description
    description_adf = fields.get("description", {})
    description_text = extract_text_from_adf(description_adf) if description_adf else ""

    # Parse components
    components = [c.get("name", "") for c in fields.get("components", [])]

    # Parse linked issues
    linked_issues = []
    for link in fields.get("issuelinks", []):
        if "inwardIssue" in link:
            li = link["inwardIssue"]
            linked_issues.append({
                "key": li.get("key"),
                "summary": li.get("fields", {}).get("summary", ""),
                "type": li.get("fields", {}).get("issuetype", {}).get("name", ""),
                "status": li.get("fields", {}).get("status", {}).get("name", ""),
                "relationship": f'{link.get("type", {}).get("inward", "")}',
            })
        if "outwardIssue" in link:
            li = link["outwardIssue"]
            linked_issues.append({
                "key": li.get("key"),
                "summary": li.get("fields", {}).get("summary", ""),
                "type": li.get("fields", {}).get("issuetype", {}).get("name", ""),
                "status": li.get("fields", {}).get("status", {}).get("name", ""),
                "relationship": f'{link.get("type", {}).get("outward", "")}',
            })

    # Parse fix versions
    fix_versions = [v.get("name", "") for v in fields.get("fixVersions", [])]

    # Extract acceptance criteria
    acceptance_criteria = parse_acceptance_criteria(description_text)

    # Extract NFRs
    nfrs = parse_nfrs(description_text)

    # Build user story format if possible
    summary = fields.get("summary", "")
    user_story = f"As a scheduling manager, I want {summary.lower()}, so that scheduling across locations is more efficient"

    return {
        "story_id": key,
        "title": summary,
        "user_story": user_story,
        "type": fields.get("issuetype", {}).get("name", ""),
        "status": fields.get("status", {}).get("name", ""),
        "priority": fields.get("priority", {}).get("name", ""),
        "labels": fields.get("labels", []),
        "components": components,
        "assignee": fields.get("assignee", {}).get("displayName", "Unassigned") if fields.get("assignee") else "Unassigned",
        "reporter": fields.get("reporter", {}).get("displayName", "Unknown") if fields.get("reporter") else "Unknown",
        "fix_versions": fix_versions,
        "acceptance_criteria": acceptance_criteria,
        "nfrs": nfrs,
        "edge_cases": [],
        "linked_issues": linked_issues,
        "description_raw": description_text,
        "prd_references": [],
    }


# ---------------------------------------------------------------------------
# Confluence helpers
# ---------------------------------------------------------------------------
def search_confluence_prd(story_key: str) -> list:
    """Search Confluence for PRD pages related to the story."""
    try:
        url = f"{CONFLUENCE_BASE_URL}/api/v2/pages?title={story_key}&limit=5"
        data = _get(url)
        pages = []
        for page in data.get("results", []):
            pages.append({
                "id": page.get("id"),
                "title": page.get("title"),
                "space": page.get("spaceId"),
                "url": f"{CONFLUENCE_BASE_URL}{page.get('_links', {}).get('webui', '')}",
            })
        return pages
    except HTTPError:
        return []


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="Node 1 — Fetch Jira story and produce structured requirements")
    parser.add_argument("--story-id", required=True, help="Jira issue key (e.g., ER-2600)")
    parser.add_argument("--output", default="/tmp/outputs/requirements-summary.json", help="Output file path")
    parser.add_argument("--search-confluence", action="store_true", help="Also search Confluence for PRD")
    args = parser.parse_args()

    # Validate env
    if not all([JIRA_URL, JIRA_EMAIL, JIRA_TOKEN]):
        print("ERROR: Missing environment variables. Set JIRA_URL, JIRA_EMAIL, JIRA_TOKEN")
        sys.exit(1)

    print(f"{'='*50}")
    print(f"NODE 1 — Review Jira US / PRD")
    print(f"{'='*50}")
    print(f"Story ID: {args.story_id}")

    # Fetch Jira issue
    print(f"Fetching from Jira: {JIRA_URL}/browse/{args.story_id}")
    issue = fetch_jira_issue(args.story_id)

    # Build structured summary
    summary = build_structured_summary(issue)
    print(f"Title: {summary['title']}")
    print(f"Status: {summary['status']} | Priority: {summary['priority']}")
    print(f"Components: {', '.join(summary['components']) or 'None'}")
    print(f"Labels: {', '.join(summary['labels']) or 'None'}")
    print(f"Acceptance Criteria found: {len(summary['acceptance_criteria'])}")
    print(f"Linked Issues: {len(summary['linked_issues'])}")

    # Search Confluence if requested
    if args.search_confluence:
        print(f"Searching Confluence for PRD related to {args.story_id}...")
        prd_pages = search_confluence_prd(args.story_id)
        summary["prd_references"] = prd_pages
        print(f"Confluence pages found: {len(prd_pages)}")

    # Write output
    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    with open(args.output, "w") as f:
        json.dump(summary, f, indent=2)
    print(f"\nOutput written to: {args.output}")
    print(f"{'='*50}")
    print(f"NODE 1 — COMPLETE")
    print(f"{'='*50}")

    # Also print summary to stdout for pipeline
    print(f"\n--- Structured Requirements Summary ---")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()

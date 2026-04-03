#!/usr/bin/env python3
"""
Fetch PR links from Jira's Development panel using the dev-status REST API.

This bypasses the MCP tool limitation (which lacks read:source-code:jira scope)
by calling the Jira REST API directly with basic auth.

Usage:
    # Set credentials as environment variables:
    export JIRA_EMAIL="your.email@company.com"
    export JIRA_API_TOKEN="your-api-token"

    # Fetch PRs for a single issue:
    python3 fetch_pr_links.py SCH-21123

    # Fetch PRs for multiple issues (from a file, one key per line):
    python3 fetch_pr_links.py --from-file defect_keys.txt

    # Output as JSON:
    python3 fetch_pr_links.py SCH-21123 --json
"""

import argparse
import base64
import json
import os
import sys
import urllib.request
import urllib.error

JIRA_BASE_URL = "https://legiontech.atlassian.net"


def get_auth_header() -> str:
    """Build basic auth header from environment variables."""
    email = os.environ.get("JIRA_EMAIL")
    token = os.environ.get("JIRA_API_TOKEN")

    if not email or not token:
        print("ERROR: Set JIRA_EMAIL and JIRA_API_TOKEN environment variables.")
        print("  export JIRA_EMAIL='your.email@company.com'")
        print("  export JIRA_API_TOKEN='your-api-token'")
        print("")
        print("Get your API token at: https://id.atlassian.com/manage-profile/security/api-tokens")
        sys.exit(1)

    credentials = base64.b64encode(f"{email}:{token}".encode()).decode()
    return f"Basic {credentials}"


def get_issue_id(issue_key: str, auth_header: str) -> str | None:
    """Get the numeric issue ID from a Jira issue key."""
    url = f"{JIRA_BASE_URL}/rest/api/3/issue/{issue_key}?fields=summary"
    req = urllib.request.Request(url, headers={
        "Authorization": auth_header,
        "Accept": "application/json",
    })

    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read())
            return data.get("id")
    except urllib.error.HTTPError as e:
        print(f"ERROR: Failed to fetch issue {issue_key}: HTTP {e.code}")
        return None


def fetch_pr_links(issue_id: str, auth_header: str) -> list[dict]:
    """Fetch PR details from Jira's dev-status API."""
    url = (
        f"{JIRA_BASE_URL}/rest/dev-status/latest/issue/detail"
        f"?issueId={issue_id}&applicationType=GitHub&dataType=pullrequest"
    )
    req = urllib.request.Request(url, headers={
        "Authorization": auth_header,
        "Accept": "application/json",
    })

    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read())
    except urllib.error.HTTPError as e:
        if e.code == 403:
            print(f"ERROR: Access denied. Your API token may lack permissions for dev-status API.")
        else:
            print(f"ERROR: HTTP {e.code} fetching dev-status for issue ID {issue_id}")
        return []

    prs = []
    for detail in data.get("detail", []):
        for pr in detail.get("pullRequests", []):
            prs.append({
                "url": pr.get("url", ""),
                "title": pr.get("name", ""),
                "status": pr.get("status", ""),
                "author": pr.get("author", {}).get("name", ""),
                "repo": pr.get("source", {}).get("url", ""),
            })

    return prs


def process_issue(issue_key: str, auth_header: str) -> dict:
    """Process a single Jira issue and return its PR links."""
    issue_id = get_issue_id(issue_key, auth_header)
    if not issue_id:
        return {"issue_key": issue_key, "error": "Issue not found", "prs": []}

    prs = fetch_pr_links(issue_id, auth_header)
    return {"issue_key": issue_key, "issue_id": issue_id, "prs": prs}


def main():
    parser = argparse.ArgumentParser(description="Fetch PR links from Jira Development panel")
    parser.add_argument("issue_keys", nargs="*", help="Jira issue keys (e.g., SCH-21123)")
    parser.add_argument("--from-file", help="File with one issue key per line")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    args = parser.parse_args()

    auth_header = get_auth_header()

    # Collect issue keys
    keys = list(args.issue_keys)
    if args.from_file:
        with open(args.from_file) as f:
            keys.extend(line.strip() for line in f if line.strip())

    if not keys:
        parser.print_help()
        sys.exit(1)

    results = []
    for key in keys:
        result = process_issue(key, auth_header)
        results.append(result)

        if not args.json:
            print(f"\n{'='*60}")
            print(f"  {key} — {len(result['prs'])} PR(s)")
            print(f"{'='*60}")
            if result.get("error"):
                print(f"  Error: {result['error']}")
            for pr in result["prs"]:
                status = pr['status'].upper()
                print(f"  [{status}] {pr['title']}")
                print(f"    URL: {pr['url']}")
                print(f"    Author: {pr['author']}")

    if args.json:
        print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()

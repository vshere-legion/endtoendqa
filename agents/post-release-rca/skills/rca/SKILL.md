# RCA Analysis Skill

The core Root Cause Analysis pipeline. Each step gates the next.

## Step 4.0: Problem Statement
Write a one-sentence problem statement: What went wrong, for whom, and what was the impact?

## Step 4.1: Timeline of Events
Reconstruct the sequence from Jira comments, PR dates, and linked tickets:
- When was the defect introduced? (PR merge date or release date)
- When was it detected? (Jira creation date)
- When was it resolved? (PR merge date for fix)

## Step 4.2: Three-Source Analysis
Produce three analysis descriptions from three different sources.
Each answers three questions in exactly 3 lines:
1. **What was the issue?**
2. **What was changed?**
3. **Why was it changed?**

### Column: "Defect Description"
Source: Jira description field + comments (priority: comments > description > summary)

### Column: "PR Description"
Source: PR title + PR body/description from `gh pr view`
If no PR linked, write "No PR linked".

### Column: "Code Description"
Source: Code diff from `gh pr diff`
If no PR linked, write "No PR linked".

## Step 4.3: Causal Chain Mapping
Before classifying, explicitly identify:
- **Root Cause:** The single systemic cause — remove it and the incident doesn't happen.
- **Contributing Factors:** Conditions that made it worse or more likely.
- **Trigger:** The proximate event that activated the latent defect.

## Step 4b: PR Columns
For each linked PR, produce:
```
<PR_URL>
Line 1: What was the change (files/components modified)
Line 2: Why the change was made (the root cause it addresses)
```

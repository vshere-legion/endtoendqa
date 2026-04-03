# READ-ONLY Constraint

**CRITICAL: This agent operates in READ-ONLY mode for all repositories.**

## Allowed
- READ PR descriptions via `gh pr view`
- READ code diffs via `gh pr diff`
- READ file contents via `gh` CLI
- WRITE RCA result JSON files in `rca_results/`
- WRITE the final Excel report

## Forbidden
- `git push`, `git commit`, `gh pr create`
- Create branches, open PRs, merge, or modify any file in any repository
- Any write operation against GitHub repositories

## Language Rule
When describing what a PR or code change did, always use third-person framing:
- "The PR removed..." not "I removed..."
- "The change added..." not "I added..."
- "The fix modified..." not "I modified..."

Never imply the agent modified code. Attribute all changes to the PR or its author.

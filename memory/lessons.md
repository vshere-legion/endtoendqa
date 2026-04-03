---
name: Self-Improvement Lessons
description: Corrections from user sessions — rules to prevent repeating mistakes. Review at every session start.
type: feedback
---

# Lessons Learned — Self-Improvement Loop

> After ANY correction, add a lesson here. Write a rule. Prevent the same mistake. Ruthlessly iterate.

---

## Lesson 1: Never use CSS selectors or XPath in Playwright scripts
**Date:** 2026-04-03
**Trigger:** User corrected — 4 CSS selectors (`.shift-transition`, `.loading-spinner`, `.coverage-value`) were present in generated Page Object.
**Root Cause:** Page object template used `.locator('.class')` as `.or()` fallbacks alongside built-in locators.
**Rule:** ONLY use Playwright built-in locators: `getByRole`, `getByText`, `getByLabel`, `getByPlaceholder`, `getByAltText`, `getByTitle`, `getByTestId`. CSS and XPath are BANNED. If no built-in locator works (extremely rare), ask user for explicit approval in interactive mode. Default is REJECT.
**Prevention:** Node 3C now treats CSS/XPath as CRITICAL blockers. Node 3 generator template has zero CSS/XPath. Grep-test all generated `.ts` files for `.locator(` before output.

---

## Lesson 2: Always ask user approval before overriding a blocked gate
**Date:** 2026-04-03
**Trigger:** User specified — when evaluation is BLOCKED in interactive mode, never auto-proceed. Send Slack message asking for explicit yes/no approval.
**Root Cause:** Initial Node 1C design would just block or proceed without user input.
**Rule:** In interactive mode, always send a Slack notification asking for override approval. Wait for reply in thread. In autonomous mode, block the pipeline. Never silently skip a gate.
**Prevention:** Node 1C has `--mode interactive` flag. Slack approval thread pattern implemented.

---

## Lesson 3: Match existing framework conventions exactly
**Date:** 2026-04-03
**Trigger:** User asked to tag scenarios matching the Playwright-Nishant framework, not custom tags.
**Root Cause:** Initially generated custom tags (`@smoke`, `@happy-path`, `@edge-case`) instead of framework tags (`@Team-SCH`, `@P2-High`, `@Regression`, `@GA`, `@mode:serial`, `@step1`, `@Positive`).
**Rule:** Before generating any test artifacts, study the target framework's conventions (tags, folder structure, imports, patterns). Never invent custom conventions when a framework exists. Read existing files first.
**Prevention:** Tag taxonomy saved in `reference_playwright_tags.md`. Team structure saved in `reference_legion_teams.md`. Node 2 generator maps Jira fields to framework tags.

---

## Lesson 4: Output files must follow exact framework folder structure
**Date:** 2026-04-03
**Trigger:** User corrected folder structure — initially used `output/SCH/Scenarios/UI/` instead of the framework's `output/SCH/features/ui/`, `output/SCH/steps/`, `output/SCH/pages/` pattern.
**Root Cause:** Assumed a generic folder structure instead of checking the real framework.
**Rule:** Always check the target framework's actual directory structure (`ls` the real folders) before creating output directories. Mirror it exactly.
**Prevention:** Explored `/teams/sch/` structure. Output dirs now match: `features/{ui,api}/`, `steps/`, `pages/`, `test-data/`, `utils/`, `api/`.

---

## Lesson 5: Store API tokens in environment variables, not files
**Date:** 2026-04-03
**Trigger:** User preferred env vars in `~/.zshrc` over `.env` files.
**Root Cause:** Initially created `.env` file approach.
**Rule:** Default to reading credentials from OS environment variables (`os.environ`). Don't create `.env` files for secrets unless user explicitly asks. Guide user to add exports to `~/.zshrc`.
**Prevention:** All agent scripts use `os.environ.get()`. No `.env` loading logic.

---

## Lesson 6: Don't use MCP tools when user prefers direct API calls
**Date:** 2026-04-03
**Trigger:** User rejected Atlassian MCP tool call — wanted direct Jira REST API with their own token.
**Root Cause:** Attempted to use MCP Atlassian tools without checking user preference.
**Rule:** Ask user first whether to use MCP integrations or direct API calls. Respect their choice. If they provide API credentials, use direct REST calls.
**Prevention:** Node 1 uses `curl` / `urllib` with `JIRA_TOKEN` from env vars.

---

## How to use this file

1. **Session start:** Review all lessons for applicable rules
2. **During work:** Before generating code, check lessons for relevant constraints
3. **After correction:** Immediately add new lesson with date, trigger, root cause, rule, prevention
4. **Periodically:** Review if any lesson is outdated or can be merged

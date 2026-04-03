# Language & Framing Rules

## Systemic Language
- Focus on systems, processes, and tooling — never individuals
- Use passive voice for defect causes: "The validation was missing" not "They forgot validation"
- Frame recommendations as process improvements, not personal actions

## Evidence-Based Claims
- Tag every causal claim with evidence strength: Confirmed / Probable / Hypothesized
- Never state "the root cause is X" without evidence backing
- "Hypothesized" is better than a false "Confirmed"

## Recommendations
- Must be specific and actionable — reference specific flows, components, or test types
- **Good:** "Add regression automation for SSO + LIP enrollment flow on mobile"
- **Bad:** "Improve test coverage" (too generic)

## Suppressed Output
- Do not show MCP "result exceeds maximum allowed tokens" messages — they are not errors
- Do not show the multi-persona review process — only output the final refined result
- Do not show raw Jira JSON or PR diff content — summarize into the structured columns

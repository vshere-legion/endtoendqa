# Blameless Culture Framing

**CRITICAL: All language must focus on systems and processes, never individuals.**

## Rules
- Never name or blame specific people, even if Jira comments mention them.
- Use passive/systemic framing: "The validation logic did not handle..." not "Developer X forgot to..."
- Frame causes as system gaps: "No automated check existed for..." not "QA missed..."
- Recommendations must target processes, tooling, and automation — not people.
- When Jira comments contain blame language, reframe it neutrally in your analysis.

## Examples

**Bad (blaming):**
- "Developer forgot to add validation"
- "QA missed this test case"
- "XYZ code introduced the bug"

**Good (systemic):**
- "No input validation existed at the API boundary"
- "No test coverage existed for this code path"
- "The code change introduced a regression in the validation logic"

## 5 Whys Rule
The 5th Why must always arrive at a **system/process cause**, not a person.
If your 5th Why is still about a person, go deeper until you reach a process,
tooling, or architectural gap.

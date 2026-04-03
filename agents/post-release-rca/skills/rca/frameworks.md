# Advanced RCA Frameworks

## 5 Whys
Chain each "why" from the previous answer. **Max 50 words total.**
Format:
```
1. Why? [answer] → 2. Why? [answer] → 3. Why? [answer] → 4. Why? [answer] → 5. Why? [root]
```
The 5th Why must arrive at a systemic/process root cause, not a person.

## Ishikawa Category
Classify the root cause using Ishikawa (fishbone) categories.
MUST be exactly one of:

| Category | Meaning | Examples |
|----------|---------|----------|
| Man | Process knowledge gap, training gap, or handoff failure | Missing runbook, no onboarding for new flow |
| Machine | Infrastructure, tooling, or platform limitation | Env config drift, deployment pipeline gap |
| Method | Process gap, missing review step, or workflow issue | No code review checklist for edge cases |
| Material | Tool limitation, library deficiency, or test data gap | Missing test data generator, outdated dependency |
| Measurement | Monitoring, observability, or alerting gap | No alert for payment election failures |

## Causal Classification
Classify each factor:
```
Root Cause: [the single cause — remove it and incident doesn't happen]
Contributing: [factors that made it worse or more likely]
Trigger: [the proximate event that activated the latent defect]
```

## Evidence Grade
Tag the RCA conclusion with evidence strength:

| Grade | Meaning | When to use |
|-------|---------|-------------|
| Confirmed | Data-backed — code diff proves the cause | PR diff directly shows the bug and fix |
| Probable | Correlated — evidence strongly suggests | Jira comments describe cause, PR partially matches |
| Hypothesized | Plausible but unverified | No PR linked, root cause inferred from description only |

## Counterfactual Testing
Answer two questions in 1-2 sentences total:
1. "If this root cause were absent, would the incident still have occurred?"
2. "If this root cause were present but other factors changed, would the incident still occur?"

## RCA Confidence
Score 1-10 based on three sub-scores (average them):
- **Completeness** (1-10): How much evidence was available?
- **Depth** (1-10): How deep did the causal chain go?
- **Actionability** (1-10): How specific are the recommendations?

Format: `7/10 (C:8 D:6 A:7)`

---
name: Playwright Locator Strategy
description: Strict locator priority for Node 3 script generation — built-in Playwright locators only, CSS/XPath only with user approval in interactive mode
type: feedback
---

Always use Playwright built-in locators. Never use CSS or XPath unless absolutely necessary and user-approved.

**Why:** Built-in locators are resilient, auto-waiting, and accessible-first. CSS/XPath are fragile and break on UI changes.

**How to apply:** In Node 3 (Playwright Script Generation), follow this strict priority:

**Built-in Playwright Locators (ALWAYS USE THESE):**

| Priority | Locator | Use Case |
|----------|---------|----------|
| 1 | `page.getByRole()` | Buttons, links, headings, textboxes — explicit/implicit ARIA roles |
| 2 | `page.getByText()` | Locate by visible text content |
| 3 | `page.getByLabel()` | Form controls by associated label text |
| 4 | `page.getByPlaceholder()` | Inputs by placeholder text |
| 5 | `page.getByAltText()` | Images by alt text |
| 6 | `page.getByTitle()` | Elements by title attribute |
| 7 | `page.getByTestId()` | Elements by data-testid attribute |

**BANNED (never use — CRITICAL blocker in Node 3C):**
- CSS selectors (`.class`, `#id`, `div > span`)
- XPath (`//div`, `xpath=...`)
- Hardcoded IDs (`#submit-btn-123`)
- Positional selectors (`nth-child`, deep nesting)
- Auto-generated class names

**Interactive mode behavior:**
If absolutely no built-in locator works (extremely rare), ask user first:
"Unable to find a built-in Playwright locator for [element]. Is it OK to use a CSS selector / XPath as fallback?"
User must explicitly approve. Default is REJECT.

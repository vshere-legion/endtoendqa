export const TEAMS = [
  'TNP', 'SCH', 'PLT-Core', 'PLT-Int', 'PLT-Ops',
  'LRB', 'EV-Com', 'EV-LIP', 'EV-ELM', 'GENAI', 'EPR',
] as const;

export type TeamName = (typeof TEAMS)[number];

export const TAG_TAXONOMY = {
  priority: ['@P1-Critical', '@P2-High', '@P3-Medium', '@P4-Low'],
  suite: ['@Regression', '@NewFeature'],
  release: [
    '@Summer-Mid', '@Summer-Final',
    '@Winter-Mid', '@Winter-Final',
    '@Spring-Mid', '@Spring-Final',
  ],
  testType: ['@Positive', '@Negative'],
  availability: ['@GA', '@LA'],
  team: TEAMS.map(t => `@Team-${t}`),
} as const;

export const TIMEOUTS = {
  action: 15_000,
  navigation: 30_000,
  assertion: 10_000,
  api: 30_000,
} as const;

export const REPORT_PATHS = {
  html: 'reports/html',
  json: 'reports/json',
  cucumber: 'reports/cucumber',
  screenshots: 'reports/screenshots',
} as const;

export const BROWSERS = ['chromium', 'firefox', 'webkit'] as const;
export type BrowserName = (typeof BROWSERS)[number];

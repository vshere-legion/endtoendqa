#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// ==================== FILE CONTENTS ====================

const files = {
  
  'package.json': `{
  "name": "playwright-cucumber-enterprise",
  "version": "2.0.0",
  "description": "Enterprise Playwright + Cucumber BDD Framework",
  "scripts": {
    "test": "playwright test",
    "test:headed": "playwright test --headed",
    "test:debug": "playwright test --debug",
    "test:ui": "playwright test --ui",
    "test:sch": "TEAM=sch npm test",
    "test:sch:ui": "TEAM=sch TYPE=ui npm test",
    "test:smoke": "npm test -- --grep @smoke",
    "test:parallel": "npm test -- --workers=4",
    "bdd:generate": "bddgen",
    "report:open": "playwright show-report"
  },
  "keywords": ["playwright", "bdd", "cucumber", "testing"],
  "author": "QA Team",
  "license": "MIT",
  "dependencies": {
    "@playwright/test": "^1.40.0",
    "playwright-bdd": "^6.1.0",
    "@cucumber/cucumber": "^10.0.0",
    "dotenv": "^16.4.0",
    "winston": "^3.11.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0"
  }
}`,

  'tsconfig.json': `{
  "compilerOptions": {
    "target": "ESNext",
    "module": "commonjs",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "types": ["node", "@playwright/test"],
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["shared/*"],
      "@teams/*": ["teams/*"],
      "@fixtures/*": ["src/fixtures/*"]
    }
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "dist", "test-results"]
}`,

  'playwright.config.ts': `import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';
import * as dotenv from 'dotenv';

dotenv.config();

const TEAM = process.env.TEAM || 'all';
const TYPE = process.env.TYPE || 'all';

function getTestPaths() {
  const base = TEAM === 'all' ? 'teams/*' : \`teams/\${TEAM}\`;
  
  if (TYPE === 'api') {
    return {
      features: [\`\${base}/features/api/**/*.feature\`],
      steps: [\`\${base}/steps/**/*.ts\`, 'shared/steps/**/*.ts', 'src/steps/**/*.ts']
    };
  } else if (TYPE === 'ui') {
    return {
      features: [\`\${base}/features/ui/**/*.feature\`],
      steps: [\`\${base}/steps/**/*.ts\`, 'shared/steps/**/*.ts', 'src/steps/**/*.ts']
    };
  } else {
    return {
      features: [\`\${base}/features/**/*.feature\`],
      steps: [\`\${base}/steps/**/*.ts\`, 'shared/steps/**/*.ts', 'src/steps/**/*.ts']
    };
  }
}

const { features, steps } = getTestPaths();

const testDir = defineBddConfig({
  paths: features,
  require: steps,
  import: steps,
});

export default defineConfig({
  testDir,
  fullyParallel: true,
  workers: process.env.CI ? 4 : 2,
  retries: process.env.CI ? 2 : 1,
  timeout: 60 * 1000,
  
  reporter: [
    ['list'],
    ['html', { outputFolder: \`reports/\${TEAM}\`, open: 'never' }],
    ['junit', { outputFile: \`reports/junit/\${TEAM}-results.xml\` }],
  ],
  
  use: {
    baseURL: process.env.BASE_URL || 'https://staging.example.com',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    headless: process.env.HEADED !== 'true',
  },

  projects: TYPE === 'api' ? [
    { name: 'api-tests' }
  ] : [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});`,

  '.env.example': `NODE_ENV=staging
BASE_URL=https://staging.example.com
API_URL=https://api-staging.example.com
ADMIN_USERNAME=admin@example.com
ADMIN_PASSWORD=password123
TEAM=all
TYPE=all
HEADED=false`,

  '.gitignore': `node_modules/
test-results/
playwright-report/
reports/
*.log
.env
.env.local
.DS_Store
logs/`,

  'README.md': `# Playwright + Cucumber Enterprise Framework

## Quick Start

\`\`\`bash
npm install
npx playwright install --with-deps
cp .env.example .env
npm run test:sch
\`\`\`

## Running Tests

\`\`\`bash
npm run test:sch           # SCH team tests
npm run test:sch:ui        # SCH UI tests only
npm run test:smoke         # Smoke tests
npm run test:parallel      # 4 workers
\`\`\`

## Documentation

- Setup: See docs/SETUP.md
- Architecture: See ARCHITECTURE.md
`,

  'src/fixtures/test-fixtures.ts': `import { test as base, Page } from '@playwright/test';
import { LoginPage } from '../pages/auth/LoginPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { Logger } from '../utils/Logger';

export interface TestContext {
  sharedData: Map<string, any>;
  testRunId: string;
  workerIndex: number;
  userData: {
    username?: string;
    email?: string;
    token?: string;
    role?: string;
  };
  metadata: {
    startTime: number;
    tags: string[];
    environment: string;
  };
}

type CustomFixtures = {
  testContext: TestContext;
  logger: Logger;
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
};

export const test = base.extend<CustomFixtures>({
  
  testContext: async ({}, use, testInfo) => {
    const context: TestContext = {
      sharedData: new Map(),
      testRunId: \`test-\${Date.now()}-\${testInfo.workerIndex}\`,
      workerIndex: testInfo.workerIndex,
      userData: {},
      metadata: {
        startTime: Date.now(),
        tags: testInfo.tags,
        environment: process.env.NODE_ENV || 'staging',
      },
    };
    
    console.log(\`\\n🚀 [Worker \${testInfo.workerIndex}] Started: \${context.testRunId}\`);
    await use(context);
    
    const duration = Date.now() - context.metadata.startTime;
    console.log(\`✅ [Worker \${testInfo.workerIndex}] Completed in \${duration}ms\\n\`);
    
    context.sharedData.clear();
  },
  
  logger: async ({ testContext }, use) => {
    const logger = new Logger(\`Worker-\${testContext.workerIndex}\`);
    await use(logger);
  },
  
  loginPage: async ({ page, testContext }, use) => {
    await use(new LoginPage(page, testContext));
  },
  
  dashboardPage: async ({ page, testContext }, use) => {
    await use(new DashboardPage(page, testContext));
  },
});

export { expect } from '@playwright/test';`,

  'src/pages/base/BasePage.ts': `import { Page, Locator, expect } from '@playwright/test';
import { TestContext } from '../../fixtures/test-fixtures';
import { Logger } from '../../utils/Logger';

export class BasePage {
  protected page: Page;
  protected context: TestContext;
  protected logger: Logger;

  constructor(page: Page, context: TestContext) {
    this.page = page;
    this.context = context;
    this.logger = new Logger(\`\${this.constructor.name}-\${context.testRunId}\`);
  }

  async navigateTo(url: string) {
    this.logger.info(\`Navigating to: \${url}\`);
    await this.page.goto(url, { waitUntil: 'networkidle' });
  }

  async click(locator: Locator) {
    await locator.click();
  }

  async fill(locator: Locator, text: string) {
    await locator.clear();
    await locator.fill(text);
  }

  async getText(locator: Locator): Promise<string> {
    return (await locator.textContent()) || '';
  }

  async assertVisible(locator: Locator) {
    await expect(locator).toBeVisible();
  }
}`,

  'src/pages/auth/LoginPage.ts': `import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base/BasePage';
import { TestContext } from '../../fixtures/test-fixtures';

export class LoginPage extends BasePage {
  private usernameInput: Locator;
  private passwordInput: Locator;
  private loginButton: Locator;

  constructor(page: Page, context: TestContext) {
    super(page, context);
    this.usernameInput = page.locator('#username');
    this.passwordInput = page.locator('#password');
    this.loginButton = page.locator('button[type="submit"]');
  }

  async goto() {
    await this.navigateTo('/login');
  }

  async login(username: string, password: string) {
    this.logger.info(\`Logging in as: \${username}\`);
    await this.fill(this.usernameInput, username);
    await this.fill(this.passwordInput, password);
    await this.click(this.loginButton);
    
    this.context.userData.username = username;
    this.context.sharedData.set('loginTimestamp', Date.now());
    
    await this.page.waitForURL(/dashboard|home/);
    
    const token = await this.page.evaluate(() => localStorage.getItem('authToken'));
    if (token) {
      this.context.userData.token = token;
    }
  }

  async isOnLoginPage(): Promise<boolean> {
    return this.page.url().includes('/login');
  }
}`,

  'src/pages/dashboard/DashboardPage.ts': `import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base/BasePage';
import { TestContext } from '../../fixtures/test-fixtures';

export class DashboardPage extends BasePage {
  private welcomeMessage: Locator;

  constructor(page: Page, context: TestContext) {
    super(page, context);
    this.welcomeMessage = page.locator('.welcome-message');
  }

  async goto() {
    await this.navigateTo('/dashboard');
  }

  async isOnDashboard(): Promise<boolean> {
    return this.page.url().includes('/dashboard');
  }
}`,

  'src/utils/Logger.ts': `export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  info(message: string) {
    console.log(\`[\${this.context}] INFO: \${message}\`);
  }

  error(message: string, error?: Error) {
    console.error(\`[\${this.context}] ERROR: \${message}\`, error?.stack);
  }

  warn(message: string) {
    console.warn(\`[\${this.context}] WARN: \${message}\`);
  }
}`,

  'src/steps/auth/login.steps.ts': `import { Given, When, Then } from '@cucumber/cucumber';
import { test, expect } from '../../fixtures/test-fixtures';

Given('I am on the login page', async ({ loginPage }) => {
  await loginPage.goto();
});

When('I login with username {string} and password {string}', 
  async ({ loginPage, testContext }, username: string, password: string) => {
    testContext.sharedData.set('username', username);
    await loginPage.login(username, password);
});

Then('I should be logged in successfully', async ({ dashboardPage, testContext }) => {
  const isOnDashboard = await dashboardPage.isOnDashboard();
  expect(isOnDashboard).toBeTruthy();
  expect(testContext.userData.token).toBeDefined();
});`,

  'features/auth/login.feature': `@smoke @auth @login
Feature: User Login

  @positive @critical
  Scenario: Successful login
    Given I am on the login page
    When I login with username "john@example.com" and password "password123"
    Then I should be logged in successfully`,

  'teams/sch/features/ui/scheduling.feature': `@sch @ui @scheduling @smoke
Feature: Schedule Management

  @positive
  Scenario: View schedules
    Given I am on the schedules page
    Then I should see the schedules list`,

  'teams/sch/steps/scheduling.steps.ts': `import { Given, Then } from '@cucumber/cucumber';
import { test, expect } from '../../../../src/fixtures/test-fixtures';

Given('I am on the schedules page', async ({ page }) => {
  await page.goto('/scheduling/schedules');
});

Then('I should see the schedules list', async ({ page }) => {
  const list = page.locator('.schedules-list');
  await list.waitFor({ state: 'visible' });
});`,

  'teams/sch/README.md': `# SCH Team Tests

## Running
\`\`\`bash
npm run test:sch
npm run test:sch:ui
\`\`\``,

};

// ==================== FOLDER STRUCTURE ====================

const folders = [
  'src/fixtures',
  'src/pages/base',
  'src/pages/auth',
  'src/pages/dashboard',
  'src/steps/auth',
  'src/utils',
  'src/config',
  'teams/sch/features/ui',
  'teams/sch/features/api',
  'teams/sch/steps',
  'teams/ta/features/ui',
  'teams/ta/steps',
  'features/auth',
  'shared/pages',
  'shared/utils',
  'scripts',
  'reports',
  'logs',
  'docs',
];

// ==================== MAIN SETUP ====================

async function setup() {
  log('\n🎭 Playwright + Cucumber Framework Setup\n', 'cyan');
  
  log('📁 Creating folders...', 'blue');
  folders.forEach((folder) => {
    const folderPath = path.join(process.cwd(), folder);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
      log(`   ✅ ${folder}`, 'green');
    }
  });
  
  log('\n📄 Creating files...', 'blue');
  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(process.cwd(), filePath);
    const dir = path.dirname(fullPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(fullPath, content);
    log(`   ✅ ${filePath}`, 'green');
  }
  
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    fs.copyFileSync(
      path.join(process.cwd(), '.env.example'),
      envPath
    );
    log('\n🔑 Created .env file', 'yellow');
  }
  
  log('\n✅ Setup completed!\n', 'green');
  log('📚 Next steps:', 'cyan');
  log('   1. npm install', 'yellow');
  log('   2. npx playwright install --with-deps', 'yellow');
  log('   3. npm run test:sch\n', 'yellow');
}

if (require.main === module) {
  const autoMode = process.argv.includes('--auto');
  
  if (autoMode) {
    setup().catch((error) => {
      log(`\n❌ Error: ${error.message}`, 'red');
      process.exit(1);
    });
  } else {
    log('\n⚠️  Run with --auto:\n', 'yellow');
    log('   node setup-framework-fixed.js --auto\n', 'cyan');
  }
}

module.exports = { setup };
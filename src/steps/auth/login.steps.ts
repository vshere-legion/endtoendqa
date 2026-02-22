import { createBdd } from 'playwright-bdd';
import { test, expect } from '../../fixtures/test-fixtures';

const { Given, When, Then } = createBdd(test);

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
});
import { createBdd } from 'playwright-bdd';
import { test } from '../../../src/fixtures/test-fixtures';

const { Before, After } = createBdd(test);

Before(async function () {
  console.log('Starting SCH test');
});

After(async function () {
  console.log('SCH test completed');
});
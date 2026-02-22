/**
 * Slack Notification Script — sends test results to Slack via webhook.
 *
 * Called from GitHub Actions after test completion.
 *
 * Environment variables:
 *   SLACK_WEBHOOK_URL  - Slack Incoming Webhook URL (required)
 *   TEST_RESULT        - 'success' | 'failure' | 'cancelled' (from GitHub Actions)
 *   GITHUB_RUN_URL     - Link to the workflow run
 *   TEST_ENV           - Target environment
 *   ENTERPRISE         - Enterprise name
 *   TEST_TEAM          - Team filter
 *   GITHUB_REPOSITORY  - e.g., 'legionco/playwright-cucumber-legion-framework-v2'
 *   GITHUB_REF_NAME    - Branch name
 *   GITHUB_ACTOR       - User who triggered the run
 *   GITHUB_EVENT_NAME  - 'workflow_dispatch', 'pull_request', 'schedule'
 */

const https = require('https');
const url = require('url');

const webhookUrl = process.env.SLACK_WEBHOOK_URL;
if (!webhookUrl) {
  console.log('[SlackNotify] No SLACK_WEBHOOK_URL set. Skipping notification.');
  process.exit(0);
}

const testResult = process.env.TEST_RESULT || 'unknown';
const runUrl = process.env.GITHUB_RUN_URL || '';
const env = process.env.TEST_ENV || 'unknown';
const enterprise = process.env.ENTERPRISE || 'unknown';
const team = process.env.TEST_TEAM || 'all';
const repo = process.env.GITHUB_REPOSITORY || '';
const branch = process.env.GITHUB_REF_NAME || '';
const actor = process.env.GITHUB_ACTOR || '';
const trigger = process.env.GITHUB_EVENT_NAME || '';

// ─── Status Mapping ─────────────────────────────────────
const statusConfig = {
  success: { emoji: ':white_check_mark:', color: '#36a64f', text: 'PASSED' },
  failure: { emoji: ':x:', color: '#e01e5a', text: 'FAILED' },
  cancelled: { emoji: ':warning:', color: '#f2c744', text: 'CANCELLED' },
  unknown: { emoji: ':question:', color: '#808080', text: 'UNKNOWN' },
};

const status = statusConfig[testResult] || statusConfig.unknown;

// ─── Trigger Label ──────────────────────────────────────
const triggerLabels = {
  workflow_dispatch: 'Manual',
  pull_request: 'PR',
  schedule: 'Nightly',
  push: 'Push',
};
const triggerLabel = triggerLabels[trigger] || trigger;

// ─── Build Slack Message ────────────────────────────────
const payload = {
  blocks: [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${status.emoji} Playwright Tests ${status.text}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Environment:*\n${env}` },
        { type: 'mrkdwn', text: `*Enterprise:*\n${enterprise}` },
        { type: 'mrkdwn', text: `*Team:*\n${team}` },
        { type: 'mrkdwn', text: `*Trigger:*\n${triggerLabel}` },
        { type: 'mrkdwn', text: `*Branch:*\n${branch}` },
        { type: 'mrkdwn', text: `*Triggered by:*\n${actor}` },
      ],
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'View Run', emoji: true },
          url: runUrl,
          style: testResult === 'success' ? 'primary' : 'danger',
        },
      ],
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `${repo} | ${new Date().toISOString().slice(0, 19).replace('T', ' ')} UTC`,
        },
      ],
    },
  ],
};

// ─── Send to Slack ──────────────────────────────────────
const parsedUrl = new URL(webhookUrl);
const postData = JSON.stringify(payload);

const options = {
  hostname: parsedUrl.hostname,
  port: 443,
  path: parsedUrl.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
  },
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => (body += chunk));
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('[SlackNotify] Notification sent successfully.');
    } else {
      console.error(`[SlackNotify] Failed: ${res.statusCode} — ${body}`);
      process.exit(1);
    }
  });
});

req.on('error', (err) => {
  console.error(`[SlackNotify] Request error: ${err.message}`);
  process.exit(1);
});

req.write(postData);
req.end();

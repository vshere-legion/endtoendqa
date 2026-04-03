#!/usr/bin/env python3
"""Generate a sample report to verify the Excel generator works correctly."""

import json
import os

sample_data = {
    "batch_id": 1,
    "defects": [
        {
            "defect_id": "PLAT-1001",
            "project": "Platform",
            "summary": "API returns 500 when session token expires during request",
            "severity": "S1 - Urgent",
            "linked_prs": ["https://github.example.com/legion/platform/pull/456"],
            "pr_summaries": [
                "Modified SessionTokenHandler.java to catch TokenExpiredException mid-request.\nAdded retry logic in ApiGatewayFilter for expired token scenarios."
            ],
            "defect_description": "API calls fail with 500 error when session token expires mid-request.\nAdded token expiry handling and retry logic in API gateway.\nTo prevent user-facing errors during normal session lifecycle.",
            "pr_description": "SessionTokenHandler did not catch mid-request token expiration.\nAdded TokenExpiredException handling and retry in ApiGatewayFilter.\nTo gracefully handle token expiry without returning 500 to users.",
            "code_description": "SessionTokenHandler.java lacked catch block for TokenExpiredException.\nAdded try-catch in request processing and retry logic in ApiGatewayFilter.\nTo prevent unhandled exception propagation when tokens expire during active requests.",
            "why_qa_missed": "Edge-case",
            "qa_recommendation": "Add integration test for token expiry during in-flight API requests",
            "why_dev_missed": "Assumption",
            "dev_recommendation": "Implement automatic token refresh in API gateway middleware"
        },
        {
            "defect_id": "PLAT-1002",
            "project": "Platform",
            "summary": "Scheduler fails silently when timezone config missing",
            "severity": "S2 - High",
            "linked_prs": ["https://github.example.com/legion/platform/pull/457", "https://github.example.com/legion/platform/pull/460"],
            "pr_summaries": [
                "Modified SchedulerConfig.java to fail fast when timezone is null.\nTo prevent silent downstream failures from missing config.",
                "Added default timezone fallback in CronJobRunner.java.\nTo ensure scheduler operates even when config is partially missing."
            ],
            "defect_description": "Scheduler ran silently with null timezone causing incorrect job execution times.\nAdded fail-fast null check and default timezone fallback.\nTo prevent silent failures in production where staging had defaults configured.",
            "pr_description": "SchedulerConfig allowed null timezone to pass through without error.\nAdded null check with fail-fast and CronJobRunner fallback.\nTo catch config issues at startup rather than producing wrong results silently.",
            "code_description": "SchedulerConfig.java had no null check on timezone property.\nAdded IllegalStateException on null timezone and UTC fallback in CronJobRunner.\nTo enforce config presence at startup and provide safe fallback.",
            "why_qa_missed": "Environment",
            "qa_recommendation": "Add config parity check between staging and prod environments before release",
            "why_dev_missed": "Assumption",
            "dev_recommendation": "Add startup validation for all required config keys with clear error messages"
        },
        {
            "defect_id": "TA-2001",
            "project": "Time Attendance",
            "summary": "Overtime calculation wrong for employees with split shifts",
            "severity": "S1 - Urgent",
            "linked_prs": ["https://github.example.com/legion/ta/pull/789"],
            "pr_summaries": [
                "Modified OvertimeCalculator.java to aggregate hours across split shift segments.\nFixed boundary condition where gap between segments was counted as work time."
            ],
            "defect_description": "Overtime calculated incorrectly for split shift employees; segments treated independently.\nAggregated hours across shift segments before applying overtime rules.\nTo ensure correct payroll for employees working non-contiguous shifts.",
            "pr_description": "OvertimeCalculator treated each shift segment as independent for overtime.\nConsolidated segment hours and fixed gap-as-work boundary bug.\nTo apply overtime rules on total daily hours, not per-segment.",
            "code_description": "OvertimeCalculator.java calculated overtime per ShiftSegment instead of aggregated.\nAdded ShiftAggregator call before overtime logic and fixed gap boundary condition.\nTo correctly sum work hours across split segments for overtime threshold.",
            "why_qa_missed": "Coverage",
            "qa_recommendation": "Add test scenarios for split shifts, double shifts, and cross-midnight shifts in overtime suite",
            "why_dev_missed": "Logic",
            "dev_recommendation": "Add unit tests for OvertimeCalculator with multi-segment shift inputs"
        },
        {
            "defect_id": "TA-2002",
            "project": "Time Attendance",
            "summary": "Punch-in button unresponsive after Android 14 update",
            "severity": "S1 - Urgent",
            "linked_prs": [],
            "pr_summaries": [],
            "defect_description": "Punch-in button stopped responding on Android 14 devices after OS update.\nAndroid 14 API change broke touch event handling on custom button component.\nOS-level breaking change not caught before release.",
            "pr_description": "No PR linked",
            "code_description": "No PR linked",
            "why_qa_missed": "Regression",
            "qa_recommendation": "Add mobile UI automation covering punch-in/out flows on latest Android versions",
            "why_dev_missed": "Dependency",
            "dev_recommendation": "Subscribe to Android API changelog and test custom UI components against beta OS releases"
        },
    ]
}

os.makedirs("rca_results", exist_ok=True)
with open("rca_results/batch_1.json", "w") as f:
    json.dump(sample_data, f, indent=2)

print("Sample batch written to rca_results/batch_1.json")

os.system('python3 generate_report.py --input rca_results/ --output "RCA_Summer_2025_sample_report.xlsx" --title "Pareto — QA Missed Reasons — Summer 2025 — Platform, Time Attendance"')

@sch @mode:serial @schedule @shift-flow @group-HardStopForMinorViolation
Feature: Schedule Shift Creation and Validation Flow
  As an Internal Admin
  I want to create shifts via UI and API, then validate them
  So that I can verify end-to-end schedule management works correctly

  This feature runs 5 sequential scenarios with a shared browser session.
  Data flows between scenarios via TestContext (cross-scenario state).

  @step1
  Scenario: Login and create schedule for next week
    Given I login as "InternalAdmin" and navigate to the location
    When I navigate to schedule for next week
    Then a schedule should exist for the current week
    And I should see the schedule hours on the smart card

  @step2
  Scenario: Create shift via UI on Friday
    Given I am on the schedule page from previous scenario
    When I edit the schedule and create a new shift with:
      | workRole   | startTime | endTime  | day    | assignment                          |
      | Cafe       | 9:00 AM   | 1:00 PM  | Friday | Assign or Offer to Specific TM's    |
    And I save the schedule changes
    Then the UI shift should be created successfully

  @step3
  Scenario: Create shift via API on Saturday and publish schedule
    Given I am on the dashboard from previous scenario
    When I create a shift via API for Saturday with role "Cafe" and time "9:00 AM - 1:00 PM"
    And I publish the schedule for the current week
    Then the API shift should be created and schedule published

  @step4
  Scenario: Validate both shifts via API
    Given shifts were created in previous scenarios
    When I validate shifts via the GET shifts API
    Then both UI and API shifts should be found
    And the employee external ID should match
    And the shift timing should match

  @step5
  Scenario: Export report and verify shifts in CSV
    Given shift IDs are available from validation
    When I export the shift report for the current week
    Then the UI shift ID should be found in the export
    And the API shift ID should be found in the export

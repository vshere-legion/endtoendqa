@sch @p2p @mode:serial @p2p-dm @P2-High @Regression @GA @Team-SCH @group-P2PLGTest
Feature: P2P LG District Manager Views and Analytics
  As an Internal Admin
  I want to verify DM view data accuracy for P2P location groups
  So that district managers see correct schedule, compliance, and timesheet analytics

  Background:
    Given I am logged in as "InternalAdmin"

  @step1
  Scenario: Verify status of P2P in DM views
    Given I navigate to the schedule page
    And I create P2P schedules at peer locations with different statuses
    When I switch to DM view
    Then each location's status should display correctly in the DM view
    And the status indicators should accurately reflect:
      | indicator   |
      | Generated   |
      | Published   |
      | Ungenerated |

  @step2
  Scenario: Verify District Summary widget on Dashboard in Region view with LG
    Given I create P2P schedules at district and region level with LG locations
    When I navigate to the Dashboard in Region view
    Then the District Summary widget should display correct data:
      | metric              |
      | Shift counts        |
      | Coverage percentage |
      | Budget hours        |
    And the widget data should match the source schedule data

  @step3
  Scenario: Verify Location Summary widget on Dashboard in DM view with LG
    Given I am on the dashboard from previous scenario
    And I create P2P schedules at location level
    When I navigate to the Dashboard in DM view
    Then the Location Summary widget should show correct aggregated data
    And the data should be consistent across views

  @step4
  Scenario: Verify analytics table on Schedule in DM view with LG
    Given I create P2P schedules with LG locations
    When I navigate to the DM Schedule view
    Then the analytics table should display:
      | column             |
      | Total shifts       |
      | Assigned shifts    |
      | Open shifts        |
      | Coverage %         |
      | Budget utilization |
    And all values should be accurate

  @step5
  Scenario: Verify analytics table on Compliance in DM view with LG
    Given I am in the DM view from previous scenario
    When I navigate to the DM Compliance view
    Then the compliance analytics table should display:
      | column                  |
      | Violations count        |
      | Compliance rules        |
      | Red flag indicators     |
    And the data should match the schedule compliance data

  @step6
  Scenario: Verify analytics table on Timesheet in DM view with LG
    Given I am in the DM view from previous scenario
    When I navigate to the DM Timesheet view
    Then the timesheet analytics table should display:
      | column           |
      | Hours worked     |
      | Labor costs      |
      | Utilization      |
    And the calculations should be correct

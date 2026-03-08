@sch @p2p @mode:serial @p2p-schedule @P2-High @Regression @GA @Team-SCH @group-P2PLGTest
Feature: P2P LG Schedule Generation and Validation
  As an Internal Admin
  I want to generate P2P location group schedules and verify smart cards, buttons, and navigation
  So that I can confirm the P2P schedule generation workflow works correctly

  Background:
    Given I am logged in as "InternalAdmin"

  @step1
  Scenario: Generate P2P LG schedule with time range
    Given I navigate to the schedule page
    And I click on the Overview tab and then the Schedule tab
    When I navigate to next week
    And I ungenerate the active schedule if already generated
    And I create a P2P LG schedule with time range "06:00am" to "06:00am"
    Then the schedule should be generated successfully
    And I should see the operating hours display correctly in Toggle Summary View

  @step2
  Scenario: Verify all smart cards display correctly after schedule generation
    Given I am on the schedule page from previous scenario
    When I delete all unassigned shifts
    And I apply the location filter
    Then I should see the "Schedule Not Published" smart card
    When I create shifts with specific values
    Then I should see the Compliance smart card with red flags
    When I switch to day view
    Then the smart cards should persist in day view
    And I should see the staffing smart card with correct data
    And I should see the coverage smart card with correct data

  @step3 @wip
  Scenario: Verify schedule page buttons and controls
    Given I am on the schedule page from previous scenario
    When I switch back to week view
    Then the following buttons should be displayed and functional:
      | button          |
      | Edit            |
      | Delete          |
      | Publish         |
      | Filter          |
      | Group By        |
    And the schedule toolbar should display correctly

  @step4 @wip
  Scenario: Verify navigation across roster, schedule, and dashboard
    Given I am on the schedule page from previous scenario
    When I navigate to the Dashboard
    Then the dashboard should load with P2P LG data
    When I navigate to the Roster page
    Then the roster should display team members for the location group
    When I navigate back to the schedule page
    Then the schedule should display with the previously generated data
    And all navigation links should be functional

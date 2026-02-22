@sch @p2p @mode:serial @p2p-shifts @P2-High @Regression @GA @Team-SCH @group-P2PLGTest
Feature: P2P LG Auto and Manual Open Shifts
  As an Internal Admin
  I want to create auto and manual open shifts in week and day views
  So that I can fill staffing gaps across the location group

  Background:
    Given I am logged in as "InternalAdmin"

  @step1
  Scenario: Auto open shift in week view
    Given I navigate to the schedule page
    And I navigate 3 weeks ahead
    And I create a P2P LG schedule if not already generated
    When I select a random shift with an assigned TM
    And I note the shift work role
    And I apply the location filter
    And I delete the TM shifts to create open positions
    And I configure auto-open shifts for the work role
    Then auto-open shifts should be created automatically
    And the auto-open shift count should match the deleted positions

  @step2
  Scenario: Auto open shift in day view
    Given I am on the schedule page from previous scenario
    And I create a P2P LG schedule if not already generated
    When I select a random shift with an assigned TM
    And I apply the location filter
    And I delete the TM shifts to create open positions
    And I switch to day view
    And I configure auto-open shifts for the work role
    Then auto-open shifts should be created in day view
    And the shifts should display correctly in the day view layout

  @step3
  Scenario: Manual open shift in week view
    Given I navigate to the schedule page
    And I navigate to next week
    And I create a P2P LG schedule if not already generated
    When I select a random assigned shift and note its work role
    And I get the child location names
    And I delete the existing shifts
    And I manually create open shifts with:
      | workRole      | from shift data |
      | location      | child location  |
      | shiftCount    | 2               |
    Then the manual open shifts should be created successfully
    And the shifts should appear in the schedule for the correct location

  @step4
  Scenario: Manual open shift in day view
    Given I am on the schedule page from previous scenario
    And I create a P2P LG schedule if not already generated
    When I switch to day view
    And I manually create open shifts in day view with:
      | workRole      | from shift data |
      | location      | child location  |
      | shiftCount    | 1               |
    Then the manual open shifts should be created in day view
    And the shifts should display correctly in the day view context

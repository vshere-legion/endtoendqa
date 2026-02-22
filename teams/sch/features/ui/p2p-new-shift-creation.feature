@sch @p2p @mode:serial @p2p-shifts @P2-High @Regression @GA @Team-SCH @group-P2PLGTest
Feature: P2P LG New Shift Creation UI Workflows
  As an Internal Admin
  I want to use the new create shift UI to assign, manually offer, and auto offer TMs
  So that I can efficiently create and fill shifts across the location group

  Background:
    Given I am logged in as "InternalAdmin"

  @step1
  Scenario: Assign TMs workflow via new create shift UI
    Given I navigate to the schedule page
    And I create a P2P LG schedule if not already generated
    And I apply the single location filter
    When I switch to day view
    And I click "Add New Shift" button
    And I fill in the new shift details:
      | field     | value           |
      | workRole  | from shift data |
      | startTime | 9:00 AM         |
      | endTime   | 1:00 PM         |
    And I select "Assign" as the TM assignment method
    And I select team members to assign
    And I save the new shift
    Then the shift should be created with the assigned TMs
    And the group by options should show single location correctly

  @step2
  Scenario: Manual offer TMs workflow via new create shift UI
    Given I am on the schedule page from previous scenario
    And I create a P2P LG schedule if not already generated
    When I click "Add New Shift" button
    And I fill in the new shift details:
      | field     | value           |
      | workRole  | from shift data |
      | startTime | 10:00 AM        |
      | endTime   | 2:00 PM         |
    And I select "Manual Offer" as the TM assignment method
    And I select team members to offer the shift to
    And I save the new shift
    Then the shift should be created with manual offer status
    And the offered TMs should be able to accept or decline

  @step3
  Scenario: Auto offer TMs workflow via new create shift UI
    Given I am on the schedule page from previous scenario
    And I create a P2P LG schedule if not already generated
    When I click "Add New Shift" button
    And I fill in the new shift details:
      | field     | value           |
      | workRole  | from shift data |
      | startTime | 11:00 AM        |
      | endTime   | 3:00 PM         |
    And I select "Auto Offer" as the TM assignment method
    And I save the new shift
    Then the shift should be created with auto offer enabled
    And eligible TMs should be automatically offered the shift
    And the auto-offer should respect TM constraints

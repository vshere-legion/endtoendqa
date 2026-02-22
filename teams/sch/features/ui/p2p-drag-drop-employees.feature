@sch @p2p @mode:serial @p2p-shifts @P2-High @Regression @GA @Team-SCH @group-P2PLGTest
Feature: P2P LG Drag and Drop Employee Operations
  As an Internal Admin
  I want to drag and drop employees across locations
  So that I can reassign all of an employee's shifts to a different location

  Background:
    Given I am logged in as "InternalAdmin"

  @step1
  Scenario: Drag and drop employee to same location
    Given I navigate to the schedule page
    And I create a P2P LG schedule if not already generated
    When I select an employee row in the schedule
    And I drag the employee to the same location
    Then all of the employee's shifts should remain at that location
    And the shift details should be preserved
    And scheduling constraints should be maintained

  @step2
  Scenario: Drag and drop employee to different location
    Given I am on the schedule page from previous scenario
    And I create a P2P LG schedule if not already generated
    When I select an employee row in the schedule
    And I drag the employee to a different location
    Then all of the employee's shifts should be moved to the new location
    And no conflicts with existing assignments should occur
    And the employee's schedule should reflect the location change

@sch @p2p @mode:serial @p2p-shifts @P2-High @Regression @GA @Team-SCH @group-P2PLGTest
Feature: P2P LG Shift Assignment with Constraints
  As an Internal Admin
  I want to assign TMs to shifts with proper constraint enforcement
  So that scheduling rules are respected across the location group

  Background:
    Given I am logged in as "InternalAdmin"

  @step1
  Scenario: Assign TM to shift
    Given I navigate to the schedule page
    And I navigate to next week
    And I create a P2P LG schedule if not already generated
    When I select two different shifts with assigned TMs
    And I get the first TM work role
    And I get the second TM work role
    And I perform shift assignment for the first TM
    Then the TM should be assigned to the shift successfully
    And the schedule should reflect the new assignment

  @step2
  Scenario: Assign TM when TM has time off on that day
    Given I navigate to the schedule page
    And I navigate to next week
    And I create a P2P LG schedule if not already generated
    And I get the child location names
    When I logout and login as "StoreManager"
    And I navigate to My Profile and then My Time Off
    And I create or verify a time off request for "JURY DUTY"
    And I ensure the time off request is approved
    And I logout and login as "InternalAdmin"
    And I navigate to the schedule page
    And I attempt to assign the TM with time off to a shift on that day
    Then the assignment should show a time off restriction warning
    And the system should handle the time off conflict appropriately

  @step3
  Scenario: Assign TM when max number of shifts reached
    Given I navigate to the schedule page
    And I create a P2P LG schedule if not already generated
    And I get the child location names
    When I select a random shift with an assigned TM
    And the TM has reached the maximum number of scheduled shifts
    And I attempt to assign an additional shift to the TM
    Then the system should prevent the assignment
    And an error message should indicate maximum shifts reached

  @step4
  Scenario: Assign TM with overlapping shift violation
    Given I navigate to the schedule page
    And I navigate to the appropriate week
    And I create a P2P LG schedule if not already generated
    When I select a shift that overlaps with an existing TM assignment
    And I attempt to assign the TM to the overlapping shift
    Then the system should detect the overlapping violation
    And the assignment should be prevented with an overlap warning

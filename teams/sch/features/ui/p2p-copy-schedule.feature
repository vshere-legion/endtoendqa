@sch @p2p @mode:serial @p2p-schedule @P2-High @Regression @GA @Team-SCH @group-P2PLGTest
Feature: P2P LG Copy Schedule and Multi-User Operations
  As an Internal Admin
  I want to copy schedules and verify multi-user concurrent operations
  So that schedule management works correctly across users

  Background:
    Given I am logged in as "InternalAdmin"

  @step1
  Scenario: Copy schedule to next week
    Given I navigate to the schedule page
    And I click on the Overview tab and then the Schedule tab
    And I navigate 2 weeks ahead
    And I ungenerate the active schedule if already generated
    When I create a P2P LG schedule with Sunday closed
    And I delete all unassigned shifts
    And I apply the location filter
    And I note the current shift count and details
    And I copy the schedule to the following week
    And I navigate to the following week
    Then the copied schedule should contain the same shifts
    And the shift details should match the source week

  @step2
  Scenario: Operate P2P LG schedule by different users
    Given I navigate to the schedule page
    And I create a P2P LG schedule if not already generated
    When I make modifications to the schedule as User A
    And I note the changes made
    And I logout and login as "StoreManager"
    And I navigate to the schedule page
    Then the changes made by User A should be visible
    When I make additional modifications as User B
    And I logout and login as "InternalAdmin"
    And I navigate to the schedule page
    Then the changes made by User B should be visible
    And no conflicts should exist between concurrent operations

@sch @p2p @mode:serial @p2p-schedule @P2-High @Regression @GA @Team-SCH @group-P2PLGTest
Feature: P2P LG Peer Location Operations
  As an Internal Admin
  I want to manage schedules across peer locations in the location group
  So that I can coordinate scheduling across all child locations

  Background:
    Given I am logged in as "InternalAdmin"

  @step1
  Scenario: Verify peer locations in Schedule Overview page
    Given I navigate to the schedule page
    And I create a P2P LG schedule if not already generated
    When I navigate to the Schedule Overview page
    Then peer locations should be displayed
    And I should be able to filter by peer location
    And peer location specific data should display correctly

  @step2
  Scenario: Copy or move shifts to sub-locations using location group
    Given I am on the schedule page from previous scenario
    And I create a P2P LG schedule for the location group
    When I select shifts at a parent location
    And I move the shifts to a sub-location within the same location group
    Then the shifts should be distributed to the sub-location correctly
    When I select additional shifts
    And I copy the shifts to another sub-location
    Then the copies should be created at the target sub-location
    And original shifts should remain unchanged

  @step3
  Scenario: Create schedule for all peer locations
    Given I navigate to the schedule page
    When I generate the schedule for the parent location
    Then a schedule should be created for the parent location
    When I navigate through each peer location
    Then each peer location should have a generated schedule
    And the schedules should be independent but coordinated

  @step4
  Scenario: Verify actions for each peer location in different status
    Given I have peer locations with different schedule statuses:
      | location | status      |
      | Peer001  | Ungenerated |
      | Peer002  | Generated   |
      | Peer003  | Published   |
    When I view each peer location
    Then the available actions should match the location status:
      | status      | expectedActions                      |
      | Ungenerated | Generate                             |
      | Generated   | Publish, Edit, Delete, Copy          |
      | Published   | Republish, Edit, Copy                |
    And action buttons should be enabled or disabled appropriately

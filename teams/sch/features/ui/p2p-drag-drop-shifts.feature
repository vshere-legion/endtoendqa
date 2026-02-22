@sch @p2p @mode:serial @p2p-shifts @P2-High @Regression @GA @Team-SCH @group-P2PLGTest
Feature: P2P LG Drag and Drop Shift Operations
  As an Internal Admin
  I want to drag and drop shifts to move or copy them across days and locations
  So that I can efficiently reorganize the schedule

  Background:
    Given I am logged in as "InternalAdmin"

  @step1
  Scenario: Bulk drag and drop shifts to same day and same location creates open shifts
    Given I navigate to the schedule page
    And I navigate to next week
    And I ungenerate the active schedule if already generated
    And I create a P2P LG schedule via non-DG flow
    And I delete any existing open shifts
    When I select multiple shifts with assigned TMs
    And I drag and drop them to the same day and same location
    Then open shifts should be created instead of assigned shifts
    And the number of open shifts should match the dragged shifts

  @step2
  Scenario: Move shifts to same day and another location
    Given I am on the schedule page from previous scenario
    And I create a P2P LG schedule if not already generated
    When I select shifts at location A
    And I drag and drop them to the same day but location B
    Then the shifts should be moved to location B
    And the shifts should no longer appear at location A
    And no scheduling conflicts should be created

  @step3
  Scenario: Copy shifts to same day and another location
    Given I am on the schedule page from previous scenario
    And I create a P2P LG schedule if not already generated
    When I select shifts at location A
    And I copy them to the same day but location B
    Then the original shifts should remain at location A
    And copies should be created at location B
    And the copied shift details should match the originals

  @step4
  Scenario: Move shifts to another day and another location
    Given I am on the schedule page from previous scenario
    And I create a P2P LG schedule if not already generated
    When I select shifts
    And I drag and drop them to a different day and different location
    Then the shifts should be moved to the new day and location
    And time buffer constraints should be respected
    And no overlapping violations should occur

  @step5
  Scenario: Copy shifts to another day and another location
    Given I am on the schedule page from previous scenario
    And I create a P2P LG schedule if not already generated
    When I select shifts at location A
    And I copy them to a different day at location B
    Then the original shifts should remain unchanged
    And copies should be created at the new day and location
    And all copied shift details should be accurate

  @step6
  Scenario: Drag and drop single shift to same location
    Given I am on the schedule page from previous scenario
    And I create a P2P LG schedule if not already generated
    When I select a single shift
    And I drag it to another day within the same location
    Then the shift should be moved to the new day
    And the shift time and details should be preserved
    And no scheduling conflicts should be created

  @step7
  Scenario: Drag and drop single shift to different location
    Given I am on the schedule page from previous scenario
    And I create a P2P LG schedule if not already generated
    When I select a single shift at location A
    And I drag it to location B
    Then the shift should be moved to location B
    And TM buffer time constraints should be validated
    And no skill or role mismatches should occur

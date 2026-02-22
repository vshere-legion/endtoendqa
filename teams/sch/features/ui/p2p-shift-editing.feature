@sch @p2p @mode:serial @p2p-shifts @P2-High @Regression @GA @Team-SCH @group-P2PLGTest
Feature: P2P LG Shift Editing Operations
  As an Internal Admin
  I want to edit single and multiple shifts with location and constraint validation
  So that shift modifications respect P2P rules and buffer times

  Background:
    Given I am logged in as "InternalAdmin"

  @step1
  Scenario: Verify content on multi-edit shifts window
    Given I navigate to the schedule page
    And I create a P2P LG schedule if not already generated
    When I select multiple shifts across different days and TMs
    And I open the "Edit Multiple Shifts" dialog
    Then the dialog should show:
      | field        |
      | Location     |
      | Work Role    |
      | Start Time   |
      | End Time     |
      | Bulk Options |
    And bulk edit options should be available
    When I edit common properties across the selected shifts
    And I save the bulk edit
    Then all selected shifts should be updated with the new values

  @step2
  Scenario: Verify content on single edit shift window
    Given I am on the schedule page from previous scenario
    And I create a P2P LG schedule if not already generated
    When I select a single shift
    And I open the "Edit Shift" dialog
    Then the dialog should show:
      | field          |
      | Shift Date     |
      | Start Time     |
      | End Time       |
      | Location       |
      | Assigned TM    |
      | Work Role      |
      | Edit Buttons   |
    When I edit the shift start and end time
    And I save the single shift edit
    Then the shift should be updated with the new times

  @step3
  Scenario: TM cannot have shift in more than one location without buffer time
    Given I am on the schedule page from previous scenario
    And I create a P2P LG schedule if not already generated
    When I select a TM with shifts at location A
    And I attempt to assign the same TM to location B without sufficient buffer time
    Then the system should prevent the assignment
    And an error message should indicate buffer time requirement
    When I add a shift with sufficient buffer time between locations
    Then the assignment should succeed
    And the TM should have shifts at both locations with proper buffer

  @step4
  Scenario: Change location on multi-edit shifts window
    Given I am on the schedule page from previous scenario
    And I create a P2P LG schedule if not already generated
    When I select multiple shifts at different locations
    And I open the "Edit Multiple Shifts" dialog
    And I change the location for all selected shifts to a new location
    And I save the bulk edit
    Then all selected shifts should be moved to the new location
    And no scheduling conflicts should be created

  @step5
  Scenario: Verify budget and guidance column in child location
    Given I am on the schedule page from previous scenario
    And I create P2P schedules at the parent location
    When I view the budget and guidance columns
    Then the columns should display correctly at the parent level
    When I navigate to a peer child location
    Then the budget and guidance columns should still display correctly
    And the values should update if the child location has a different budget

  @step6
  Scenario: Change location on single edit shift window
    Given I am on the schedule page from previous scenario
    And I create a P2P LG schedule if not already generated
    When I select a single shift at location A
    And I open the "Edit Shift" dialog
    And I change the location to location B
    And I save the single shift edit
    Then the shift should be moved to location B
    And all constraints should still apply at the new location

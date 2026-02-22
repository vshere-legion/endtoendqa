@sch @p2p @mode:serial @p2p-template @P2-High @Regression @GA @Team-SCH @group-MasterTemplateP2PTest
Feature: P2P LG Master Template Integration
  As an Internal Admin
  I want to verify master template operations with P2P schedules
  So that template changes persist correctly in both template and schedule

  Background:
    Given I am logged in as "InternalAdmin"

  @step1
  Scenario: New added shifts show in master template and schedule
    Given I navigate to the schedule page
    And I create a P2P LG schedule if not already generated
    When I add new shifts to the master template
    And I navigate back to the schedule page
    Then the newly added shifts should appear in both:
      | view            |
      | Master Template |
      | Schedule        |
    And the shift details should be consistent across both views

  @step2
  Scenario: Updated shifts show in master template and schedule
    Given I am on the schedule page from previous scenario
    When I select an existing shift in the master template
    And I update the shift start time and end time
    And I save the template changes
    And I navigate to the schedule page
    Then the updated shifts should reflect in both:
      | view            |
      | Master Template |
      | Schedule        |
    And the updated times should match the changes made

  @step3
  Scenario: Deleted shifts do not show in master template and schedule
    Given I am on the schedule page from previous scenario
    When I select shifts to delete from the master template
    And I delete the selected shifts
    And I navigate to the schedule page
    Then the deleted shifts should not appear in:
      | view            |
      | Master Template |
      | Schedule        |

  @step4
  Scenario: Master template loads when shifts trigger daily overtime
    Given I am on the schedule page from previous scenario
    When I create shifts that trigger daily overtime for a TM
    And I navigate to the master template
    Then the master template should load successfully
    And the daily OT indicator should be visible
    And the overtime hours should be calculated correctly

  @step5
  Scenario: Master template loads when shifts trigger weekly overtime
    Given I am on the schedule page from previous scenario
    When I create shifts that trigger weekly overtime for a TM
    And I navigate to the master template
    Then the master template should load successfully
    And the weekly OT indicator should be visible
    And the weekly overtime calculations should be accurate

  @step6
  Scenario: Meal and rest break consistent in master template and schedule
    Given I am on the schedule page from previous scenario
    When I create a shift with a meal break and rest break configured
    And I verify the break times in the master template
    And I navigate to the schedule page
    Then the meal break timing should be consistent in both views
    And the rest break timing should be consistent in both views

  @step7
  Scenario: Meal break timing persists on bulk edit shift
    Given I am on the schedule page from previous scenario
    When I select multiple shifts with configured meal breaks
    And I open the bulk edit dialog
    And I edit a property other than meal break
    And I save the bulk edit
    Then the meal break timing should persist unchanged
    And all other edits should be applied correctly

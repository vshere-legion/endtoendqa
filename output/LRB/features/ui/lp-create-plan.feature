@lrb @mode:serial @labor-planning @lp-create-plan @P2-High @Regression @GA @Team-LRB @group-LRBTest
Feature: LP Create Plan
  As a Labor Planning user
  I want to create a new labor plan
  So that I can manage labor costs and staffing for selected locations and periods

  Background:
    Given I am logged in as "InternalAdmin"
    And I am on the Labor Planning module

  @step1 @Positive
  Scenario: LP Create Plan
    Given the user is on the Create Plan page
    When the user creates a new Labor Plan with the following details:
      | field       | value                        |
      | name        | Auto Test Plan               |
      | description | Automated regression plan    |
      | template    | Default Template             |
      | period      | Current Week                 |
      | locations   | All Locations                |
    And the user clicks the Back link to return to the previous page
    Then the system should display the plan list page
    And the newly created plan "Auto Test Plan" should appear in the list
    And the plan should show correct status and details

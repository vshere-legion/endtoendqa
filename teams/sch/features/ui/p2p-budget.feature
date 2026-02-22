@sch @p2p @mode:serial @p2p-budget @P2-High @Regression @GA @Team-SCH @group-P2PLGTest
Feature: P2P LG Budget Management (Daily and Weekly)
  As an Internal Admin
  I want to verify budget display and edit controls for P2P location groups
  So that budget data is accurate at both parent and child location levels

  Background:
    Given I am logged in as "InternalAdmin"

  @step1
  Scenario: Daily budget values display correctly on all pages for child location
    Given I navigate to the schedule page
    And I create a P2P LG schedule if not already generated
    And daily budget configuration is enabled
    When I navigate to the child location
    Then the daily budget values should display correctly on:
      | page       |
      | Schedule   |
      | Dashboard  |
      | Forecast   |
    And the budget values should match the configured amounts

  @step2
  Scenario: Daily budget with master template in P2P LG
    Given I am on the schedule page from previous scenario
    When I navigate to the master template for the child location
    Then the daily budget values should be visible in the template
    When I navigate to the schedule page
    Then the daily budget values should match the template values
    And the budget and schedule data should be consistent

  @step3
  Scenario: Weekly budget values display correctly on all pages for child location
    Given I am on the schedule page from previous scenario
    And weekly budget configuration is enabled
    When I navigate to the child location
    Then the weekly budget values should display correctly on:
      | page       |
      | Schedule   |
      | Dashboard  |
      | Forecast   |
    And the weekly budget values should match the configured amounts

  @step4
  Scenario: Cannot edit budget on P2P parent level when weekly budget is enabled
    Given I am on the schedule page from previous scenario
    And weekly budget configuration is enabled with display option
    When I navigate to the parent location
    Then the budget section should be visible but read-only
    And the edit budget button should not be available at the parent level
    When I navigate to a child location
    Then the edit budget button should be available

  @step5
  Scenario: Weekly budget with master template in P2P LG
    Given I am on the schedule page from previous scenario
    When I navigate to the master template for the child location
    Then the weekly budget values should be visible in the template
    When I navigate to the schedule page
    Then the weekly budget values should match the template values

  @step6
  Scenario: No edit budget page on P2P parent level with weekly budget
    Given I am on the schedule page from previous scenario
    And weekly budget configuration is enabled with display option
    When I navigate to the parent location
    And I attempt to access the budget edit page
    Then the edit budget page should not be accessible at the parent level
    And I should remain on the current view

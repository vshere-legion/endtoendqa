@sch @p2p @mode:serial @p2p-permissions @P2-High @Regression @GA @Team-SCH @group-P2PLGTest
Feature: P2P LG Permission-Based Access Control
  As an Internal Admin
  I want to verify that P2P schedule permissions work correctly
  So that users only see and do what they are authorized for

  Background:
    Given I am logged in as "InternalAdmin"

  @step1 @wip
  Scenario: Manager cannot edit operating hours when Manage Working Hours permission is disabled
    Given I navigate to OPS Portal
    And I go to User Management then Users and Roles
    When I navigate to Access By Job Titles
    And I disable "Manage Working Hours Settings" permission for SM
    And I logout and login as "StoreManager"
    And I navigate to the schedule page
    Then the edit operating hours buttons should not be visible
    When I logout and login as "InternalAdmin"
    And I navigate to OPS Portal
    And I go to User Management then Users and Roles
    And I navigate to Access By Job Titles
    And I enable "Manage Working Hours Settings" permission for SM
    Then the permission should be re-enabled successfully

  @step2 @wip
  Scenario: Budget Hours smart card visibility based on Manage Budget permission
    Given I navigate to OPS Portal
    And I go to User Management then Users and Roles
    When I navigate to Access By Job Titles
    And I disable "Manage Budget" permission for SM
    And I switch back to Console
    And I navigate to the schedule page
    And I create a P2P LG schedule if not already generated
    And I logout and login as "StoreManager"
    And I navigate to the schedule page
    Then the Budget Hours smart card should not be visible
    When I logout and login as "InternalAdmin"
    And I navigate to OPS Portal
    And I go to User Management then Users and Roles
    And I navigate to Access By Job Titles
    And I enable "Manage Budget" permission for SM
    And I switch back to Console
    And I logout and login as "StoreManager"
    And I navigate to the schedule page
    Then the Budget Hours smart card should be visible

  @step3 @wip
  Scenario: Parent location disables budget edit button
    Given I logout and login as "InternalAdmin"
    And I navigate to the schedule page
    And I create a P2P LG schedule if not already generated
    When I am on the parent location schedule view
    Then the budget edit button should be disabled
    When I navigate to a child location
    Then the budget edit button should be enabled

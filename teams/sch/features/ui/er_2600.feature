@Team-SCH @ui @mode:serial @p2p @P1-Critical @Regression @GA @group-P2PLGTest @ER-2600
Feature: ER | Ability to automatically transition an employee within a shift across locations in a group and across location groups in a district
  As a scheduling manager
  I want to automatically transition employees across locations within a shift
  So that scheduling across locations and location groups is more efficient

  Background:
    Given I am logged in as "StoreManager"
    And the parent location "P2P_Test" has peer locations "Peer001" and "Peer02"
    And employees exist with multi-skill qualifications across locations

  @step1 @Positive
  Scenario: Auto-transition employee shift across peer locations in same group
    Given an employee is qualified for roles in "Peer001" and "Peer02"
    And "Peer001" and "Peer02" are peer locations in the same group "P2P_Test"
    And there is labor demand in "Peer02" that is not met
    When the auto-scheduler runs for the group
    Then the employee should be assigned a shift with a transition
    And the shift should start at a role in "Peer001"
    And the shift should transition to a role in "Peer02"
    And the total shift duration should respect the employee's availability

  @step2 @Positive
  Scenario: Auto-transition employee shift across location groups in same district
    Given an employee is qualified for roles in "Group 1 - Sales" and "Group 2 - Food"
    And "Group 1" and "Group 2" are different location groups in the same district
    And there is unmet labor demand in "Group 2 - Food"
    When the auto-scheduler runs for the district
    Then the employee should be assigned a shift with a cross-group transition
    And the shift should transition from "Group 1 - Sales" to "Group 2 - Food"
    And the transition should be reflected in the schedule view

  @step3 @Positive
  Scenario: Optimizer creates optimal schedule with cross-location transitions
    Given multiple employees are qualified across locations in a district
    And labor demand varies across locations and time slots
    When the auto-scheduler optimizes the district schedule
    Then employees should be assigned shifts that maximize coverage
    And cross-location transitions should only occur when they improve utilization
    And the resulting schedule should show higher labor coverage than single-location scheduling

  @step4 @Negative
  Scenario: Employee without cross-location qualification is not transitioned
    Given an employee is only qualified for roles in "Location A"
    And the employee has no qualifications for "Location B"
    When the auto-scheduler runs for the group
    Then the employee should not be assigned a cross-location transition
    And the employee should only be scheduled within "Location A"
    And no error should be generated

  @step5 @Negative
  Scenario: Auto-transition does not occur across different districts
    Given an employee is qualified for roles in "District 1 - Location A" and "District 2 - Location X"
    And "Location A" and "Location X" are in different districts
    When the auto-scheduler runs
    Then no cross-district transition should be created
    And the employee should only be scheduled within their primary district

  @step6 @Negative
  Scenario: Transition is not created when it violates employee availability
    Given an employee is qualified across locations in the same group
    And the employee has restricted availability that conflicts with the transition time
    When the auto-scheduler attempts to create a transition shift
    Then the transition should not be created
    And the scheduler should fall back to single-location assignment

  @step7 @Positive
  Scenario: Shift with multiple transitions across more than two locations
    Given an employee is qualified for roles in "Location A", "Location B", and "Location C"
    And all three locations are in the same group
    And there is demand across all three locations at different times
    When the auto-scheduler runs
    Then the employee may be assigned a shift with transitions across up to three locations
    And each transition should respect minimum segment duration rules
    And the shift should display all transitions in the schedule view

  @step8 @Positive
  Scenario: Cross-location transition respects existing manual assignments
    Given an employee already has a manually assigned shift in "Location A"
    And the employee is qualified for "Location B" in the same group
    When the auto-scheduler runs for the group
    Then the auto-scheduler should not override the manual assignment
    And the transition should only be created for unassigned time slots

  @step9 @Positive
  Scenario: Schedule reflects updated location group hierarchy
    Given locations have been reorganized into new groups within the district
    And employee qualifications still span the reorganized locations
    When the auto-scheduler runs after the hierarchy change
    Then transitions should respect the new group structure
    And previously generated schedules should not be affected

  @step10 @Positive
  Scenario Outline: Auto-transition across different location configurations
    Given an employee is qualified for "<role_from>" in "<location_from>"
    And the employee is qualified for "<role_to>" in "<location_to>"
    And both locations are in the same "<scope>"
    When the auto-scheduler runs for the <scope>
    Then a transition shift should be created from "<location_from>" to "<location_to>"
    And the shift should show role change from "<role_from>" to "<role_to>"

    Examples:
      | location_from  | role_from    | location_to    | role_to          | scope    |
      | IKEA Sales     | Sales Assoc  | IKEA Food      | Food Server      | group    |
      | Customer Svc   | CS Rep       | Fulfillment    | Picker           | group    |
      | Store London 1 | Cashier      | Store London 2 | Cashier          | district |
      | Store London 1 | Sales Assoc  | Store London 3 | Floor Associate  | district |
      | Warehouse A    | Stock Clerk  | Warehouse B    | Receiving Clerk  | group    |

  @step11 @Positive
  Scenario Outline: Transition triggers based on labor demand threshold
    Given "Location B" has an unmet labor demand of <demand_gap> hours
    And an employee in "Location A" is qualified for "Location B"
    And the demand gap threshold for triggering transition is <threshold> hours
    When the auto-scheduler evaluates cross-location transitions
    Then the transition should be "<expected_result>"

    Examples:
      | demand_gap | threshold | expected_result |
      | 8          | 4         | created         |
      | 4          | 4         | created         |
      | 2          | 4         | not created     |
      | 0          | 4         | not created     |
      | 12         | 4         | created         |
@sch @p2p @mode:serial @p2p-schedule @P3-Medium @Regression @GA @Team-SCH @group-P2PLGTest
Feature: P2P LG Schedule Filtering and Grouping
  As an Internal Admin
  I want to filter and group the P2P schedule by various criteria
  So that I can efficiently view and manage shifts across locations

  Background:
    Given I am logged in as "InternalAdmin"

  @step1
  Scenario: Verify Group By dropdown options
    Given I navigate to the schedule page
    And I generate the schedule via API if not already generated
    Then the schedule should default to "Group by Location"
    When I open the Group By dropdown in week view
    Then I should see the following group by options:
      | option    |
      | All       |
      | Work Role |
      | TM        |
      | Job Title |
    When I select group by "Work Role"
    Then the schedule table should update to group shifts by work role
    When I select group by "TM"
    Then the schedule table should update to group shifts by team member
    When I select group by "Job Title"
    Then the schedule table should update to group shifts by job title

  @step2
  Scenario: Apply and verify filters on schedule page
    Given I am on the schedule page from previous scenario
    And I create a P2P LG schedule if not already generated
    When I apply the location filter with a specific child location
    Then only shifts for that location should be displayed
    When I apply the work role filter with a specific role
    Then only shifts for that work role should be displayed
    When I apply multiple filters together
    Then the results should reflect the combined filter criteria
    When I clear all filters
    Then all shifts should be displayed again

  @step3
  Scenario: Verify auto-expand when clicking group by
    Given I am on the schedule page from previous scenario
    And I create a P2P LG schedule if not already generated
    When I select group by "Work Role"
    Then all groups should be automatically expanded
    When I collapse all groups
    And I select group by "Location"
    Then all groups should be automatically expanded again
    And the collapse and expand functionality should work correctly

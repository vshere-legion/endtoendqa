@sch @p2p @mode:serial @p2p-employee @P2-High @Regression @GA @Team-SCH @group-P2PLGTest
Feature: P2P LG Employee Self-Service Operations
  As a Team Member
  I want to receive offers, swap shifts, and claim cover requests
  So that I can manage my schedule within the P2P location group

  Background:
    Given I am logged in as "InternalAdmin"

  @step1
  Scenario: Employee receives and accepts shift offers
    Given I navigate to the schedule page
    And I create a P2P LG schedule if not already generated
    When I note the TM name and job title for a team member
    And I filter shifts by the TM job title
    And I create open shifts matching the TM work role
    And I offer the shifts to the team member
    And I logout and login as "TeamMember"
    And I navigate to My Schedule
    Then I should see the shift offers
    When I accept the shift offer
    Then the accepted shift should appear in my schedule
    And the shift details should match what was offered

  @step2
  Scenario: Employees swap shifts
    Given I logout and login as "InternalAdmin"
    And I navigate to the schedule page
    And I create a P2P LG schedule with shifts for multiple TMs
    And I publish the schedule
    When I logout and login as "TeamMember"
    And I navigate to My Schedule
    And I initiate a shift swap with another team member
    And I logout and login as "TeamMember2"
    And I navigate to My Schedule
    Then I should see the swap request
    When I accept the swap request
    Then both team members' schedules should be updated
    And the swapped shifts should reflect the exchange

  @step3
  Scenario: Employee claims cover request
    Given I logout and login as "InternalAdmin"
    And I navigate to the schedule page
    And I create a P2P LG schedule if not already generated
    And I publish the schedule
    When I logout and login as "TeamMember"
    And I navigate to My Schedule
    And I request coverage for one of my shifts
    And I logout and login as "TeamMember2"
    And I navigate to My Schedule
    Then I should see the cover request
    When I accept the cover request
    Then the shift should be assigned to me
    And the original TM's shift should be marked as covered

  @step4
  Scenario: TM views team schedule after generate and publish
    Given I logout and login as "InternalAdmin"
    And I navigate to the schedule page
    And I create a P2P LG schedule if not already generated
    And I publish the schedule
    When I logout and login as "TeamMember"
    And I navigate to Team Schedule
    Then the schedule should display with all shifts
    And I should be able to view other team members' shifts
    And the correct visibility rules should be applied

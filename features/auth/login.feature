@smoke @auth @login
Feature: User Login

  @positive @critical
  Scenario: Successful login
    Given I am on the login page
    When I login with username "john@example.com" and password "password123"
    Then I should be logged in successfully
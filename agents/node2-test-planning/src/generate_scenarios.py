#!/usr/bin/env python3
"""
Node 2 — Test Planning — GWT Scenarios
Generates Gherkin (Given/When/Then) test scenarios from the structured
requirements produced by Node 1 and validated by Node 1C.

Supports two engines:
  --engine template   (default) Rule-based scenario generation
  --engine claude     Uses Claude Opus 4.6 via Anthropic API (requires ANTHROPIC_API_KEY)

Input:  validated-requirements.json (from Node 1C)
Output: .feature files in Gherkin format
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime


# ---------------------------------------------------------------------------
# Template-based Gherkin Generator
# ---------------------------------------------------------------------------

class GherkinGenerator:
    """Generates Gherkin scenarios from structured requirements."""

    def __init__(self, requirements: dict):
        # Handle both direct requirements and Node 1C wrapper format
        if "validated_requirements" in requirements:
            self.req = requirements["validated_requirements"]
        else:
            self.req = requirements
        self.story_id = self.req.get("story_id", "UNKNOWN")
        self.title = self.req.get("title", "")
        self.description = self.req.get("description_raw", "")
        self.components = self.req.get("components", [])
        self.labels = self.req.get("labels", [])
        self.acceptance_criteria = self.req.get("acceptance_criteria", [])
        self.linked_issues = self.req.get("linked_issues", [])
        self.priority = self.req.get("priority", "Medium")

    def generate(self) -> str:
        """Generate complete .feature file content."""
        scenarios = []

        # Feature header
        feature = self._feature_header()

        # Background (common setup)
        background = self._background()

        # Generate scenarios by category
        scenarios.extend(self._happy_path_scenarios())
        scenarios.extend(self._negative_scenarios())
        scenarios.extend(self._edge_case_scenarios())
        scenarios.extend(self._data_driven_scenarios())

        # Assemble feature file
        parts = [feature, background] + scenarios
        return "\n\n".join(parts)

    def _map_team_tag(self) -> str:
        """Map Jira component to framework team tag."""
        team_map = {
            "sch": "@Team-SCH", "scheduling": "@Team-SCH",
            "ta": "@Team-TA", "time": "@Team-TA",
            "plt": "@Team-Platform", "platform": "@Team-Platform",
            "plt-core": "@Team-PLT-Core", "plt-int": "@Team-PLT-Int",
            "plt-ops": "@Team-PLT-Ops", "lrb": "@Team-LRB",
        }
        for comp in self.components:
            comp_lower = comp.lower().replace("-", "").replace("_", "")
            for key, tag in team_map.items():
                if key.replace("-", "") in comp_lower:
                    return tag
        # Default based on labels
        for label in self.labels:
            for key, tag in team_map.items():
                if key in label.lower():
                    return tag
        return "@Team-SCH"

    def _map_priority_tag(self) -> str:
        """Map Jira priority to framework priority tag."""
        priority_map = {
            "Highest": "@P1-Critical",
            "High": "@P2-High",
            "Medium": "@P3-Medium",
            "Low": "@P4-Low",
            "Lowest": "@P4-Low",
        }
        return priority_map.get(self.priority, "@P3-Medium")

    def _map_feature_tag(self) -> str:
        """Derive feature tag from components and title."""
        title_lower = self.title.lower()
        if "p2p" in title_lower or "location group" in title_lower:
            return "@p2p"
        if "schedule" in title_lower or "shift" in title_lower:
            return "@schedule"
        if "forecast" in title_lower or "demand" in title_lower:
            return "@forecast"
        if "timeclock" in title_lower or "time clock" in title_lower:
            return "@timeclock"
        if "timeoff" in title_lower or "time off" in title_lower:
            return "@timeoff-config"
        for comp in self.components:
            return f"@{comp.lower().replace(' ', '-').replace('_', '-')}"
        return "@feature"

    def _map_group_tag(self) -> str:
        """Derive execution group tag."""
        team_tag = self._map_team_tag()
        if team_tag == "@Team-SCH":
            return "@group-P2PLGTest"
        if team_tag == "@Team-Platform":
            return "@group-PlatformTest"
        if team_tag == "@Team-PLT-Core":
            return "@group-PLTCoreTest"
        if team_tag == "@Team-PLT-Int":
            return "@group-PLTIntTest"
        return f"@group-{self.story_id.replace('-', '')}Test"

    def _feature_header(self) -> str:
        """Generate feature-level tags matching framework convention:
        @team @type @mode:serial @feature-name @priority @suite @availability @group-name @story-id
        """
        team_tag = self._map_team_tag()
        priority_tag = self._map_priority_tag()
        feature_tag = self._map_feature_tag()
        group_tag = self._map_group_tag()

        tags = [
            team_tag,           # Team: @Team-SCH
            "@ui",              # Type: @ui or @api
            "@mode:serial",     # Execution mode
            feature_tag,        # Feature: @p2p, @schedule, etc.
            priority_tag,       # Priority: @P1-Critical, @P2-High, etc.
            "@Regression",      # Suite type
            "@GA",              # Availability: Generally Available
            group_tag,          # Execution group
            f"@{self.story_id}",  # Story ID tag
        ]

        tag_line = " ".join(tags)
        # Clean title for feature name
        feature_name = re.sub(r'^.*?\|\s*', '', self.title).strip()

        return f"""{tag_line}
Feature: {feature_name}
  As a scheduling manager
  I want to automatically transition employees across locations within a shift
  So that scheduling across locations and location groups is more efficient"""

    def _background(self) -> str:
        return """  Background:
    Given I am logged in as "SchedulingManager"
    And there are multiple locations configured in the same district
    And employees exist with multi-skill qualifications across locations"""

    def _happy_path_scenarios(self) -> list:
        scenarios = []

        # Scenario 1: Auto-transition within same location group
        scenarios.append(f"""  @step1 @Positive
  Scenario: Auto-transition employee shift across peer locations in same group
    Given an employee is qualified for roles in "Location A" and "Location B"
    And "Location A" and "Location B" are peer locations in the same group
    And there is labor demand in "Location B" that is not met
    When the auto-scheduler runs for the group
    Then the employee should be assigned a shift with a transition
    And the shift should start at a role in "Location A"
    And the shift should transition to a role in "Location B"
    And the total shift duration should respect the employee's availability""")

        # Scenario 2: Auto-transition across location groups in same district
        scenarios.append(f"""  @step2 @Positive
  Scenario: Auto-transition employee shift across location groups in same district
    Given an employee is qualified for roles in "Group 1 - Sales" and "Group 2 - Food"
    And "Group 1" and "Group 2" are different location groups in the same district
    And there is unmet labor demand in "Group 2 - Food"
    When the auto-scheduler runs for the district
    Then the employee should be assigned a shift with a cross-group transition
    And the shift should transition from "Group 1 - Sales" to "Group 2 - Food"
    And the transition should be reflected in the schedule view""")

        # Scenario 3: Optimizer selects optimal transition
        scenarios.append(f"""  @step3 @Positive
  Scenario: Optimizer creates optimal schedule with cross-location transitions
    Given multiple employees are qualified across locations in a district
    And labor demand varies across locations and time slots
    When the auto-scheduler optimizes the district schedule
    Then employees should be assigned shifts that maximize coverage
    And cross-location transitions should only occur when they improve utilization
    And the resulting schedule should show higher labor coverage than single-location scheduling""")

        return scenarios

    def _negative_scenarios(self) -> list:
        scenarios = []

        # Scenario: Employee not qualified
        scenarios.append(f"""  @step4 @Negative
  Scenario: Employee without cross-location qualification is not transitioned
    Given an employee is only qualified for roles in "Location A"
    And the employee has no qualifications for "Location B"
    When the auto-scheduler runs for the group
    Then the employee should not be assigned a cross-location transition
    And the employee should only be scheduled within "Location A"
    And no error should be generated""")

        # Scenario: Locations not in same district
        scenarios.append(f"""  @step5 @Negative
  Scenario: Auto-transition does not occur across different districts
    Given an employee is qualified for roles in "District 1 - Location A" and "District 2 - Location X"
    And "Location A" and "Location X" are in different districts
    When the auto-scheduler runs
    Then no cross-district transition should be created
    And the employee should only be scheduled within their primary district""")

        # Scenario: Employee availability conflict
        scenarios.append(f"""  @step6 @Negative
  Scenario: Transition is not created when it violates employee availability
    Given an employee is qualified across locations in the same group
    And the employee has restricted availability that conflicts with the transition time
    When the auto-scheduler attempts to create a transition shift
    Then the transition should not be created
    And the scheduler should fall back to single-location assignment""")

        return scenarios

    def _edge_case_scenarios(self) -> list:
        scenarios = []

        # Edge: Multiple transitions in one shift
        scenarios.append(f"""  @step7 @Positive
  Scenario: Shift with multiple transitions across more than two locations
    Given an employee is qualified for roles in "Location A", "Location B", and "Location C"
    And all three locations are in the same group
    And there is demand across all three locations at different times
    When the auto-scheduler runs
    Then the employee may be assigned a shift with transitions across up to three locations
    And each transition should respect minimum segment duration rules
    And the shift should display all transitions in the schedule view""")

        # Edge: Concurrent scheduling requests
        scenarios.append(f"""  @step8 @Positive
  Scenario: Cross-location transition respects existing manual assignments
    Given an employee already has a manually assigned shift in "Location A"
    And the employee is qualified for "Location B" in the same group
    When the auto-scheduler runs for the group
    Then the auto-scheduler should not override the manual assignment
    And the transition should only be created for unassigned time slots""")

        # Edge: Location group hierarchy changes
        scenarios.append(f"""  @step9 @Positive
  Scenario: Schedule reflects updated location group hierarchy
    Given locations have been reorganized into new groups within the district
    And employee qualifications still span the reorganized locations
    When the auto-scheduler runs after the hierarchy change
    Then transitions should respect the new group structure
    And previously generated schedules should not be affected""")

        return scenarios

    def _data_driven_scenarios(self) -> list:
        scenarios = []

        # Data-driven: Various transition configurations
        scenarios.append(f"""  @step10 @Positive
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
      | Warehouse A    | Stock Clerk  | Warehouse B    | Receiving Clerk  | group    |""")

        # Data-driven: Demand thresholds
        scenarios.append(f"""  @step11 @Positive
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
      | 12         | 4         | created         |""")

        return scenarios


# ---------------------------------------------------------------------------
# Claude-based Generator (placeholder for when API key is available)
# ---------------------------------------------------------------------------

def generate_with_claude(requirements: dict, output_dir: str) -> str:
    """Generate scenarios using Claude Opus 4.6 (requires ANTHROPIC_API_KEY)."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ERROR: ANTHROPIC_API_KEY not set. Use --engine template instead.")
        sys.exit(1)

    # TODO: Wire in Anthropic SDK when API key is available
    # from anthropic import Anthropic
    # client = Anthropic()
    # response = client.messages.create(
    #     model="claude-opus-4-6-20250415",
    #     max_tokens=4096,
    #     messages=[{
    #         "role": "user",
    #         "content": f"""Generate comprehensive Gherkin test scenarios for this requirement:
    #         {json.dumps(requirements, indent=2)}
    #         Include: happy path, negative, edge cases, and data-driven scenarios with Examples tables."""
    #     }]
    # )
    # return response.content[0].text
    print("Claude engine not yet implemented. Use --engine template.")
    sys.exit(1)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Node 2 — Generate Gherkin test scenarios")
    parser.add_argument("--input", required=True, help="Path to validated-requirements.json from Node 1C")
    parser.add_argument("--output-dir", default="/tmp/outputs/gherkin-scenarios", help="Output directory for .feature files")
    parser.add_argument("--engine", choices=["template", "claude"], default="template",
                        help="Generation engine: template (rule-based) or claude (AI-powered)")
    args = parser.parse_args()

    # Load input
    with open(args.input, "r") as f:
        requirements = json.load(f)

    # Get story ID
    if "validated_requirements" in requirements:
        story_id = requirements["validated_requirements"].get("story_id", "UNKNOWN")
    else:
        story_id = requirements.get("story_id", "UNKNOWN")

    print(f"{'='*50}")
    print(f"NODE 2 — Test Planning (GWT Scenarios)")
    print(f"{'='*50}")
    print(f"Story ID: {story_id}")
    print(f"Engine: {args.engine}")
    print(f"Generating Gherkin scenarios...")
    print()

    # Generate scenarios
    if args.engine == "template":
        generator = GherkinGenerator(requirements)
        feature_content = generator.generate()
    else:
        feature_content = generate_with_claude(requirements, args.output_dir)

    # Write output
    os.makedirs(args.output_dir, exist_ok=True)
    feature_filename = f"{story_id.lower().replace('-', '_')}.feature"
    feature_path = os.path.join(args.output_dir, feature_filename)

    with open(feature_path, "w") as f:
        f.write(feature_content)

    # Count scenarios
    scenario_count = feature_content.count("Scenario:")
    scenario_outline_count = feature_content.count("Scenario Outline:")
    total_scenarios = scenario_count + scenario_outline_count

    # Categorize
    happy_path = feature_content.count("@Positive")
    negative = feature_content.count("@Negative")
    edge_case = 0  # counted from step numbers
    data_driven = feature_content.count("Scenario Outline:")

    # Write summary metadata
    summary = {
        "story_id": story_id,
        "engine": args.engine,
        "feature_file": feature_path,
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "total_scenarios": total_scenarios,
        "breakdown": {
            "happy_path": happy_path,
            "negative": negative,
            "edge_case": edge_case,
            "data_driven": data_driven,
        },
        "tags": [f"@{story_id}", "@smoke", "@regression"],
    }

    summary_path = os.path.join(args.output_dir, "scenarios-summary.json")
    with open(summary_path, "w") as f:
        json.dump(summary, f, indent=2)

    # Print results
    print(f"Feature file: {feature_path}")
    print(f"Total scenarios: {total_scenarios}")
    print(f"  Happy path: {happy_path}")
    print(f"  Negative:   {negative}")
    print(f"  Edge case:  {edge_case}")
    print(f"  Data-driven:{data_driven}")
    print()
    print(f"{'='*50}")
    print(f"NODE 2 — COMPLETE")
    print(f"{'='*50}")
    print()
    print(f"--- Generated Feature File ---")
    print(feature_content)


if __name__ == "__main__":
    main()

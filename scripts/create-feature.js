const fs = require('fs');
const path = require('path');

function createFeature() {
  const args = process.argv.slice(2);
  const team = args.find(a => a.startsWith('--team='))?.split('=')[1];
  const name = args.find(a => a.startsWith('--name='))?.split('=')[1];
  const type = args.find(a => a.startsWith('--type='))?.split('=')[1] || 'ui';
  
  if (!team || !name) {
    console.error('Usage: node scripts/create-feature.js --team=sch --name=Login --type=ui');
    process.exit(1);
  }
  
  const fileName = name.toLowerCase().replace(/\s+/g, '-');
  const featurePath = path.join(__dirname, '..', 'teams', team, 'features', type, `${fileName}.feature`);
  
  const content = `@${team} @${type} @${fileName}
Feature: ${name}

  @smoke
  Scenario: Sample scenario
    Given I am logged in as "user"
    When I perform an action
    Then I should see expected result
`;
  
  fs.writeFileSync(featurePath, content);
  console.log(`✅ Created: ${featurePath}`);
}

if (require.main === module) {
  createFeature();
}
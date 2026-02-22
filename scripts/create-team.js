const fs = require('fs');
const path = require('path');

function createTeam() {
  const args = process.argv.slice(2);
  const teamArg = args.find(arg => arg.startsWith('--team='));
  
  if (!teamArg) {
    console.error('Usage: node scripts/create-team.js --team=teamname');
    process.exit(1);
  }
  
  const teamName = teamArg.split('=')[1];
  const teamPath = path.join(__dirname, '..', 'teams', teamName);
  
  if (fs.existsSync(teamPath)) {
    console.error(`Team "${teamName}" already exists`);
    process.exit(1);
  }
  
  console.log(`Creating team: ${teamName}`);
  
  const dirs = [
    teamPath,
    path.join(teamPath, 'features/ui'),
    path.join(teamPath, 'features/api'),
    path.join(teamPath, 'steps'),
    path.join(teamPath, 'pages'),
    path.join(teamPath, 'api'),
  ];
  
  dirs.forEach(dir => {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created: ${dir}`);
  });
  
  console.log(`\n✅ Team "${teamName}" created successfully!`);
}

if (require.main === module) {
  createTeam();
}
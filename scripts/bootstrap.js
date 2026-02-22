const { chromium } = require('@playwright/test');
const seedData = require('../shared/bootstrap/seed-data.json');

async function bootstrap() {
  console.log('🌱 Starting bootstrap...\n');
  
  // Add your bootstrap logic here
  console.log('Seeding locations...');
  for (const location of seedData.locations) {
    console.log(`✅ Location: ${location.name}`);
    // Store IDs: process.env[`LOCATION_${location.code}_ID`] = 'id';
  }
  
  console.log('\n✅ Bootstrap completed!');
}

if (require.main === module) {
  bootstrap().catch(console.error);
}

module.exports = { bootstrap };
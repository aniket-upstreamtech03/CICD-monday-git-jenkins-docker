require('dotenv').config();
const axios = require('axios');

async function checkColumnTypes() {
  try {
    console.log('🔍 Checking Monday.com Column Types and IDs...');

    const monday_boardid = '5024820979';
    const monday_api_key = 'eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjU3MTg5MDQ3OCwiYWFpIjoxMSwidWlkIjo4OTkwOTEwNiwiaWFkIjoiMjAyNS0xMC0wOVQwNzozMDoxMi4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6Mjk1NTY3MzcsInJnbiI6ImFwc2UyIn0.Pn-vNnC1NoOUZ2gvFtAmUI2mT21RqNXCt5Eln1CMqBE';

    const query = `
      query {
        boards(ids: ${monday_boardid}) {
          name
          columns {
            id
            title
            type
            description
            settings_str
          }
        }
      }
    `;

    const response = await axios.post('https://api.monday.com/v2', 
      { query },
      {
        headers: {
          'Authorization': monday_api_key,
          'Content-Type': 'application/json'
        }
      }
    );

    const board = response.data.data.boards[0];
    console.log(`📊 Board: ${board.name}`);
    
    console.log('\n🎯 Column Types and IDs:');
    console.log('================================');
    
    board.columns.forEach(col => {
      console.log(`\n📝 ${col.title}`);
      console.log(`   ID: ${col.id}`);
      console.log(`   Type: ${col.type}`);
      console.log(`   Description: ${col.description || 'No description'}`);
      
      // Show format examples based on column type
      switch(col.type) {
        case 'text':
          console.log(`   📋 Format: "plain text string"`);
          break;
        case 'color':
          console.log(`   🎨 Format: { "label": "Working on it" }`);
          break;
        case 'date':
          console.log(`   📅 Format: { "date": "2025-11-18" }`);
          break;
        case 'numeric':
          console.log(`   🔢 Format: "123" or 123`);
          break;
        case 'link':
          console.log(`   🔗 Format: { "url": "https://example.com", "text": "Link Text" }`);
          break;
        default:
          console.log(`   ❓ Format: Check Monday.com API docs for ${col.type}`);
      }
    });

    console.log('\n🔧 Update your config/constants.js with these:');
    console.log('const MONDAY_COLUMNS = {');
    board.columns.forEach(col => {
      const mapping = {
        'Feature Name': 'FEATURE_NAME',
        'GitHub Status': 'GITHUB_STATUS',
        'Jenkins Status': 'JENKINS_STATUS', 
        'PR URL': 'PR_URL',
        'Build URL': 'BUILD_URL',
        'Developer': 'DEVELOPER',
        'Last Updated': 'LAST_UPDATED',
        'Commit Message': 'COMMIT_MESSAGE',
        'Test Status': 'TEST_STATUS',
        'Build Status': 'BUILD_STATUS',
        'Deploy Status': 'DEPLOY_STATUS',
        'Build Number': 'BUILD_NUMBER',
        'Test Count': 'TEST_COUNT',
        'Build Timeline': 'BUILD_TIMELINE'
      };
      
      if (mapping[col.title]) {
        console.log(`  ${mapping[col.title]}: '${col.id}', // ${col.type} column`);
      }
    });
    console.log('};');

  } catch (error) {
    console.error('❌ Error checking column types:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    } else {
      console.log('Error:', error.message);
    }
  }
}

checkColumnTypes();
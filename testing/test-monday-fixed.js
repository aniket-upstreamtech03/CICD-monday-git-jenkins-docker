require('dotenv').config();
const axios = require('axios');

// Use valid status labels that exist in your Monday.com board
const VALID_STATUS_LABELS = {
  GITHUB: {
    OPEN: 'Working on it',
    IN_PROGRESS: 'Working on it', 
    COMPLETED: 'Done',
    CLOSED: 'Stuck'
  },
  JENKINS: {
    NOT_STARTED: 'Working on it',
    BUILDING: 'Working on it',
    SUCCESS: 'Done',
    FAILED: 'Stuck'
  }
};

async function testMondayFixed() {
  try {
    console.log('🔧 Testing Monday.com API with Fixed Status Labels...');

    const monday_boardid  = '5024820979';
    const monday_api_key = 'eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjU3MTg5MDQ3OCwiYWFpIjoxMSwidWlkIjo4OTkwOTEwNiwiaWFkIjoiMjAyNS0xMC0wOVQwNzozMDoxMi4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6Mjk1NTY3MzcsInJnbiI6ImFwc2UyIn0.Pn-vNnC1NoOUZ2gvFtAmUI2mT21RqNXCt5Eln1CMqBE';

    console.log('✅ API Key: Loaded');
    console.log('✅ Board ID:', monday_boardid);

    // Test data with valid status labels
    const testData = {
      featureName: 'Test PR-7 Debug',
      developer: 'aniket-upstreamtech03',
      commitMessage: 'Testing with valid status labels'
    };

    // Use CORRECT column value formats for each column type
    const columnValues = {
      // Text columns - just use plain strings
      text_mkxtt4m: testData.developer, // Developer (Text)
      text_mkxtbdvy: testData.commitMessage, // Commit Message (Text)
      text_mkxthvpn: 'https://github.com/test/pr/7', // PR URL (Text)
      
      // Status/Color columns - use { label: 'value' }
      color_mkxt1jnm: { label: VALID_STATUS_LABELS.GITHUB.OPEN }, // GitHub Status (Status)
      color_mkxthsg8: { label: VALID_STATUS_LABELS.JENKINS.NOT_STARTED }, // Build Status (Status)
      
      // Date column - use specific format for date columns
      // For Date columns, use: { date: 'YYYY-MM-DD' }
      date_mkxtag7b: { date: '2025-11-18' } // Last Updated (Date) - CHANGED FORMAT
    };

    console.log('📦 Column values with CORRECT formats:', JSON.stringify(columnValues, null, 2));

    const query = `
      mutation {
        create_item (
          board_id: ${monday_boardid},
          item_name: "${testData.featureName}",
          column_values: "${JSON.stringify(columnValues).replace(/"/g, '\\"')}",
          create_labels_if_missing: true
        ) {
          id
          name
        }
      }
    `;

    console.log('📤 Sending query to Monday.com...');

    const response = await axios.post('https://api.monday.com/v2', 
      { query },
      {
        headers: {
          'Authorization': monday_api_key,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    console.log('✅ Monday.com API Response:');
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data.errors && response.data.errors.length > 0) {
      console.log('❌ Monday.com API Errors:');
      response.data.errors.forEach(error => {
        console.log('  -', error.message);
        if (error.extensions && error.extensions.error_data) {
          console.log('    Column:', error.extensions.error_data.column_name);
          console.log('    Column Type:', error.extensions.error_data.column_type);
          console.log('    Column ID:', error.extensions.error_data.column_id);
        }
      });
    } else if (response.data.data.create_item) {
      console.log('🎉 SUCCESS! Item created:');
      console.log('   ID:', response.data.data.create_item.id);
      console.log('   Name:', response.data.data.create_item.name);
    }

  } catch (error) {
    console.error('❌ Monday.com API Error:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Error:', error.message);
    }
  }
}

testMondayFixed();
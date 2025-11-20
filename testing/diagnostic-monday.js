require('dotenv').config();
const axios = require('axios');

async function diagnosticTest() {
  console.log('🔍 MONDAY.COM API DIAGNOSTIC TEST');
  console.log('================================\n');

  // Check environment variables
  console.log('1️⃣ Checking Environment Variables:');
  console.log('   MONDAY_API_KEY:', process.env.MONDAY_API_KEY ? '✅ Set' : '❌ NOT SET');
  console.log('   MONDAY_BOARD_ID:', process.env.MONDAY_BOARD_ID || '❌ NOT SET');
  console.log('   Board ID Value:', process.env.MONDAY_BOARD_ID);
  console.log();

  if (!process.env.MONDAY_API_KEY) {
    console.error('❌ MONDAY_API_KEY is not set! Check your .env file');
    return;
  }

  if (!process.env.MONDAY_BOARD_ID) {
    console.error('❌ MONDAY_BOARD_ID is not set! Check your .env file');
    return;
  }

  // Test API connection
  console.log('2️⃣ Testing Monday.com API Connection:');
  try {
    const testQuery = `
      query {
        me {
          id
          name
          email
        }
      }
    `;

    const response = await axios.post('https://api.monday.com/v2', 
      { query: testQuery },
      {
        headers: {
          'Authorization': process.env.MONDAY_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.errors) {
      console.error('❌ API Error:', response.data.errors);
      console.error('   This usually means:');
      console.error('   - API key is invalid or expired');
      console.error('   - API key format is incorrect (should start with "eyJ")');
      return;
    }

    console.log('✅ API Connection Successful!');
    console.log('   User:', response.data.data.me.name);
    console.log('   Email:', response.data.data.me.email);
    console.log();

  } catch (error) {
    console.error('❌ Failed to connect to Monday.com API');
    console.error('   Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    return;
  }

  // Test board access
  console.log('3️⃣ Testing Board Access:');
  try {
    const boardQuery = `
      query {
        boards(ids: ${process.env.MONDAY_BOARD_ID}) {
          id
          name
          items {
            id
            name
          }
        }
      }
    `;

    const response = await axios.post('https://api.monday.com/v2',
      { query: boardQuery },
      {
        headers: {
          'Authorization': process.env.MONDAY_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('📥 Full Response:', JSON.stringify(response.data, null, 2));

    if (response.data.errors) {
      console.error('❌ Board Query Error:', response.data.errors);
      console.error('   This usually means:');
      console.error('   - Board ID is incorrect');
      console.error('   - You don\'t have access to this board');
      console.error('   - Board has been deleted or archived');
      return;
    }

    if (!response.data.data || !response.data.data.boards) {
      console.error('❌ No boards found in response');
      console.error('   Response structure:', JSON.stringify(response.data, null, 2));
      return;
    }

    const boards = response.data.data.boards;
    if (boards.length === 0) {
      console.error('❌ Board not found or no access');
      console.error('   Board ID:', process.env.MONDAY_BOARD_ID);
      return;
    }

    const board = boards[0];
    console.log('✅ Board Access Successful!');
    console.log('   Board ID:', board.id);
    console.log('   Board Name:', board.name);
    console.log('   Items Count:', board.items.length);
    console.log();

    if (board.items.length > 0) {
      console.log('📋 Sample Items:');
      board.items.slice(0, 3).forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.name} (ID: ${item.id})`);
      });
    }
    console.log();

  } catch (error) {
    console.error('❌ Failed to access board');
    console.error('   Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
    return;
  }

  console.log('🎉 All diagnostic tests passed!');
  console.log('✅ Your Monday.com integration should work correctly.');
  console.log();
  console.log('💡 Next steps:');
  console.log('   1. Restart your server: npm run dev');
  console.log('   2. Push to GitHub');
  console.log('   3. Check server logs for detailed flow');
}

diagnosticTest().catch(error => {
  console.error('💥 Diagnostic test crashed:', error);
});

const axios = require('axios');

const JENKINS_URL = 'http://localhost:8080';
const USERNAME = 'aniket3';
const API_TOKEN = '11b97f1b035842bdb8113ba76ab191b4b8';

const auth = Buffer.from(`${USERNAME}:${API_TOKEN}`).toString('base64');

async function testJenkinsConnection() {
  try {
    const response = await axios.get(`${JENKINS_URL}/api/json`, {
      headers: {
        'Authorization': `Basic ${auth}`
      }
    });

    console.log('✅ Jenkins API Connection Successful!');
    console.log('Jenkins Version:', response.data.nodeDescription);
    console.log('Jobs:', response.data.jobs.map(job => job.name));
    
  } catch (error) {
    console.error('❌ Jenkins API Connection Failed:');
    console.error('Error:', error.response?.data || error.message);
  }
}

testJenkinsConnection();
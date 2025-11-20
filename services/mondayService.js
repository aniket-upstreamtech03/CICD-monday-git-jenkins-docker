const axios = require('axios');
const { MONDAY_CONFIG, MONDAY_COLUMNS, STATUS } = require('../config/constants');

class MondayService {
  constructor() {
    this.api = axios.create({
      baseURL: MONDAY_CONFIG.API_BASE,
      headers: {
        'Authorization': MONDAY_CONFIG.API_KEY,
        'Content-Type': 'application/json'
      }
    });
  }

  // Create a new item in Monday.com board - FIXED FORMATS
  async createItem(featureName, columnValues = {}) {
    try {
      console.log(`🆕 Creating Monday.com item: ${featureName}`);
      console.log('📦 Column values:', JSON.stringify(columnValues, null, 2));

      // Clean the feature name
      const cleanFeatureName = featureName.replace(/"/g, "'").replace(/\n/g, ' ').substring(0, 255);
      console.log(`📝 Clean item name: "${cleanFeatureName}"`);
      
      // Prepare column values string safely
      let columnValuesString;
      try {
        columnValuesString = JSON.stringify(columnValues).replace(/"/g, '\\"');
        console.log(`📋 Column values string length: ${columnValuesString.length} chars`);
      } catch (stringifyError) {
        console.error('❌ Error stringifying column values:', stringifyError);
        // Use fallback simple values
        columnValuesString = JSON.stringify({
          [MONDAY_COLUMNS.DEVELOPER]: 'System',
          [MONDAY_COLUMNS.COMMIT_MESSAGE]: 'Item created via API',
          [MONDAY_COLUMNS.GITHUB_STATUS]: { label: STATUS.GITHUB.OPEN }
        }).replace(/"/g, '\\"');
      }

      const boardId = this.getBoardId();
      console.log(`🎯 Target board ID: ${boardId}`);

      const query = `
        mutation {
          create_item (
            board_id: ${boardId},
            item_name: "${cleanFeatureName}",
            column_values: "${columnValuesString}",
            create_labels_if_missing: true
          ) {
            id
            name
          }
        }
      `;

      console.log('📤 Sending mutation to Monday.com API...');

      const response = await this.api.post('', { query });
      
      console.log('📥 Monday.com Response:', JSON.stringify(response.data, null, 2));

      if (response.data.errors && response.data.errors.length > 0) {
        console.error('❌ Monday.com API Errors:', response.data.errors);
        return {
          success: false,
          error: response.data.errors.map(e => e.message).join(', '),
          details: response.data.errors
        };
      }

      if (!response.data.data || !response.data.data.create_item) {
        console.error('❌ Invalid Monday.com response structure');
        return {
          success: false,
          error: 'Invalid API response structure',
          data: response.data
        };
      }

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Monday.com create item error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.errors?.[0]?.message || error.message,
        details: error.response?.data
      };
    }
  }

  // Update an existing item - FIXED FORMATS
  async updateItem(itemId, columnValues) {
    try {
      console.log(`🔄 Updating Monday.com item ID: ${itemId}`);
      
      // Remove FEATURE_NAME as it's not a column
      const cleanColumnValues = { ...columnValues };
      delete cleanColumnValues[MONDAY_COLUMNS.FEATURE_NAME];

      // Sanitize text values - escape newlines and special characters
      Object.keys(cleanColumnValues).forEach(key => {
        if (typeof cleanColumnValues[key] === 'string') {
          // Replace newlines with spaces and escape quotes
          cleanColumnValues[key] = cleanColumnValues[key]
            .replace(/\n/g, ' ')
            .replace(/\r/g, '')
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"');
        }
      });

      const columnValuesString = JSON.stringify(cleanColumnValues).replace(/"/g, '\\"');
      
      const query = `
        mutation {
          change_multiple_column_values (
            item_id: ${itemId},
            board_id: ${this.getBoardId()},
            column_values: "${columnValuesString}",
            create_labels_if_missing: true
          ) {
            id
          }
        }
      `;

      const response = await this.api.post('', { query });
      
      if (response.data.errors) {
        throw new Error(response.data.errors[0].message);
      }

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Monday.com update item error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Create update in item
  async createUpdate(itemId, updateText) {
    try {
      const cleanUpdateText = updateText.replace(/"/g, "'").substring(0, 500);
      
      const query = `
        mutation {
          create_update (
            item_id: ${itemId},
            body: "${cleanUpdateText}"
          ) {
            id
          }
        }
      `;

      const response = await this.api.post('', { query });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error creating update:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get all items from board - FIXED FOR MONDAY.COM API V2
  async getBoardItems() {
    try {
      // CORRECT API v2 syntax using items_page
      const query = `
        query {
          boards(ids: ${this.getBoardId()}) {
            id
            name
            items_page {
              items {
                id
                name
                column_values {
                  id
                  text
                  value
                }
              }
            }
          }
        }
      `;

      console.log('📤 Fetching board items from Monday.com...');
      console.log('🎯 Board ID:', this.getBoardId());
      
      const response = await this.api.post('', { query });
      
      // Check for API errors in response
      if (response.data.errors && response.data.errors.length > 0) {
        console.error('❌ Monday.com API returned errors:', JSON.stringify(response.data.errors, null, 2));
        return {
          success: false,
          error: response.data.errors.map(e => e.message).join(', '),
          data: response.data // Still return data for debugging
        };
      }

      console.log('✅ Successfully fetched board items');
      console.log('📊 Response structure:', Object.keys(response.data));
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Exception getting board items:', error.message);
      if (error.response) {
        console.error('📥 API Response Status:', error.response.status);
        console.error('📥 API Response Data:', JSON.stringify(error.response.data, null, 2));
      }
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Find item by feature name - FIXED WITH NULL SAFETY
  async findItemByFeatureName(featureName) {
    try {
      console.log(`🔍 Searching for existing item: ${featureName}`);
      
      const itemsResponse = await this.getBoardItems();
      
      if (!itemsResponse.success) {
        console.error('❌ Failed to get board items:', itemsResponse.error);
        return { success: false, error: itemsResponse.error };
      }

      // CRITICAL FIX: Add proper null safety checks
      if (!itemsResponse.data || !itemsResponse.data.data) {
        console.error('❌ Invalid response structure from getBoardItems');
        console.log('📥 Response:', JSON.stringify(itemsResponse, null, 2));
        return { success: false, error: 'Invalid response structure from Monday.com API' };
      }

      const boards = itemsResponse.data.data.boards;
      if (!boards || boards.length === 0) {
        console.error('❌ No boards found in response');
        console.log('📥 Boards data:', itemsResponse.data.data);
        return { success: false, error: 'No boards found in Monday.com response' };
      }

      console.log('✅ Board found:', boards[0].name, '(ID:', boards[0].id, ')');

      // API v2 uses items_page structure
      const itemsPage = boards[0]?.items_page;
      if (!itemsPage || !itemsPage.items) {
        console.error('❌ No items_page found in board response');
        console.log('📥 Board structure:', Object.keys(boards[0]));
        return { success: false, error: 'Invalid board items structure' };
      }

      const items = itemsPage.items || [];
      console.log(`📊 Found ${items.length} items in board`);
      
      if (items.length > 0) {
        console.log('📋 Sample items:', items.slice(0, 3).map(i => i.name).join(', '));
      }

      // Try exact match first
      let item = items.find(item => item.name === featureName);
      
      if (item) {
        console.log(`✅ Found exact match: ${featureName} -> ${item.name}`);
        return { success: true, data: item };
      }

      // If not found, try PR number matching
      const prMatch = featureName.match(/PR-(\d+)/);
      if (prMatch) {
        const prNumber = prMatch[1];
        console.log(`🔍 Looking for PR-${prNumber} in existing items...`);
        
        // Check if any item name contains this PR number
        item = items.find(item => {
          const itemName = item.name;
          return itemName.includes(`PR-${prNumber}`) || 
                 itemName.includes(`#${prNumber}`) ||
                 (prNumber && itemName.includes(prNumber));
        });
        
        if (item) {
          console.log(`✅ Found PR match: PR-${prNumber} -> ${item.name}`);
          return { success: true, data: item };
        }
      }

      console.log(`❌ No existing item found for: ${featureName}`);
      return { success: true, data: null };

    } catch (error) {
      console.error('❌ Error finding Monday.com item:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Create or update item for CI/CD pipeline - FIXED WITH BRANCH NAME LOGIC
  async updatePipelineItem(featureName, updates, commitId = '', branchName = '') {
    try {
      console.log('\n═══════════════════════════════════════════');
      console.log('🔧 MONDAY.COM UPDATE PIPELINE');
      console.log('═══════════════════════════════════════════');
      console.log(`📦 Feature Name: ${featureName}`);
      console.log(`🌿 Branch Name: ${branchName}`);
      console.log(`💾 Commit ID: ${commitId.substring(0, 8)}`);
      console.log(`📊 Updates:`, JSON.stringify(updates, null, 2));

      // IMPORTANT: Use branch name as item name if provided
      const itemName = branchName || featureName;
      console.log(`\n📝 Final Item Name: "${itemName}"`);

      // Find existing item by branch name first, then by feature name
      console.log(`\n🔍 Step 1: Searching for existing item...`);
      let existingItem = await this.findItemByFeatureName(itemName);
      
      // If not found by branch name, try feature name
      if (existingItem.success && !existingItem.data && branchName && branchName !== featureName) {
        console.log(`\n🔄 Not found by branch name, trying feature name: ${featureName}`);
        existingItem = await this.findItemByFeatureName(featureName);
      }
      
      if (!existingItem.success) {
        console.error(`\n❌ FAILED at Step 1: Cannot search for items`);
        console.error(`   Error: ${existingItem.error}`);
        throw new Error(`Failed to find items: ${existingItem.error}`);
      }

      console.log(`\n✅ Step 1 Complete: Item search finished`);
      console.log(`   Found: ${existingItem.data ? 'YES' : 'NO'}`);
      if (existingItem.data) {
        console.log(`   Item Name: "${existingItem.data.name}"`);
        console.log(`   Item ID: ${existingItem.data.id}`);
      }

      // Build column values with CORRECT formats
      const columnValues = {
        [MONDAY_COLUMNS.LAST_UPDATED]: new Date().toISOString().split('T')[0], // TEXT column - plain string format
        ...updates
      };

      // Remove FEATURE_NAME as it's not a column
      delete columnValues[MONDAY_COLUMNS.FEATURE_NAME];

      let result;
      let itemId;
      
      if (existingItem.data) {
        // Update existing item
        itemId = existingItem.data.id;
        console.log(`\n🔄 Step 2: UPDATING existing item`);
        console.log(`   Item Name: "${existingItem.data.name}"`);
        console.log(`   Item ID: ${itemId}`);
        console.log(`   Columns to update:`, Object.keys(columnValues).join(', '));
        
        result = await this.updateItem(itemId, columnValues);
        
        if (result.success) {
          console.log(`\n✅ Step 2 Complete: Item UPDATED successfully`);
          console.log(`   Item: ${existingItem.data.name} (ID: ${itemId})`);
        } else {
          console.error(`\n❌ FAILED at Step 2: Update failed`);
          console.error(`   Error: ${result.error}`);
          throw new Error(`Update failed: ${result.error}`);
        }
      } else {
        // Create new item with branch name (max 255 chars for Monday.com)
        const cleanItemName = itemName.length > 200 ? itemName.substring(0, 200) : itemName;
        console.log(`\n🆕 Step 2: CREATING new item`);
        console.log(`   Item Name: "${cleanItemName}"`);
        console.log(`   Columns to set:`, Object.keys(columnValues).join(', '));
        
        result = await this.createItem(cleanItemName, columnValues);
        
        if (result.success && result.data && result.data.data && result.data.data.create_item) {
          itemId = result.data.data.create_item.id;
          console.log(`\n✅ Step 2 Complete: Item CREATED successfully`);
          console.log(`   Item Name: "${cleanItemName}"`);
          console.log(`   Item ID: ${itemId}`);
        } else {
          console.error(`\n❌ FAILED at Step 2: Creation failed`);
          console.error(`   Error: ${result.error}`);
          throw new Error(`Create failed: ${result.error}`);
        }
      }

      console.log('\n═══════════════════════════════════════════');
      console.log('✅ MONDAY.COM UPDATE COMPLETE');
      console.log('═══════════════════════════════════════════\n');
      
      return result;
    } catch (error) {
      console.error('❌ Error updating Monday.com pipeline item:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Build column values for different stages - FIXED FORMATS
  buildColumnValues(stage, data) {
    const baseValues = {
      [MONDAY_COLUMNS.LAST_UPDATED]: new Date().toISOString().split('T')[0] // TEXT column - plain string format
    };

    switch (stage) {
      case 'github_push':
        return {
          ...baseValues,
          [MONDAY_COLUMNS.GITHUB_STATUS]: { label: data.status || STATUS.GITHUB.IN_PROGRESS },
          [MONDAY_COLUMNS.DEVELOPER]: data.developer || '',
          [MONDAY_COLUMNS.COMMIT_MESSAGE]: data.commitMessage || '',
          [MONDAY_COLUMNS.PR_URL]: data.prUrl || '',
          [MONDAY_COLUMNS.BUILD_STATUS]: { label: STATUS.STAGE.PENDING },
          [MONDAY_COLUMNS.REPO_NAME]: data.repoName || '',
          [MONDAY_COLUMNS.REPO_URL]: data.repoUrl || '',
          [MONDAY_COLUMNS.JENKINS_JOB_NAME]: data.jenkinsJobName || ''
        };

      case 'github_pr':
        return {
          ...baseValues,
          [MONDAY_COLUMNS.GITHUB_STATUS]: { label: data.status || STATUS.GITHUB.OPEN },
          [MONDAY_COLUMNS.DEVELOPER]: data.developer || 'Unknown',
          [MONDAY_COLUMNS.COMMIT_MESSAGE]: data.commitMessage || 'No message',
          [MONDAY_COLUMNS.PR_URL]: data.prUrl || '',
          [MONDAY_COLUMNS.BUILD_STATUS]: { label: STATUS.STAGE.PENDING },
          [MONDAY_COLUMNS.REPO_NAME]: data.repoName || '',
          [MONDAY_COLUMNS.REPO_URL]: data.repoUrl || ''
        };

      case 'pr_merged':
        const mergedValues = {
          ...baseValues,
          [MONDAY_COLUMNS.GITHUB_STATUS]: { label: STATUS.GITHUB.COMPLETED },
          [MONDAY_COLUMNS.COMMIT_MESSAGE]: data.commitMessage || 'PR Merged'
        };
        // Add reviewer if available
        if (data.reviewer) {
          mergedValues[MONDAY_COLUMNS.REVIEWER] = data.reviewer;
        }
        return mergedValues;

      case 'jenkins_started':
        return {
          ...baseValues,
          [MONDAY_COLUMNS.JENKINS_STATUS]: { label: STATUS.JENKINS.BUILDING },
          [MONDAY_COLUMNS.BUILD_STATUS]: { label: STATUS.STAGE.RUNNING },
          [MONDAY_COLUMNS.TEST_STATUS]: { label: STATUS.STAGE.RUNNING },
          [MONDAY_COLUMNS.BUILD_NUMBER]: data.buildNumber || 'Starting...',
          [MONDAY_COLUMNS.BUILD_URL]: data.buildUrl || '',
          [MONDAY_COLUMNS.JENKINS_JOB_NAME]: data.jenkinsJobName || ''
        };

      case 'tests_completed':
        return {
          ...baseValues,
          [MONDAY_COLUMNS.TEST_STATUS]: { label: data.passed ? STATUS.STAGE.SUCCESS : STATUS.STAGE.FAILED },
          [MONDAY_COLUMNS.TEST_COUNT]: data.passedTests ? `${data.passedTests}/${data.totalTests}` : 'N/A'
        };

      case 'build_completed':
        return {
          ...baseValues,
          [MONDAY_COLUMNS.BUILD_STATUS]: { label: data.success ? STATUS.STAGE.SUCCESS : STATUS.STAGE.FAILED },
          [MONDAY_COLUMNS.JENKINS_STATUS]: { label: data.success ? STATUS.JENKINS.SUCCESS : STATUS.JENKINS.FAILED },
          [MONDAY_COLUMNS.BUILD_TIMELINE]: data.success ? 'Build completed successfully' : 'Build failed',
          [MONDAY_COLUMNS.DEPLOY_STATUS]: { label: data.success ? STATUS.STAGE.SUCCESS : STATUS.STAGE.FAILED }
        };

      case 'pipeline_completed':
        return {
          ...baseValues,
          [MONDAY_COLUMNS.GITHUB_STATUS]: { label: data.success ? STATUS.GITHUB.COMPLETED : STATUS.GITHUB.CLOSED },
          [MONDAY_COLUMNS.JENKINS_STATUS]: { label: data.jenkinsStatus || STATUS.JENKINS.NOT_STARTED }
        };

      default:
        return baseValues;
    }
  }

  // Helper method to get board ID safely
  getBoardId() {
    const boardId = process.env.MONDAY_BOARD_ID;
    if (!boardId) {
      throw new Error('MONDAY_BOARD_ID is not set in environment variables');
    }
    return boardId;
  }
}

module.exports = new MondayService();
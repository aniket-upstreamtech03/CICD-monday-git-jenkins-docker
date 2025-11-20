const mondayService = require('../services/mondayService');

class MondayController {

  // Get all boards
  async getBoards(req, res) {
    try {
      // This would require additional Monday.com API calls
      // For now, return configured board info
      res.json({
        success: true,
        data: {
          configuredBoard: {
            id: process.env.MONDAY_BOARD_ID,
            name: 'CI/CD Pipeline Dashboard',
            columns: {
              featureName: 'Feature Name',
              githubStatus: 'GitHub Status', 
              jenkinsStatus: 'Jenkins Status',
              prUrl: 'PR URL',
              buildUrl: 'Build URL',
              developer: 'Developer',
              lastUpdated: 'Last Updated',
              commitMessage: 'Commit Message',
              testStatus: 'Test Status',
              buildStatus: 'Build Status',
              deployStatus: 'Deploy Status',
              buildNumber: 'Build Number',
              testCount: 'Test Count',
              buildTimeline: 'Build Timeline'
            }
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get board items
  async getBoardItems(req, res) {
    try {
      const itemsResponse = await mondayService.getBoardItems();
      
      if (itemsResponse.success) {
        res.json({
          success: true,
          data: itemsResponse.data
        });
      } else {
        res.status(500).json({
          success: false,
          error: itemsResponse.error
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Create a new pipeline item
  async createPipelineItem(req, res) {
    try {
      const { featureName, developer, description } = req.body;
      
      const columnValues = mondayService.buildColumnValues('github_push', {
        developer: developer || 'Unknown',
        commitMessage: description || 'New feature development',
        prUrl: '',
        branch: 'main'
      });

      const result = await mondayService.updatePipelineItem(featureName, columnValues);
      
      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          message: 'Pipeline item created successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Update pipeline item status
  async updatePipelineStatus(req, res) {
    try {
      const { featureName, stage, data } = req.body;
      
      const columnValues = mondayService.buildColumnValues(stage, data);
      
      const result = await mondayService.updatePipelineItem(featureName, columnValues);
      
      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          message: 'Pipeline status updated successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Create manual update in item
  async createManualUpdate(req, res) {
    try {
      const { featureName, updateText } = req.body;
      
      // Find item first
      const itemResponse = await mondayService.findItemByFeatureName(featureName);
      
      if (!itemResponse.success || !itemResponse.data) {
        return res.status(404).json({
          success: false,
          error: 'Item not found'
        });
      }

      const updateResult = await mondayService.createUpdate(
        itemResponse.data.id,
        `Manual Update: ${updateText}`
      );
      
      if (updateResult.success) {
        res.json({
          success: true,
          data: updateResult.data,
          message: 'Manual update created successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          error: updateResult.error
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new MondayController();
const axios = require('axios');
const { GITHUB_CONFIG } = require('../config/constants');

class GitHubService {
  constructor() {
    this.api = axios.create({
      baseURL: GITHUB_CONFIG.API_BASE,
      headers: {
        'Authorization': `token ${process.env.GITHUB_ACCESS_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
  }

  // Get PR information
  async getPullRequest(owner, repo, prNumber) {
    try {
      const response = await this.api.get(`/repos/${owner}/${repo}/pulls/${prNumber}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get commit information
  async getCommit(owner, repo, sha) {
    try {
      const response = await this.api.get(`/repos/${owner}/${repo}/commits/${sha}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get repository information
  async getRepository(owner, repo) {
    try {
      const response = await this.api.get(`/repos/${owner}/${repo}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

// Update parseWebhookPayload to use BRANCH NAME for consistent item tracking
parseWebhookPayload(payload) {
  try {
    const { action, pull_request, repository, sender, ref, commits, head_commit, number, merged_by } = payload;
  
    let eventType = 'unknown';
    let featureName = '';
    let developer = sender?.login || 'Unknown';
    let reviewer = null;
    let prUrl = '';
    let commitMessage = '';
    let branch = ref ? ref.replace('refs/heads/', '') : '';
    let sourceBranch = ''; // The feature branch (for tracking)
    let targetBranch = ''; // The target branch (main/master)
    let repositoryUrl = repository?.html_url || '';
    let isMerge = false;
    let commitId = head_commit?.id || (commits && commits[0]?.id) || '';

    console.log(`🔍 Raw Webhook - Event: ${eventType}, Branch: ${branch}, Action: ${action}, PR: ${number}`);

    // Handle Pull Request Events
    if (pull_request) {
      eventType = 'pull_request';
      sourceBranch = pull_request.head?.ref || ''; // Feature branch
      targetBranch = pull_request.base?.ref || ''; // Target branch (main)
      branch = sourceBranch; // Always use source branch for tracking
      prUrl = pull_request.html_url;
      commitMessage = pull_request.title;
      repositoryUrl = repository.html_url;
      commitId = pull_request.head?.sha || commitId;
      developer = pull_request.user?.login || developer;
      
      // Check if PR was merged
      if (action === 'closed' && pull_request.merged) {
        isMerge = true;
        reviewer = pull_request.merged_by?.login || sender?.login || 'Unknown';
        commitMessage = `Merged: ${pull_request.title}`;
        // Extract original branch from PR for tracking
        branch = sourceBranch; // Keep using source branch
      }
      
      // For all PR events, use source branch name as feature identifier
      featureName = sourceBranch;
    } 
    // Handle Push Events
    else if (head_commit) {
      eventType = 'push';
      commitMessage = head_commit.message;
      developer = head_commit.author?.username || head_commit.author?.name || sender?.login || 'Unknown';
      repositoryUrl = repository.html_url;
      commitId = head_commit.id;
      
      // Check if this is a merge commit to main
      if (head_commit.message.includes('Merge pull request') || 
          head_commit.message.includes('Merge branch')) {
        isMerge = true;
        
        // Extract source branch from merge message
        // Format: "Merge pull request #8 from user/branch-name"
        const branchMatch = head_commit.message.match(/from [^/]+\/(.+)/);
        if (branchMatch) {
          sourceBranch = branchMatch[1].trim();
          featureName = sourceBranch; // Use source branch as identifier
        }
        
        // Extract PR number for reference
        const prMatch = head_commit.message.match(/Merge pull request #(\d+)/);
        if (prMatch && !featureName) {
          featureName = `PR-${prMatch[1]}`; // Fallback if branch not found
        }
      } else {
        // Regular push - use branch name
        featureName = branch;
        sourceBranch = branch;
      }
    }

    const result = {
      eventType,
      featureName: featureName || branch || `Commit-${commitId.substring(0, 8)}`,
      sourceBranch: sourceBranch || branch, // Feature branch for tracking
      targetBranch: targetBranch, // Main/master
      developer,
      reviewer, // Who merged the PR
      prUrl,
      commitMessage: commitMessage || 'No commit message',
      branch: sourceBranch || branch, // Always use source branch for item name
      repository: repository?.full_name || 'Unknown',
      repositoryUrl,
      action: action || 'push',
      isMerge: isMerge,
      isMainBranch: (branch === 'main' || branch === 'master') && !sourceBranch,
      commitId: commitId,
      prNumber: number
    };

    console.log('✅ Parsed Webhook:', result);
    return result;

  } catch (error) {
    console.error('Error parsing webhook payload:', error);
    return null;
  }
}

// In services/githubService.js - Update extractFeatureName method
extractFeatureName(message, fallback, prNumber = null) {
  if (!message) return fallback;
  
  // ALWAYS use PR number if available for consistent naming
  if (prNumber) {
    return `PR-${prNumber}`;
  }
  
  // For merge commits, extract PR number
  const prMatch = message.match(/Merge pull request #(\d+)/);
  if (prMatch) {
    return `PR-${prMatch[1]}`;
  }
  
  // For feature branch pushes without PR, use commit ID
  if (fallback && fallback.length > 7) {
    return `Commit-${fallback.substring(0, 8)}`;
  }
  
  // Fallback to cleaned message
  const cleanMessage = message.replace(/\n/g, ' ').substring(0, 50);
  return cleanMessage || 'Unknown Feature';
}

  // Verify webhook signature
  verifyWebhookSignature(payload, signature) {
    // For production, implement GitHub webhook signature verification
    // Using crypto.createHmac('sha256', secret).update(payload).digest('hex')
    return true; // Simplified for development
  }
}

module.exports = new GitHubService();
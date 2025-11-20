# 🚀 Dynamic Multi-Repository Jenkins Integration - OPTION 4

## ✅ IMPLEMENTATION COMPLETE

**Date:** November 19, 2025  
**Approach:** Option 4 - Automatic job name matching based on repository name

---

## 📋 WHAT WAS CHANGED

### 1. **New Monday.com Columns Added**

Three new TEXT columns were added to track repository and Jenkins job information:

| Column Name | Column ID | Purpose |
|------------|-----------|---------|
| **Repo Name** | `text_mkxvrvpf` | Stores the GitHub repository name (e.g., "Sample-test") |
| **Repo URL** | `text_mkxvh80n` | Stores the full GitHub repository URL |
| **Jenkins Job Name** | `text_mkxvbrz7` | Stores the Jenkins job name used for this item |

### 2. **Code Changes**

#### **config/constants.js**
- ✅ Added three new column ID constants
- ✅ Created `getJenkinsJobFromRepo()` helper function
- **How it works:** Extracts repo name from `"owner/repo-name"` format and uses it as Jenkins job name

```javascript
// Example:
getJenkinsJobFromRepo("aniket-upstreamtech03/Sample-test")
// Returns: "Sample-test"
```

#### **services/mondayService.js**
- ✅ Updated `buildColumnValues()` to include repository info
- ✅ Added repo columns to `github_push`, `github_pr`, and `jenkins_started` events
- ✅ Jenkins job name now saved to Monday.com when build starts

#### **controllers/githubController.js**
- ✅ Imported `getJenkinsJobFromRepo()` function
- ✅ Updated `getGitHubPRColumnValues()` to extract and include repo info
- ✅ Updated `getGitHubPushColumnValues()` to extract repo info and Jenkins job name
- ✅ **CRITICAL:** Modified `monitorJenkinsBuild()` to accept `repositoryName` parameter
- ✅ Changed all Jenkins API calls to use **dynamic job name** instead of hardcoded `.env` value
- ✅ Updated all 3 call sites to pass repository name

---

## 🔧 MANUAL CHANGES REQUIRED

### **STEP 1: Rename Jenkins Jobs to Match Repository Names**

Your Jenkins job names **MUST** exactly match your GitHub repository names:

| Current Jenkins Job Name | Repository Name | Required Action |
|-------------------------|-----------------|-----------------|
| ~~`Sample-Test-API`~~ | `Sample-jenkins-test` | ❌ **RENAME to:** `Sample-jenkins-test` |
| ~~`2 gitRepo Sample-test`~~ | `Sample-test` | ❌ **RENAME to:** `Sample-test` |
| (Future Job 3) | (Future Repo 3) | ✅ **NAME as:** `<repo-3-name>` |

#### **How to Rename Jenkins Jobs:**

1. Go to Jenkins Dashboard
2. Click on the job you want to rename
3. Click **"Rename"** in the left sidebar
4. Enter the **exact repository name** (without owner prefix)
5. Click **"Rename"**
6. **Update webhook URL** in the job configuration if needed

**⚠️ IMPORTANT:** Job names are **case-sensitive**! Match exactly:
- Repo: `Sample-test` → Job: `Sample-test` ✅
- Repo: `Sample-test` → Job: `sample-test` ❌ (wrong case!)

---

### **STEP 2: Verify GitHub Webhook Configuration**

Each repository should have a webhook pointing to your server:

**Webhook URL:** `https://upstream-mondaysession-98223080.loca.lt/api/webhooks/github`

**Events to subscribe:**
- ✅ Push events
- ✅ Pull requests
- ✅ Pull request reviews

Check in GitHub: `Settings → Webhooks → Edit`

---

### **STEP 3: Update Jenkins GitHub Plugin Configuration**

Each Jenkins job needs GitHub webhook trigger enabled:

1. Open Jenkins job configuration
2. **Build Triggers** section:
   - ☑ **"GitHub hook trigger for GITScm polling"**
3. **Source Code Management** section:
   - Set correct repository URL
   - Set correct branch (e.g., `*/main` or `*/master`)
4. Save configuration

---

## 🎯 HOW IT WORKS NOW

### **Before (Hardcoded):**
```javascript
// ❌ Old way - always used same job
const lastBuildInfo = await jenkinsService.getLastBuildInfo();
// Uses JENKINS_JOB_NAME=Sample-Test-API from .env
```

### **After (Dynamic):**
```javascript
// ✅ New way - extracts job name from repo
const jenkinsJobName = getJenkinsJobFromRepo("aniket-upstreamtech03/Sample-test");
// Returns: "Sample-test"

const lastBuildInfo = await jenkinsService.getLastBuildInfo(jenkinsJobName);
// Fetches from correct job!
```

---

## 📊 COMPLETE FLOW EXAMPLE

### **Scenario: Push to Sample-test Repository**

1. **GitHub Webhook Received:**
   ```javascript
   repository: "aniket-upstreamtech03/Sample-test"
   repositoryUrl: "https://github.com/aniket-upstreamtech03/Sample-test"
   branch: "feature-xyz"
   ```

2. **Code Extracts Repository Name:**
   ```javascript
   repoName = "Sample-test"  // Extracted from full name
   jenkinsJobName = "Sample-test"  // Using getJenkinsJobFromRepo()
   ```

3. **Monday.com Item Created/Updated:**
   - **Item Name:** `feature-xyz`
   - **Repo Name Column:** `Sample-test`
   - **Repo URL Column:** `https://github.com/aniket-upstreamtech03/Sample-test`
   - **Jenkins Job Name Column:** `Sample-test`

4. **Jenkins Monitoring Starts:**
   ```javascript
   monitorJenkinsBuild("feature-xyz", "aniket-upstreamtech03/Sample-test")
   // Monitors Jenkins job: "Sample-test"
   // Fetches build from: http://localhost:8080/job/Sample-test/lastBuild/api/json
   ```

5. **Result:**
   - ✅ Correct Jenkins job monitored
   - ✅ Correct build logs fetched
   - ✅ Monday.com updated with correct job name

---

## 🧪 TESTING CHECKLIST

After renaming Jenkins jobs, test each repository:

### **Test Repository 1: Sample-jenkins-test**

```
□ Rename Jenkins job to "Sample-jenkins-test"
□ Push code to feature branch
□ Check Monday.com item created with:
  - Repo Name: "Sample-jenkins-test"
  - Jenkins Job Name: "Sample-jenkins-test"
□ Verify Jenkins build #X from "Sample-jenkins-test" job
□ Check Monday.com updated with correct build logs
```

### **Test Repository 2: Sample-test**

```
□ Rename Jenkins job to "Sample-test"
□ Push code to feature branch
□ Check Monday.com item created with:
  - Repo Name: "Sample-test"
  - Jenkins Job Name: "Sample-test"
□ Verify Jenkins build #X from "Sample-test" job
□ Check Monday.com updated with correct build logs
```

### **Test Repository 3: (Future)**

```
□ Create Jenkins job with exact repo name
□ Configure GitHub webhook
□ Push code and verify automatic tracking
```

---

## 🚨 TROUBLESHOOTING

### **Problem: Still getting wrong Jenkins job logs**

**Cause:** Jenkins job name doesn't match repository name

**Solution:**
1. Check Jenkins job name exactly matches repo name
2. Restart your Node.js server: `npm run dev`
3. Push code again

---

### **Problem: Monday.com columns not updating**

**Cause:** Column IDs might be wrong

**Solution:**
1. Verify column IDs in Monday.com board settings
2. Update `config/constants.js` if IDs changed:
   ```javascript
   REPO_NAME: 'text_mkxvrvpf',
   REPO_URL: 'text_mkxvh80n',
   JENKINS_JOB_NAME: 'text_mkxvbrz7'
   ```

---

### **Problem: "Cannot determine Jenkins job for repository"**

**Logs show:**
```
❌ Cannot determine Jenkins job for repository: aniket-upstreamtech03/Sample-test
```

**Cause:** Repository name extraction failed

**Solution:**
1. Check webhook payload contains `repository.full_name`
2. Verify `getJenkinsJobFromRepo()` logic in constants.js

---

## 📝 ADDING NEW REPOSITORIES

To add a **3rd, 4th, 5th...** repository:

1. **Create Jenkins Job:**
   - Name it **exactly** like your GitHub repo name
   - Example: Repo `my-new-project` → Job `my-new-project`

2. **Configure Jenkins Job:**
   - Add GitHub webhook trigger
   - Set correct repository URL
   - Set branch to monitor

3. **Add GitHub Webhook:**
   - Repository Settings → Webhooks
   - URL: `https://upstream-mondaysession-98223080.loca.lt/api/webhooks/github`
   - Events: Push, Pull Request

4. **Test:**
   - Push code
   - Check Monday.com item created
   - Verify correct Jenkins job monitored

**That's it!** No code changes needed. ✅

---

## 🎉 BENEFITS OF OPTION 4

✅ **Zero Configuration:** No mapping files needed  
✅ **Automatic Discovery:** Just match job names to repo names  
✅ **Unlimited Repos:** Add as many as you want  
✅ **Clear Convention:** Easy to understand and maintain  
✅ **No Server Restarts:** Add new repos without code deployment  

---

## 📞 NEXT STEPS

1. **Rename your Jenkins jobs** to match repository names
2. **Restart Node.js server:** `npm run dev`
3. **Push code to both repositories** and verify correct tracking
4. **Check Monday.com board** for new columns populated
5. **Review logs** to confirm correct Jenkins jobs monitored

---

## 🔍 LOG MONITORING

After implementation, you should see logs like:

```
🎯 Using Jenkins job: Sample-test for repository: aniket-upstreamtech03/Sample-test
🔍 Monitoring Jenkins build #15: http://localhost:8080/job/Sample-test/15/
✅ Build monitoring completed for: feature-xyz
```

**Before fix (wrong):**
```
🔍 Monitoring Jenkins build #52: http://localhost:8080/job/Sample-Test-API/52/
```

**After fix (correct):**
```
🔍 Monitoring Jenkins build #15: http://localhost:8080/job/Sample-test/15/
```

---

## ✅ IMPLEMENTATION SUMMARY

| Component | Status | Action |
|-----------|--------|--------|
| Monday.com Columns | ✅ Complete | 3 new columns configured |
| Code Changes | ✅ Complete | 3 files modified |
| Dynamic Job Lookup | ✅ Complete | `getJenkinsJobFromRepo()` implemented |
| Jenkins Monitoring | ✅ Complete | Now uses dynamic job names |
| **Manual Steps** | ⏳ **YOUR ACTION** | Rename Jenkins jobs to match repos |

---

**🚀 Once you rename the Jenkins jobs, the system will automatically track all repositories correctly!**

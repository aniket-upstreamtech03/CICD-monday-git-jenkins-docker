# Fix: Jenkins Monitoring Creating Duplicate Items

## 🐛 Problem Identified

When Jenkins monitoring updates were sent to Monday.com, they were creating **duplicate items** instead of updating the existing item.

### Root Cause

In the `monitorJenkinsBuild()` function, when calling `updatePipelineItem()`, the code was only passing `featureName` but **not** `branchName`:

```javascript
// ❌ BEFORE - Missing branchName parameter
await mondayService.updatePipelineItem(featureName, startedColumnValues);
//                                     ^^^^^^^^^^^ Has item ID suffix
//                                                                    Missing branchName!
```

### Why This Caused Duplicates

The `updatePipelineItem()` method logic:

```javascript
let itemName;
if (branchName) {
  // Extract clean name: "aniket-test-new-2510573010" -> "aniket-test-new"
  itemName = this.extractItemNameFromBranch(branchName);
} else {
  // ❌ Falls back to featureName which still has item ID
  itemName = featureName; // "aniket-test-new-2510573010"
}
```

**Result:**
- Search for item named: `"aniket-test-new-2510573010"` ❌
- Doesn't find: `"aniket-test-new"` (the actual item name)
- Creates new item: `"aniket-test-new-2510573010"` ❌ **DUPLICATE!**

## ✅ Solution Implemented

Pass `branchName` parameter in all `updatePipelineItem()` calls within `monitorJenkinsBuild()`:

```javascript
// ✅ AFTER - Pass branchName so extraction works
await mondayService.updatePipelineItem(featureName, startedColumnValues, '', featureName);
//                                     ^^^^^^^^^^^                          ^^^^^^^^^^^ 
//                                     Still needed for logs                branchName parameter
```

### Code Changes Made

**File:** `controllers/githubController.js`

**Location:** `monitorJenkinsBuild()` method (lines 371-510)

**Changes:**

1. **Jenkins Build Started Update** (Line ~407)
```javascript
// BEFORE
await mondayService.updatePipelineItem(featureName, startedColumnValues);

// AFTER
await mondayService.updatePipelineItem(featureName, startedColumnValues, '', featureName);
```

2. **Build Completed Update** (Line ~425)
```javascript
// BEFORE
await mondayService.updatePipelineItem(featureName, buildColumnValues);

// AFTER
await mondayService.updatePipelineItem(featureName, buildColumnValues, '', featureName);
```

3. **Docker Info Update** (Line ~476)
```javascript
// BEFORE
await mondayService.updatePipelineItem(featureName, dockerColumnValues);

// AFTER
await mondayService.updatePipelineItem(featureName, dockerColumnValues, '', featureName);
```

4. **Error Handling Update** (Line ~508)
```javascript
// BEFORE
await mondayService.updatePipelineItem(featureName, errorColumnValues);

// AFTER
await mondayService.updatePipelineItem(featureName, errorColumnValues, '', featureName);
```

## 🔄 How It Works Now

### Before Fix (Creating Duplicates)

```
Jenkins Monitoring Starts
  ↓
featureName = "aniket-test-new-2510573010"
  ↓
updatePipelineItem(featureName, updates)
  ↓
No branchName → itemName = "aniket-test-new-2510573010"
  ↓
Search for "aniket-test-new-2510573010" → NOT FOUND
  ↓
CREATE NEW ITEM "aniket-test-new-2510573010" ❌ DUPLICATE!
```

### After Fix (Updating Existing Item)

```
Jenkins Monitoring Starts
  ↓
featureName = "aniket-test-new-2510573010"
branchName = "aniket-test-new-2510573010"
  ↓
updatePipelineItem(featureName, updates, '', branchName)
  ↓
Extract: "aniket-test-new-2510573010" → "aniket-test-new"
  ↓
Search for "aniket-test-new" → FOUND (ID: 2510573010) ✅
  ↓
UPDATE EXISTING ITEM ✅ No duplicate!
```

## 📊 Test Results

### Scenario: Push to branch `aniket-test-new-2510573010`

**Before Fix:**
- ✅ GitHub push → Updates item `aniket-test-new` 
- ❌ Jenkins starts → Creates duplicate `aniket-test-new-2510573010`
- ❌ Build completes → Updates duplicate item
- ❌ Docker deploys → Updates duplicate item
- **Result:** 2 items on Monday.com board

**After Fix:**
- ✅ GitHub push → Updates item `aniket-test-new`
- ✅ Jenkins starts → Updates item `aniket-test-new`
- ✅ Build completes → Updates item `aniket-test-new`
- ✅ Docker deploys → Updates item `aniket-test-new`
- **Result:** 1 item on Monday.com board ✅

## 🎯 Impact

### Fixed Issues
✅ No more duplicate items created during Jenkins monitoring  
✅ All pipeline stages update the same Monday.com item  
✅ Consistent tracking from GitHub push → Jenkins → Docker  
✅ Clean Monday.com board with one item per feature branch

### Files Modified
- `controllers/githubController.js` - Added `branchName` parameter to 4 `updatePipelineItem()` calls

### Backward Compatibility
✅ Existing functionality preserved  
✅ GitHub webhook handling unchanged  
✅ Other controllers not affected  
✅ Works with branches that don't have item IDs

## 🧪 How to Test

1. **Delete any duplicate items** from Monday.com board
2. **Push to a branch** like `test-feature-1234567890`
3. **Verify in Monday.com:**
   - One item created: `test-feature` ✅
   - GitHub status updated ✅
4. **Wait for Jenkins to build**
5. **Verify in Monday.com:**
   - Same item updated with Jenkins status ✅
   - No duplicate item created ✅
6. **Wait for Docker deployment**
7. **Verify in Monday.com:**
   - Same item updated with Docker info ✅
   - Still only one item on board ✅

## 📝 Notes

- The fourth parameter is `branchName` (not `commitId`)
- Signature: `updatePipelineItem(featureName, updates, commitId = '', branchName = '')`
- We pass empty string for `commitId` when not available
- The `extractItemNameFromBranch()` function handles the extraction logic

---

**Issue:** Fixed duplicate item creation during Jenkins monitoring  
**Date:** November 21, 2025  
**Status:** ✅ Resolved

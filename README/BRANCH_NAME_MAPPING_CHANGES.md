# Branch Name to Monday.com Item Mapping - Implementation Summary

## 📋 Overview

This document explains the changes made to the Monday.com item mapping logic to support branch names that include Monday.com item IDs.

## 🎯 Problem Statement

**Previous Logic:**
- Used branch name directly as item name
- Example: Branch `test-1234567890` → Item name `test-1234567890`
- Created duplicate items or couldn't find existing items

**New Requirement:**
- Branch names include Monday.com item ID as last 9-10 digits
- Need to extract clean item name by removing the item ID suffix
- Example: Branch `test-1234567890` → Item name `test`
- Example: Branch `test-check-git-native-2510556391` → Item name `test-check-git-native`

## 🔧 Changes Made

### 1. New Helper Function: `extractItemNameFromBranch()`

**Location:** `services/mondayService.js` (lines 15-34)

**Purpose:** Extract clean item name from branch name by removing the last 9-10 digits (Monday.com item ID)

**Code:**
```javascript
extractItemNameFromBranch(branchName) {
  if (!branchName) return '';
  
  // Pattern to match last 9-10 digits optionally preceded by dash or underscore
  // Monday.com item IDs can be 9 or 10 digits
  const pattern = /[-_]?\d{9,10}$/;
  
  // Remove the last 9-10 digits if present
  const itemName = branchName.replace(pattern, '');
  
  console.log(`🔧 Branch name parsing: "${branchName}" -> "${itemName}"`);
  
  return itemName;
}
```

**Examples:**
| Branch Name | Extracted Item Name | Explanation |
|-------------|---------------------|-------------|
| `test-1234567890` | `test` | Removes `-1234567890` (10 digits) |
| `test-982239713` | `test` | Removes `-982239713` (9 digits) |
| `test-check-git-native-2510556391` | `test-check-git-native` | Removes `-2510556391` (10 digits) |
| `hotfix_1234567890` | `hotfix` | Handles underscore separator |
| `feature-abc` | `feature-abc` | No change (no 9-10 digits at end) |
| `main` | `main` | No change (no digits) |

### 2. Updated `findItemByFeatureName()` Method

**Location:** `services/mondayService.js` (lines 261-307)

**Changes:**
- Simplified search to exact name match only
- Removed PR number matching logic (no longer needed)
- Now searches for the extracted item name directly

**Search Strategy:**
```
Branch: "test-check-git-native-2510556391"
  ↓
Extract: "test-check-git-native"
  ↓
Search Monday.com board for item with name = "test-check-git-native"
  ↓
Found? → Update existing item
Not Found? → Create new item with name "test-check-git-native"
```

### 3. Updated `updatePipelineItem()` Method

**Location:** `services/mondayService.js` (lines 322-365)

**Changes:**
- Now extracts item name from branch name using the new helper function
- Uses extracted item name for both search and create operations
- Maintains all existing functionality (update vs create logic, PR URL preservation)

**New Flow:**
```javascript
// OLD CODE:
const itemName = branchName || featureName;

// NEW CODE:
let itemName;
if (branchName) {
  itemName = this.extractItemNameFromBranch(branchName);
  console.log(`\n📝 Extracted Item Name from Branch: "${itemName}"`);
} else {
  itemName = featureName;
  console.log(`\n📝 Using Feature Name as Item Name: "${itemName}"`);
}
```

## 🔄 Complete Workflow Example

### Scenario 1: First Push to New Branch

**Input:**
- Branch: `test-check-git-native-2510556391`
- Developer: `john.doe`
- Commit: `feat: add new feature`

**Processing:**
1. Extract item name: `test-check-git-native-2510556391` → `test-check-git-native`
2. Search Monday.com for item named `test-check-git-native`
3. **Not found** → Create new item
4. Item created with name: `test-check-git-native`
5. Columns updated: GitHub status, developer, commit message, etc.

**Result:**
✅ New Monday.com item: `test-check-git-native` (ID: 2510556391)

---

### Scenario 2: Subsequent Push to Same Branch

**Input:**
- Branch: `test-check-git-native-2510556391` (same branch)
- Developer: `john.doe`
- Commit: `fix: resolve bug`

**Processing:**
1. Extract item name: `test-check-git-native-2510556391` → `test-check-git-native`
2. Search Monday.com for item named `test-check-git-native`
3. **Found** → Update existing item (ID: 2510556391)
4. Columns updated: Latest commit, timestamp, status, etc.

**Result:**
✅ Updated Monday.com item: `test-check-git-native` (ID: 2510556391)

---

### Scenario 3: Simple Branch Name (No Item ID)

**Input:**
- Branch: `main`
- Developer: `admin`
- Commit: `release: v1.0.0`

**Processing:**
1. Extract item name: `main` → `main` (no digits to remove)
2. Search Monday.com for item named `main`
3. **Not found** → Create new item
4. Item created with name: `main`

**Result:**
✅ New Monday.com item: `main`

## 📊 Comparison: Before vs After

### Before Changes

```javascript
// Branch: "test-check-git-native-2510556391"
const itemName = branchName || featureName;
// → itemName = "test-check-git-native-2510556391"

// Search for "test-check-git-native-2510556391" in Monday.com
// Problem: Won't find existing item if it's named "test-check-git-native"
```

### After Changes

```javascript
// Branch: "test-check-git-native-2510556391"
const itemName = this.extractItemNameFromBranch(branchName);
// → itemName = "test-check-git-native"

// Search for "test-check-git-native" in Monday.com
// Success: Finds existing item and updates it
```

## ✅ Benefits

1. **Consistent Item Tracking**: Same item name regardless of item ID in branch name
2. **No Duplicates**: Prevents creating multiple items for the same feature
3. **Cleaner Item Names**: Monday.com board shows clean names like `test` instead of `test-1234567890`
4. **Backward Compatible**: Works with branches that don't have item IDs
5. **Flexible**: Handles both 9 and 10 digit item IDs

## 🧪 Testing

Run the test script to verify the logic:

```powershell
node test-branch-name-extraction.js
```

**Expected Output:**
- ✅ 9/9 tests passed
- All branch name patterns correctly parsed
- Real-world scenario demonstration

## 📝 Code Files Modified

1. **services/mondayService.js**
   - Added `extractItemNameFromBranch()` method
   - Updated `findItemByFeatureName()` method
   - Updated `updatePipelineItem()` method

2. **test-branch-name-extraction.js** (NEW)
   - Comprehensive test suite
   - Real-world scenario examples
   - Validation of all edge cases

## 🎯 Key Takeaways

- **Branch naming convention**: `{item-name}-{item-id}`
- **Item ID format**: Last 9-10 digits of branch name
- **Separator**: Dash (`-`) or underscore (`_`)
- **Search**: Exact match by extracted item name
- **Create**: Uses extracted item name (max 200 chars)

## 🚀 Next Steps

1. Test with real GitHub webhook events
2. Monitor Monday.com board for correct item updates
3. Verify no duplicate items are created
4. Check console logs for extraction confirmations

---

**Last Updated:** November 21, 2025  
**Author:** GitHub Copilot  
**Version:** 1.0

/**
 * Test script to demonstrate the new branch name extraction logic
 * 
 * This tests the extractItemNameFromBranch() function that removes
 * the last 10 digits (Monday.com item ID) from branch names
 */

// Simulate the extraction function
function extractItemNameFromBranch(branchName) {
  if (!branchName) return '';
  
  // Pattern to match last 9-10 digits optionally preceded by dash or underscore
  // Monday.com item IDs can be 9 or 10 digits
  const pattern = /[-_]?\d{9,10}$/;
  
  // Remove the last 9-10 digits if present
  const itemName = branchName.replace(pattern, '');
  
  return itemName;
}

// Test cases
const testCases = [
  // Your examples
  { branch: 'test-1234567890', expected: 'test' },
  { branch: 'test-982239713', expected: 'test' },
  { branch: 'test-check-git-native-2510556391', expected: 'test-check-git-native' },
  
  // Edge cases
  { branch: 'feature-abc', expected: 'feature-abc' }, // No 10 digits
  { branch: 'main', expected: 'main' }, // No digits at all
  { branch: 'hotfix_1234567890', expected: 'hotfix' }, // Underscore separator
  { branch: 'bugfix-123', expected: 'bugfix-123' }, // Less than 10 digits
  { branch: 'release-v1.0-9876543210', expected: 'release-v1.0' }, // 10 digits at end
  { branch: '', expected: '' }, // Empty string
];

console.log('╔══════════════════════════════════════════════════════════════════╗');
console.log('║      Branch Name Extraction Test Results                         ║');
console.log('╚══════════════════════════════════════════════════════════════════╝\n');

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  const result = extractItemNameFromBranch(test.branch);
  const isPassing = result === test.expected;
  
  if (isPassing) {
    passed++;
    console.log(`✅ Test ${index + 1}: PASSED`);
  } else {
    failed++;
    console.log(`❌ Test ${index + 1}: FAILED`);
  }
  
  console.log(`   Branch Name:    "${test.branch}"`);
  console.log(`   Expected Result: "${test.expected}"`);
  console.log(`   Actual Result:   "${result}"`);
  console.log('');
});

console.log('═══════════════════════════════════════════════════════════════════');
console.log(`📊 Test Summary: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);
console.log('═══════════════════════════════════════════════════════════════════\n');

// Real-world scenario example
console.log('╔══════════════════════════════════════════════════════════════════╗');
console.log('║      Real-World Scenario: GitHub Push Event                      ║');
console.log('╚══════════════════════════════════════════════════════════════════╝\n');

console.log('Scenario: Developer pushes to branch "test-check-git-native-2510556391"');
console.log('');
console.log('Step 1: Extract item name from branch');
const branchName = 'test-check-git-native-2510556391';
const itemName = extractItemNameFromBranch(branchName);
console.log(`  Branch: "${branchName}"`);
console.log(`  → Item Name: "${itemName}"`);
console.log('');

console.log('Step 2: Search Monday.com board for item with name "test-check-git-native"');
console.log('  - If item exists: UPDATE columns (GitHub status, commit message, etc.)');
console.log('  - If item NOT exists: CREATE new item with name "test-check-git-native"');
console.log('');

console.log('Step 3: Monday.com item result');
console.log(`  ✓ Item Name: "${itemName}"`);
console.log(`  ✓ Item ID: 2510556391 (embedded in branch name)`);
console.log('  ✓ All status columns updated');
console.log('');

console.log('═══════════════════════════════════════════════════════════════════\n');

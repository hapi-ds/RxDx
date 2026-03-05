# Property-Based Test: Task Selection Persistence

## Overview

This document describes the property-based test implementation for **Property 14: Task Selection Persistence** which validates **Requirements 4.8** from the web-time-tracking spec.

## Test File

`frontend/src/stores/timeTrackingStore.taskSelection.properties.test.ts`

## Property Being Tested

**Property 14: Task Selection Persistence**

*For any* selected task, if the user navigates away and returns to the page, the same task should remain selected (using sessionStorage).

## Test Coverage

The test file contains 15 comprehensive property-based tests that validate task selection persistence across various scenarios:

### 1. Basic Persistence (Property 1)
- **What it tests**: Any valid task ID can be persisted and recovered
- **Generators**: UUIDs, alphanumeric strings, numeric task IDs, hex strings
- **Runs**: 100 iterations

### 2. Null Selection Handling (Property 2)
- **What it tests**: Setting selection to null clears sessionStorage
- **Generators**: UUIDs
- **Runs**: 100 iterations

### 3. Multiple Selections (Property 3)
- **What it tests**: Only the latest selection is preserved
- **Generators**: Arrays of UUIDs (2-10 items)
- **Runs**: 100 iterations

### 4. Independence from Search Query (Property 4)
- **What it tests**: Task selection persists independently of search query changes
- **Generators**: UUIDs + arrays of search strings
- **Runs**: 100 iterations

### 5. Whitespace Preservation (Property 5)
- **What it tests**: Task IDs with leading/trailing whitespace are preserved exactly
- **Generators**: Strings with various whitespace combinations
- **Runs**: 100 iterations

### 6. Special Characters (Property 6)
- **What it tests**: Task IDs with special characters are preserved
- **Generators**: Strings with @, #, $, %, &, *, etc.
- **Runs**: 100 iterations

### 7. Unicode Support (Property 7)
- **What it tests**: Task IDs with unicode characters (Chinese, Russian, Japanese, emoji) are preserved
- **Generators**: Strings with various unicode characters
- **Runs**: 100 iterations

### 8. Store Reset Survival (Property 8)
- **What it tests**: Task selection survives store reset via sessionStorage
- **Generators**: UUIDs
- **Runs**: 100 iterations

### 9. Alternating Selection/Deselection (Property 9)
- **What it tests**: Alternating between selection and deselection works correctly
- **Generators**: Arrays of optional UUIDs (2-10 items)
- **Runs**: 100 iterations

### 10. Quota Exceeded Handling (Property 10)
- **What it tests**: sessionStorage quota exceeded errors are handled gracefully
- **Generators**: UUIDs
- **Runs**: 50 iterations (fewer due to mocking)

### 11. Long Task IDs (Property 11)
- **What it tests**: Very long task IDs (100-1000 chars) are handled without truncation
- **Generators**: Long strings (100-1000 characters)
- **Runs**: 50 iterations (fewer for performance)

### 12. Idempotency (Property 12)
- **What it tests**: Selecting the same task multiple times has the same effect
- **Generators**: UUIDs + repeat counts (2-10)
- **Runs**: 100 iterations

### 13. Empty String Handling (Property 13)
- **What it tests**: Empty string task ID is treated as valid selection
- **Generators**: UUIDs
- **Runs**: 100 iterations

### 14. Concurrent Selections (Property 14)
- **What it tests**: Rapid successive selections work correctly (last write wins)
- **Generators**: Arrays of UUIDs (5-20 items)
- **Runs**: 100 iterations

### 15. Read Consistency (Property 15)
- **What it tests**: Multiple reads return consistent values
- **Generators**: UUIDs + read counts (2-10)
- **Runs**: 100 iterations

## Total Test Iterations

- **Total property tests**: 15
- **Total iterations**: ~1,450 (most tests run 100 iterations, some run 50)

## How to Run

### Run all tests
```bash
cd frontend
npm test
```

### Run only this property test
```bash
cd frontend
npm test -- timeTrackingStore.taskSelection.properties.test.ts
```

### Run with UI
```bash
cd frontend
npm run test:ui
```

### Run in watch mode
```bash
cd frontend
npm run test:watch -- timeTrackingStore.taskSelection.properties.test.ts
```

## Expected Behavior

All 15 property tests should pass, validating that:

1. ✅ Task selection is correctly persisted to sessionStorage
2. ✅ Task selection is correctly recovered from sessionStorage
3. ✅ All types of task IDs (UUIDs, strings, numbers, special chars, unicode) work correctly
4. ✅ Edge cases (null, empty string, whitespace, very long IDs) are handled properly
5. ✅ Error conditions (quota exceeded) are handled gracefully
6. ✅ State consistency is maintained across operations

## Integration with Store

The test validates the following store methods:

- `selectTask(taskId: string | null)`: Selects a task and persists to sessionStorage
- `selectedTaskId`: The currently selected task ID (recovered from sessionStorage on initialization)

The test also validates the sessionStorage integration:

- **Key**: `rxdx_session_selected_task`
- **Value**: The selected task ID (string) or null if no selection
- **Behavior**: Automatically saved on selection, cleared on null selection

## Property-Based Testing Approach

This test uses **fast-check** library for property-based testing, which:

1. **Generates random inputs**: Creates diverse test cases automatically
2. **Finds edge cases**: Discovers corner cases that manual tests might miss
3. **Validates properties**: Ensures universal properties hold for all inputs
4. **Provides counterexamples**: When a test fails, shows the exact input that caused the failure

## Validation Against Requirements

This test validates **Requirements 4.8**:

> THE Web App SHALL preserve search state when navigating away and returning to the page

The test extends this requirement to also validate task selection persistence, which is implemented using the same sessionStorage mechanism.

## Notes

- The test uses `sessionStorage` (not `localStorage`) because task selection is session-specific
- The test mocks sessionStorage operations to test error handling
- The test validates both store state and sessionStorage state for consistency
- The test covers both happy paths and error conditions
- The test uses realistic task ID formats (UUIDs, alphanumeric, etc.)

## Maintenance

When updating the task selection persistence logic:

1. Ensure all 15 property tests still pass
2. Add new property tests for new edge cases
3. Update this documentation if behavior changes
4. Consider adding more generators if new task ID formats are supported

## Related Files

- `frontend/src/stores/timeTrackingStore.ts`: Store implementation
- `frontend/src/stores/timeTrackingStore.sessionStorage.test.ts`: Unit tests for sessionStorage
- `.kiro/specs/web-time-tracking/design.md`: Design document with Property 14 definition
- `.kiro/specs/web-time-tracking/requirements.md`: Requirements document (4.8)

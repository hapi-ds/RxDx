# Integration Testing Documentation

This directory contains integration tests for the RxDx application.

## Task 20.1: Integration Testing

### Test Coverage

The integration tests verify:

1. **Complete User Flows**
   - Table page navigation and filtering
   - Graph Explorer navigation and filtering
   - Cross-page navigation maintaining state
   - Bulk edit workflows

2. **Cross-Page Navigation**
   - Navigation between Table, Graph, Schedule pages
   - Backward compatibility redirect from /requirements to /table
   - State preservation across navigation
   - Error handling during navigation

3. **Session Persistence**
   - Filter state saved to session storage
   - Filter state restored on page load
   - Separate filter states for Table and Graph pages
   - Filter state cleared on logout
   - Handling of corrupted session storage

### Test Files

- `filter-persistence.integration.test.ts` - Tests for session storage and filter persistence
- `user-flows.integration.test.tsx` - Tests for complete user workflows (requires full app setup)

### Known Limitations

1. **Debounced Saves**: The `saveFilterState` function uses a 500ms debounce to optimize performance. Tests that verify immediate saves need to account for this delay or use `saveFilterStateImmediate()`.

2. **Null vs Empty Set**: The `loadFilterState` function returns `null` for empty filter arrays (no filters set) rather than an empty Set. This is intentional to distinguish between "no saved state" and "explicitly cleared filters".

3. **Full App Tests**: The `user-flows.integration.test.tsx` file contains comprehensive tests that require the full React app to be rendered. These tests may need additional setup for mocking authentication, routing, and API calls.

### Running Integration Tests

```bash
# Run all integration tests
npm test -- integration

# Run specific integration test file
npm test -- filter-persistence.integration.test.ts

# Run with coverage
npm test -- integration --coverage
```

### Integration Test Strategy

The integration tests follow a layered approach:

1. **Unit-level Integration**: Test individual utilities and services working together (e.g., session storage + filter state)

2. **Component-level Integration**: Test components interacting with stores and services (e.g., Table page + workitemStore + workitemService)

3. **Page-level Integration**: Test complete page workflows including navigation, state management, and API calls

4. **End-to-End Integration**: Test complete user journeys across multiple pages (covered in task 20.2)

### Test Data

Integration tests use:
- Mock API responses for workitems and graph data
- Mock authentication state
- Session storage (real browser API in test environment)
- Mock routing (MemoryRouter from react-router-dom)

### Validation Criteria

Integration tests validate:
- ✅ Filter state persists across page navigation
- ✅ Session storage handles edge cases (corrupted data, missing keys)
- ✅ Performance meets requirements (< 500ms for filter operations)
- ✅ Error handling works correctly
- ✅ Backward compatibility maintained

### Future Enhancements

1. Add visual regression testing for UI components
2. Add performance benchmarking for large datasets
3. Add accessibility testing with axe-core
4. Add network failure simulation tests
5. Add concurrent user simulation tests

## Related Tasks

- Task 20.2: End-to-end testing
- Task 20.3: Browser compatibility testing
- Task 21: Final checkpoint

## References

- Requirements: `.kiro/specs/graph-table-ui-enhancements/requirements.md`
- Design: `.kiro/specs/graph-table-ui-enhancements/design.md`
- Tasks: `.kiro/specs/graph-table-ui-enhancements/tasks.md`

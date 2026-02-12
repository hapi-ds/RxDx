"""
Property-based tests for graph search functionality
Tests case-insensitive search and search result navigation
"""

import pytest
from hypothesis import given, strategies as st, assume
from uuid import uuid4


# Property 16: Case-Insensitive Search
@pytest.mark.asyncio
@given(
    search_text=st.text(min_size=1, max_size=50).filter(lambda s: s.strip()),
    case_variant=st.sampled_from(['lower', 'upper', 'title', 'mixed'])
)
async def test_property_16_case_insensitive_search(
    search_text: str,
    case_variant: str,
    async_client,
    test_user,
    test_project
):
    """
    Feature: graph-table-ui-enhancements
    Property 16: Case-Insensitive Search
    
    For any search query string, the search results should include nodes whose
    title or description contains the query string, regardless of case differences.
    
    Validates: Requirements 16.2
    """
    from app.db.graph import GraphService
    from app.services.workitem_service import WorkItemService
    from app.schemas.workitem import WorkItemCreate
    
    # Get services
    graph_service = GraphService()
    workitem_service = WorkItemService(graph_service)
    
    # Create a work item with the search text in the title
    original_text = search_text.strip()
    
    # Apply case variant to the work item title
    if case_variant == 'lower':
        workitem_title = original_text.lower()
    elif case_variant == 'upper':
        workitem_title = original_text.upper()
    elif case_variant == 'title':
        workitem_title = original_text.title()
    else:  # mixed
        # Create mixed case by alternating
        workitem_title = ''.join(
            c.upper() if i % 2 == 0 else c.lower()
            for i, c in enumerate(original_text)
        )
    
    # Create work item
    workitem_data = WorkItemCreate(
        type='requirement',
        title=f"Test {workitem_title} Item",
        description=f"Description with {workitem_title}",
        status='draft',
        project_id=test_project.id
    )
    
    created_item = await workitem_service.create_workitem(
        workitem_data,
        test_user
    )
    
    try:
        # Search with different case variants
        search_variants = [
            original_text.lower(),
            original_text.upper(),
            original_text.title(),
        ]
        
        for search_query in search_variants:
            # Skip if search query is empty after transformation
            if not search_query.strip():
                continue
            
            # Perform search
            results = await graph_service.search_workitems(
                search_text=search_query,
                limit=100
            )
            
            # Check if our created item is in the results
            found = any(
                str(item.get('id')) == str(created_item.id)
                for item in results
            )
            
            # Property: Search should find the item regardless of case
            assert found, (
                f"Case-insensitive search failed: "
                f"Created item with title '{workitem_title}' "
                f"not found when searching for '{search_query}'"
            )
    
    finally:
        # Cleanup: Delete the created work item
        try:
            await workitem_service.delete_workitem(created_item.id, test_user)
        except Exception:
            pass  # Ignore cleanup errors


# Property 17: Search Result Navigation
@pytest.mark.asyncio
@given(
    num_items=st.integers(min_value=1, max_value=5)
)
async def test_property_17_search_result_navigation(
    num_items: int,
    async_client,
    test_user,
    test_project
):
    """
    Feature: graph-table-ui-enhancements
    Property 17: Search Result Navigation
    
    For any search result selected by the user, the graph viewport should center
    on that node and the node should be highlighted.
    
    Validates: Requirements 16.4
    
    Note: This test validates that search results contain the necessary data
    for navigation (id, type, label). The actual centering and highlighting
    is a frontend behavior tested in frontend tests.
    """
    from app.db.graph import GraphService
    from app.services.workitem_service import WorkItemService
    from app.schemas.workitem import WorkItemCreate
    
    # Get services
    graph_service = GraphService()
    workitem_service = WorkItemService(graph_service)
    
    # Create multiple work items
    created_items = []
    search_term = f"NavTest{uuid4().hex[:8]}"
    
    try:
        for i in range(num_items):
            workitem_data = WorkItemCreate(
                type='requirement',
                title=f"{search_term} Item {i}",
                description=f"Description for navigation test {i}",
                status='draft',
                project_id=test_project.id
            )
            
            created_item = await workitem_service.create_workitem(
                workitem_data,
                test_user
            )
            created_items.append(created_item)
        
        # Search for the items
        results = await graph_service.search_workitems(
            search_text=search_term,
            limit=100
        )
        
        # Property: Each search result must have the required fields for navigation
        for result in results:
            if str(result.get('id')) in [str(item.id) for item in created_items]:
                # Check required fields for navigation
                assert 'id' in result, "Search result missing 'id' field"
                assert 'type' in result, "Search result missing 'type' field"
                assert 'title' in result or 'label' in result, (
                    "Search result missing 'title' or 'label' field"
                )
                
                # Verify ID is valid
                assert result['id'] is not None, "Search result has null ID"
                assert str(result['id']).strip(), "Search result has empty ID"
                
                # Verify type is valid
                assert result['type'] is not None, "Search result has null type"
                assert str(result['type']).strip(), "Search result has empty type"
    
    finally:
        # Cleanup: Delete created work items
        for item in created_items:
            try:
                await workitem_service.delete_workitem(item.id, test_user)
            except Exception:
                pass  # Ignore cleanup errors

"""Property-based tests for Milestone operations"""

import pytest
from datetime import UTC, datetime, timedelta
from hypothesis import given, strategies as st
from uuid import uuid4

from app.models.user import User
from app.schemas.milestone import MilestoneCreate
from app.services.milestone_service import MilestoneService


# Hypothesis strategies for generating test data
@st.composite
def milestone_title_strategy(draw):
    """Generate valid milestone titles"""
    # Generate a title with at least 5 characters and at least one letter
    prefix = draw(st.text(alphabet=st.characters(whitelist_categories=('Lu', 'Ll')), min_size=1, max_size=10))
    suffix = draw(st.text(min_size=4, max_size=490))
    return f"{prefix}{suffix}"


@st.composite
def future_datetime_strategy(draw):
    """Generate future datetime values"""
    days_ahead = draw(st.integers(min_value=1, max_value=365))
    hours_ahead = draw(st.integers(min_value=0, max_value=23))
    return datetime.now(UTC) + timedelta(days=days_ahead, hours=hours_ahead)


@st.composite
def milestone_data_strategy(draw):
    """Generate valid milestone creation data"""
    title = draw(milestone_title_strategy())
    target_date = draw(future_datetime_strategy())
    is_manual_constraint = draw(st.booleans())
    project_id = uuid4()

    # Optional fields
    description = draw(st.one_of(
        st.none(),
        st.text(min_size=10, max_size=500)
    ))

    completion_criteria = draw(st.one_of(
        st.none(),
        st.text(min_size=10, max_size=500)
    ))

    status = draw(st.sampled_from(["draft", "active", "completed", "archived"]))

    return MilestoneCreate(
        title=title,
        description=description,
        target_date=target_date,
        is_manual_constraint=is_manual_constraint,
        completion_criteria=completion_criteria,
        status=status,
        project_id=project_id
    )


@pytest.fixture
def mock_user():
    """Create a mock user for testing"""
    return User(
        id=uuid4(),
        email="test@example.com",
        full_name="Test User",
        hashed_password="hashed",
        is_active=True,
        role="user"
    )


@pytest.fixture
def milestone_service(mock_graph_service):
    """Create MilestoneService with mock graph service"""
    return MilestoneService(mock_graph_service)


@pytest.mark.asyncio
@given(milestone_data=milestone_data_strategy())
async def test_property_is_manual_constraint_is_always_boolean(
    milestone_data,
    milestone_service,
    mock_user
):
    """
    Property: is_manual_constraint is always a boolean value
    
    **Validates: Requirements 1.8, 1.9**
    
    This property ensures that the is_manual_constraint field is always
    stored and retrieved as a boolean value, never as a string or other type.
    """
    milestone = await milestone_service.create_milestone(milestone_data, mock_user)

    # Verify is_manual_constraint is a boolean
    assert isinstance(milestone.is_manual_constraint, bool)
    assert milestone.is_manual_constraint in [True, False]

    # Retrieve the milestone and verify again
    retrieved = await milestone_service.get_milestone(milestone.id)
    assert retrieved is not None
    assert isinstance(retrieved.is_manual_constraint, bool)
    assert retrieved.is_manual_constraint == milestone.is_manual_constraint


@pytest.mark.asyncio
@given(milestone_data=milestone_data_strategy())
async def test_property_all_milestones_have_valid_project_id(
    milestone_data,
    milestone_service,
    mock_user
):
    """
    Property: All milestones have a valid project_id
    
    **Validates: Requirements 16.14, 16.16**
    
    This property ensures that every milestone is associated with a valid
    project UUID and that the project_id is preserved through create/retrieve operations.
    """
    milestone = await milestone_service.create_milestone(milestone_data, mock_user)

    # Verify project_id is a valid UUID
    assert milestone.project_id is not None
    assert isinstance(milestone.project_id, type(uuid4()))
    assert milestone.project_id == milestone_data.project_id

    # Retrieve the milestone and verify project_id is preserved
    retrieved = await milestone_service.get_milestone(milestone.id)
    assert retrieved is not None
    assert retrieved.project_id == milestone.project_id
    assert retrieved.project_id == milestone_data.project_id


@pytest.mark.asyncio
@given(milestone_data=milestone_data_strategy())
async def test_property_milestone_target_date_is_preserved(
    milestone_data,
    milestone_service,
    mock_user
):
    """
    Property: Milestone target_date is preserved through create/retrieve operations
    
    **Validates: Requirements 1.8, 1.9**
    
    This property ensures that the target_date is stored and retrieved accurately,
    maintaining timezone information and precision.
    """
    milestone = await milestone_service.create_milestone(milestone_data, mock_user)

    # Verify target_date is preserved
    assert milestone.target_date is not None
    assert isinstance(milestone.target_date, datetime)
    assert milestone.target_date.tzinfo is not None  # Timezone-aware

    # Retrieve the milestone and verify target_date matches
    retrieved = await milestone_service.get_milestone(milestone.id)
    assert retrieved is not None
    assert retrieved.target_date == milestone.target_date


@pytest.mark.asyncio
@given(milestone_data=milestone_data_strategy())
async def test_property_milestone_status_is_valid(
    milestone_data,
    milestone_service,
    mock_user
):
    """
    Property: Milestone status is always one of the allowed values
    
    **Validates: Requirements 16.14**
    
    This property ensures that milestone status is constrained to valid values
    and is preserved through create/retrieve operations.
    """
    milestone = await milestone_service.create_milestone(milestone_data, mock_user)

    # Verify status is valid
    allowed_statuses = {"draft", "active", "completed", "archived"}
    assert milestone.status in allowed_statuses

    # Retrieve the milestone and verify status is preserved
    retrieved = await milestone_service.get_milestone(milestone.id)
    assert retrieved is not None
    assert retrieved.status == milestone.status
    assert retrieved.status in allowed_statuses


@pytest.mark.asyncio
@given(milestone_data=milestone_data_strategy())
async def test_property_milestone_has_version(
    milestone_data,
    milestone_service,
    mock_user
):
    """
    Property: All milestones have a version number
    
    **Validates: Requirements 16.14**
    
    This property ensures that every milestone has a version number
    starting at "1.0" for new milestones.
    """
    milestone = await milestone_service.create_milestone(milestone_data, mock_user)

    # Verify version is set
    assert milestone.version is not None
    assert isinstance(milestone.version, str)
    assert milestone.version == "1.0"  # New milestones start at 1.0

    # Retrieve the milestone and verify version is preserved
    retrieved = await milestone_service.get_milestone(milestone.id)
    assert retrieved is not None
    assert retrieved.version == milestone.version


@pytest.mark.asyncio
@given(milestone_data=milestone_data_strategy())
async def test_property_milestone_has_timestamps(
    milestone_data,
    milestone_service,
    mock_user
):
    """
    Property: All milestones have created_at and updated_at timestamps
    
    **Validates: Requirements 16.14**
    
    This property ensures that every milestone has creation and update timestamps
    that are timezone-aware and reasonable.
    """
    milestone = await milestone_service.create_milestone(milestone_data, mock_user)

    # Verify timestamps are set
    assert milestone.created_at is not None
    assert milestone.updated_at is not None
    assert isinstance(milestone.created_at, datetime)
    assert isinstance(milestone.updated_at, datetime)
    assert milestone.created_at.tzinfo is not None
    assert milestone.updated_at.tzinfo is not None

    # Verify timestamps are reasonable (within last minute)
    now = datetime.now(UTC)
    assert (now - milestone.created_at).total_seconds() < 60
    assert (now - milestone.updated_at).total_seconds() < 60

    # Retrieve the milestone and verify timestamps are preserved
    retrieved = await milestone_service.get_milestone(milestone.id)
    assert retrieved is not None
    assert retrieved.created_at == milestone.created_at
    assert retrieved.updated_at == milestone.updated_at


@pytest.mark.asyncio
@given(milestone_data=milestone_data_strategy())
async def test_property_milestone_has_creator(
    milestone_data,
    milestone_service,
    mock_user
):
    """
    Property: All milestones have a created_by user ID
    
    **Validates: Requirements 16.14**
    
    This property ensures that every milestone tracks who created it.
    """
    milestone = await milestone_service.create_milestone(milestone_data, mock_user)

    # Verify created_by is set
    assert milestone.created_by is not None
    assert isinstance(milestone.created_by, type(uuid4()))
    assert milestone.created_by == mock_user.id

    # Retrieve the milestone and verify created_by is preserved
    retrieved = await milestone_service.get_milestone(milestone.id)
    assert retrieved is not None
    assert retrieved.created_by == milestone.created_by


@pytest.mark.asyncio
@given(
    milestone_data=milestone_data_strategy(),
    is_manual_constraint=st.booleans()
)
async def test_property_manual_constraint_toggle(
    milestone_data,
    is_manual_constraint,
    milestone_service,
    mock_user
):
    """
    Property: is_manual_constraint can be toggled between true and false
    
    **Validates: Requirements 1.8, 1.9**
    
    This property ensures that the is_manual_constraint flag can be updated
    and the new value is preserved.
    """
    # Create milestone with initial is_manual_constraint value
    milestone = await milestone_service.create_milestone(milestone_data, mock_user)

    # Update is_manual_constraint to the test value
    from app.schemas.milestone import MilestoneUpdate
    updates = MilestoneUpdate(is_manual_constraint=is_manual_constraint)
    updated = await milestone_service.update_milestone(milestone.id, updates, mock_user)

    # Verify the update
    assert updated is not None
    assert isinstance(updated.is_manual_constraint, bool)
    assert updated.is_manual_constraint == is_manual_constraint

    # Retrieve and verify persistence
    retrieved = await milestone_service.get_milestone(milestone.id)
    assert retrieved is not None
    assert retrieved.is_manual_constraint == is_manual_constraint


@pytest.mark.asyncio
@given(milestone_data=milestone_data_strategy())
async def test_property_milestone_list_includes_created_milestone(
    milestone_data,
    milestone_service,
    mock_user
):
    """
    Property: A created milestone appears in the list of milestones
    
    **Validates: Requirements 16.14**
    
    This property ensures that after creating a milestone, it can be found
    in the list of milestones for its project.
    """
    milestone = await milestone_service.create_milestone(milestone_data, mock_user)

    # List milestones for the project
    milestones = await milestone_service.list_milestones(project_id=milestone.project_id)

    # Verify the created milestone is in the list
    assert len(milestones) > 0
    assert any(m.id == milestone.id for m in milestones)

    # Verify the milestone data matches
    found_milestone = next(m for m in milestones if m.id == milestone.id)
    assert found_milestone.title == milestone.title
    assert found_milestone.project_id == milestone.project_id
    assert found_milestone.is_manual_constraint == milestone.is_manual_constraint

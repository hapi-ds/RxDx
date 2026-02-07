"""Property-based tests for Department using Hypothesis"""

import pytest
from hypothesis import given, strategies as st
from uuid import UUID

from app.schemas.department import DepartmentCreate, DepartmentUpdate


# Strategy for valid department names
valid_names = st.text(min_size=1, max_size=200).filter(lambda x: x.strip())

# Strategy for valid descriptions
valid_descriptions = st.one_of(
    st.none(),
    st.text(min_size=0, max_size=1000)
)

# Strategy for UUIDs
uuid_strategy = st.uuids()


@given(
    name=valid_names,
    description=valid_descriptions,
    company_id=uuid_strategy,
)
def test_department_create_valid_data(name, description, company_id):
    """
    Property test: Department creation with valid data should succeed
    
    **Validates: Requirements 16.2**
    """
    manager_id = None
    
    department = DepartmentCreate(
        name=name,
        description=description,
        manager_user_id=manager_id,
        company_id=company_id,
    )
    
    assert department.name == name
    assert department.description == description
    assert department.company_id == company_id


@given(name=st.text(min_size=0, max_size=0))
def test_department_create_empty_name_fails(name):
    """
    Property test: Department creation with empty name should fail
    
    **Validates: Requirements 16.2**
    """
    company_id = UUID("12345678-1234-5678-1234-567812345678")
    
    with pytest.raises(ValueError):
        DepartmentCreate(
            name=name,
            company_id=company_id,
        )


@given(name=st.text(min_size=201, max_size=500))
def test_department_create_long_name_fails(name):
    """
    Property test: Department creation with name > 200 chars should fail
    
    **Validates: Requirements 16.2**
    """
    company_id = UUID("12345678-1234-5678-1234-567812345678")
    
    with pytest.raises(ValueError):
        DepartmentCreate(
            name=name,
            company_id=company_id,
        )


@given(description=st.text(min_size=1001, max_size=2000))
def test_department_create_long_description_fails(description):
    """
    Property test: Department creation with description > 1000 chars should fail
    
    **Validates: Requirements 16.2**
    """
    company_id = UUID("12345678-1234-5678-1234-567812345678")
    
    with pytest.raises(ValueError):
        DepartmentCreate(
            name="Engineering",
            description=description,
            company_id=company_id,
        )


@given(
    name=st.one_of(st.none(), valid_names),
    description=st.one_of(st.none(), valid_descriptions),
)
def test_department_update_optional_fields(name, description):
    """
    Property test: Department update with optional fields should succeed
    
    **Validates: Requirements 16.2**
    """
    update = DepartmentUpdate(
        name=name,
        description=description,
    )
    
    assert update.name == name
    assert update.description == description


def test_department_uuid_property():
    """
    Property test: All Departments have valid company_id UUIDs
    
    **Validates: Task 1.2 - All Departments belong to a Company**
    """
    company_id = UUID("12345678-1234-5678-1234-567812345678")
    
    department = DepartmentCreate(
        name="Engineering",
        company_id=company_id,
    )
    
    assert isinstance(department.company_id, UUID)
    assert str(department.company_id) == "12345678-1234-5678-1234-567812345678"


@given(name=st.text(min_size=1, max_size=200))
def test_department_name_whitespace_handling(name):
    """
    Property test: Department names with leading/trailing whitespace are handled
    
    **Validates: Requirements 16.2**
    """
    company_id = UUID("12345678-1234-5678-1234-567812345678")
    
    # Names with only whitespace should fail
    if not name.strip():
        with pytest.raises(ValueError):
            DepartmentCreate(
                name=name,
                company_id=company_id,
            )
    else:
        # Valid names should succeed
        department = DepartmentCreate(
            name=name,
            company_id=company_id,
        )
        assert department.name == name


@given(
    name=st.text(
        min_size=1,
        max_size=200,
        alphabet=st.characters(
            whitelist_categories=("Lu", "Ll", "Nd", "Pd", "Pc", "Po", "Zs")
        ),
    )
)
def test_department_special_characters(name):
    """
    Property test: Department names with special characters are handled correctly
    
    **Validates: Requirements 16.2**
    """
    company_id = UUID("12345678-1234-5678-1234-567812345678")
    
    if name.strip():
        department = DepartmentCreate(
            name=name,
            company_id=company_id,
        )
        assert department.name == name


def test_department_update_all_none():
    """
    Property test: Department update with all None values should succeed
    
    **Validates: Requirements 16.2**
    """
    update = DepartmentUpdate()
    
    assert update.name is None
    assert update.description is None
    assert update.manager_user_id is None
    assert update.company_id is None


@given(
    name1=valid_names,
    name2=valid_names,
    company_id=uuid_strategy,
)
def test_department_equality_by_company(name1, name2, company_id):
    """
    Property test: Departments with same company_id belong to same company
    
    **Validates: Task 1.2 - All Departments belong to a Company**
    """
    dept1 = DepartmentCreate(
        name=name1,
        company_id=company_id,
    )
    dept2 = DepartmentCreate(
        name=name2,
        company_id=company_id,
    )
    
    assert dept1.company_id == dept2.company_id


@given(company_id=uuid_strategy)
def test_department_company_relationship(company_id):
    """
    Property test: Department must have a company_id (PARENT_OF relationship)
    
    **Validates: Requirements 16.3 - PARENT_OF relationship from Company to Department**
    """
    department = DepartmentCreate(
        name="Engineering",
        company_id=company_id,
    )
    
    # Department must have a company_id
    assert department.company_id is not None
    assert isinstance(department.company_id, UUID)


def test_department_manager_optional():
    """
    Property test: Department manager_user_id is optional
    
    **Validates: Requirements 16.2**
    """
    company_id = UUID("12345678-1234-5678-1234-567812345678")
    
    # Without manager
    dept1 = DepartmentCreate(
        name="Engineering",
        company_id=company_id,
    )
    assert dept1.manager_user_id is None
    
    # With manager
    manager_id = UUID("87654321-4321-8765-4321-876543218765")
    dept2 = DepartmentCreate(
        name="Sales",
        manager_user_id=manager_id,
        company_id=company_id,
    )
    assert dept2.manager_user_id == manager_id

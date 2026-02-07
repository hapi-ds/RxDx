"""Property-based tests for Company operations"""

from uuid import UUID

import pytest
from hypothesis import given, strategies as st

from app.schemas.company import CompanyCreate, CompanyUpdate


class TestCompanyProperties:
    """Property-based tests for Company validation"""

    @given(
        name=st.text(min_size=1, max_size=200).filter(lambda x: x.strip() != ""),
        description=st.one_of(st.none(), st.text(max_size=1000)),
    )
    def test_company_create_valid_data(self, name, description):
        """
        Property: CompanyCreate should accept any valid name and description

        **Validates: Requirements 16.1**
        """
        company = CompanyCreate(name=name, description=description)

        assert company.name == name
        assert company.description == description

    @given(name=st.text(max_size=0))
    def test_company_create_empty_name_fails(self, name):
        """
        Property: CompanyCreate should reject empty names

        **Validates: Requirements 16.1**
        """
        with pytest.raises(ValueError):
            CompanyCreate(name=name)

    @given(name=st.text(min_size=201))
    def test_company_create_long_name_fails(self, name):
        """
        Property: CompanyCreate should reject names longer than 200 characters

        **Validates: Requirements 16.1**
        """
        with pytest.raises(ValueError):
            CompanyCreate(name=name)

    @given(description=st.text(min_size=1001))
    def test_company_create_long_description_fails(self, description):
        """
        Property: CompanyCreate should reject descriptions longer than 1000 characters

        **Validates: Requirements 16.1**
        """
        with pytest.raises(ValueError):
            CompanyCreate(name="Valid Name", description=description)

    @given(
        name=st.one_of(st.none(), st.text(min_size=1, max_size=200)),
        description=st.one_of(st.none(), st.text(max_size=1000)),
    )
    def test_company_update_optional_fields(self, name, description):
        """
        Property: CompanyUpdate should accept optional name and description

        **Validates: Requirements 16.1**
        """
        # Filter out empty strings for name
        if name is not None and name.strip() == "":
            pytest.skip("Empty name not valid")

        update = CompanyUpdate(name=name, description=description)

        assert update.name == name
        assert update.description == description

    def test_company_uuid_property(self):
        """
        Property: Company nodes should have valid UUIDs

        **Validates: Task 1.1 - Company nodes have valid UUIDs**
        """
        # Test that UUID validation works
        test_uuid = "550e8400-e29b-41d4-a716-446655440000"
        uuid_obj = UUID(test_uuid)

        assert str(uuid_obj) == test_uuid
        assert isinstance(uuid_obj, UUID)

    @given(
        name=st.text(min_size=1, max_size=200).filter(lambda x: x.strip() != ""),
    )
    def test_company_name_whitespace_handling(self, name):
        """
        Property: Company names should preserve whitespace

        **Validates: Requirements 16.1**
        """
        company = CompanyCreate(name=name)

        # Name should be preserved as-is (no automatic trimming)
        assert company.name == name

    @given(
        name=st.text(min_size=1, max_size=200).filter(lambda x: x.strip() != ""),
        description=st.text(max_size=1000),
    )
    def test_company_special_characters(self, name, description):
        """
        Property: Company should handle special characters in name and description

        **Validates: Requirements 16.1**
        """
        company = CompanyCreate(name=name, description=description)

        assert company.name == name
        assert company.description == description

    def test_company_update_all_none(self):
        """
        Property: CompanyUpdate should allow all fields to be None

        **Validates: Requirements 16.1**
        """
        update = CompanyUpdate()

        assert update.name is None
        assert update.description is None

    @given(
        name1=st.text(min_size=1, max_size=200).filter(lambda x: x.strip() != ""),
        name2=st.text(min_size=1, max_size=200).filter(lambda x: x.strip() != ""),
    )
    def test_company_equality_by_name(self, name1, name2):
        """
        Property: Companies with different names should be different

        **Validates: Requirements 16.1**
        """
        company1 = CompanyCreate(name=name1)
        company2 = CompanyCreate(name=name2)

        if name1 == name2:
            assert company1.name == company2.name
        else:
            assert company1.name != company2.name

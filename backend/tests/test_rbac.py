"""Unit tests for RBAC (Role-Based Access Control) system"""

import pytest
from fastapi import HTTPException

from app.core.security import (
    ROLE_PERMISSIONS,
    Permission,
    has_permission,
    require_permission,
)
from app.models.user import User, UserRole


class TestPermissionEnum:
    """Test Permission enumeration"""

    def test_permission_values(self):
        """Test that all permissions have correct string values"""
        assert Permission.READ_WORKITEM.value == "read:workitem"
        assert Permission.WRITE_WORKITEM.value == "write:workitem"
        assert Permission.SIGN_WORKITEM.value == "sign:workitem"
        assert Permission.DELETE_WORKITEM.value == "delete:workitem"
        assert Permission.MANAGE_USERS.value == "manage:users"
        assert Permission.VIEW_AUDIT.value == "view:audit"

    def test_all_permissions_defined(self):
        """Test that all expected permissions are defined"""
        expected_permissions = {
            "READ_WORKITEM",
            "WRITE_WORKITEM",
            "SIGN_WORKITEM",
            "DELETE_WORKITEM",
            "MANAGE_USERS",
            "VIEW_AUDIT",
        }
        actual_permissions = {p.name for p in Permission}
        assert actual_permissions == expected_permissions


class TestRolePermissionsMapping:
    """Test ROLE_PERMISSIONS mapping"""

    def test_all_roles_have_permissions(self):
        """Test that all user roles have permission mappings"""
        for role in UserRole:
            assert role in ROLE_PERMISSIONS
            assert isinstance(ROLE_PERMISSIONS[role], list)

    def test_admin_has_all_permissions(self):
        """Test that admin role has all permissions"""
        admin_perms = set(ROLE_PERMISSIONS[UserRole.ADMIN])
        all_perms = set(Permission)
        assert admin_perms == all_perms

    def test_project_manager_permissions(self):
        """Test project manager has correct permissions"""
        pm_perms = set(ROLE_PERMISSIONS[UserRole.PROJECT_MANAGER])
        expected = {
            Permission.READ_WORKITEM,
            Permission.WRITE_WORKITEM,
            Permission.SIGN_WORKITEM,
            Permission.DELETE_WORKITEM,
        }
        assert pm_perms == expected

    def test_validator_permissions(self):
        """Test validator has correct permissions"""
        validator_perms = set(ROLE_PERMISSIONS[UserRole.VALIDATOR])
        expected = {
            Permission.READ_WORKITEM,
            Permission.SIGN_WORKITEM,
        }
        assert validator_perms == expected

    def test_auditor_permissions(self):
        """Test auditor has correct permissions"""
        auditor_perms = set(ROLE_PERMISSIONS[UserRole.AUDITOR])
        expected = {
            Permission.READ_WORKITEM,
            Permission.VIEW_AUDIT,
        }
        assert auditor_perms == expected

    def test_user_permissions(self):
        """Test regular user has correct permissions"""
        user_perms = set(ROLE_PERMISSIONS[UserRole.USER])
        expected = {
            Permission.READ_WORKITEM,
            Permission.WRITE_WORKITEM,
        }
        assert user_perms == expected

    def test_validator_cannot_delete(self):
        """Test that validator cannot delete work items"""
        validator_perms = ROLE_PERMISSIONS[UserRole.VALIDATOR]
        assert Permission.DELETE_WORKITEM not in validator_perms

    def test_user_cannot_sign(self):
        """Test that regular user cannot sign work items"""
        user_perms = ROLE_PERMISSIONS[UserRole.USER]
        assert Permission.SIGN_WORKITEM not in user_perms

    def test_auditor_cannot_write(self):
        """Test that auditor cannot write work items"""
        auditor_perms = ROLE_PERMISSIONS[UserRole.AUDITOR]
        assert Permission.WRITE_WORKITEM not in auditor_perms

    def test_only_admin_can_manage_users(self):
        """Test that only admin can manage users"""
        for role in UserRole:
            perms = ROLE_PERMISSIONS[role]
            if role == UserRole.ADMIN:
                assert Permission.MANAGE_USERS in perms
            else:
                assert Permission.MANAGE_USERS not in perms


class TestHasPermission:
    """Test has_permission function"""

    def test_admin_has_all_permissions(self):
        """Test admin has all permissions"""
        for permission in Permission:
            assert has_permission(UserRole.ADMIN, permission)

    def test_project_manager_has_workitem_permissions(self):
        """Test project manager has work item permissions"""
        assert has_permission(UserRole.PROJECT_MANAGER, Permission.READ_WORKITEM)
        assert has_permission(UserRole.PROJECT_MANAGER, Permission.WRITE_WORKITEM)
        assert has_permission(UserRole.PROJECT_MANAGER, Permission.SIGN_WORKITEM)
        assert has_permission(UserRole.PROJECT_MANAGER, Permission.DELETE_WORKITEM)

    def test_project_manager_lacks_admin_permissions(self):
        """Test project manager lacks admin permissions"""
        assert not has_permission(UserRole.PROJECT_MANAGER, Permission.MANAGE_USERS)
        assert not has_permission(UserRole.PROJECT_MANAGER, Permission.VIEW_AUDIT)

    def test_validator_can_read_and_sign(self):
        """Test validator can read and sign"""
        assert has_permission(UserRole.VALIDATOR, Permission.READ_WORKITEM)
        assert has_permission(UserRole.VALIDATOR, Permission.SIGN_WORKITEM)

    def test_validator_cannot_write_or_delete(self):
        """Test validator cannot write or delete"""
        assert not has_permission(UserRole.VALIDATOR, Permission.WRITE_WORKITEM)
        assert not has_permission(UserRole.VALIDATOR, Permission.DELETE_WORKITEM)

    def test_auditor_can_read_and_audit(self):
        """Test auditor can read and view audit logs"""
        assert has_permission(UserRole.AUDITOR, Permission.READ_WORKITEM)
        assert has_permission(UserRole.AUDITOR, Permission.VIEW_AUDIT)

    def test_auditor_cannot_modify(self):
        """Test auditor cannot modify anything"""
        assert not has_permission(UserRole.AUDITOR, Permission.WRITE_WORKITEM)
        assert not has_permission(UserRole.AUDITOR, Permission.SIGN_WORKITEM)
        assert not has_permission(UserRole.AUDITOR, Permission.DELETE_WORKITEM)

    def test_user_can_read_and_write(self):
        """Test regular user can read and write"""
        assert has_permission(UserRole.USER, Permission.READ_WORKITEM)
        assert has_permission(UserRole.USER, Permission.WRITE_WORKITEM)

    def test_user_cannot_sign_or_delete(self):
        """Test regular user cannot sign or delete"""
        assert not has_permission(UserRole.USER, Permission.SIGN_WORKITEM)
        assert not has_permission(UserRole.USER, Permission.DELETE_WORKITEM)


class TestRequirePermissionDecorator:
    """Test require_permission decorator"""

    @pytest.mark.asyncio
    async def test_decorator_allows_authorized_user(self):
        """Test decorator allows user with permission"""

        @require_permission(Permission.READ_WORKITEM)
        async def test_endpoint(current_user: User):
            return {"message": "success"}

        # Create a user with READ_WORKITEM permission
        user = User(
            email="test@example.com",
            full_name="Test User",
            role=UserRole.USER,
            hashed_password="hashed",
        )

        result = await test_endpoint(current_user=user)
        assert result == {"message": "success"}

    @pytest.mark.asyncio
    async def test_decorator_blocks_unauthorized_user(self):
        """Test decorator blocks user without permission"""

        @require_permission(Permission.MANAGE_USERS)
        async def test_endpoint(current_user: User):
            return {"message": "success"}

        # Create a user without MANAGE_USERS permission
        user = User(
            email="test@example.com",
            full_name="Test User",
            role=UserRole.USER,
            hashed_password="hashed",
        )

        with pytest.raises(HTTPException) as exc_info:
            await test_endpoint(current_user=user)

        assert exc_info.value.status_code == 403
        assert "Permission denied" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_decorator_requires_authentication(self):
        """Test decorator requires current_user"""

        @require_permission(Permission.READ_WORKITEM)
        async def test_endpoint():
            return {"message": "success"}

        with pytest.raises(HTTPException) as exc_info:
            await test_endpoint()

        assert exc_info.value.status_code == 401
        assert "Authentication required" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_decorator_with_admin_user(self):
        """Test decorator allows admin for any permission"""

        @require_permission(Permission.MANAGE_USERS)
        async def test_endpoint(current_user: User):
            return {"message": "admin success"}

        admin_user = User(
            email="admin@example.com",
            full_name="Admin User",
            role=UserRole.ADMIN,
            hashed_password="hashed",
        )

        result = await test_endpoint(current_user=admin_user)
        assert result == {"message": "admin success"}

    @pytest.mark.asyncio
    async def test_decorator_with_validator_signing(self):
        """Test validator can access sign endpoint"""

        @require_permission(Permission.SIGN_WORKITEM)
        async def sign_endpoint(current_user: User):
            return {"message": "signed"}

        validator = User(
            email="validator@example.com",
            full_name="Validator User",
            role=UserRole.VALIDATOR,
            hashed_password="hashed",
        )

        result = await sign_endpoint(current_user=validator)
        assert result == {"message": "signed"}

    @pytest.mark.asyncio
    async def test_decorator_blocks_validator_from_delete(self):
        """Test validator cannot access delete endpoint"""

        @require_permission(Permission.DELETE_WORKITEM)
        async def delete_endpoint(current_user: User):
            return {"message": "deleted"}

        validator = User(
            email="validator@example.com",
            full_name="Validator User",
            role=UserRole.VALIDATOR,
            hashed_password="hashed",
        )

        with pytest.raises(HTTPException) as exc_info:
            await delete_endpoint(current_user=validator)

        assert exc_info.value.status_code == 403


class TestPermissionHierarchy:
    """Test permission hierarchy and relationships"""

    def test_admin_superset_of_all_roles(self):
        """Test admin has superset of all other role permissions"""
        admin_perms = set(ROLE_PERMISSIONS[UserRole.ADMIN])

        for role in UserRole:
            if role != UserRole.ADMIN:
                role_perms = set(ROLE_PERMISSIONS[role])
                assert role_perms.issubset(admin_perms)

    def test_project_manager_superset_of_user(self):
        """Test project manager has superset of user permissions"""
        pm_perms = set(ROLE_PERMISSIONS[UserRole.PROJECT_MANAGER])
        user_perms = set(ROLE_PERMISSIONS[UserRole.USER])
        assert user_perms.issubset(pm_perms)

    def test_validator_and_auditor_disjoint_special_perms(self):
        """Test validator and auditor have different special permissions"""
        validator_perms = set(ROLE_PERMISSIONS[UserRole.VALIDATOR])
        auditor_perms = set(ROLE_PERMISSIONS[UserRole.AUDITOR])

        # Both can read
        assert Permission.READ_WORKITEM in validator_perms
        assert Permission.READ_WORKITEM in auditor_perms

        # Validator can sign, auditor cannot
        assert Permission.SIGN_WORKITEM in validator_perms
        assert Permission.SIGN_WORKITEM not in auditor_perms

        # Auditor can view audit, validator cannot
        assert Permission.VIEW_AUDIT in auditor_perms
        assert Permission.VIEW_AUDIT not in validator_perms

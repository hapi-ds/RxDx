"""Property-based tests for RBAC system using Hypothesis"""

from hypothesis import given
from hypothesis import strategies as st

from app.core.security import (
    ROLE_PERMISSIONS,
    Permission,
    has_permission,
)
from app.models.user import UserRole

# Strategy for generating user roles
user_role_strategy = st.sampled_from(list(UserRole))

# Strategy for generating permissions
permission_strategy = st.sampled_from(list(Permission))


class TestRBACProperties:
    """Property-based tests for RBAC invariants"""

    @given(role=user_role_strategy)
    def test_property_all_roles_have_permissions(self, role: UserRole):
        """
        Property: Every role must have a non-empty list of permissions.
        
        **Validates: Requirements 1.3**
        
        This ensures that the ROLE_PERMISSIONS mapping is complete and
        every role has at least one permission defined.
        """
        assert role in ROLE_PERMISSIONS
        assert isinstance(ROLE_PERMISSIONS[role], list)
        assert len(ROLE_PERMISSIONS[role]) > 0

    @given(permission=permission_strategy)
    def test_property_admin_has_all_permissions(self, permission: Permission):
        """
        Property: Admin role must have every possible permission.
        
        **Validates: Requirements 1.3**
        
        This ensures that the admin role is truly a superuser with
        unrestricted access to all system functionality.
        """
        assert has_permission(UserRole.ADMIN, permission)
        assert permission in ROLE_PERMISSIONS[UserRole.ADMIN]

    @given(role=user_role_strategy, permission=permission_strategy)
    def test_property_has_permission_consistency(
        self, role: UserRole, permission: Permission
    ):
        """
        Property: has_permission must be consistent with ROLE_PERMISSIONS.
        
        **Validates: Requirements 1.3**
        
        This ensures that the has_permission function correctly reflects
        the ROLE_PERMISSIONS mapping without any discrepancies.
        """
        expected = permission in ROLE_PERMISSIONS[role]
        actual = has_permission(role, permission)
        assert actual == expected

    @given(role=user_role_strategy)
    def test_property_read_permission_universal(self, role: UserRole):
        """
        Property: All roles must have READ_WORKITEM permission.
        
        **Validates: Requirements 1.3**
        
        This ensures that every user can at least read work items,
        which is fundamental to system usability.
        """
        assert has_permission(role, Permission.READ_WORKITEM)

    @given(role=user_role_strategy)
    def test_property_manage_users_admin_only(self, role: UserRole):
        """
        Property: Only admin can manage users.
        
        **Validates: Requirements 1.3**
        
        This ensures that user management is restricted to administrators,
        maintaining security and access control integrity.
        """
        can_manage = has_permission(role, Permission.MANAGE_USERS)
        if role == UserRole.ADMIN:
            assert can_manage
        else:
            assert not can_manage

    @given(role=user_role_strategy)
    def test_property_permissions_subset_of_admin(self, role: UserRole):
        """
        Property: Every role's permissions must be a subset of admin permissions.
        
        **Validates: Requirements 1.3**
        
        This ensures proper permission hierarchy where admin has all
        permissions that any other role might have.
        """
        role_perms = set(ROLE_PERMISSIONS[role])
        admin_perms = set(ROLE_PERMISSIONS[UserRole.ADMIN])
        assert role_perms.issubset(admin_perms)

    @given(permission=permission_strategy)
    def test_property_at_least_one_role_has_permission(self, permission: Permission):
        """
        Property: Every permission must be assigned to at least one role.
        
        **Validates: Requirements 1.3**
        
        This ensures that no permission is orphaned and every defined
        permission is actually used by at least one role.
        """
        roles_with_permission = [
            role for role in UserRole if has_permission(role, permission)
        ]
        assert len(roles_with_permission) > 0

    @given(role=user_role_strategy)
    def test_property_auditor_read_only_workitems(self, role: UserRole):
        """
        Property: Auditor can only read work items, not modify them.
        
        **Validates: Requirements 1.3**
        
        This ensures auditors maintain independence and cannot alter
        the data they are auditing.
        """
        if role == UserRole.AUDITOR:
            assert has_permission(role, Permission.READ_WORKITEM)
            assert not has_permission(role, Permission.WRITE_WORKITEM)
            assert not has_permission(role, Permission.DELETE_WORKITEM)
            assert not has_permission(role, Permission.SIGN_WORKITEM)

    @given(role=user_role_strategy)
    def test_property_validator_can_sign(self, role: UserRole):
        """
        Property: Validator and above can sign work items.
        
        **Validates: Requirements 1.3, 2.1**
        
        This ensures that validators, project managers, and admins
        can digitally sign work items for compliance.
        """
        can_sign = has_permission(role, Permission.SIGN_WORKITEM)
        signing_roles = {
            UserRole.ADMIN,
            UserRole.PROJECT_MANAGER,
            UserRole.VALIDATOR,
        }

        if role in signing_roles:
            assert can_sign
        else:
            assert not can_sign

    @given(role=user_role_strategy)
    def test_property_view_audit_restricted(self, role: UserRole):
        """
        Property: Only admin and auditor can view audit logs.
        
        **Validates: Requirements 1.3, 13.1**
        
        This ensures audit logs are only accessible to authorized
        personnel for compliance and security.
        """
        can_view_audit = has_permission(role, Permission.VIEW_AUDIT)
        audit_roles = {UserRole.ADMIN, UserRole.AUDITOR}

        if role in audit_roles:
            assert can_view_audit
        else:
            assert not can_view_audit

    @given(
        role1=user_role_strategy,
        role2=user_role_strategy,
        permission=permission_strategy,
    )
    def test_property_permission_check_deterministic(
        self, role1: UserRole, role2: UserRole, permission: Permission
    ):
        """
        Property: Permission checks must be deterministic.
        
        **Validates: Requirements 1.3**
        
        This ensures that checking the same permission for the same role
        always returns the same result (no randomness or state dependency).
        """
        result1 = has_permission(role1, permission)
        result2 = has_permission(role1, permission)
        assert result1 == result2

        if role1 == role2:
            result3 = has_permission(role2, permission)
            assert result1 == result3

    @given(role=user_role_strategy)
    def test_property_no_duplicate_permissions(self, role: UserRole):
        """
        Property: No role should have duplicate permissions.
        
        **Validates: Requirements 1.3**
        
        This ensures the ROLE_PERMISSIONS mapping is clean and
        doesn't contain redundant permission entries.
        """
        perms = ROLE_PERMISSIONS[role]
        assert len(perms) == len(set(perms))

    @given(role=user_role_strategy)
    def test_property_project_manager_superset_of_user(self, role: UserRole):
        """
        Property: Project manager permissions are superset of user permissions.
        
        **Validates: Requirements 1.3**
        
        This ensures proper permission hierarchy where project managers
        can do everything regular users can do, plus more.
        """
        if role == UserRole.USER:
            user_perms = set(ROLE_PERMISSIONS[UserRole.USER])
            pm_perms = set(ROLE_PERMISSIONS[UserRole.PROJECT_MANAGER])
            assert user_perms.issubset(pm_perms)

    @given(permission=permission_strategy)
    def test_property_permission_enum_values_unique(self, permission: Permission):
        """
        Property: All permission enum values must be unique.
        
        **Validates: Requirements 1.3**
        
        This ensures no two permissions have the same string value,
        preventing ambiguity in permission checks.
        """
        all_values = [p.value for p in Permission]
        assert all_values.count(permission.value) == 1

    @given(role=user_role_strategy)
    def test_property_delete_implies_write(self, role: UserRole):
        """
        Property: If a role can delete, it must also be able to write.
        
        **Validates: Requirements 1.3**
        
        This ensures logical consistency where deletion permission
        implies the ability to modify work items.
        """
        can_delete = has_permission(role, Permission.DELETE_WORKITEM)
        can_write = has_permission(role, Permission.WRITE_WORKITEM)

        if can_delete:
            assert can_write

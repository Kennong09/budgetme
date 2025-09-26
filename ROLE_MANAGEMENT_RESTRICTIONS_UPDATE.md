# Updated Family Role Management Restrictions

## Summary of Changes

I've updated the family role management system to implement strict restrictions as requested:

### ✅ **New Restrictions Implemented**

#### **Member Role Restrictions**
- ❌ **Cannot manage any family roles**
- ❌ **Cannot remove any members**
- ❌ **Cannot assign any roles**
- ✅ **Can participate in family activities (goals, transactions)**
- ✅ **Can view family information based on permissions**

#### **Viewer Role Restrictions**
- ❌ **Cannot manage any family roles**
- ❌ **Cannot remove any members**
- ❌ **Cannot assign any roles**
- ✅ **Read-only access to limited family information**

#### **Admin Role Restrictions**
- ✅ **Can manage admin, member, and viewer roles**
- ❌ **Cannot remove or manage the family owner**
- ❌ **Cannot assign ownership**
- ❌ **Cannot transfer ownership**
- ❌ **Cannot take ownership**
- ✅ **Can assign admin, member, viewer roles to non-owners**

#### **Owner Role (unchanged)**
- ✅ **Can manage all member roles**
- ✅ **Can transfer ownership to admins or members**
- ✅ **Can demote/promote any member (except cannot demote self without transfer)**
- ✅ **Full family control**

## Updated Permission Matrix

| User Role | Manage Roles | Remove Members | Assign Roles | Transfer Ownership | Manage Owner |
|-----------|--------------|----------------|--------------|-------------------|-------------|
| **Owner** | ✅ All | ✅ All | ✅ All | ✅ Yes | ✅ Self only |
| **Admin** | ✅ Non-owners | ✅ Non-owners | ✅ admin/member/viewer | ❌ No | ❌ No |
| **Member** | ❌ None | ❌ None | ❌ None | ❌ No | ❌ No |
| **Viewer** | ❌ None | ❌ None | ❌ None | ❌ No | ❌ No |

## Implementation Details

### **Database Function Updates**

**File**: `sql-refactored/03-family-schema.sql`

- Enhanced `reassign_member_role()` function with strict permission checks
- Added specific error messages for member and viewer role attempts
- Implemented owner protection for admin users
- Added detailed logging for role change operations

### **Service Layer Updates**

**File**: `src/services/database/familyService.ts`

- Enhanced `canManageRoles()` with detailed restriction information
- Added specific restriction messages for different role types
- Improved error handling for unauthorized operations

### **Frontend Component Updates**

**File**: `src/components/family/RoleManagement.tsx`

- Enhanced permission error messages for members and viewers
- Added admin restriction notices in role change modal
- Improved user experience with role-specific guidance

## Error Messages by Role

### **Member Attempts Role Management**
```
\"Members cannot manage family roles. Only owners and admins can assign roles\"
```

### **Viewer Attempts Role Management**
```
\"Viewers cannot manage family roles. Only owners and admins can assign roles\"
```

### **Admin Attempts to Manage Owner**
```
\"Admin role cannot manage the family owner. Only the owner can change their own role or transfer ownership\"
```

## Security Enforcement

### **Database Level**
1. **Function-level validation** prevents unauthorized role changes
2. **Explicit role checking** with detailed permission logic
3. **Owner protection** prevents admin interference with owner
4. **Input validation** ensures only valid roles are assigned

### **Application Level**
1. **UI restrictions** hide management options for unauthorized users
2. **Service layer validation** double-checks permissions
3. **User feedback** provides clear messaging about restrictions
4. **Progressive disclosure** shows features based on user role

## Testing Scenarios

### **Blocked Operations**
- ❌ Member trying to change any role
- ❌ Viewer trying to change any role
- ❌ Admin trying to change owner's role
- ❌ Admin trying to transfer ownership
- ❌ Admin trying to remove owner

### **Allowed Operations**
- ✅ Admin changing member role to viewer
- ✅ Admin changing viewer role to member
- ✅ Admin promoting member to admin
- ✅ Owner changing any role (except self-demotion)
- ✅ Owner transferring ownership to admin/member

## User Experience

### **For Members**
- Role Management section shows informative message
- Explains member privileges and limitations
- Provides clear guidance on who can manage roles

### **For Viewers**
- Role Management section shows informative message
- Explains viewer privileges and limitations
- Provides clear guidance on role hierarchy

### **For Admins**
- Role Management interface available
- Owner actions are disabled with clear tooltips
- Modal shows admin restrictions and limitations
- Cannot see ownership transfer options

### **For Owners**
- Full Role Management interface
- All options available including ownership transfer
- Crown icon indicates owner status
- Clear warnings for irreversible actions

This implementation ensures that only authorized users can manage family roles while providing clear feedback about restrictions and maintaining the security and integrity of the family management system.
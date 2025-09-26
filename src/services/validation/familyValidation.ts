/**
 * Family Schema Validation Layer
 * 
 * This module provides comprehensive validation for family-related operations
 * as specified in the Family Schema Validation and Component Integration Design.
 * 
 * Features:
 * - Input validation with detailed error messages
 * - Business rule validation
 * - Permission validation
 * - Data sanitization
 * - Type-safe validation results
 */

// ===== Core Validation Types =====

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity?: 'error' | 'warning';
}

export interface ValidationResult<T = any> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
  warnings?: ValidationError[];
}

export interface ValidationRule<T = any> {
  field: string;
  validate: (value: T, context?: any) => ValidationError | null;
  required?: boolean;
}

// ===== Family Data Types =====

export interface FamilyCreateData {
  family_name: string;
  description?: string;
  currency_pref: string;
  is_public?: boolean;
}

export interface FamilyUpdateData {
  family_name?: string;
  description?: string;
  currency_pref?: string;
  is_public?: boolean;
}

export interface FamilyMemberData {
  user_id: string;
  role: 'admin' | 'member' | 'viewer';
  family_id: string;
}

// ===== Validation Constants =====

export const VALIDATION_RULES = {
  FAMILY_NAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 255,
    PATTERN: /^[a-zA-Z0-9\s\-_'.]+$/,
  },
  DESCRIPTION: {
    MAX_LENGTH: 500,
  },
  SUPPORTED_CURRENCIES: ['PHP', 'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'] as const,
  DEFAULT_CURRENCY: 'PHP' as const,
} as const;

type SupportedCurrency = typeof VALIDATION_RULES.SUPPORTED_CURRENCIES[number];

export const ERROR_CODES = {
  REQUIRED_FIELD: 'REQUIRED_FIELD',
  MIN_LENGTH: 'MIN_LENGTH',
  MAX_LENGTH: 'MAX_LENGTH',
  INVALID_CHARACTERS: 'INVALID_CHARACTERS',
  INVALID_EMAIL: 'INVALID_EMAIL',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  NOT_FOUND: 'NOT_FOUND',
  INVALID_CURRENCY: 'INVALID_CURRENCY',
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
  DATABASE_ERROR: 'DATABASE_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

// ===== Core Validation Functions =====

/**
 * Validates a required string field
 */
function validateRequiredString(
  value: string | undefined | null,
  fieldName: string,
  minLength = 1,
  maxLength = 255
): ValidationError | null {
  if (!value || value.trim().length === 0) {
    return {
      field: fieldName,
      message: `${fieldName.replace('_', ' ')} is required`,
      code: ERROR_CODES.REQUIRED_FIELD,
      severity: 'error'
    };
  }

  const trimmed = value.trim();

  if (trimmed.length < minLength) {
    return {
      field: fieldName,
      message: `${fieldName.replace('_', ' ')} must be at least ${minLength} characters long`,
      code: ERROR_CODES.MIN_LENGTH,
      severity: 'error'
    };
  }

  if (trimmed.length > maxLength) {
    return {
      field: fieldName,
      message: `${fieldName.replace('_', ' ')} cannot exceed ${maxLength} characters`,
      code: ERROR_CODES.MAX_LENGTH,
      severity: 'error'
    };
  }

  return null;
}

/**
 * Validates string pattern matching
 */
function validateStringPattern(
  value: string,
  fieldName: string,
  pattern: RegExp,
  errorMessage?: string
): ValidationError | null {
  if (!pattern.test(value)) {
    return {
      field: fieldName,
      message: errorMessage || `${fieldName.replace('_', ' ')} contains invalid characters`,
      code: ERROR_CODES.INVALID_CHARACTERS,
      severity: 'error'
    };
  }

  return null;
}

/**
 * Validates optional string field
 */
function validateOptionalString(
  value: string | undefined | null,
  fieldName: string,
  maxLength = 255
): ValidationError | null {
  if (!value || value.trim().length === 0) {
    return null; // Optional field is valid when empty
  }

  const trimmed = value.trim();

  if (trimmed.length > maxLength) {
    return {
      field: fieldName,
      message: `${fieldName.replace('_', ' ')} cannot exceed ${maxLength} characters`,
      code: ERROR_CODES.MAX_LENGTH,
      severity: 'error'
    };
  }

  return null;
}

// ===== Family Creation Validation =====

/**
 * Validates family creation data according to the design specifications
 */
export function validateFamilyCreateData(data: FamilyCreateData): ValidationResult<FamilyCreateData> {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Validate family name (required)
  const nameError = validateRequiredString(
    data.family_name,
    'family_name',
    VALIDATION_RULES.FAMILY_NAME.MIN_LENGTH,
    VALIDATION_RULES.FAMILY_NAME.MAX_LENGTH
  );
  if (nameError) {
    errors.push(nameError);
  } else {
    // Check pattern if name is valid
    const patternError = validateStringPattern(
      data.family_name.trim(),
      'family_name',
      VALIDATION_RULES.FAMILY_NAME.PATTERN,
      'Family name can only contain letters, numbers, spaces, hyphens, underscores, and apostrophes'
    );
    if (patternError) {
      errors.push(patternError);
    }
  }

  // Validate description (optional)
  const descriptionError = validateOptionalString(
    data.description,
    'description',
    VALIDATION_RULES.DESCRIPTION.MAX_LENGTH
  );
  if (descriptionError) {
    errors.push(descriptionError);
  }

  // Validate currency preference
  if (!data.currency_pref) {
    warnings.push({
      field: 'currency_pref',
      message: `Currency preference not specified, defaulting to ${VALIDATION_RULES.DEFAULT_CURRENCY}`,
      code: 'DEFAULT_VALUE_USED',
      severity: 'warning'
    });
  } else if (!(VALIDATION_RULES.SUPPORTED_CURRENCIES as readonly string[]).includes(data.currency_pref)) {
    warnings.push({
      field: 'currency_pref',
      message: `Currency ${data.currency_pref} is not officially supported, defaulting to ${VALIDATION_RULES.DEFAULT_CURRENCY}`,
      code: ERROR_CODES.INVALID_CURRENCY,
      severity: 'warning'
    });
  }

  // Validate is_public flag
  if (data.is_public !== undefined && typeof data.is_public !== 'boolean') {
    errors.push({
      field: 'is_public',
      message: 'Public visibility setting must be true or false',
      code: 'INVALID_TYPE',
      severity: 'error'
    });
  }

  // Return sanitized data if validation passes
  if (errors.length === 0) {
    const sanitizedData: FamilyCreateData = {
      family_name: data.family_name.trim(),
      description: data.description?.trim() || '',
      currency_pref: (VALIDATION_RULES.SUPPORTED_CURRENCIES as readonly string[]).includes(data.currency_pref) 
        ? data.currency_pref 
        : VALIDATION_RULES.DEFAULT_CURRENCY,
      is_public: data.is_public || false
    };

    return {
      success: true,
      data: sanitizedData,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  return {
    success: false,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

// ===== Family Update Validation =====

/**
 * Validates family update data according to the design specifications
 */
export function validateFamilyUpdateData(data: FamilyUpdateData): ValidationResult<FamilyUpdateData> {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Validate family name if provided
  if (data.family_name !== undefined) {
    const nameError = validateRequiredString(
      data.family_name,
      'family_name',
      VALIDATION_RULES.FAMILY_NAME.MIN_LENGTH,
      VALIDATION_RULES.FAMILY_NAME.MAX_LENGTH
    );
    if (nameError) {
      errors.push(nameError);
    } else {
      const patternError = validateStringPattern(
        data.family_name.trim(),
        'family_name',
        VALIDATION_RULES.FAMILY_NAME.PATTERN
      );
      if (patternError) {
        errors.push(patternError);
      }
    }
  }

  // Validate description if provided
  if (data.description !== undefined) {
    const descriptionError = validateOptionalString(
      data.description,
      'description',
      VALIDATION_RULES.DESCRIPTION.MAX_LENGTH
    );
    if (descriptionError) {
      errors.push(descriptionError);
    }
  }

  // Validate currency preference if provided
  if (data.currency_pref !== undefined) {
    if (!(VALIDATION_RULES.SUPPORTED_CURRENCIES as readonly string[]).includes(data.currency_pref)) {
      warnings.push({
        field: 'currency_pref',
        message: `Currency ${data.currency_pref} is not officially supported`,
        code: ERROR_CODES.INVALID_CURRENCY,
        severity: 'warning'
      });
    }
  }

  // Validate is_public flag if provided
  if (data.is_public !== undefined && typeof data.is_public !== 'boolean') {
    errors.push({
      field: 'is_public',
      message: 'Public visibility setting must be true or false',
      code: 'INVALID_TYPE',
      severity: 'error'
    });
  }

  // Return sanitized data if validation passes
  if (errors.length === 0) {
    const sanitizedData: FamilyUpdateData = {};

    if (data.family_name !== undefined) {
      sanitizedData.family_name = data.family_name.trim();
    }
    if (data.description !== undefined) {
      sanitizedData.description = data.description?.trim() || '';
    }
    if (data.currency_pref !== undefined) {
      sanitizedData.currency_pref = data.currency_pref;
    }
    if (data.is_public !== undefined) {
      sanitizedData.is_public = data.is_public;
    }

    return {
      success: true,
      data: sanitizedData,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  return {
    success: false,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

// ===== Permission Validation =====

/**
 * Validates user permissions for family operations
 */
export function validateFamilyPermissions(
  userId: string,
  familyCreatorId: string,
  requiredRole: 'admin' | 'member' | 'viewer' = 'admin'
): ValidationResult<void> {
  if (!userId || !familyCreatorId) {
    return {
      success: false,
      errors: [{
        field: 'permission',
        message: 'User ID and family creator ID are required for permission check',
        code: ERROR_CODES.REQUIRED_FIELD,
        severity: 'error'
      }]
    };
  }

  // For now, only family creators can perform admin operations
  // This can be extended to support role-based permissions in the future
  if (requiredRole === 'admin' && userId !== familyCreatorId) {
    return {
      success: false,
      errors: [{
        field: 'permission',
        message: 'Only family creators can perform this operation',
        code: ERROR_CODES.PERMISSION_DENIED,
        severity: 'error'
      }]
    };
  }

  return { success: true };
}

// ===== Business Rule Validation =====

/**
 * Validates business rules for family operations
 */
export function validateFamilyBusinessRules(data: {
  operation: 'create' | 'update' | 'delete';
  familyData?: FamilyCreateData | FamilyUpdateData;
  existingMembership?: boolean;
  memberCount?: number;
}): ValidationResult<void> {
  const errors: ValidationError[] = [];

  switch (data.operation) {
    case 'create':
      if (data.existingMembership) {
        errors.push({
          field: 'membership',
          message: 'User already belongs to a family. Only one family membership is allowed per user.',
          code: ERROR_CODES.BUSINESS_RULE_VIOLATION,
          severity: 'error'
        });
      }
      break;

    case 'delete':
      if (data.memberCount && data.memberCount > 1) {
        errors.push({
          field: 'members',
          message: 'Cannot delete family with active members. Remove all members first.',
          code: ERROR_CODES.BUSINESS_RULE_VIOLATION,
          severity: 'error'
        });
      }
      break;
  }

  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

// ===== Utility Functions =====

/**
 * Converts validation errors to user-friendly messages
 */
export function formatValidationErrors(errors: ValidationError[]): string[] {
  return errors.map(error => {
    switch (error.code) {
      case ERROR_CODES.REQUIRED_FIELD:
        return `${error.field.replace('_', ' ')} is required.`;
      case ERROR_CODES.MIN_LENGTH:
        return error.message;
      case ERROR_CODES.MAX_LENGTH:
        return error.message;
      case ERROR_CODES.INVALID_CHARACTERS:
        return error.message;
      case ERROR_CODES.PERMISSION_DENIED:
        return 'You do not have permission to perform this action.';
      case ERROR_CODES.BUSINESS_RULE_VIOLATION:
        return error.message;
      default:
        return error.message || 'An error occurred during validation.';
    }
  });
}

/**
 * Checks if validation result has critical errors that should prevent operation
 */
export function hasCriticalErrors(result: ValidationResult): boolean {
  return !result.success && (result.errors?.some(error => error.severity === 'error') ?? false);
}

/**
 * Extracts warnings from validation result for user feedback
 */
export function extractWarnings(result: ValidationResult): string[] {
  return result.warnings?.map(warning => warning.message) ?? [];
}
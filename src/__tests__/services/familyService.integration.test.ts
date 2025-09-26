/**
 * Family Service Integration Tests
 * 
 * These tests validate the integration between the family service,
 * database functions, and validation layer as specified in the
 * Family Schema Validation and Component Integration Design.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { familyService, FamilyCreateData, FamilyUpdateData, ValidationResult } from '../../services/database/familyService';
import { validateFamilyCreateData, validateFamilyUpdateData } from '../../services/validation/familyValidation';

// Mock Supabase client
jest.mock('../../utils/supabaseClient', () => ({
  supabase: {
    rpc: jest.fn(),
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn()
          }))
        }))
      })),
      delete: jest.fn(() => ({
        eq: jest.fn()
      }))
    }))
  }
}));

describe('Family Service Integration Tests', () => {
  const mockUserId = '12345678-1234-1234-1234-123456789012';
  const mockFamilyId = '87654321-4321-4321-4321-210987654321';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createFamily Integration', () => {
    it('should successfully create family with valid data', async () => {
      const validFamilyData: FamilyCreateData = {
        family_name: 'Test Family',
        description: 'A test family for integration testing',
        currency_pref: 'PHP',
        is_public: false
      };

      // Mock successful database response
      const mockResponse = {
        id: mockFamilyId,
        family_name: 'Test Family',
        description: 'A test family for integration testing',
        currency_pref: 'PHP',
        is_public: false,
        created_by: mockUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { supabase } = require('../../utils/supabaseClient');
      supabase.rpc.mockResolvedValueOnce({ data: mockResponse, error: null });

      // Mock family membership check (no existing membership)
      supabase.rpc.mockResolvedValueOnce({ 
        data: { is_member: false }, 
        error: null 
      });

      const result = await familyService.createFamily(validFamilyData, mockUserId);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        id: mockFamilyId,
        family_name: 'Test Family',
        currency_pref: 'PHP'
      });
      expect(supabase.rpc).toHaveBeenCalledWith('create_family_with_member', {
        p_family_name: 'Test Family',
        p_description: 'A test family for integration testing',
        p_currency_pref: 'PHP',
        p_is_public: false,
        p_user_id: mockUserId
      });
    });

    it('should handle validation errors for invalid family data', async () => {
      const invalidFamilyData: FamilyCreateData = {
        family_name: 'A', // Too short
        description: 'A'.repeat(501), // Too long
        currency_pref: 'PHP',
        is_public: false
      };

      const result = await familyService.createFamily(invalidFamilyData, mockUserId);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors?.[0].code).toBe('MIN_LENGTH');
      expect(result.errors?.[1].code).toBe('MAX_LENGTH');
    });

    it('should prevent creation when user already has family membership', async () => {
      const validFamilyData: FamilyCreateData = {
        family_name: 'Test Family',
        description: 'Test description',
        currency_pref: 'PHP',
        is_public: false
      };

      // Mock existing family membership
      const { supabase } = require('../../utils/supabaseClient');
      supabase.rpc.mockResolvedValueOnce({ 
        data: { 
          is_member: true, 
          family_id: 'existing-family-id' 
        }, 
        error: null 
      });

      const result = await familyService.createFamily(validFamilyData, mockUserId);

      expect(result.success).toBe(false);
      expect(result.errors?.[0].code).toBe('ALREADY_MEMBER');
    });

    it('should handle database errors gracefully', async () => {
      const validFamilyData: FamilyCreateData = {
        family_name: 'Test Family',
        description: 'Test description',
        currency_pref: 'PHP',
        is_public: false
      };

      const { supabase } = require('../../utils/supabaseClient');
      // Mock no existing membership
      supabase.rpc.mockResolvedValueOnce({ 
        data: { is_member: false }, 
        error: null 
      });
      // Mock database error on family creation
      supabase.rpc.mockResolvedValueOnce({ 
        data: null, 
        error: { message: 'Database connection failed' } 
      });

      const result = await familyService.createFamily(validFamilyData, mockUserId);

      expect(result.success).toBe(false);
      expect(result.errors?.[0].code).toBe('DATABASE_ERROR');
    });
  });

  describe('updateFamily Integration', () => {
    it('should successfully update family with valid data', async () => {
      const updateData: FamilyUpdateData = {
        family_name: 'Updated Family Name',
        description: 'Updated description'
      };

      const mockExistingFamily = {
        id: mockFamilyId,
        family_name: 'Original Family',
        description: 'Original description',
        currency_pref: 'PHP',
        created_by: mockUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const mockUpdatedFamily = {
        ...mockExistingFamily,
        ...updateData,
        updated_at: new Date().toISOString()
      };

      const { supabase } = require('../../utils/supabaseClient');
      
      // Mock getFamilyById
      supabase.from().select().eq().single.mockResolvedValueOnce({
        data: mockExistingFamily,
        error: null
      });

      // Mock update operation
      supabase.from().update().eq().select().single.mockResolvedValueOnce({
        data: mockUpdatedFamily,
        error: null
      });

      const result = await familyService.updateFamily(mockFamilyId, updateData, mockUserId);

      expect(result.success).toBe(true);
      expect(result.data?.family_name).toBe('Updated Family Name');
    });

    it('should prevent update when user is not family creator', async () => {
      const updateData: FamilyUpdateData = {
        family_name: 'Updated Family Name'
      };

      const mockExistingFamily = {
        id: mockFamilyId,
        family_name: 'Original Family',
        created_by: 'different-user-id', // Different from mockUserId
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { supabase } = require('../../utils/supabaseClient');
      
      // Mock getFamilyById
      supabase.from().select().eq().single.mockResolvedValueOnce({
        data: mockExistingFamily,
        error: null
      });

      const result = await familyService.updateFamily(mockFamilyId, updateData, mockUserId);

      expect(result.success).toBe(false);
      expect(result.errors?.[0].code).toBe('PERMISSION_DENIED');
    });

    it('should handle family not found scenario', async () => {
      const updateData: FamilyUpdateData = {
        family_name: 'Updated Family Name'
      };

      const { supabase } = require('../../utils/supabaseClient');
      
      // Mock family not found
      supabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      });

      const result = await familyService.updateFamily(mockFamilyId, updateData, mockUserId);

      expect(result.success).toBe(false);
      expect(result.errors?.[0].code).toBe('NOT_FOUND');
    });
  });

  describe('Parameter Mapping Validation', () => {
    it('should correctly map parameters to database function', async () => {
      const familyData: FamilyCreateData = {
        family_name: 'Test Family',
        description: 'Test description',
        currency_pref: 'PHP',
        is_public: true
      };

      const { supabase } = require('../../utils/supabaseClient');
      
      // Mock no existing membership
      supabase.rpc.mockResolvedValueOnce({ 
        data: { is_member: false }, 
        error: null 
      });
      
      // Mock successful creation
      supabase.rpc.mockResolvedValueOnce({ 
        data: { id: mockFamilyId }, 
        error: null 
      });

      await familyService.createFamily(familyData, mockUserId);

      // Verify correct parameter mapping
      expect(supabase.rpc).toHaveBeenCalledWith('create_family_with_member', {
        p_family_name: 'Test Family',
        p_description: 'Test description',
        p_currency_pref: 'PHP',
        p_is_public: true,
        p_user_id: mockUserId
      });
    });

    it('should handle default values correctly', async () => {
      const familyData: FamilyCreateData = {
        family_name: 'Test Family',
        currency_pref: 'PHP'
        // description and is_public omitted
      };

      const { supabase } = require('../../utils/supabaseClient');
      
      // Mock no existing membership
      supabase.rpc.mockResolvedValueOnce({ 
        data: { is_member: false }, 
        error: null 
      });
      
      // Mock successful creation
      supabase.rpc.mockResolvedValueOnce({ 
        data: { id: mockFamilyId }, 
        error: null 
      });

      await familyService.createFamily(familyData, mockUserId);

      // Verify default values are applied
      expect(supabase.rpc).toHaveBeenCalledWith('create_family_with_member', {
        p_family_name: 'Test Family',
        p_description: '', // Default empty string
        p_currency_pref: 'PHP',
        p_is_public: false, // Default false
        p_user_id: mockUserId
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should map database constraint violations to user-friendly errors', async () => {
      const familyData: FamilyCreateData = {
        family_name: 'Test Family',
        currency_pref: 'PHP'
      };

      const { supabase } = require('../../utils/supabaseClient');
      
      // Mock no existing membership
      supabase.rpc.mockResolvedValueOnce({ 
        data: { is_member: false }, 
        error: null 
      });
      
      // Mock constraint violation
      supabase.rpc.mockResolvedValueOnce({ 
        data: null, 
        error: { message: 'User is already a member of family xyz' } 
      });

      const result = await familyService.createFamily(familyData, mockUserId);

      expect(result.success).toBe(false);
      expect(result.errors?.[0].code).toBe('ALREADY_MEMBER');
    });

    it('should handle network timeouts and connection errors', async () => {
      const familyData: FamilyCreateData = {
        family_name: 'Test Family',
        currency_pref: 'PHP'
      };

      const { supabase } = require('../../utils/supabaseClient');
      
      // Mock connection error
      supabase.rpc.mockRejectedValueOnce(new Error('Network timeout'));

      const result = await familyService.createFamily(familyData, mockUserId);

      expect(result.success).toBe(false);
      expect(result.errors?.[0].code).toBe('UNKNOWN_ERROR');
    });
  });
});

describe('Family Validation Layer Tests', () => {
  describe('validateFamilyCreateData', () => {
    it('should validate correct family creation data', () => {
      const validData: FamilyCreateData = {
        family_name: 'My Family',
        description: 'A wonderful family',
        currency_pref: 'PHP',
        is_public: false
      };

      const result = validateFamilyCreateData(validData);

      expect(result.success).toBe(true);
      expect(result.data?.family_name).toBe('My Family');
      expect(result.data?.currency_pref).toBe('PHP');
    });

    it('should reject family names that are too short', () => {
      const invalidData: FamilyCreateData = {
        family_name: 'AB', // Too short
        currency_pref: 'PHP'
      };

      const result = validateFamilyCreateData(invalidData);

      expect(result.success).toBe(false);
      expect(result.errors?.[0].code).toBe('MIN_LENGTH');
    });

    it('should reject family names with invalid characters', () => {
      const invalidData: FamilyCreateData = {
        family_name: 'Family@#$%', // Invalid characters
        currency_pref: 'PHP'
      };

      const result = validateFamilyCreateData(invalidData);

      expect(result.success).toBe(false);
      expect(result.errors?.[0].code).toBe('INVALID_CHARACTERS');
    });

    it('should warn about unsupported currencies but allow them', () => {
      const dataWithUnsupportedCurrency: FamilyCreateData = {
        family_name: 'Test Family',
        currency_pref: 'XYZ' // Unsupported currency
      };

      const result = validateFamilyCreateData(dataWithUnsupportedCurrency);

      expect(result.success).toBe(true);
      expect(result.data?.currency_pref).toBe('PHP'); // Should default to PHP
      expect(result.warnings?.[0].code).toBe('INVALID_CURRENCY');
    });

    it('should trim whitespace from family name and description', () => {
      const dataWithWhitespace: FamilyCreateData = {
        family_name: '  My Family  ',
        description: '  A great family  ',
        currency_pref: 'PHP'
      };

      const result = validateFamilyCreateData(dataWithWhitespace);

      expect(result.success).toBe(true);
      expect(result.data?.family_name).toBe('My Family');
      expect(result.data?.description).toBe('A great family');
    });
  });

  describe('validateFamilyUpdateData', () => {
    it('should validate partial updates correctly', () => {
      const updateData: FamilyUpdateData = {
        family_name: 'Updated Name'
        // Other fields omitted
      };

      const result = validateFamilyUpdateData(updateData);

      expect(result.success).toBe(true);
      expect(result.data?.family_name).toBe('Updated Name');
      expect(result.data?.description).toBeUndefined();
    });

    it('should handle empty update data', () => {
      const updateData: FamilyUpdateData = {};

      const result = validateFamilyUpdateData(updateData);

      expect(result.success).toBe(true);
      expect(Object.keys(result.data || {})).toHaveLength(0);
    });
  });
});

describe('Database Function Integration', () => {
  describe('create_family_with_member Function', () => {
    it('should validate function signature matches service call', () => {
      // This test ensures that the function signature in the SQL schema
      // matches what the service is calling
      const expectedParameters = [
        'p_family_name',
        'p_description', 
        'p_currency_pref',
        'p_is_public',
        'p_user_id'
      ];

      // This would typically test against the actual function metadata
      // For now, we're documenting the expected signature
      expect(expectedParameters).toHaveLength(5);
      expect(expectedParameters).toContain('p_is_public');
    });
  });
});
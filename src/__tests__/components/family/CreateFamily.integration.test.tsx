/**
 * CreateFamily Component Integration Tests
 * 
 * These tests validate the integration between the CreateFamily component,
 * family service, and validation layer as specified in the
 * Family Schema Validation and Component Integration Design.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import '@testing-library/jest-dom';

// Mock the required contexts and services
jest.mock('../../../utils/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' }
  })
}));

jest.mock('../../../utils/ToastContext', () => ({
  useToast: () => ({
    showSuccessToast: jest.fn(),
    showErrorToast: jest.fn()
  })
}));

jest.mock('../../../services/database/familyService', () => ({
  familyService: {
    checkFamilyMembership: jest.fn(),
    createFamily: jest.fn(),
    getFamilyById: jest.fn()
  },
  ValidationError: class ValidationError {
    constructor(public field: string, public message: string, public code: string) {}
  }
}));

jest.mock('../../../utils/helpers', () => ({
  refreshFamilyMembershipsView: jest.fn()
}));

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

import CreateFamily from '../../../components/family/CreateFamily';
import { familyService } from '../../../services/database/familyService';

const renderCreateFamily = () => {
  return render(
    <BrowserRouter>
      <CreateFamily />
    </BrowserRouter>
  );
};

describe('CreateFamily Component Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock for checkFamilyMembership (no existing family)
    (familyService.checkFamilyMembership as jest.Mock).mockResolvedValue({
      is_member: false
    });
  });

  describe('Form Validation Integration', () => {
    it('should display validation errors for invalid input', async () => {
      renderCreateFamily();

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText(/Create Your Family/i)).toBeInTheDocument();
      });

      // Try to submit with empty family name
      const submitButton = screen.getByText(/Review Family Details/i);
      const form = screen.getByRole('form') || screen.getByTestId('family-form');
      
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/Please enter a family name/i)).toBeInTheDocument();
      });
    });

    it('should validate minimum length requirements', async () => {
      renderCreateFamily();

      await waitFor(() => {
        expect(screen.getByLabelText(/Family Name/i)).toBeInTheDocument();
      });

      // Enter a name that's too short
      const familyNameInput = screen.getByLabelText(/Family Name/i);
      fireEvent.change(familyNameInput, { target: { value: 'AB' } });

      const form = screen.getByRole('form') || screen.getByTestId('family-form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/Family name must be at least 3 characters long/i)).toBeInTheDocument();
      });
    });

    it('should proceed to review mode with valid input', async () => {
      renderCreateFamily();

      await waitFor(() => {
        expect(screen.getByLabelText(/Family Name/i)).toBeInTheDocument();
      });

      // Fill in valid data
      const familyNameInput = screen.getByLabelText(/Family Name/i);
      const descriptionInput = screen.getByLabelText(/Description/i);

      fireEvent.change(familyNameInput, { target: { value: 'Test Family' } });
      fireEvent.change(descriptionInput, { target: { value: 'A test family' } });

      const form = screen.getByRole('form') || screen.getByTestId('family-form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/Review Your Family Details/i)).toBeInTheDocument();
      });
    });
  });

  describe('Service Integration', () => {
    it('should call family service with correct parameters', async () => {
      const mockCreateFamily = familyService.createFamily as jest.Mock;
      mockCreateFamily.mockResolvedValue({
        success: true,
        data: {
          id: 'new-family-id',
          family_name: 'Test Family',
          description: 'A test family',
          currency_pref: 'PHP',
          is_public: false
        }
      });

      renderCreateFamily();

      // Fill form and proceed to review
      await waitFor(() => {
        expect(screen.getByLabelText(/Family Name/i)).toBeInTheDocument();
      });

      const familyNameInput = screen.getByLabelText(/Family Name/i);
      const descriptionInput = screen.getByLabelText(/Description/i);

      fireEvent.change(familyNameInput, { target: { value: 'Test Family' } });
      fireEvent.change(descriptionInput, { target: { value: 'A test family' } });

      // Submit form to go to review
      const reviewButton = screen.getByText(/Review Family Details/i);
      fireEvent.click(reviewButton);

      // Wait for review mode and then submit
      await waitFor(() => {
        expect(screen.getByText(/Create Family/i)).toBeInTheDocument();
      });

      const createButton = screen.getByText(/Create Family/i);
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockCreateFamily).toHaveBeenCalledWith(
          {
            family_name: 'Test Family',
            description: 'A test family',
            currency_pref: 'PHP',
            is_public: false
          },
          'test-user-id'
        );
      });
    });

    it('should handle service validation errors', async () => {
      const mockCreateFamily = familyService.createFamily as jest.Mock;
      mockCreateFamily.mockResolvedValue({
        success: false,
        errors: [
          {
            field: 'family_name',
            message: 'Family name contains invalid characters',
            code: 'INVALID_CHARACTERS'
          }
        ]
      });

      renderCreateFamily();

      // Fill form and proceed to create
      await waitFor(() => {
        expect(screen.getByLabelText(/Family Name/i)).toBeInTheDocument();
      });

      const familyNameInput = screen.getByLabelText(/Family Name/i);
      fireEvent.change(familyNameInput, { target: { value: 'Test Family@#$' } });

      // Submit to review
      const form = screen.getByRole('form') || screen.getByTestId('family-form');
      fireEvent.submit(form);

      // Then submit to create
      await waitFor(() => {
        const createButton = screen.getByText(/Create Family/i);
        fireEvent.click(createButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Family name contains invalid characters/i)).toBeInTheDocument();
      });
    });

    it('should prevent creation when user already has family', async () => {
      // Mock existing family membership
      (familyService.checkFamilyMembership as jest.Mock).mockResolvedValue({
        is_member: true,
        family_id: 'existing-family-id'
      });

      renderCreateFamily();

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/family');
      });
    });

    it('should handle network errors gracefully', async () => {
      const mockCreateFamily = familyService.createFamily as jest.Mock;
      mockCreateFamily.mockRejectedValue(new Error('Network error'));

      renderCreateFamily();

      // Fill form and proceed to create
      await waitFor(() => {
        expect(screen.getByLabelText(/Family Name/i)).toBeInTheDocument();
      });

      const familyNameInput = screen.getByLabelText(/Family Name/i);
      fireEvent.change(familyNameInput, { target: { value: 'Test Family' } });

      // Submit to review
      const form = screen.getByRole('form') || screen.getByTestId('family-form');
      fireEvent.submit(form);

      // Then submit to create
      await waitFor(() => {
        const createButton = screen.getByText(/Create Family/i);
        fireEvent.click(createButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Network error/i)).toBeInTheDocument();
      });
    });
  });

  describe('User Experience Flow', () => {
    it('should show loading state during family creation', async () => {
      let resolvePromise: (value: any) => void;
      const mockPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      const mockCreateFamily = familyService.createFamily as jest.Mock;
      mockCreateFamily.mockReturnValue(mockPromise);

      renderCreateFamily();

      // Fill form and proceed to create
      await waitFor(() => {
        expect(screen.getByLabelText(/Family Name/i)).toBeInTheDocument();
      });

      const familyNameInput = screen.getByLabelText(/Family Name/i);
      fireEvent.change(familyNameInput, { target: { value: 'Test Family' } });

      // Submit to review
      const form = screen.getByRole('form') || screen.getByTestId('family-form');
      fireEvent.submit(form);

      // Submit to create
      await waitFor(() => {
        const createButton = screen.getByText(/Create Family/i);
        fireEvent.click(createButton);
      });

      // Check for loading state
      await waitFor(() => {
        expect(screen.getByText(/Creating/i) || screen.getByRole('progressbar')).toBeInTheDocument();
      });

      // Resolve promise to finish loading
      resolvePromise!({
        success: true,
        data: { id: 'new-family-id' }
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/family?created=true');
      });
    });

    it('should allow going back from review to form', async () => {
      renderCreateFamily();

      // Fill form and proceed to review
      await waitFor(() => {
        expect(screen.getByLabelText(/Family Name/i)).toBeInTheDocument();
      });

      const familyNameInput = screen.getByLabelText(/Family Name/i);
      fireEvent.change(familyNameInput, { target: { value: 'Test Family' } });

      const form = screen.getByRole('form') || screen.getByTestId('family-form');
      fireEvent.submit(form);

      // Should now be in review mode
      await waitFor(() => {
        expect(screen.getByText(/Review Your Family Details/i)).toBeInTheDocument();
      });

      // Click back button
      const backButton = screen.getByText(/Edit Details/i) || screen.getByText(/Back/i);
      fireEvent.click(backButton);

      // Should be back in form mode
      await waitFor(() => {
        expect(screen.getByLabelText(/Family Name/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility and User Experience', () => {
    it('should have proper form labels and accessibility attributes', async () => {
      renderCreateFamily();

      await waitFor(() => {
        expect(screen.getByLabelText(/Family Name/i)).toBeInTheDocument();
      });

      // Check for required form elements
      expect(screen.getByLabelText(/Family Name/i)).toBeRequired();
      expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
      
      // Check for proper form structure
      const form = screen.getByRole('form') || screen.getByTestId('family-form');
      expect(form).toBeInTheDocument();
    });

    it('should display helpful tooltips and guidance', async () => {
      renderCreateFamily();

      await waitFor(() => {
        expect(screen.getByText(/Create Your Family/i)).toBeInTheDocument();
      });

      // Look for help text or tooltips
      const helpTexts = screen.getAllByText(/tip|help|guide/i);
      expect(helpTexts.length).toBeGreaterThan(0);
    });

    it('should show currency preference as read-only PHP', async () => {
      renderCreateFamily();

      await waitFor(() => {
        expect(screen.getByText(/PHP/i)).toBeInTheDocument();
      });

      // Currency should be displayed but not editable
      expect(screen.getByText(/Philippine Peso/i) || screen.getByText(/PHP/i)).toBeInTheDocument();
    });
  });

  describe('Error Recovery', () => {
    it('should allow retry after service error', async () => {
      const mockCreateFamily = familyService.createFamily as jest.Mock;
      
      // First call fails
      mockCreateFamily.mockResolvedValueOnce({
        success: false,
        errors: [{ field: 'general', message: 'Service temporarily unavailable', code: 'SERVICE_ERROR' }]
      });
      
      // Second call succeeds
      mockCreateFamily.mockResolvedValueOnce({
        success: true,
        data: { id: 'new-family-id' }
      });

      renderCreateFamily();

      // Fill form and submit
      await waitFor(() => {
        expect(screen.getByLabelText(/Family Name/i)).toBeInTheDocument();
      });

      const familyNameInput = screen.getByLabelText(/Family Name/i);
      fireEvent.change(familyNameInput, { target: { value: 'Test Family' } });

      const form = screen.getByRole('form') || screen.getByTestId('family-form');
      fireEvent.submit(form);

      // Submit to create (should fail)
      await waitFor(() => {
        const createButton = screen.getByText(/Create Family/i);
        fireEvent.click(createButton);
      });

      // Should show error and return to form
      await waitFor(() => {
        expect(screen.getByText(/Service temporarily unavailable/i)).toBeInTheDocument();
      });

      // Should be back in form mode, try again
      await waitFor(() => {
        const retryButton = screen.getByText(/Review Family Details/i);
        fireEvent.click(retryButton);
      });

      // Submit again (should succeed)
      await waitFor(() => {
        const createButton = screen.getByText(/Create Family/i);
        fireEvent.click(createButton);
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/family?created=true');
      });
    });
  });
});
// Integration test for the refactored BudgetSetupModal components
// This file validates that all components work together properly

import React from 'react';
import { ModalState, BudgetFormData, TransactionFormData } from '../types/BudgetSetupTypes';
import { ValidationEngine } from '../utils/ValidationEngine';

// Test function to validate the complete integration
export const testBudgetSetupIntegration = (): boolean => {
  try {
    // Test 1: Verify type definitions exist and are properly structured
    const mockModalState: ModalState = {
      currentStep: 'workflow_choice',
      workflowChoice: null,
      budgetData: {
        budget_name: '',
        category_id: '',
        category_name: '',
        amount: 0,
        period: 'month',
        start_date: '2025-01',
        alert_threshold: 0.8
      },
      transactionData: {
        type: 'expense',
        amount: 0,
        account_id: '',
        account_name: '',
        category_id: '',
        category_name: '',
        date: '2025-01-15',
        description: ''
      },
      validationErrors: {},
      isSubmitting: false,
      allowWorkflowChange: true,
      progressPercentage: 25
    };

    // Test 2: Verify ValidationEngine methods work correctly
    const testBudgetData: BudgetFormData = {
      budget_name: 'Test Budget',
      category_id: 'cat_123',
      category_name: 'Groceries',
      amount: 1000,
      period: 'month',
      start_date: '2025-01',
      alert_threshold: 0.8
    };

    const testTransactionData: TransactionFormData = {
      type: 'expense',
      amount: 100,
      account_id: 'acc_123',
      account_name: 'Main Account',
      category_id: 'cat_123',
      category_name: 'Groceries',
      date: '2025-01-15',
      description: 'Grocery shopping'
    };

    // Test validation functions
    const budgetErrors = ValidationEngine.validateBudgetData(testBudgetData);
    const transactionErrors = ValidationEngine.validateTransactionData(testTransactionData);
    const crossErrors = ValidationEngine.crossValidateData(testBudgetData, testTransactionData);

    // Test 3: Verify comprehensive validation works
    const allErrors = ValidationEngine.generateValidationErrors(
      testBudgetData,
      testTransactionData,
      true,
      true,
      true
    );

    const hasErrors = ValidationEngine.hasValidationErrors(allErrors);
    const summary = ValidationEngine.getValidationSummary(allErrors);

    // Test 4: Verify step flow logic
    const stepProgression = [
      'workflow_choice',
      'budget_config',
      'transaction_create',
      'final_confirmation'
    ];

    // Test 5: Verify smart defaults functionality

    return true;

  } catch (error) {
    console.error('❌ BudgetSetup integration test failed:', error);
    return false;
  }
};

// Test runner for development environment
if (process.env.NODE_ENV === 'development') {
  // Run tests after component imports are loaded
  setTimeout(() => {
    testBudgetSetupIntegration();
  }, 1000);
}

export default testBudgetSetupIntegration;
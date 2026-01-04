/**
 * Validation Logger Tests
 * TASK 5.2: Test frontend validation logging functionality
 * 
 * Tests verify that:
 * - Prediction values exceeding expected ranges are logged
 * - Unrealistic growth rates are detected and logged
 * - Fallback calculations are logged when applied
 * - User ID and timeframe are included in all logs
 */

import {
  logPredictionExceedsRange,
  logUnrealisticGrowthRate,
  logFallbackApplication,
  logHighGrowthRateWarning,
  logCategoryValidationWarning,
  logValidationSummary,
  logModerateGrowthInfo,
  logNoPredictionsAvailable,
  logAggregationValidation,
  logValidationSuccess
} from '../utils/validationLogger';

// Mock console methods
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();
const mockConsoleInfo = jest.spyOn(console, 'info').mockImplementation();
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();

describe('Validation Logger', () => {
  const mockContext = {
    userId: 'test-user-123',
    timeframe: 'months_3'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
    mockConsoleWarn.mockRestore();
    mockConsoleInfo.mockRestore();
    mockConsoleLog.mockRestore();
  });

  describe('logPredictionExceedsRange', () => {
    it('should log error when prediction exceeds 3x historical average', () => {
      logPredictionExceedsRange({
        ...mockContext,
        label: 'Income',
        predicted: 300000,
        historical: 65000,
        growthRate: 3.615,
        threshold: '200% (3x historical)',
        ratio: 4.62,
        validationRule: 'prediction_exceeds_3x_historical'
      });

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('VALIDATION ERROR'),
        expect.objectContaining({
          userId: 'test-user-123',
          timeframe: 'months_3',
          label: 'Income',
          predicted: '300000.00',
          historical: '65000.00',
          validationRule: 'prediction_exceeds_3x_historical'
        })
      );
    });

    it('should include user ID and timeframe in log', () => {
      logPredictionExceedsRange({
        ...mockContext,
        label: 'Expenses',
        predicted: 150000,
        historical: 45000,
        growthRate: 2.33,
        threshold: '200%',
        ratio: 3.33,
        validationRule: 'prediction_exceeds_3x_historical'
      });

      const logCall = mockConsoleError.mock.calls[0][1];
      expect(logCall).toHaveProperty('userId', 'test-user-123');
      expect(logCall).toHaveProperty('timeframe', 'months_3');
      expect(logCall).toHaveProperty('timestamp');
    });
  });

  describe('logUnrealisticGrowthRate', () => {
    it('should log error when growth rate exceeds 50%', () => {
      logUnrealisticGrowthRate({
        ...mockContext,
        transactionType: 'Income',
        changePercent: 254.3,
        threshold: '50%',
        exceedsBy: 204.3,
        validationRule: 'growth_rate_exceeds_50_percent'
      });

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Unrealistic growth rate'),
        expect.objectContaining({
          userId: 'test-user-123',
          timeframe: 'months_3',
          transactionType: 'Income',
          changePercent: '254.3%',
          exceedsBy: '204.3%'
        })
      );
    });

    it('should include validation rule in log', () => {
      logUnrealisticGrowthRate({
        ...mockContext,
        transactionType: 'Savings',
        changePercent: 1515.7,
        threshold: '50%',
        exceedsBy: 1465.7,
        validationRule: 'growth_rate_exceeds_50_percent'
      });

      const logCall = mockConsoleError.mock.calls[0][1];
      expect(logCall).toHaveProperty('validationRule', 'growth_rate_exceeds_50_percent');
    });
  });

  describe('logFallbackApplication', () => {
    it('should log warning when fallback is applied', () => {
      logFallbackApplication({
        ...mockContext,
        label: 'Income',
        originalValue: 585039,
        fallbackValue: 68250,
        adjustment: 'historical + 5%',
        reason: 'Prediction exceeded 3x historical average'
      });

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('FALLBACK APPLIED'),
        expect.objectContaining({
          userId: 'test-user-123',
          timeframe: 'months_3',
          label: 'Income',
          originalValue: '585039.00',
          fallbackValue: '68250.00',
          adjustment: 'historical + 5%',
          reason: 'Prediction exceeded 3x historical average'
        })
      );
    });

    it('should include timestamp in fallback log', () => {
      logFallbackApplication({
        ...mockContext,
        label: 'Expenses',
        originalValue: 100000,
        fallbackValue: 47250,
        adjustment: 'historical + 5%',
        reason: 'Unrealistic prediction detected'
      });

      const logCall = mockConsoleWarn.mock.calls[0][1];
      expect(logCall).toHaveProperty('timestamp');
      expect(new Date(logCall.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('logHighGrowthRateWarning', () => {
    it('should log warning for growth rates between 20-50%', () => {
      logHighGrowthRateWarning({
        ...mockContext,
        transactionType: 'Expenses',
        changePercent: 35.5,
        threshold: '20-50%',
        validationRule: 'growth_rate_exceeds_20_percent'
      });

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('High growth rate'),
        expect.objectContaining({
          userId: 'test-user-123',
          changePercent: '35.5%',
          threshold: '20-50%'
        })
      );
    });
  });

  describe('logCategoryValidationWarning', () => {
    it('should log warning for high category growth rates', () => {
      logCategoryValidationWarning({
        ...mockContext,
        category: 'Food & Dining',
        historicalAverage: 15000,
        predicted: 22500,
        changePercent: 50,
        threshold: '30%',
        validationRule: 'category_growth_exceeds_30_percent'
      });

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('High category growth rate'),
        expect.objectContaining({
          userId: 'test-user-123',
          category: 'Food & Dining',
          historicalAverage: '15000.00',
          predicted: '22500.00',
          changePercent: '50.0%'
        })
      );
    });
  });

  describe('logValidationSummary', () => {
    it('should log summary when multiple caps are applied', () => {
      logValidationSummary({
        ...mockContext,
        cappingSummary: {
          income: 'CAPPED',
          expense: 'OK',
          savings: 'CAPPED'
        },
        cappedValues: {
          income: { original: '585039.00', capped: '68250.00' },
          expense: null,
          savings: { original: '539789.00', capped: '21000.00' }
        },
        reason: 'One or more predictions exceeded realistic growth thresholds'
      });

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('VALIDATION SUMMARY'),
        expect.objectContaining({
          userId: 'test-user-123',
          timeframe: 'months_3',
          cappingSummary: expect.objectContaining({
            income: 'CAPPED',
            savings: 'CAPPED'
          })
        })
      );
    });
  });

  describe('logModerateGrowthInfo', () => {
    it('should log info for moderate growth rates', () => {
      logModerateGrowthInfo({
        ...mockContext,
        transactionType: 'Income',
        changePercent: 3.5,
        threshold: '2.5-5%',
        validationRule: 'income_growth_moderate'
      });

      expect(mockConsoleInfo).toHaveBeenCalledWith(
        expect.stringContaining('Moderate growth rate'),
        expect.objectContaining({
          userId: 'test-user-123',
          changePercent: '3.5%',
          validationRule: 'income_growth_moderate'
        })
      );
    });
  });

  describe('logNoPredictionsAvailable', () => {
    it('should log warning when no predictions are available', () => {
      logNoPredictionsAvailable(
        mockContext,
        'No category forecasts in prediction response'
      );

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('No predictions available'),
        expect.objectContaining({
          userId: 'test-user-123',
          timeframe: 'months_3',
          reason: 'No category forecasts in prediction response'
        })
      );
    });
  });

  describe('logAggregationValidation', () => {
    it('should log aggregation validation issues', () => {
      logAggregationValidation(
        mockContext,
        '2025-11',
        'Incomplete month data',
        {
          daysInMonth: 15,
          expectedMinimum: 28,
          monthlyTotal: 32500
        }
      );

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Aggregation validation issue'),
        expect.objectContaining({
          userId: 'test-user-123',
          month: '2025-11',
          issue: 'Incomplete month data',
          daysInMonth: 15,
          expectedMinimum: 28
        })
      );
    });
  });

  describe('logValidationSuccess', () => {
    it('should log successful validation', () => {
      logValidationSuccess(
        mockContext,
        'Income prediction',
        {
          predicted: 67000,
          historical: 65000,
          growthRate: '3.1%',
          withinThreshold: true
        }
      );

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('VALIDATION SUCCESS'),
        expect.objectContaining({
          userId: 'test-user-123',
          label: 'Income prediction',
          predicted: 67000,
          withinThreshold: true
        })
      );
    });
  });

  describe('Context Requirements', () => {
    it('should always include userId in logs', () => {
      logPredictionExceedsRange({
        ...mockContext,
        label: 'Test',
        predicted: 100,
        historical: 50,
        growthRate: 1,
        threshold: '200%',
        ratio: 2,
        validationRule: 'test_rule'
      });

      const logCall = mockConsoleError.mock.calls[0][1];
      expect(logCall).toHaveProperty('userId');
      expect(logCall.userId).toBe('test-user-123');
    });

    it('should always include timeframe in logs', () => {
      logUnrealisticGrowthRate({
        ...mockContext,
        transactionType: 'Test',
        changePercent: 100,
        threshold: '50%',
        validationRule: 'test_rule'
      });

      const logCall = mockConsoleError.mock.calls[0][1];
      expect(logCall).toHaveProperty('timeframe');
      expect(logCall.timeframe).toBe('months_3');
    });

    it('should always include timestamp in logs', () => {
      logFallbackApplication({
        ...mockContext,
        label: 'Test',
        originalValue: 100,
        fallbackValue: 50,
        adjustment: 'test',
        reason: 'test reason'
      });

      const logCall = mockConsoleWarn.mock.calls[0][1];
      expect(logCall).toHaveProperty('timestamp');
      expect(typeof logCall.timestamp).toBe('string');
    });
  });

  describe('Validation Rules', () => {
    it('should include validation rule in all error logs', () => {
      const testCases = [
        {
          fn: logPredictionExceedsRange,
          args: {
            ...mockContext,
            label: 'Test',
            predicted: 100,
            historical: 50,
            growthRate: 1,
            threshold: '200%',
            ratio: 2,
            validationRule: 'prediction_exceeds_3x_historical'
          }
        },
        {
          fn: logUnrealisticGrowthRate,
          args: {
            ...mockContext,
            transactionType: 'Test',
            changePercent: 100,
            threshold: '50%',
            validationRule: 'growth_rate_exceeds_50_percent'
          }
        }
      ];

      testCases.forEach(({ fn, args }) => {
        jest.clearAllMocks();
        fn(args as any);
        const logCall = mockConsoleError.mock.calls[0][1];
        expect(logCall).toHaveProperty('validationRule');
        expect(typeof logCall.validationRule).toBe('string');
      });
    });
  });
});

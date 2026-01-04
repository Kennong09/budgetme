import React, { FC, memo, ChangeEvent, FormEvent } from "react";
import { BudgetFormData, ExpenseCategory } from "../../types";

interface BudgetFormProps {
  budget: BudgetFormData;
  expenseCategories: ExpenseCategory[];
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  isLoading?: boolean;
  submitButtonText?: string;
}

const BudgetForm: FC<BudgetFormProps> = memo(({
  budget,
  expenseCategories,
  onSubmit,
  onChange,
  isLoading = false,
  submitButtonText = "Continue to Review"
}) => {
  return (
    <form onSubmit={onSubmit}>
      <div className="form-group mb-3 md:mb-4">
        <label htmlFor="budget_name" className="text-sm md:text-base font-weight-bold text-gray-800">
          Budget Name <span className="text-danger">*</span>
        </label>
        <input
          type="text"
          id="budget_name"
          name="budget_name"
          value={budget.budget_name || ''}
          onChange={onChange}
          className="form-control form-control-user text-sm md:text-base"
          placeholder="Enter budget name (e.g., Monthly Food Budget)"
          maxLength={100}
          required
          disabled={isLoading}
        />
        <small className="form-text text-xs md:text-sm text-muted">
          Give your budget a descriptive name
        </small>
      </div>
      
      <div className="form-group mb-3 md:mb-4">
        <label htmlFor="category_id" className="text-sm md:text-base font-weight-bold text-gray-800">
          Category <span className="text-danger">*</span>
        </label>
        <select
          id="category_id"
          name="category_id"
          value={budget.category_id}
          onChange={onChange}
          className="form-control text-sm md:text-base"
          required
          disabled={isLoading}
        >
          <option value="">Select Category</option>
          {expenseCategories.map((category) => (
            <option key={category.id} value={category.id.toString()}>
              {category.category_name}
            </option>
          ))}
        </select>
        <small className="form-text text-xs md:text-sm text-muted">
          Select the spending category for this budget
        </small>
      </div>

      <div className="form-group mb-3 md:mb-4">
        <label htmlFor="amount" className="text-sm md:text-base font-weight-bold text-gray-800">
          Budget Amount <span className="text-danger">*</span>
        </label>
        <div className="input-group">
          <div className="input-group-prepend">
            <span className="input-group-text text-sm md:text-base">₱</span>
          </div>
          <input
            type="number"
            id="amount"
            name="amount"
            value={budget.amount}
            onChange={onChange}
            className="form-control form-control-user text-sm md:text-base"
            placeholder="0.00"
            step="0.01"
            min="0"
            required
            disabled={isLoading}
          />
        </div>
        <small className="form-text text-xs md:text-sm text-muted">
          How much do you want to allocate for this category?
        </small>
      </div>

      <div className="row">
        <div className="col-md-6">
          <div className="form-group mb-3 md:mb-4">
            <label htmlFor="period" className="text-sm md:text-base font-weight-bold text-gray-800">
              Budget Period <span className="text-danger">*</span>
            </label>
            <select
              id="period"
              name="period"
              value={budget.period}
              onChange={onChange}
              className="form-control text-sm md:text-base"
              required
              disabled={isLoading}
            >
              <option value="month">Monthly</option>
              <option value="quarter">Quarterly</option>
              <option value="year">Yearly</option>
            </select>
            <small className="form-text text-xs md:text-sm text-muted">
              How often do you want to reset this budget?
            </small>
          </div>
        </div>

        <div className="col-md-6">
          <div className="form-group mb-3 md:mb-4">
            <label htmlFor="startDate" className="text-sm md:text-base font-weight-bold text-gray-800">
              Start Date <span className="text-danger">*</span>
            </label>
            <input
              type="month"
              id="startDate"
              name="startDate"
              value={budget.startDate}
              onChange={onChange}
              className="form-control text-sm md:text-base"
              required
              disabled={isLoading}
            />
            <small className="form-text text-xs md:text-sm text-muted">
              When should this budget begin?
            </small>
          </div>
        </div>
      </div>

      <hr className="my-3 md:my-4" />

      <div className="text-center">
        <button 
          type="submit" 
          className="inline-flex items-center px-4 py-2.5 md:px-6 md:py-3 bg-[#4e73df] hover:bg-[#2e59d9] text-white text-sm md:text-base font-medium rounded shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading}
        >
          <i className={`${isLoading ? "fas fa-spinner fa-spin" : "fas fa-arrow-right"} mr-2 text-xs md:text-sm`}></i>
          <span>{submitButtonText}</span>
        </button>
      </div>
    </form>
  );
});

BudgetForm.displayName = 'BudgetForm';

export default BudgetForm;

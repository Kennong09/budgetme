import React, { FC, ChangeEvent, FormEvent } from "react";
import { BudgetFormData, ExpenseCategory } from "../../types";

interface BudgetFormProps {
  budget: BudgetFormData;
  expenseCategories: ExpenseCategory[];
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  isLoading?: boolean;
  submitButtonText?: string;
}

const BudgetForm: FC<BudgetFormProps> = ({
  budget,
  expenseCategories,
  onSubmit,
  onChange,
  isLoading = false,
  submitButtonText = "Continue to Review"
}) => {
  return (
    <form onSubmit={onSubmit}>
      <div className="form-group">
        <label htmlFor="budget_name" className="font-weight-bold text-gray-800">
          Budget Name <span className="text-danger">*</span>
        </label>
        <input
          type="text"
          id="budget_name"
          name="budget_name"
          value={budget.budget_name || ''}
          onChange={onChange}
          className="form-control form-control-user"
          placeholder="Enter budget name (e.g., Monthly Food Budget)"
          maxLength={100}
          required
          disabled={isLoading}
        />
        <small className="form-text text-muted">
          Give your budget a descriptive name
        </small>
      </div>
      
      <div className="form-group">
        <label htmlFor="category_id" className="font-weight-bold text-gray-800">
          Category <span className="text-danger">*</span>
        </label>
        <select
          id="category_id"
          name="category_id"
          value={budget.category_id}
          onChange={onChange}
          className="form-control"
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
        <small className="form-text text-muted">
          Select the spending category for this budget
        </small>
      </div>

      <div className="form-group">
        <label htmlFor="amount" className="font-weight-bold text-gray-800">
          Budget Amount <span className="text-danger">*</span>
        </label>
        <div className="input-group">
          <div className="input-group-prepend">
            <span className="input-group-text">₱</span>
          </div>
          <input
            type="number"
            id="amount"
            name="amount"
            value={budget.amount}
            onChange={onChange}
            className="form-control form-control-user"
            placeholder="0.00"
            step="0.01"
            min="0"
            required
            disabled={isLoading}
          />
        </div>
        <small className="form-text text-muted">
          How much do you want to allocate for this category?
        </small>
      </div>

      <div className="row">
        <div className="col-md-6">
          <div className="form-group">
            <label htmlFor="period" className="font-weight-bold text-gray-800">
              Budget Period <span className="text-danger">*</span>
            </label>
            <select
              id="period"
              name="period"
              value={budget.period}
              onChange={onChange}
              className="form-control"
              required
              disabled={isLoading}
            >
              <option value="month">Monthly</option>
              <option value="quarter">Quarterly</option>
              <option value="year">Yearly</option>
            </select>
            <small className="form-text text-muted">
              How often do you want to reset this budget?
            </small>
          </div>
        </div>

        <div className="col-md-6">
          <div className="form-group">
            <label htmlFor="startDate" className="font-weight-bold text-gray-800">
              Start Date <span className="text-danger">*</span>
            </label>
            <input
              type="month"
              id="startDate"
              name="startDate"
              value={budget.startDate}
              onChange={onChange}
              className="form-control"
              required
              disabled={isLoading}
            />
            <small className="form-text text-muted">
              When should this budget begin?
            </small>
          </div>
        </div>
      </div>

      <hr className="my-4" />

      <div className="text-center">
        <button 
          type="submit" 
          className="btn btn-primary btn-icon-split"
          disabled={isLoading}
        >
          <span className="icon text-white-50">
            <i className={isLoading ? "fas fa-spinner fa-spin" : "fas fa-arrow-right"}></i>
          </span>
          <span className="text">{submitButtonText}</span>
        </button>
      </div>
    </form>
  );
};

export default BudgetForm;

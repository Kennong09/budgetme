import React, { FC, ReactNode } from 'react';

interface FormGroupProps {
  label: string;
  htmlFor: string;
  labelWidth?: number;
  children: ReactNode;
  helpText?: string;
  icon?: string;
}

const FormGroup: FC<FormGroupProps> = ({ 
  label, 
  htmlFor, 
  labelWidth = 3, 
  children, 
  helpText,
  icon
}) => {
  const contentWidth = 12 - labelWidth;
  
  return (
    <>
      {/* Mobile Form Group */}
      <div className="block md:hidden bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-3">
        <label 
          htmlFor={htmlFor} 
          className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-2 block"
        >
          {label}
        </label>
        <div className="flex items-center space-x-3">
          {icon && (
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <i className={`${icon} text-indigo-500 text-sm`}></i>
            </div>
          )}
          <div className="flex-1">
            {children}
          </div>
        </div>
        {helpText && (
          <p className="text-[10px] text-gray-500 mt-2">
            <i className="fas fa-info-circle mr-1"></i>
            {helpText}
          </p>
        )}
      </div>

      {/* Desktop Form Group */}
      <div className="hidden md:block form-group row">
        <label htmlFor={htmlFor} className={`col-sm-${labelWidth} col-form-label`}>
          {label}
        </label>
        <div className={`col-sm-${contentWidth}`}>
          {children}
          {helpText && (
            <small className="form-text text-muted">{helpText}</small>
          )}
        </div>
      </div>
    </>
  );
};

export default FormGroup;

import React, { FC, ReactNode } from 'react';

interface FormGroupProps {
  label: string;
  htmlFor: string;
  labelWidth?: number;
  children: ReactNode;
  helpText?: string;
}

const FormGroup: FC<FormGroupProps> = ({ 
  label, 
  htmlFor, 
  labelWidth = 3, 
  children, 
  helpText 
}) => {
  const contentWidth = 12 - labelWidth;
  
  return (
    <div className="form-group row">
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
  );
};

export default FormGroup;

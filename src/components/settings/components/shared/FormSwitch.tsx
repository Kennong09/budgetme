import React, { FC } from 'react';

interface FormSwitchProps {
  id: string;
  name: string;
  label: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  helpText?: string;
}

const FormSwitch: FC<FormSwitchProps> = ({ 
  id, 
  name, 
  label, 
  checked, 
  onChange, 
  helpText 
}) => {
  return (
    <div className="form-group">
      <div className="custom-control custom-switch">
        <input
          type="checkbox"
          className="custom-control-input"
          id={id}
          name={name}
          checked={checked}
          onChange={onChange}
        />
        <label className="custom-control-label" htmlFor={id}>
          {label}
        </label>
      </div>
      {helpText && (
        <small className="form-text text-muted ml-4 mt-1">
          {helpText}
        </small>
      )}
    </div>
  );
};

export default FormSwitch;

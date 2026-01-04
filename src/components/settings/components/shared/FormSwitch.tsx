import React, { FC } from 'react';

interface FormSwitchProps {
  id: string;
  name: string;
  label: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  helpText?: string;
  icon?: string;
}

const FormSwitch: FC<FormSwitchProps> = ({ 
  id, 
  name, 
  label, 
  checked, 
  onChange, 
  helpText,
  icon
}) => {
  return (
    <>
      {/* Mobile Switch */}
      <div className="block md:hidden bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {icon && (
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <i className={`${icon} text-indigo-500 text-sm`}></i>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-800">{label}</p>
              {helpText && (
                <p className="text-[10px] text-gray-500 mt-0.5">{helpText}</p>
              )}
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              id={id}
              name={name}
              checked={checked}
              onChange={onChange}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
          </label>
        </div>
      </div>

      {/* Desktop Switch */}
      <div className="hidden md:block form-group">
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
    </>
  );
};

export default FormSwitch;

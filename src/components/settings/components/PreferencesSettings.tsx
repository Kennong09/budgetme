import React, { FC } from 'react';
import FormGroup from './shared/FormGroup';
import { UserProfile, LANGUAGE_OPTIONS } from '../types';

interface PreferencesSettingsProps {
  profile: UserProfile;
  onInputChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

const PreferencesSettings: FC<PreferencesSettingsProps> = ({ profile, onInputChange }) => {
  return (
    <div className="settings-section animate__animated animate__fadeIn animate__faster">
      <h2 className="h5 mb-4 text-gray-700">Preferences</h2>
      
      {/* Currency is now fixed to PHP - display only */}
      <FormGroup label="Currency" htmlFor="currency">
        <div className="form-control-static">
          <div className="d-flex align-items-center">
            <i className="fas fa-peso-sign text-success mr-2"></i>
            <span className="font-weight-bold">PHP - Philippine Peso (₱)</span>
            <span className="badge badge-primary ml-2">Fixed</span>
          </div>
        </div>
        <small className="form-text text-muted">
          <i className="fas fa-info-circle mr-1 text-gray-400"></i>
          Currency selection has been standardized to Philippine Pesos for all users.
        </small>
      </FormGroup>
      
      <FormGroup label="Language" htmlFor="language">
        <select
          className="form-control"
          id="language"
          name="language"
          value={profile.language}
          onChange={onInputChange}
        >
          {LANGUAGE_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </FormGroup>
    </div>
  );
};

export default PreferencesSettings;

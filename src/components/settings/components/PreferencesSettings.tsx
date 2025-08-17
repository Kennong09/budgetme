import React, { FC } from 'react';
import FormGroup from './shared/FormGroup';
import { UserProfile, CURRENCY_OPTIONS, LANGUAGE_OPTIONS } from '../types';

interface PreferencesSettingsProps {
  profile: UserProfile;
  onInputChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

const PreferencesSettings: FC<PreferencesSettingsProps> = ({ profile, onInputChange }) => {
  return (
    <div className="settings-section animate__animated animate__fadeIn animate__faster">
      <h2 className="h5 mb-4 text-gray-700">Preferences</h2>
      
      <FormGroup label="Currency" htmlFor="currency">
        <select
          className="form-control"
          id="currency"
          name="currency"
          value={profile.currency}
          onChange={onInputChange}
        >
          {CURRENCY_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
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

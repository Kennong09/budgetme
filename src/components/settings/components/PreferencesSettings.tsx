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
      {/* Mobile Preferences Settings */}
      <div className="block md:hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center">
              <i className="fas fa-sliders-h text-purple-500 text-xs"></i>
            </div>
            Preferences
          </h2>
          <p className="text-[10px] text-gray-500 mt-1 ml-9">Customize your app experience</p>
        </div>

        <div className="p-4">
          {/* Currency - Fixed */}
          <div className="mb-4">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">
              Currency
            </label>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <i className="fas fa-peso-sign text-emerald-500 text-sm"></i>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Philippine Peso</p>
                    <p className="text-[10px] text-gray-500">₱ PHP</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 text-[9px] font-semibold rounded-full">
                  Fixed
                </span>
              </div>
            </div>
            <p className="text-[9px] text-gray-400 mt-1.5">
              <i className="fas fa-info-circle mr-1"></i>
              Currency is standardized to PHP for all users
            </p>
          </div>

          {/* Language */}
          <div className="mb-4">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">
              Language
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <i className="fas fa-globe text-gray-400 text-xs"></i>
              </div>
              <select
                className="w-full pl-9 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                id="languageMobile"
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
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <i className="fas fa-chevron-down text-gray-400 text-xs"></i>
              </div>
            </div>
            <p className="text-[9px] text-gray-400 mt-1">Select your preferred language</p>
          </div>

          {/* Info Card */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mt-6">
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <i className="fas fa-lightbulb text-blue-500 text-[10px]"></i>
              </div>
              <div>
                <p className="text-xs font-semibold text-blue-800">Tip</p>
                <p className="text-[10px] text-blue-600 mt-0.5">
                  Your preferences are automatically saved when you make changes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Preferences Settings */}
      <div className="hidden md:block">
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
    </div>
  );
};

export default PreferencesSettings;

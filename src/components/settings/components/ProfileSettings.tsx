import React, { FC } from 'react';
import FormGroup from './shared/FormGroup';
import { UserProfile } from '../types';

interface ProfileSettingsProps {
  profile: UserProfile;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const ProfileSettings: FC<ProfileSettingsProps> = ({ profile, onInputChange }) => {
  return (
    <div className="settings-section animate__animated animate__fadeIn animate__faster">
      <h2 className="h5 mb-4 text-gray-700">Profile Settings</h2>
      
      <div className="mb-4 text-center">
        <div className="profile-picture-container mx-auto">
          <img
            src={profile.profilePicture || "https://via.placeholder.com/150"}
            alt="Profile"
            className="profile-picture rounded-circle img-thumbnail"
          />
          <div className="profile-picture-overlay">
            <button type="button" className="btn btn-sm btn-primary">
              <i className="fas fa-camera mr-1"></i> Change
            </button>
          </div>
        </div>
      </div>
      
      <FormGroup label="Full Name" htmlFor="name">
        <input
          type="text"
          className="form-control"
          id="name"
          name="name"
          value={profile.name}
          onChange={onInputChange}
        />
      </FormGroup>
      
      <FormGroup 
        label="Email Address" 
        htmlFor="email"
        helpText="Contact support to change your email address"
      >
        <input
          type="email"
          className="form-control"
          id="email"
          name="email"
          value={profile.email}
          onChange={onInputChange}
          disabled
        />
      </FormGroup>
    </div>
  );
};

export default ProfileSettings;

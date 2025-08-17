import React, { FC } from 'react';
import FormSwitch from './shared/FormSwitch';
import { UserProfile } from '../types';

interface NotificationSettingsProps {
  profile: UserProfile;
  onCheckboxChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const NotificationSettings: FC<NotificationSettingsProps> = ({ profile, onCheckboxChange }) => {
  return (
    <div className="settings-section animate__animated animate__fadeIn animate__faster">
      <h2 className="h5 mb-4 text-gray-700">Notification Settings</h2>
      
      <FormSwitch
        id="emailNotifications"
        name="notifications.email"
        label="Email Notifications"
        checked={profile.notifications.email}
        onChange={onCheckboxChange}
        helpText="Receive budget alerts and weekly reports via email"
      />
      
      <FormSwitch
        id="pushNotifications"
        name="notifications.push"
        label="Push Notifications"
        checked={profile.notifications.push}
        onChange={onCheckboxChange}
        helpText="Receive in-app alerts and notifications"
      />
    </div>
  );
};

export default NotificationSettings;

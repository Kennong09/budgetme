import React, { FC, useState, useRef } from 'react';
import FormGroup from './shared/FormGroup';
import { UserProfile } from '../types';
import { supabase } from '../../../utils/supabaseClient';
import { useAuth } from '../../../utils/AuthContext';

// Import SB Admin CSS
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";
import "animate.css";

interface ProfileSettingsProps {
  profile: UserProfile;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setSuccessMessage: (message: string) => void;
  setErrorMessage: (message: string) => void;
}

const ProfileSettings: FC<ProfileSettingsProps> = ({ 
  profile, 
  onInputChange, 
  setSuccessMessage, 
  setErrorMessage 
}) => {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setErrorMessage('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setErrorMessage('Image size must be less than 5MB');
      return;
    }

    setSelectedImage(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      if (!user) throw new Error('User must be logged in to upload images');

      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `profile-${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `profiles/${fileName}`;

        const { data, error } = await supabase.storage
          .from('profile-pictures')
          .upload(filePath, file, { cacheControl: '3600', upsert: false });

        if (error) throw error;

        const { data: publicUrlData } = supabase.storage
          .from('profile-pictures')
          .getPublicUrl(filePath);

        return publicUrlData.publicUrl;
      } catch (storageError) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(file);
        });
      }
    } catch (error) {
      console.error('Error processing image:', error);
      throw error;
    }
  };

  const handleImageUpload = async () => {
    if (!selectedImage || !user) return;

    try {
      setIsUploading(true);
      setErrorMessage('');
      
      const imageUrl = await uploadImage(selectedImage);
      
      if (imageUrl) {
        onInputChange({
          target: { name: 'profilePicture', value: imageUrl }
        } as React.ChangeEvent<HTMLInputElement>);

        const { error: authError } = await supabase.auth.updateUser({
          data: { full_name: profile.name, avatar_url: imageUrl }
        });

        if (authError) throw authError;

        setSuccessMessage('Profile picture uploaded and saved successfully!');
        setSelectedImage(null);
        setPreviewUrl('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      setErrorMessage(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) {
      setErrorMessage('You must be logged in to save profile changes');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage('');

      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: profile.name, avatar_url: profile.profilePicture }
      });

      if (authError) throw authError;

      setSuccessMessage('Profile saved successfully!');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      console.error('Error saving profile:', error);
      setErrorMessage(`Failed to save profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const clearSelectedImage = () => {
    setSelectedImage(null);
    setPreviewUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const hasChanges = () => {
    const currentName = profile.name.trim();
    const originalName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';
    return currentName !== originalName && currentName.length > 0;
  };

  return (
    <div className="settings-section animate__animated animate__fadeIn animate__faster">
      {/* Mobile Profile Settings */}
      <div className="block md:hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="fas fa-user text-indigo-500 text-xs"></i>
            </div>
            Profile Settings
          </h2>
          <p className="text-[10px] text-gray-500 mt-1 ml-9">Manage your profile information</p>
        </div>

        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={previewUrl || profile.profilePicture || "https://via.placeholder.com/150"}
                alt="Profile"
                className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 shadow-sm"
              />
              {(previewUrl || selectedImage) && (
                <span className="absolute -bottom-1 -right-1 bg-blue-500 text-white text-[8px] px-1.5 py-0.5 rounded-full">
                  Preview
                </span>
              )}
            </div>
            <div className="flex-1">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/jpeg,image/png,image/jpg,image/gif,image/webp"
                onChange={handleImageSelect}
                className="hidden"
                id="profilePictureMobile"
              />
              <div className="flex flex-wrap gap-2">
                <button 
                  type="button" 
                  className="px-3 py-1.5 bg-indigo-50 text-indigo-600 text-xs font-medium rounded-lg hover:bg-indigo-100 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <i className="fas fa-camera mr-1 text-[10px]"></i>
                  Choose
                </button>
                
                {selectedImage && (
                  <>
                    <button 
                      type="button" 
                      className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-medium rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
                      onClick={handleImageUpload}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <><i className="fas fa-spinner fa-spin mr-1 text-[10px]"></i>Uploading...</>
                      ) : (
                        <><i className="fas fa-cloud-upload-alt mr-1 text-[10px]"></i>Upload</>
                      )}
                    </button>
                    <button 
                      type="button" 
                      className="w-7 h-7 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
                      onClick={clearSelectedImage}
                      disabled={isUploading}
                    >
                      <i className="fas fa-times text-[10px]"></i>
                    </button>
                  </>
                )}
              </div>
              {selectedImage && (
                <p className="text-[9px] text-gray-500 mt-1 truncate max-w-[180px]">
                  {selectedImage.name}
                </p>
              )}
            </div>
          </div>
          <p className="text-[9px] text-gray-400 mt-2">
            <i className="fas fa-info-circle mr-1"></i>
            JPEG, PNG, GIF, or WebP (max 5MB)
          </p>
        </div>

        <div className="p-4">
          <div className="mb-4">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">
              Full Name
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <i className="fas fa-user text-gray-400 text-xs"></i>
              </div>
              <input
                type="text"
                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                id="nameMobile"
                name="name"
                value={profile.name}
                onChange={onInputChange}
                placeholder="Enter your full name"
                maxLength={100}
              />
            </div>
            <p className="text-[9px] text-gray-400 mt-1">Your display name visible to other users</p>
          </div>

          <div className="mb-4">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <i className="fas fa-envelope text-gray-400 text-xs"></i>
              </div>
              <input
                type="email"
                className="w-full pl-9 pr-10 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-500 cursor-not-allowed"
                id="emailMobile"
                name="email"
                value={profile.email}
                disabled
                readOnly
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <i className="fas fa-lock text-gray-300 text-xs"></i>
              </div>
            </div>
            <p className="text-[9px] text-gray-400 mt-1">
              <i className="fas fa-shield-alt mr-1 text-amber-400"></i>
              Contact support to change email
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-700">
                  {hasChanges() ? 'Unsaved changes' : 'No changes'}
                </p>
                <p className="text-[9px] text-gray-400">Pictures save automatically</p>
              </div>
              <button 
                type="button" 
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  hasChanges() 
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-md' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
                onClick={handleSaveProfile}
                disabled={isSaving || !hasChanges()}
              >
                {isSaving ? (
                  <><i className="fas fa-spinner fa-spin mr-1 text-xs"></i>Saving...</>
                ) : (
                  <><i className="fas fa-save mr-1 text-xs"></i>Save</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Profile Settings */}
      <div className="hidden md:block">
        <div className="mb-4">
          <h2 className="h5 mb-0 text-gray-700 d-flex align-items-center">
            <i className="fas fa-user text-primary mr-2"></i>
            Profile Settings
          </h2>
          <small className="text-gray-500">Manage your profile information and picture</small>
        </div>
        
        <div className="card border-left-primary shadow-sm mb-4">
          <div className="card-body">
            <h6 className="font-weight-bold text-primary mb-3">
              <i className="fas fa-camera mr-2"></i>
              Profile Picture
            </h6>
            
            <div className="row">
              <div className="col-md-4 text-center">
                <div className="profile-picture-container mx-auto mb-3">
                  <img
                    src={previewUrl || profile.profilePicture || "https://via.placeholder.com/150"}
                    alt="Profile"
                    className="rounded-circle img-thumbnail"
                    style={{ width: '150px', height: '150px', objectFit: 'cover' }}
                  />
                  {(previewUrl || selectedImage) && (
                    <div className="mt-2">
                      <span className="badge badge-info">
                        <i className="fas fa-clock mr-1"></i>Preview
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="col-md-8">
                <div className="mb-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/jpeg,image/png,image/jpg,image/gif,image/webp"
                    onChange={handleImageSelect}
                    className="form-control-file"
                    id="profilePicture"
                    style={{ display: 'none' }}
                  />
                  
                  <div className="d-flex flex-wrap gap-2">
                    <button 
                      type="button" 
                      className="btn btn-outline-primary btn-sm mr-2 mb-2"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      <i className="fas fa-upload mr-1"></i>Choose Image
                    </button>
                    
                    {selectedImage && (
                      <>
                        <button 
                          type="button" 
                          className="btn btn-success btn-sm mr-2 mb-2"
                          onClick={handleImageUpload}
                          disabled={isUploading}
                        >
                          {isUploading ? (
                            <><span className="spinner-border spinner-border-sm mr-1" role="status"></span>Uploading...</>
                          ) : (
                            <><i className="fas fa-cloud-upload-alt mr-1"></i>Upload & Save</>
                          )}
                        </button>
                        
                        <button 
                          type="button" 
                          className="btn btn-outline-secondary btn-sm mb-2"
                          onClick={clearSelectedImage}
                          disabled={isUploading}
                        >
                          <i className="fas fa-times mr-1"></i>Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
                
                {selectedImage && (
                  <div className="alert alert-info" role="alert">
                    <i className="fas fa-info-circle mr-2"></i>
                    <strong>Selected:</strong> {selectedImage.name} ({(selectedImage.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                )}
                
                <small className="text-muted">
                  <i className="fas fa-info-circle mr-1"></i>
                  Upload a profile picture (JPEG, PNG, GIF, or WebP, max 5MB). Images are automatically saved after upload.
                </small>
              </div>
            </div>
          </div>
        </div>
        
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h6 className="font-weight-bold text-gray-800 mb-3">
              <i className="fas fa-info-circle mr-2"></i>
              Profile Information
            </h6>
            
            <FormGroup label="Full Name" htmlFor="name">
              <div className="input-group">
                <div className="input-group-prepend">
                  <span className="input-group-text">
                    <i className="fas fa-user text-gray-600"></i>
                  </span>
                </div>
                <input
                  type="text"
                  className="form-control"
                  id="name"
                  name="name"
                  value={profile.name}
                  onChange={onInputChange}
                  placeholder="Enter your full name"
                  maxLength={100}
                />
              </div>
              <small className="form-text text-muted">
                <i className="fas fa-info-circle mr-1"></i>
                Your display name visible to other users
              </small>
            </FormGroup>
            
            <FormGroup label="Email Address" htmlFor="email" helpText="Contact support to change your email address">
              <div className="input-group">
                <div className="input-group-prepend">
                  <span className="input-group-text">
                    <i className="fas fa-envelope text-gray-600"></i>
                  </span>
                </div>
                <input
                  type="email"
                  className="form-control bg-light"
                  id="email"
                  name="email"
                  value={profile.email}
                  disabled
                  readOnly
                />
                <div className="input-group-append">
                  <span className="input-group-text bg-light border-left-0">
                    <i className="fas fa-lock text-gray-400"></i>
                  </span>
                </div>
              </div>
              <small className="form-text text-muted">
                <i className="fas fa-shield-alt mr-1 text-warning"></i>
                Email changes require account verification. Contact support for assistance.
              </small>
            </FormGroup>
          </div>
        </div>
        
        <div className="card border-left-success shadow-sm">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h6 className="font-weight-bold text-success mb-1">
                  <i className="fas fa-check-circle mr-2"></i>
                  Save Name Changes
                </h6>
                <small className="text-muted">
                  {hasChanges() ? 'You have unsaved name changes' : 'No name changes to save'}
                  <br />
                  <i className="fas fa-info-circle mr-1 text-info"></i>
                  Profile pictures are saved automatically when uploaded
                </small>
              </div>
              <button 
                type="button" 
                className="btn btn-success"
                onClick={handleSaveProfile}
                disabled={isSaving || !hasChanges()}
              >
                {isSaving ? (
                  <><span className="spinner-border spinner-border-sm mr-2" role="status"></span>Saving...</>
                ) : (
                  <><i className="fas fa-save mr-2"></i>Save Name Changes</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;

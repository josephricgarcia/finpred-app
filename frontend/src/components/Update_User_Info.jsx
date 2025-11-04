import { useEffect, useState } from 'react';
import { useUser } from '../contexts/UserContext';
import supabase from '../helper/supabaseClient';

const UpdateUserInfo = ({ onClose, onSuccess, onError }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [form, setForm] = useState({
    username: '',
    email: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const { userData, updateUserData, logout } = useUser();

  // Initialize form when component mounts or userData changes
  useEffect(() => {
    if (userData) {
      setForm({
        username: userData.username || '',
        email: userData.email || '',
        newPassword: '',
        confirmNewPassword: ''
      });
    }
  }, [userData]);

  const validatePassword = (pwd) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(pwd);
    const hasLowerCase = /[a-z]/.test(pwd);
    const hasNumber = /\d/.test(pwd);
    return pwd.length >= minLength && hasUpperCase && hasLowerCase && hasNumber;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    onError(null);
    setIsUpdating(true);

    try {
      // Validate form inputs
      if (!form.username.trim()) {
        throw new Error('Username is required');
      }

      if (!form.email.trim()) {
        throw new Error('Email is required');
      }

      const wantsPasswordChange = form.newPassword || form.confirmNewPassword;

      if (wantsPasswordChange) {
        if (form.newPassword !== form.confirmNewPassword) {
          throw new Error('New passwords do not match');
        }
        if (!validatePassword(form.newPassword)) {
          throw new Error('New password must be at least 8 characters long, include uppercase, lowercase, and a number.');
        }
      }

      // Check if user is authenticated
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Not authenticated');
      }

      let hasChanges = false;
      let updateMessage = 'Profile updated successfully';

      // Update email if changed
      if (userData?.email !== form.email.trim()) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: form.email.trim()
        });
        if (emailError) {
          throw new Error(`Email update failed: ${emailError.message}`);
        }
        hasChanges = true;
        updateMessage = 'Email updated successfully. Please check your email for confirmation. You will be signed out now.';

        // Sign out the user after email change
        logout();
      }

      // Update password if requested
      if (wantsPasswordChange) {
        const { error: pwdError } = await supabase.auth.updateUser({
          password: form.newPassword
        });
        if (pwdError) {
          throw new Error(`Password update failed: ${pwdError.message}`);
        }
        hasChanges = true;
        updateMessage = hasChanges && userData?.email !== form.email.trim()
          ? 'Email and password updated successfully. Please check your email for confirmation. You will be signed out now.'
          : 'Password updated successfully';
      }

      // Update username in user metadata (Supabase)
      if (userData?.username !== form.username.trim()) {
        const { error: metaError } = await supabase.auth.updateUser({
          data: { username: form.username.trim() }
        });
        if (metaError) {
          throw new Error(`Username update failed: ${metaError.message}`);
        }
        hasChanges = true;
        if (!wantsPasswordChange && userData?.email === form.email.trim()) {
          updateMessage = 'Username updated successfully';
        }
      }

      // If no changes were made, inform the user
      if (!hasChanges) {
        throw new Error('No changes detected');
      }

      // Update local state with the new data
      const updatedUserData = {
        username: form.username.trim(),
        email: form.email.trim(),
        lastUpdated: new Date(),
        // Preserve other user data
        ...userData
      };

      updateUserData(updatedUserData);

      onSuccess(updateMessage);
    } catch (err) {
      console.error('Update error:', err);
      onError(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Username</label>
            <input 
              name="username" 
              value={form.username} 
              onChange={handleChange} 
              className="w-full border rounded-md px-3 py-2" 
              required 
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Email</label>
            <input 
              name="email" 
              type="email" 
              value={form.email} 
              onChange={handleChange} 
              className="w-full border rounded-md px-3 py-2" 
              required 
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">New Password</label>
            <input 
              name="newPassword" 
              type="password" 
              value={form.newPassword} 
              onChange={handleChange} 
              className="w-full border rounded-md px-3 py-2" 
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Confirm New Password</label>
            <input 
              name="confirmNewPassword" 
              type="password" 
              value={form.confirmNewPassword} 
              onChange={handleChange} 
              className="w-full border rounded-md px-3 py-2" 
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </button>
            <button 
              type="submit" 
              className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg flex items-center"
              disabled={isUpdating}
            >
              {isUpdating ? (
                <div className="flex items-center">
                  <svg
                    className="animate-spin h-4 w-4 mr-2 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Updating...
                </div>
              ) : (
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Save Changes
                </div>
              )}
            </button>
          </div>
        </form>
    </div>
  );
};

export default UpdateUserInfo;
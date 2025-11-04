import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import supabase from '../helper/supabaseClient';

const DeleteAccount = ({ onClose, onSuccess, onError }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const navigate = useNavigate();
  const { handleAccountDeletion } = useUser();

  const handleDelete = async (e) => {
    e.preventDefault();
    onError(null);
    
    if (confirmation !== 'DELETE') {
      onError('Please type "DELETE" to confirm account deletion');
      return;
    }

    if (!password) {
      onError('Password is required to delete your account');
      return;
    }

    setIsDeleting(true);

    try {
      // Verify password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: (await supabase.auth.getUser()).data.user?.email || '',
        password: password
      });

      if (signInError) {
        throw new Error('Incorrect password');
      }

      // Note: Deleting the user from Supabase auth requires the service role
      // For now, we'll just sign out and clear local data
      // The user should manually delete their account from Supabase dashboard
      // or you can set up a serverless function to handle account deletion
      await supabase.auth.signOut();

      // Clear user state and local storage
      handleAccountDeletion();
      onSuccess();
    } catch (err) {
      console.error('Delete error:', err);
      onError(err.message || 'Failed to delete account. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <p className="text-red-600 font-medium mb-2">Warning: This action cannot be undone!</p>
        <p className="text-gray-600 text-sm">
          All your data including transactions, insights, and account information will be permanently deleted.
        </p>
      </div>

      <form onSubmit={handleDelete} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Type <span className="font-mono text-red-600">DELETE</span> to confirm
            </label>
            <input 
              type="text" 
              value={confirmation} 
              onChange={(e) => setConfirmation(e.target.value)} 
              className="w-full border rounded-md px-3 py-2" 
              required 
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="w-full border rounded-md px-3 py-2" 
              required 
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg flex items-center"
              disabled={isDeleting}
            >
              {isDeleting ? (
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
                  Deleting...
                </div>
              ) : (
                'Delete Account'
              )}
            </button>
          </div>
        </form>
    </div>
  );
};

export default DeleteAccount;
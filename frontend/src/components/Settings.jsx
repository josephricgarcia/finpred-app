import { useState, useEffect } from 'react';
import Sidebar from './Sidebar.jsx';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import UpdateUserInfo from './Update_User_Info.jsx';
import DeleteAccount from './Delete_Account.jsx';

const Settings = () => {
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const navigate = useNavigate();
  const { userData, isLoading: loading } = useUser();

  useEffect(() => {
    // TODO: Implement authentication check
    // if (!user) {
    //   navigate('/signin');
    //   return;
    // }
  }, [navigate]);

  // Helper function to get account creation date
  const getAccountCreatedDate = (userData) => {
    if (!userData) return 'Unknown';

    const timestamp = userData.createdAt || userData.accountCreated || userData.dateCreated;

    if (!timestamp) return 'Unknown';

    try {
      // Firestore Timestamp
      if (typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toLocaleDateString();
      }
      // Object form with seconds/nanoseconds
      if (typeof timestamp === 'object' && typeof timestamp.seconds === 'number') {
        return new Date(timestamp.seconds * 1000).toLocaleDateString();
      }
      // Native Date
      if (timestamp instanceof Date) {
        return timestamp.toLocaleDateString();
      }
      return 'Unknown';
    } catch (error) {
      console.error('Error parsing date:', error);
      return 'Unknown';
    }
  };

  // Helper function to get last updated date
  const getLastUpdatedDate = (userData) => {
    if (!userData) return '-';

    const timestamp = userData.lastUpdated || userData.updatedAt || userData.lastModified;

    if (!timestamp) return '-';

    try {
      if (typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toLocaleDateString();
      }
      if (typeof timestamp === 'object' && typeof timestamp.seconds === 'number') {
        return new Date(timestamp.seconds * 1000).toLocaleDateString();
      }
      if (timestamp instanceof Date) {
        return timestamp.toLocaleDateString();
      }
      return '-';
    } catch (error) {
      console.error('Error parsing date:', error);
      return '-';
    }
  };

  const handleUpdateSuccess = (message) => {
    setSuccess(message);
    setShowSuccessModal(true);
    setShowUpdateModal(false);
    // Clear any existing error state
    setError(null);
    setShowErrorModal(false);
  };

  const handleUpdateError = (errorMessage) => {
    if (errorMessage) {
      setError(errorMessage);
      setShowErrorModal(true);
    } else {
      setError(null);
      setShowErrorModal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-blue-50">
        <Sidebar />
        <div className="flex-1 p-8 ml-64">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">User Information</h1>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-gray-600">Loading user information...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-blue-50">
      <Sidebar />
      <div className="flex-1 p-8 ml-64">
        <div className="max-w-10xl mx-auto px-4">
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">User Information</h1>
          <p className="text-gray-600 mb-6">Overview of your fish transaction business</p>

          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
            {userData ? (
              <div className="space-y-6">
                <div className="flex items-center">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mr-6">
                    <span className="text-2xl font-bold text-blue-600">
                      {userData.username ? userData.username.charAt(0).toUpperCase() : 'U'}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-800">{userData.username || 'No username set'}</h3>
                    <p className="text-gray-600">{userData.email || 'No email available'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Account Created</h4>
                    <p className="text-gray-800">
                      {getAccountCreatedDate(userData)}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Last Updated</h4>
                    <p className="text-gray-800">
                      {getLastUpdatedDate(userData)}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">User ID</h4>
                    <p className="text-sm text-gray-800 font-mono truncate">
                      {userData?.uid || 'Not available'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-600">No user information available.</p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Account Actions</h2>
            <div className="space-y-6">
              <div className="p-6 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-800">Update your user information</h3>
                    <p className="text-sm text-gray-600">Change your name, email, or password</p>
                  </div>
                  <button
                    onClick={() => setShowUpdateModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 flex items-center"
                    type="button"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="w-5 h-5 mr-2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                    </svg>
                    Update Info
                  </button>
                </div>
              </div>
              <div className="p-6 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-800">Delete your account</h3>
                    <p className="text-sm text-gray-600">Permanently remove your account and all associated data</p>
                  </div>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="w-5 h-5 mr-2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Update User Info Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 bg-black/50 grid place-items-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Update User Information</h2>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setShowUpdateModal(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <UpdateUserInfo 
              onClose={() => setShowUpdateModal(false)}
              onSuccess={handleUpdateSuccess}
              onError={handleUpdateError}
            />
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 grid place-items-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Delete Account</h2>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setShowDeleteModal(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <DeleteAccount 
              onClose={() => setShowDeleteModal(false)}
              onSuccess={() => {
                setSuccess('Account deleted successfully');
                setShowSuccessModal(true);
                setShowDeleteModal(false);
                // Clear any existing error state
                setError(null);
                setShowErrorModal(false);
              }}
              onError={handleUpdateError}
            />
          </div>
        </div>
      )}

      {/* Error Popup Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black/50 grid place-items-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Error</h2>
              </div>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={() => {
                  setShowErrorModal(false);
                  setError(null);
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-gray-700 mb-6">{error}</p>
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowErrorModal(false);
                  setError(null);
                }}
                className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Popup Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 grid place-items-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Success</h2>
              </div>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={() => {
                  setShowSuccessModal(false);
                  setSuccess(null);
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-gray-700 mb-6">{success}</p>
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setSuccess(null);
                  // If this is an account deletion success, navigate to signin
                  if (success === 'Account deleted successfully') {
                    navigate('/signin');
                  }
                }}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
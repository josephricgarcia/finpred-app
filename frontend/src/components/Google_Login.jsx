import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';

const GoogleLogin = ({ onError }) => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { loginWithGoogle } = useUser();

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const result = await loginWithGoogle();
      if (result?.success) {
        // Supabase will redirect on success; as a fallback, push to dashboard
        navigate('/dashboard');
      } else if (result?.error) {
        // Show error to user
        if (onError) {
          onError(result.error);
        } else {
          console.error('Google sign-in failed:', result.error);
        }
      }
    } catch (err) {
      console.error('Google sign-in failed:', err);
      if (onError) {
        onError('Google sign-in failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleGoogleLogin}
      disabled={isLoading}
      className="bg-gray-100 rounded-full p-2 hover:bg-gray-200 transition flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
      aria-label="Sign in with Google"
    >
      {isLoading ? (
        <svg
          className="animate-spin h-5 w-5 text-gray-600"
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
      ) : (
        <img src="google-logo.svg" alt="Google" className="w-6 h-6" />
      )}
    </button>
  );
};

export default GoogleLogin;
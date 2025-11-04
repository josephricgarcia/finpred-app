import React from 'react';
import GoogleLogin from './Google_Login.jsx';

// For this app, Google sign-up is the same as Google sign-in.
const GoogleSignup = ({ onError }) => {
  return <GoogleLogin onError={onError} />;
};

export default GoogleSignup;
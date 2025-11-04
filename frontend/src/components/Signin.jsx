import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import GoogleLogin from './Google_Login.jsx';
import { useUser } from '../contexts/UserContext';

const Signin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login, isAuthenticated } = useUser();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    // Validate inputs
    if (!email.trim()) {
      setError("Email is required!");
      setIsLoading(false);
      return;
    }

    if (!password) {
      setError("Password is required!");
      setIsLoading(false);
      return;
    }

    try {
      const result = await login(email.trim(), password);
      
      if (result.success) {
        setError(null);
        setEmail('');
        setPassword('');
        navigate('/dashboard');
      } else {
        setError(result.error || "Authentication failed. Please try again.");
      }
    } catch (err) {
      console.error("Authentication error:", err);
      setError("Authentication failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const closeErrorPopup = () => {
    setError(null);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative"
      style={{
        backgroundImage: 'url(fishfarm.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div 
        className="absolute inset-0"
        style={{
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
        }}
      />
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md flex flex-col gap-4 relative z-10">
        <h1 className="text-2xl font-bold text-center text-gray-800">WELCOME TO</h1>
        <h3 className="text-lg text-center text-gray-600 mb-4">CLARIN FRESHWATER FISH FARM</h3>

        <div className="flex items-center border rounded-md px-3 py-2 bg-gray-50 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200 transition-all duration-200">
          <img src="./mail.svg" alt="Mail" className="w-5 h-5 mr-2" />
          <label htmlFor="email" className="sr-only">Email address</label>
          <input
            id="email"
            type="email"
            placeholder="Email address"
            className="flex-1 bg-transparent outline-none text-gray-700"
            value={email}
            onChange={(e) => setEmail(e.target.value.trim())}
            required
          />
        </div>

        <div className="flex items-center border rounded-md px-3 py-2 bg-gray-50 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200 transition-all duration-200">
          <img src="./lock.svg" alt="Lock" className="w-5 h-5 mr-2" />
          <label htmlFor="password" className="sr-only">Password</label>
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            className="flex-1 bg-transparent outline-none text-gray-700"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="ml-2 text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            {showPassword ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>

        <button
          type="submit"
          className="bg-blue-600 text-white py-2 rounded-md font-semibold hover:bg-blue-700 transition flex items-center justify-center"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center">
              <svg
                className="animate-spin h-5 w-5 mr-2 text-white"
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
              Loading...
            </div>
          ) : (
            'Sign In'
          )}
        </button>

        <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline text-center">Forgot password?</Link>

        <div className="flex items-center my-2">
          <div className="flex-grow h-px bg-gray-300" />
          <span className="px-2 text-gray-400 text-sm">or</span>
          <div className="flex-grow h-px bg-gray-300" />
        </div>

        <p className="text-center text-gray-500 text-sm">Sign in with</p>

        <div className="flex justify-center gap-4 mt-1">
          <GoogleLogin onError={setError} />
        </div>

        <p className="text-center text-gray-600 text-sm mt-4">
          Don't have an account?{' '}
          <Link to="/signup" className="text-blue-600 hover:underline">Sign up</Link>
        </p>

        {error && (
          <div className="absolute inset-0 flex items-center justify-center z-50">
            <div className="absolute inset-0 backdrop-blur-sm" />
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4 relative z-50">
              <h2 className="text-xl font-bold text-red-600 mb-4">Error</h2>
              <p className="text-gray-700 mb-6">{error}</p>
              <button
                onClick={closeErrorPopup}
                className="w-full bg-blue-600 text-white py-2 rounded-md font-semibold hover:bg-blue-700 transition">
                Close
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default Signin;
import React, { useState } from 'react'
import { Link } from 'react-router-dom'

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage(null)
    setError(null)

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setError('Please enter your email address.')
      return
    }

    setIsLoading(true)
    try {
      // TODO: Implement password reset with your backend
      console.log('Password reset request for:', trimmedEmail)
      setMessage('Password reset email sent. Please check your inbox.')
      setEmail('')
    } catch (err) {
      console.error('Password reset error:', err)
      setError('Failed to send reset email. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

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
        style={{ backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)' }}
      />
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md flex flex-col gap-4 relative z-10"
      >
        <h1 className="text-2xl font-bold text-center text-gray-800">Reset your password</h1>
        <p className="text-center text-gray-600 text-sm -mt-2">
          Enter the email associated with your account and we’ll send a reset link.
        </p>

        <div className="flex items-center border rounded-md px-3 py-2 bg-gray-50">
          <img src="./mail.svg" alt="Mail" className="w-5 h-5 mr-2" />
          <label htmlFor="email" className="sr-only">Email address</label>
          <input
            id="email"
            type="email"
            placeholder="Email address"
            className="flex-1 bg-transparent outline-none text-gray-700"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
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
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Sending...
            </div>
          ) : (
            'Send reset link'
          )}
        </button>

        {message && (
          <div className="text-green-600 text-sm text-center">{message}</div>
        )}
        {error && (
          <div className="text-red-600 text-sm text-center">{error}</div>
        )}

        <p className="text-center text-gray-600 text-sm mt-2">
          Remembered your password?{' '}
          <Link to="/signin" className="text-blue-600 hover:underline">Back to sign in</Link>
        </p>
      </form>
    </div>
  )
}

export default ForgotPassword
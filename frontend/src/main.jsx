import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider, useUser } from './contexts/UserContext';
import Signup from './components/Signup.jsx';
import Signin from './components/Signin.jsx';
import ForgotPassword from './components/Forgot_Password.jsx';
import Dashboard from './components/Dashboard.jsx';
import Transactions from './components/Transaction.jsx';
import AddTransaction from './components/Add_Transaction.jsx';
import Insights from './components/Insights.jsx';
import Settings from './components/Settings.jsx';
import UpdateUserInfo from './components/Update_User_Info.jsx';
import DeleteAccount from './components/Delete_Account.jsx';
import DeleteTransaction from './components/Delete_Transaction.jsx';
import UpdateTransaction from './components/Update_Transaction.jsx';
import Prediction from './components/Prediction.jsx';
import PredictionRecords from './components/Prediction_Records.jsx';
import './index.css';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useUser();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/signin" />;
};

const App = () => {
  return (
    <UserProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/signup" element={<Signup />} />
          <Route path="/signin" element={<Signin />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/transactions"
            element={
              <ProtectedRoute>
                <Transactions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/transactions/:id/update"
            element={
              <ProtectedRoute>
                <UpdateTransaction />
              </ProtectedRoute>
            }
          />
          <Route
            path="/transactions/:id/delete"
            element={
              <ProtectedRoute>
                <DeleteTransaction />
              </ProtectedRoute>
            }
          />
          <Route
            path="/add-transaction"
            element={
              <ProtectedRoute>
                <AddTransaction />
              </ProtectedRoute>
            }
          />
          <Route
            path="/insights"
            element={
              <ProtectedRoute>
                <Insights />
              </ProtectedRoute>
            }
          />
          <Route
            path="/prediction"
            element={
              <ProtectedRoute>
                <Prediction />
              </ProtectedRoute>
            }
          />
          <Route
            path="/prediction-records"
            element={
              <ProtectedRoute>
                <PredictionRecords />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/update-info"
            element={
              <ProtectedRoute>
                <UpdateUserInfo />
              </ProtectedRoute>
            }
          />
          <Route
            path="/delete-account"
            element={
              <ProtectedRoute>
                <DeleteAccount />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </BrowserRouter>
    </UserProvider>
  );
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
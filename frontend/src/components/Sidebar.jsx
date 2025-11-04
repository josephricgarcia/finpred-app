import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';

const IconHome = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
    <path d="M3 11l9-8 9 8"/>
    <path d="M9 22V12h6v10"/>
  </svg>
);

const IconTransactions = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
    <path d="M3 7h13"/>
    <path d="M10 3l4 4-4 4"/>
    <path d="M21 17H8"/>
    <path d="M14 21l-4-4 4-4"/>
  </svg>
);

const IconInsights = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
    <path d="M3 3v18h18"/>
    <path d="M7 15l4-4 3 3 4-5"/>
  </svg>
);

const IconOnline = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
    <circle cx="12" cy="12" r="9"/>
    <path d="M3 12h18"/>
    <path d="M12 3c3 3 3 15 0 18"/>
    <path d="M12 3c-3 3-3 15 0 18"/>
  </svg>
);

const IconPredictionRecords = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14,2 14,8 20,8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10,9 9,9 8,9"/>
  </svg>
);

const IconLogout = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <path d="M16 17l5-5-5-5"/>
    <path d="M21 12H9"/>
  </svg>
);


const NavItem = ({ to, label, icon, isActive }) => (
  <Link
    to={to}
    className={`flex items-center gap-3 py-2.5 px-3 rounded-lg border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white ${isActive ? 'bg-blue-800 text-white border-blue-700 ring-2 ring-white' : 'bg-blue-900 text-blue-100 border-blue-800 hover:bg-blue-800 hover:border-blue-700'}`}
    aria-current={isActive ? 'page' : undefined}
  >
    {icon}
    <span className="font-medium">{label}</span>
  </Link>
);

const Sidebar = () => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { userData, isLoading: isLoadingUserData, logout } = useUser();

  const handleLogout = async () => {
    try {
      setShowLogoutConfirm(false);
      await logout();
      navigate('/signin');
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  return (
    <div className="fixed top-0 left-0 h-screen w-64 bg-blue-900 text-white flex flex-col z-50">
      <div className="flex items-center gap-3 px-4 py-5 border-b border-blue-800">
        <img src="/logo.svg" alt="FINPRED Logo" className="w-10 h-10" />
        <div>
          
          <p className="text-lg font-semibold text-white leading-tight">FINPRED</p>
          <p className="text-sm text-blue-200 leading-tight">Clarin Freshwater Fish Farm</p>
        </div>
      </div>
      <nav className="flex flex-col justify-between px-4 flex-1 py-4">
        <div className="flex flex-col gap-2">
          <NavItem to="/dashboard" label="Dashboard" icon={<IconHome />} isActive={location.pathname === '/dashboard'} />
          <NavItem to="/transactions" label="Transactions" icon={<IconTransactions />} isActive={location.pathname === '/transactions'} />
          <NavItem to="/insights" label="Insights" icon={<IconInsights />} isActive={location.pathname === '/insights'} />
          <NavItem to="/prediction" label="Prediction" icon={<IconOnline />} isActive={location.pathname === '/prediction'} />
          <NavItem to="/prediction-records" label="Prediction Records" icon={<IconPredictionRecords />} isActive={location.pathname === '/prediction-records'} />
        </div>
      </nav>
      <div className="mt-auto px-4 pb-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-blue-700 flex items-center justify-center">
            <span className="text-sm font-semibold text-blue-100">
              {isLoadingUserData ? '...' : (userData?.username || 'U').charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <button
              onClick={() => navigate('/settings')}
              className="block text-left text-white font-medium leading-tight hover:underline w-full"
              aria-label="Go to settings"
            >
              {isLoadingUserData ? 'Loading...' : (userData?.username || 'User')}
            </button>
            <p className="text-sm text-blue-200 truncate">
              {isLoadingUserData ? 'Loading...' : (userData?.email || '—')}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-transparent border border-blue-500 text-white hover:bg-blue-800"
          aria-label="Sign out"
        >
          <IconLogout />
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowLogoutConfirm(false)}></div>
          <div className="relative bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-sm mx-4">
            <div className="p-5">
              <h3 className="text-lg font-semibold text-gray-900">Are you sure you want to logout?</h3>
              <p className="text-sm text-gray-600 mt-1">You will need to sign in again to continue.</p>
              <div className="mt-5 flex justify-end gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-lg"
                >
                  No
                </button>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg"
                >
                  Yes, Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';

// Utility function to format date from separate month, day, year fields
const formatDate = (month, day, year) => {
  if (!month || !day || !year) return 'N/A';
  
  const monthNames = {
    'January': 'Jan', 'February': 'Feb', 'March': 'Mar', 'April': 'Apr',
    'May': 'May', 'June': 'Jun', 'July': 'Jul', 'August': 'Aug',
    'September': 'Sep', 'October': 'Oct', 'November': 'Nov', 'December': 'Dec'
  };
  
  const shortMonth = monthNames[month] || month;
  return `${shortMonth} ${day}, ${year}`;
};

const DeleteTransaction = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [transaction, setTransaction] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        // TODO: Implement transaction loading from your backend
        console.log('Loading transaction:', id);
        setTransaction({ id, name: 'Sample Transaction', date: new Date() });
        setLoading(false);
      } catch (e) {
        setError(e.message);
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const confirmDelete = async () => {
    try {
      setLoading(true);
      // TODO: Implement transaction deletion with your backend
      console.log('Deleting transaction:', id);
      navigate('/transactions');
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-blue-50">
      <Sidebar />
      <div className="flex-1 p-8 ml-64 max-w-3xl">
        <h1 className="text-2xl font-semibold text-gray-900">Delete Transaction</h1>
        <p className="text-gray-600 mt-1 text-sm">Please review the details before confirming deletion.</p>

        <div className="bg-white rounded-lg shadow p-6 mt-6">
          {loading ? (
            <div className="flex items-center gap-3 text-gray-600">
              <svg className="w-5 h-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
              Processing...
            </div>
          ) : error ? (
            <div className="text-red-700 bg-red-50 border border-red-200 rounded-md px-4 py-3" role="alert" aria-live="assertive">{error}</div>
          ) : (
            <>
              <div className="flex items-start gap-3 p-4 rounded-md bg-red-50 border border-red-200">
                <div className="shrink-0 text-red-600">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                    <path d="M12 9v4" />
                    <path d="M12 17h.01" />
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-red-800 font-medium">This action is permanent. You cannot undo this deletion.</p>
                </div>
              </div>

              <div className="mt-4">
                <h2 className="text-sm font-semibold text-gray-900">Transaction Summary</h2>
                <div className="mt-2 bg-gray-50 rounded-md border border-gray-200 p-4 text-sm text-gray-700">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6">
                    <div className="grid grid-cols-[140px,1fr] items-center gap-2">
                      <span className="text-gray-500">Date</span>
                      <span className="font-medium text-gray-900">{formatDate(transaction?.month, transaction?.day, transaction?.year)}</span>
                    </div>
                    <div className="grid grid-cols-[140px,1fr] items-center gap-2">
                      <span className="text-gray-500">Name</span>
                      <span className="font-medium text-gray-900">{transaction?.name || 'N/A'}</span>
                    </div>
                    <div className="grid grid-cols-[140px,1fr] items-center gap-2">
                      <span className="text-gray-500">Gender</span>
                      <span className="font-medium text-gray-900 capitalize">{transaction?.gender || 'N/A'}</span>
                    </div>
                    <div className="grid grid-cols-[140px,1fr] items-center gap-2">
                      <span className="text-gray-500">Barangay</span>
                      <span className="font-medium text-gray-900">{transaction?.barangay || 'N/A'}</span>
                    </div>
                    <div className="grid grid-cols-[140px,1fr] items-center gap-2">
                      <span className="text-gray-500">Municipality</span>
                      <span className="font-medium text-gray-900">{transaction?.municipality || 'N/A'}</span>
                    </div>
                    <div className="grid grid-cols-[140px,1fr] items-center gap-2">
                      <span className="text-gray-500">Contact</span>
                      <span className="font-medium text-gray-900">{transaction?.contact || 'N/A'}</span>
                    </div>
                    <div className="grid grid-cols-[140px,1fr] items-center gap-2">
                      <span className="text-gray-500">Species</span>
                      <span className="font-medium text-gray-900">{transaction?.species || 'N/A'}</span>
                    </div>
                    <div className="grid grid-cols-[140px,1fr] items-center gap-2">
                      <span className="text-gray-500">Quantity</span>
                      <span className="font-medium text-gray-900">{transaction?.quantity ?? 'N/A'}</span>
                    </div>
                    <div className="grid grid-cols-[140px,1fr] items-center gap-2">
                      <span className="text-gray-500">Cost</span>
                      <span className="font-medium text-gray-900">{typeof transaction?.cost === 'number' ? `₱${transaction.cost.toFixed(2)}` : (transaction?.cost || 'N/A')}</span>
                    </div>
                    <div className="grid grid-cols-[140px,1fr] items-center gap-2">
                      <span className="text-gray-500">Type</span>
                      <span className="font-medium text-gray-900 capitalize">{transaction?.type || 'N/A'}</span>
                    </div>
                    <div className="grid grid-cols-[140px,1fr] items-center gap-2">
                      <span className="text-gray-500">Experience</span>
                      <span className="font-medium text-gray-900 capitalize">{transaction?.experience || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row sm:justify-end gap-2">
                <button onClick={() => navigate('/transactions')} className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition">Cancel</button>
                <button onClick={confirmDelete} className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition inline-flex items-center gap-2" disabled={loading}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path d="M3 6h18"/>
                    <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                    <path d="M10 11v6"/>
                    <path d="M14 11v6"/>
                  </svg>
                  Delete Transaction
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeleteTransaction;

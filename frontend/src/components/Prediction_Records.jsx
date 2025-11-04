import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar.jsx';
import { useUser } from '../contexts/UserContext';
import supabase from '../helper/supabaseClient';

const Card = ({ title, children, footer }) => (
  <div className="bg-white border border-gray-200 rounded-xl">
    <div className="px-6 py-4 border-b border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
    </div>
    <div className="p-6">
      {children}
    </div>
    {footer ? <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">{footer}</div> : null}
  </div>
);

const toTitleCase = (str) => {
  if (!str) return str;
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const formatMonth = (month) => {
  if (!month) return month;
  const parts = month.split('-');
  if (parts.length === 2) {
    return `${parts[1]}-${parts[0]}`;
  }
  return month;
};

const PredictionRecords = () => {
  const { userData } = useUser();
  const [predictionHistory, setPredictionHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSpecies, setFilterSpecies] = useState('');
  const [filterMunicipality, setFilterMunicipality] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, municipality, species

  // Load prediction history from Supabase on component mount
  useEffect(() => {
    const fetchHistory = async () => {
      if (!userData?.uid) return;
      const { data, error } = await supabase
        .from('prediction_records')
        .select('*')
        .eq('userId', userData.uid)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching prediction history:', error);
      } else {
        setPredictionHistory(data || []);
        setFilteredHistory(data || []);
      }
    };
    fetchHistory();
  }, [userData]);

  // Filter and sort predictions
  useEffect(() => {
    let filtered = [...predictionHistory];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(prediction => 
        prediction.municipality.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prediction.species.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prediction.month.includes(searchTerm)
      );
    }

    // Apply species filter
    if (filterSpecies) {
      filtered = filtered.filter(prediction => prediction.species === filterSpecies);
    }

    // Apply municipality filter
    if (filterMunicipality) {
      filtered = filtered.filter(prediction => prediction.municipality === filterMunicipality);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at) - new Date(a.created_at);
        case 'oldest':
          return new Date(a.created_at) - new Date(b.created_at);
        case 'municipality':
          return a.municipality.localeCompare(b.municipality);
        case 'species':
          return a.species.localeCompare(b.species);
        case 'cost':
          return b.cost - a.cost;
        case 'quantity':
          return b.predicted_quantity - a.predicted_quantity;
        default:
          return 0;
      }
    });

    setFilteredHistory(filtered);
  }, [predictionHistory, searchTerm, filterSpecies, filterMunicipality, sortBy]);

  const deletePrediction = async (id) => {
    try {
      const { error } = await supabase
        .from('prediction_records')
        .delete()
        .eq('id', id);
      if (error) {
        console.error('Error deleting prediction:', error);
        alert(`Error deleting prediction: ${error.message || 'Database error'}`);
      } else {
        setPredictionHistory(prev => prev.filter(p => p.id !== id));
      }
    } catch (err) {
      console.error('Error deleting prediction:', err);
      alert('Failed to delete prediction. Please try again.');
    }
  };

  const clearAllPredictions = async () => {
    if (window.confirm('Are you sure you want to delete all prediction records? This action cannot be undone.')) {
      try {
        const { error } = await supabase
          .from('prediction_records')
          .delete()
          .eq('userId', userData.uid);
        if (error) {
          console.error('Error clearing predictions:', error);
          alert(`Error clearing predictions: ${error.message || 'Database error'}`);
        } else {
          setPredictionHistory([]);
          setFilteredHistory([]);
        }
      } catch (err) {
        console.error('Error clearing predictions:', err);
        alert('Failed to clear predictions. Please try again.');
      }
    }
  };

  // Get unique values for filter dropdowns
  const uniqueSpecies = [...new Set(predictionHistory.map(p => p.species).filter(Boolean))];
  const uniqueMunicipalities = [...new Set(predictionHistory.map(p => p.municipality).filter(Boolean))];

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const formatCurrency = (amount) => {
    const num = Number(amount);
    if (isNaN(num)) return '₱0';
    return num.toLocaleString(undefined, { 
      style: 'currency', 
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  return (
    <div className="flex min-h-screen bg-blue-50">
      <Sidebar />
      <div className="flex-1 p-8 ml-64">
        <div className="max-w-10xl mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900">Prediction Records</h1>
              <p className="text-gray-600 mt-1">View and manage your saved predictions</p>
            </div>
            {predictionHistory.length > 0 && (
              <button
                onClick={clearAllPredictions}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:outline-none transition-colors font-medium"
              >
                Clear All Records
              </button>
            )}
          </div>

          {predictionHistory.length === 0 ? (
            <div className="mt-8">
              <Card title="No Prediction Records">
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No predictions saved yet</h3>
                  <p className="text-gray-500 mb-4">Start by creating predictions in the Prediction page</p>
                  <a
                    href="/prediction"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors font-medium"
                  >
                    Go to Prediction Page
                  </a>
                </div>
              </Card>
            </div>
          ) : (
            <>


              {/* Prediction Records */}
              <div className="mt-6 space-y-6">
                {filteredHistory.length === 0 ? (
                  <Card title="No Matching Records">
                    <div className="text-center py-8">
                      <p className="text-gray-500">No prediction records match your current filters.</p>
                      <p className="text-sm text-gray-400 mt-1">Try adjusting your search criteria.</p>
                    </div>
                  </Card>
                ) : (
                  filteredHistory.map((prediction) => (
                    <Card key={prediction.id} title={`${toTitleCase(prediction.municipality)} - ${formatMonth(prediction.month)}`}>
                      <div className="space-y-4">
                        {/* Header with timestamp and delete button */}
                        <div className="flex justify-between items-start">
                          <div className="text-sm text-gray-600">
                            Created: {formatDate(prediction.created_at)}
                          </div>
                          <button
                            onClick={() => deletePrediction(prediction.id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                          >
                            Delete Record
                          </button>
                        </div>

                        {/* Prediction Details Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Species</p>
                            <p className="font-semibold text-gray-900">{prediction.species || 'All'}</p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Transaction Type</p>
                            <p className="font-semibold text-gray-900">
                              {prediction.transaction_type === 0 ? 'Sale' : 
                               prediction.transaction_type === 1 ? 'Dispersal' : 'N/A'}
                            </p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Cost</p>
                            <p className="font-semibold text-gray-900">{formatCurrency(prediction.cost || 0)}</p>
                          </div>
                          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                            <p className="text-xs text-blue-600 uppercase tracking-wide">Projected Quantity</p>
                            <p className="font-semibold text-blue-900">{parseFloat(prediction.predicted_quantity || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                          </div>
                        </div>

                        {/* Forecast Table */}
                        {prediction.forecast && prediction.forecast.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900 mb-3">Demand Forecast</h4>
                            <div className="overflow-x-auto">
                              <table className="min-w-full text-left text-sm">
                                <thead className="text-xs text-gray-500 bg-gray-50">
                                  <tr>
                                    <th className="px-4 py-3 font-medium">Fish Type</th>
                                    <th className="px-4 py-3 font-medium">Expected Transactions</th>
                                    <th className="px-4 py-3 font-medium">Expected Quantity (kg)</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-gray-700">
                                  {prediction.forecast.map((row) => (
                                    <tr key={row.key} className="hover:bg-gray-50">
                                      <td className="px-4 py-3 font-medium">{row.label}</td>
                                      <td className="px-4 py-3">{row.expectedTransactions.toLocaleString()}</td>
                                      <td className="px-4 py-3">{row.expectedQuantityKg.toLocaleString()}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PredictionRecords;
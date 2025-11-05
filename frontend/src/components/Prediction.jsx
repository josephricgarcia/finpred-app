import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar.jsx';
import { useUser } from '../contexts/UserContext';
import supabase from '../helper/supabaseClient';

const Field = ({ label, children }) => (
  <div className="flex flex-col gap-2">
    <label className="text-sm font-semibold text-gray-800">{label}</label>
    {children}
  </div>
);

const Card = ({ title, children, footer, header }) => (
  <div className="bg-white border border-gray-200 rounded-xl">
    <div className="px-6 py-4 border-b border-gray-200">
      {header || <h2 className="text-lg font-semibold text-gray-900">{title}</h2>}
    </div>
    <div className="p-6">
      {children}
    </div>
    {footer ? <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">{footer}</div> : null}
  </div>
);

const MUNICIPALITY_MAP = {
  'alburquerque': 1,
  'alicia': 2,
  'antequera': 3,
  'baclayon': 4,
  'balilihan': 5,
  'batuan': 6,
  'bien unido': 7,
  'bilar': 8,
  'buenavista': 9,
  'calape': 10,
  'candijay': 11,
  'carmen': 12,
  'catigbian': 13,
  'clarin': 14,
  'corella': 15,
  'cortes': 16,
  'dagohoy': 17,
  'danao': 18,
  'dauis': 19,
  'dimiao': 20,
  'duero': 21,
  'garcia hernandez': 22,
  'getafe': 23,
  'guindulman': 24,
  'inabanga': 25,
  'jagna': 26,
  'lila': 27,
  'loon': 28,
  'mabini': 29,
  'maribojoc': 30,
  'panglao': 31,
  'pilar': 32,
  'president carlos p. garcia': 33,
  'sagbayan': 34,
  'san isidro': 35,
  'san miguel': 36,
  'sevilla': 37,
  'sierra bullones': 38,
  'sikatuna': 39,
  'tagbilaran': 40,
  'talibon': 41,
  'trinidad': 42,
  'tubigon': 43,
  'ubay': 44,
  'valencia': 45,
};

const toTitleCase = (str) => {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const Prediction = () => {
  const { userData, isAuthenticated } = useUser();
  const [month, setMonth] = useState('');
  const [species, setSpecies] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [transactionType, setTransactionType] = useState('');
  const [cost, setCost] = useState('');
  const [predictionHistory, setPredictionHistory] = useState([]);
  const [predictedQuantity, setPredictedQuantity] = useState(null);
  const [loading, setLoading] = useState(false);

  const currentMonth = new Date().toISOString().slice(0, 7);

useEffect(() => {
  const fetchHistory = async () => {
    if (!isAuthenticated || !userData?.uid) return;
    const { data, error } = await supabase
      .from('prediction_records')
      .select('*')
      .eq('userId', userData.uid)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching prediction history:', error);
    } else {
      setPredictionHistory(data || []);
    }
  };
  fetchHistory();
}, [isAuthenticated, userData]);


  const generatePrediction = async () => {
    if (!month || !municipality || !cost || !species || !transactionType) {
      alert("Please fill all required fields.");
      return;
    }

    if (transactionType === '0' && parseFloat(cost) === 0) {
      alert("Cost must be greater than 0 for Sale transactions.");
      return;
    }

    if (!isAuthenticated || !userData?.uid) {
      alert("You must log in first.");
      return;
    }


    const monthNum = parseInt(month.split("-")[1]);
    const yearNum = parseInt(month.split("-")[0]);
    const speciesMap = { 'Tilapia': 1, 'Koi Carp': 2, 'Common Carp': 3, 'Hito': 4 };

    const payload = {
      Month: monthNum,
      Year: yearNum,
      Municipality: MUNICIPALITY_MAP[municipality],
      Transaction_Type: parseInt(transactionType),
      Cost: parseFloat(cost),
      Species: speciesMap[species]
    };

    const res = await fetch('/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    let result;
    try {
      result = await res.json();
    } catch {
      throw new Error('Server returned invalid JSON');
    }

    if (!res.ok) throw new Error(result?.error || 'Prediction failed');

    try {
      setLoading(true);
      const res = await fetch('/api/predict', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      let result;
      try {
        result = await res.json();
      } catch {
        throw new Error('Server returned invalid JSON');
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Server error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      
      if (!data.predicted_quantity && data.predicted_quantity !== 0) {
        throw new Error('Invalid prediction response from server');
      }

      setPredictedQuantity(data.predicted_quantity);

      const newPrediction = {
        userId: userData.uid,
        month,
        municipality: toTitleCase(municipality),
        species,
        transaction_type: parseInt(transactionType),
        cost: parseFloat(cost),
        predicted_quantity: data.predicted_quantity,
      };

      const { data: inserted, error: insertError } = await supabase
        .from('prediction_records')
        .insert(newPrediction)
        .select('*')
        .single();

      if (insertError) {
        console.error('Error inserting prediction:', insertError);
        alert(`Error saving prediction: ${insertError.message || 'Database error'}`);
        return;
      }

      setPredictionHistory(prev => [inserted, ...prev]);
      setMonth('');
      setSpecies('');
      setMunicipality('');
      setTransactionType('');
      setCost('');
    } catch (error) {
      console.error("Prediction error:", error);
      alert(`Error: ${error.message || 'Failed to generate prediction. Please try again.'}`);
      setPredictedQuantity(null);
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="flex min-h-screen bg-blue-50">
      <Sidebar />
      <div className="flex-1 p-8 ml-64">
        <div className="max-w-10xl mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900">Prediction</h1>
              <p className="text-gray-600 mt-1">Estimate quantity based on inputs using the trained model</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <div className="lg:col-span-1">
              <Card title="Inputs">
                <div className="flex flex-col gap-4">
                <Field label="Target Month">
                  <input
                    type="month"
                    min="2019-01"
                    className="w-full px-3 py-2 rounded-lg border-2 border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none hover:border-gray-400 transition-colors"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                  />
                </Field>
                  <Field label="Species">
                    <select
                      className="w-full px-3 py-2 rounded-lg border-2 border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none hover:border-gray-400 transition-colors cursor-pointer"
                      value={species}
                      onChange={(e) => setSpecies(e.target.value)}
                    >
                      <option value="">Select species...</option>
                      <option value="Tilapia">Tilapia</option>
                      <option value="Koi Carp">Koi Carp</option>
                      <option value="Common Carp">Common Carp</option>
                      <option value="Hito">Hito</option>
                    </select>
                  </Field>

                  <Field label="Municipality">
                    <select
                      className="w-full px-3 py-2 rounded-lg border-2 border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none cursor-pointer"
                      value={municipality}
                      onChange={(e) => setMunicipality(e.target.value)}
                    >
                      <option value="">Select municipality...</option>

                      {/* Use keys from MUNICIPALITY_MAP so values match the map (lowercase keys) */}
                      {Object.keys(MUNICIPALITY_MAP).map((key) => (
                        <option key={key} value={key}>
                          {toTitleCase(key)}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Transaction Type">
                    <select
                      className="w-full px-3 py-2 rounded-lg border-2 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none cursor-pointer"
                      value={transactionType}
                      onChange={(e) => {
                        setTransactionType(e.target.value);
                        if (e.target.value === 'Dispersal') setCost('0');
                      }}
                    >
                      <option value="">Select type...</option>
                      <option value="Dispersal">Dispersal</option>
                      <option value="Sale">Sale</option>
                    </select>
                  </Field>

                  <Field label="Cost">
                    <input
                      type="number"
                      min={transactionType === '0' ? '1' : '0'}
                      step="0.01"
                      className="w-full px-3 py-2 rounded-lg border-2 border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none hover:border-gray-400 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                      value={cost}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (transactionType === '0' && value === '0') {
                          return; // Don't update if sale type and value is 0
                        }
                        setCost(value);
                      }}
                      placeholder="e.g. 120"
                      disabled={transactionType === '1'}
                    />
                  </Field>
                  <button
                    onClick={generatePrediction}
                    disabled={loading}
                    className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Generating...' : 'Generate Prediction'}
                  </button>
                </div>
              </Card>
            </div>

            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Predicted Quantity">
                  <div className="flex flex-col gap-2">
                    <p className="text-4xl font-semibold text-gray-900">
                      {predictedQuantity !== null 
                        ? predictedQuantity.toLocaleString(undefined, { maximumFractionDigits: 0 })
                        : 'N/A'
                      }
                    </p>
                    <p className="text-sm text-gray-600">
                      {predictedQuantity !== null 
                        ? `Predicted by trained model`
                        : `Enter values and generate prediction`
                      }
                    </p>
                  </div>
                </Card>
              </div>

              <div className="mt-6">
                  <Card 
                    title="Prediction History"
                    header={
                      <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-900">Prediction History</h2>
                        {predictionHistory.length > 0 && (
                          <p className="text-sm text-gray-600">
                            {new Date(predictionHistory[0].created_at).toLocaleDateString()} at {new Date(predictionHistory[0].created_at).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    }
                  >
                    {predictionHistory.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No predictions saved yet.</p>
                        <p className="text-sm text-gray-400 mt-1">Generate a prediction to start tracking history.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-end items-start mb-3">
                            <button
                              onClick={() => deletePrediction(predictionHistory[0].id)}
                              className="text-red-600 hover:text-red-800 text-sm font-medium"
                            >
                              Delete
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-600">Target Municipality</p>
                              <p className="font-medium">{predictionHistory[0].municipality}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Target Date</p>
                              <p className="font-medium">
                                {predictionHistory[0].month 
                                  ? (() => {
                                      const parts = predictionHistory[0].month.split('-');
                                      return `${parts[1]}-${parts[0]}`;
                                    })()
                                  : predictionHistory[0].month
                                }
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Species</p>
                              <p className="font-medium">{predictionHistory[0].species}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Transaction Type</p>
                              <p className="font-medium">{predictionHistory[0].transaction_type === 0 ? 'Sale' : 'Dispersal'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Cost</p>
                              <p className="font-medium">{predictionHistory[0].cost.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Predicted Quantity</p>
                              <p className="font-medium">{predictionHistory[0].predicted_quantity.toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Prediction;

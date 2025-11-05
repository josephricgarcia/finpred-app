// Prediction.jsx
import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar.jsx';
import { useUser } from '../contexts/UserContext';
import supabase from '../helper/supabaseClient';

// --------------------------------------------------------------
// Utility functions
// --------------------------------------------------------------
const monthName = (num) => [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
][num];

const toTitleCase = (str) =>
  str
    .toLowerCase()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

const Field = ({ label, children }) => (
  <div className="flex flex-col gap-2">
    <label className="text-sm font-semibold text-gray-800">{label}</label>
    {children}
  </div>
);

const Card = ({ title, children, footer, header }) => (
  <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
      {header || <h2 className="text-lg font-semibold text-gray-900">{title}</h2>}
    </div>
    <div className="p-6">{children}</div>
    {footer ? (
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">{footer}</div>
    ) : null}
  </div>
);

// --------------------------------------------------------------
// Main Component
// --------------------------------------------------------------
const Prediction = () => {
  const { userData, isAuthenticated } = useUser();

  // ---------- Form states ----------
  const [monthPicker, setMonthPicker] = useState('');
  const [species, setSpecies] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [transactionType, setTransactionType] = useState('');
  const [cost, setCost] = useState('');
  const [predictedQuantity, setPredictedQuantity] = useState(null);
  const [loading, setLoading] = useState(false);

  // ---------- History state ----------
  const [predictionHistory, setPredictionHistory] = useState([]);

  // --------------------------------------------------------------
  // Load user prediction history
  // --------------------------------------------------------------
  useEffect(() => {
    const fetchHistory = async () => {
      if (!isAuthenticated || !userData?.uid) return;

      const { data, error } = await supabase
        .from('prediction_records')
        .select('*')
        .eq('userId', userData.uid)
        .order('created_at', { ascending: false });

      if (error) console.error('Error fetching history:', error);
      else setPredictionHistory(data || []);
    };

    fetchHistory();
  }, [isAuthenticated, userData]);

  // --------------------------------------------------------------
  // Generate prediction using Flask API
  // --------------------------------------------------------------
  const generatePrediction = async () => {
    if (!monthPicker || !municipality || !species || !transactionType || cost === '') {
      alert('⚠️ Please fill all required fields.');
      return;
    }

    const [year, monthStr] = monthPicker.split('-');
    const monthNum = parseInt(monthStr, 10);
    const monthNameStr = monthName(monthNum);

    const payload = {
      Month: monthNameStr,
      Year: parseInt(year, 10),
      Municipality: municipality.trim(),
      "Transaction Type": transactionType.trim(),
      Cost: transactionType === 'Dispersal' ? 0 : parseFloat(cost),
      Species: species.trim(),
    };

    try {
      setLoading(true);

      // --- Send request to Flask backend ---
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Prediction request failed');

      // --- Display predicted value ---
      setPredictedQuantity(result.predicted_quantity);

      // --- Save prediction record to Supabase ---
      const { data: inserted, error: insertError } = await supabase
        .from('prediction_records')
        .insert({
          userId: userData.uid,
          month: monthPicker,
          municipality: toTitleCase(municipality),
          species,
          transaction_type: transactionType,
          cost: payload.Cost,
          predicted_quantity: result.predicted_quantity,
        })
        .select('*')
        .single();

      if (insertError) throw insertError;

      // --- Update local history ---
      setPredictionHistory((prev) => [inserted, ...prev]);
      resetForm();
    } catch (err) {
      console.error(err);
      alert(`❌ Error: ${err.message}`);
      setPredictedQuantity(null);
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------
  // Delete prediction from Supabase
  // --------------------------------------------------------------
  const deletePrediction = async (id) => {
    const { error } = await supabase.from('prediction_records').delete().eq('id', id);
    if (error) {
      alert('Failed to delete prediction.');
    } else {
      setPredictionHistory((prev) => prev.filter((rec) => rec.id !== id));
    }
  };

  // --------------------------------------------------------------
  // Reset form
  // --------------------------------------------------------------
  const resetForm = () => {
    setMonthPicker('');
    setSpecies('');
    setMunicipality('');
    setTransactionType('');
    setCost('');
  };

  // --------------------------------------------------------------
  // UI
  // --------------------------------------------------------------
  return (
    <div className="flex min-h-screen bg-blue-50">
      <Sidebar />
      <div className="flex-1 p-8 ml-64">
        <div className="max-w-10xl mx-auto">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900">Prediction</h1>
              <p className="text-gray-600 mt-1">Estimate fish quantity using the trained Random Forest model</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            {/* Input Card */}
            <div className="lg:col-span-1">
              <Card title="Prediction Inputs">
                <div className="flex flex-col gap-4">
                  {/* Month */}
                  <Field label="Target Month">
                    <input
                      type="month"
                      min="2019-01"
                      max="2025-12"
                      className="w-full px-3 py-2 rounded-lg border-2 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                      value={monthPicker}
                      onChange={(e) => setMonthPicker(e.target.value)}
                    />
                  </Field>

                  {/* Species */}
                  <Field label="Species">
                    <select
                      className="w-full px-3 py-2 rounded-lg border-2 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none cursor-pointer"
                      value={species}
                      onChange={(e) => setSpecies(e.target.value)}
                    >
                      <option value="">Select species...</option>
                      {['Tilapia', 'Koi Carp', 'Common Carp', 'Hito'].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </Field>

                  {/* Municipality */}
                  <Field label="Municipality">
                    <input
                      type="text"
                      list="municipality-options"
                      className="w-full px-3 py-2 rounded-lg border-2 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                      value={municipality}
                      onChange={(e) => setMunicipality(e.target.value)}
                      placeholder="e.g. Balilihan"
                    />
                    <datalist id="municipality-options">
                      {[
                        'Alburquerque', 'Alicia', 'Antequera', 'Baclayon', 'Balilihan', 'Batuan', 'Bien Unido', 'Bilar',
                        'Buenavista', 'Calape', 'Candijay', 'Carmen', 'Catigbian', 'Clarin', 'Corella', 'Cortes', 'Dagohoy',
                        'Danao', 'Dauis', 'Dimiao', 'Duero', 'Garcia Hernandez', 'Getafe', 'Guindulman', 'Inabanga',
                        'Jagna', 'Lila', 'Loon', 'Mabini', 'Maribojoc', 'Panglao', 'Pilar', 'Pres. Carlos P. Garcia',
                        'Sagbayan', 'San Isidro', 'San Miguel', 'Sevilla', 'Sierra Bullones', 'Sikatuna', 'Tagbilaran',
                        'Talibon', 'Trinidad', 'Tubigon', 'Ubay', 'Valencia'
                      ].map((m) => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
                  </Field>

                  {/* Transaction Type */}
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
                      <option value="Sale">Sale</option>
                      <option value="Dispersal">Dispersal</option>
                    </select>
                  </Field>

                  {/* Cost */}
                  <Field label="Cost (₱)">
                    <input
                      type="number"
                      min={transactionType === 'Sale' ? '0.01' : '0'}
                      step="0.01"
                      className="w-full px-3 py-2 rounded-lg border-2 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                      disabled={transactionType === 'Dispersal'}
                      placeholder={transactionType === 'Dispersal' ? '0 (Fixed)' : 'e.g. 120'}
                    />
                  </Field>

                  <button
                    onClick={generatePrediction}
                    disabled={loading}
                    className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {loading ? 'Generating...' : 'Generate Prediction'}
                  </button>
                </div>
              </Card>
            </div>

            {/* Results & History */}
            <div className="lg:col-span-2 space-y-6">
              {/* Result */}
              <Card title="Predicted Quantity">
                <div className="flex flex-col gap-2 items-center text-center">
                  <p className="text-5xl font-bold text-gray-900">
                    {predictedQuantity !== null ? predictedQuantity.toLocaleString() : 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {predictedQuantity !== null
                      ? 'Predicted by trained Random Forest model'
                      : 'Enter inputs and click Generate Prediction'}
                  </p>
                </div>
              </Card>

              {/* History */}
              <Card
                title="Prediction History"
                header={
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-900">Prediction History</h2>
                    {predictionHistory.length > 0 && (
                      <p className="text-sm text-gray-600">
                        Last updated:{" "}
                        {new Date(predictionHistory[0].created_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                }
              >
                {predictionHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No predictions saved yet.</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Generate a prediction to start tracking your records.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {predictionHistory.slice(0, 5).map((rec) => (
                      <div key={rec.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-end mb-2">
                          <button
                            onClick={() => deletePrediction(rec.id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Delete
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Municipality</p>
                            <p className="font-medium">{rec.municipality}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Date</p>
                            <p className="font-medium">
                              {(() => {
                                const [y, m] = rec.month.split('-');
                                return `${monthName(parseInt(m))} ${y}`;
                              })()}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Species</p>
                            <p className="font-medium">{rec.species}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Type</p>
                            <p className="font-medium">{rec.transaction_type}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Cost</p>
                            <p className="font-medium">₱{Number(rec.cost).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Predicted Quantity</p>
                            <p className="font-medium">{rec.predicted_quantity.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Prediction;

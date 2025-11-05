// Prediction.jsx
import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar.jsx';
import { useUser } from '../contexts/UserContext';
import supabase from '../helper/supabaseClient';

// Utility: convert 1–12 to month name
const monthName = (num) => [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
][num];

// Utility: capitalize words
const toTitleCase = (str) =>
  str.toLowerCase().split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

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
    <div className="p-6">{children}</div>
    {footer ? <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">{footer}</div> : null}
  </div>
);

const Prediction = () => {
  const { userData, isAuthenticated } = useUser();

  const [monthPicker, setMonthPicker] = useState('');
  const [species, setSpecies] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [transactionType, setTransactionType] = useState('');
  const [cost, setCost] = useState('');
  const [predictionHistory, setPredictionHistory] = useState([]);
  const [predictedQuantity, setPredictedQuantity] = useState(null);
  const [loading, setLoading] = useState(false);

  // --- Fetch prediction history ---
  useEffect(() => {
    const fetchHistory = async () => {
      if (!isAuthenticated || !userData?.uid) return;
      const { data, error } = await supabase
        .from('prediction_records')
        .select('*')
        .eq('userId', userData.uid)
        .order('created_at', { ascending: false });
      if (!error) setPredictionHistory(data || []);
    };
    fetchHistory();
  }, [isAuthenticated, userData]);

  // --- Generate Prediction ---
  const generatePrediction = async () => {
    if (!monthPicker || !municipality || !species || !transactionType || cost === '') {
      alert('Please fill all required fields.');
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
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Prediction failed');

      setPredictedQuantity(result.predicted_quantity);

      // Save to Supabase
      const { data: inserted, error: insErr } = await supabase
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

      if (insErr) throw insErr;

      setPredictionHistory((prev) => [inserted, ...prev]);
      resetForm();
    } catch (err) {
      console.error(err);
      alert(`Error: ${err.message}`);
      setPredictedQuantity(null);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setMonthPicker('');
    setSpecies('');
    setMunicipality('');
    setTransactionType('');
    setCost('');
  };

  const deletePrediction = async (id) => {
    const { error } = await supabase.from('prediction_records').delete().eq('id', id);
    if (!error) {
      setPredictionHistory((p) => p.filter((x) => x.id !== id));
    }
  };

  // --- UI ---
  return (
    <div className="flex min-h-screen bg-blue-50">
      <Sidebar />
      <div className="flex-1 p-8 ml-64">
        <div className="max-w-10xl mx-auto">
          <h1 className="text-3xl font-semibold text-gray-900">Prediction</h1>
          <p className="text-gray-600 mt-1">Estimate quantity using the trained model</p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            {/* Input Card */}
            <div className="lg:col-span-1">
              <Card title="Inputs">
                <div className="flex flex-col gap-4">
                  <Field label="Target Month">
                    <input
                      type="month"
                      min="2019-01"
                      className="w-full px-3 py-2 rounded-lg border-2 border-gray-300"
                      value={monthPicker}
                      onChange={(e) => setMonthPicker(e.target.value)}
                    />
                  </Field>

                  <Field label="Species">
                    <select
                      className="w-full px-3 py-2 rounded-lg border-2 border-gray-300"
                      value={species}
                      onChange={(e) => setSpecies(e.target.value)}
                    >
                      <option value="">Select species...</option>
                      {['Tilapia', 'Koi Carp', 'Common Carp', 'Hito'].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Municipality">
                    <input
                      type="text"
                      className="w-full px-3 py-2 rounded-lg border-2 border-gray-300"
                      value={municipality}
                      onChange={(e) => setMunicipality(e.target.value)}
                      placeholder="e.g. Balilihan"
                    />
                  </Field>

                  <Field label="Transaction Type">
                    <select
                      className="w-full px-3 py-2 rounded-lg border-2 border-gray-300"
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

                  <Field label="Cost">
                    <input
                      type="number"
                      className="w-full px-3 py-2 rounded-lg border-2 border-gray-300"
                      min={transactionType === 'Sale' ? '0.01' : '0'}
                      step="0.01"
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                      disabled={transactionType === 'Dispersal'}
                    />
                  </Field>

                  <button
                    onClick={generatePrediction}
                    disabled={loading}
                    className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Generating...' : 'Generate Prediction'}
                  </button>
                </div>
              </Card>
            </div>

            {/* Results + History */}
            <div className="lg:col-span-2">
              <Card title="Predicted Quantity">
                <p className="text-4xl font-semibold text-gray-900">
                  {predictedQuantity !== null ? predictedQuantity.toLocaleString() : 'N/A'}
                </p>
                <p className="text-sm text-gray-600">
                  {predictedQuantity !== null
                    ? 'Predicted by trained model'
                    : 'Enter inputs and generate prediction'}
                </p>
              </Card>

              <div className="mt-6">
                <Card title="Prediction History">
                  {predictionHistory.length === 0 ? (
                    <p className="text-gray-500 text-center">No predictions yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {predictionHistory.map((rec) => (
                        <div key={rec.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between mb-2">
                            <p className="font-semibold">{rec.municipality}</p>
                            <button
                              onClick={() => deletePrediction(rec.id)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Delete
                            </button>
                          </div>
                          <p className="text-sm text-gray-600">
                            {rec.month} | {rec.species} | {rec.transaction_type} | ₱{rec.cost}
                          </p>
                          <p className="text-lg font-semibold mt-1">
                            Predicted: {rec.predicted_quantity.toLocaleString()}
                          </p>
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
    </div>
  );
};

export default Prediction;

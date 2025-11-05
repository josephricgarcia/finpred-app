// Prediction.jsx
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
    <div className="p-6">{children}</div>
    {footer ? <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">{footer}</div> : null}
  </div>
);

const toTitleCase = (str) =>
  str
    .toLowerCase()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

const monthName = (num) => {
  const names = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return names[num];
};

const Prediction = () => {
  const { userData, isAuthenticated } = useUser();

  // ---------- Form state ----------
  const [monthPicker, setMonthPicker] = useState(''); // "YYYY-MM"
  const [species, setSpecies] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [transactionType, setTransactionType] = useState('');
  const [cost, setCost] = useState('');
  const [predictionHistory, setPredictionHistory] = useState([]);
  const [predictedQuantity, setPredictedQuantity] = useState(null);
  const [loading, setLoading] = useState(false);

  // ---------- Load history ----------
  useEffect(() => {
    const fetchHistory = async () => {
      if (!isAuthenticated || !userData?.uid) return;
      const { data, error } = await supabase
        .from('prediction_records')
        .select('*')
        .eq('userId', userData.uid)
        .order('created_at', { ascending: false });
      if (error) console.error('History error:', error);
      else setPredictionHistory(data || []);
    };
    fetchHistory();
  }, [isAuthenticated, userData]);

  // ---------- Prediction ----------
  const generatePrediction = async () => {
    if (!monthPicker || !municipality || !species || !transactionType || cost === '') {
      alert('Please fill all required fields.');
      return;
    }

    const [year, monthStr] = monthPicker.split('-');
    const monthNum = parseInt(monthStr, 10);
    const monthNameStr = monthName(monthNum); // e.g. "April"

    const payload = {
      Month: monthNameStr,               // <-- backend now understands month name
      Year: parseInt(year, 10),
      Municipality: municipality.trim(),
      Transaction_Type: transactionType.trim(),
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

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || `Server ${res.status}`);
      }

      const { predicted_quantity } = await res.json();
      setPredictedQuantity(predicted_quantity);

      // ---- Save to Supabase ----
      const newRec = {
        userId: userData.uid,
        month: monthPicker, // keep YYYY-MM for UI
        municipality: toTitleCase(municipality),
        species,
        transaction_type: transactionType,
        cost: payload.Cost,
        predicted_quantity,
      };

      const { data: inserted, error: insErr } = await supabase
        .from('prediction_records')
        .insert(newRec)
        .select('*')
        .single();

      if (insErr) throw insErr;

      setPredictionHistory((prev) => [inserted, ...prev]);
      resetForm();
    } catch (e) {
      console.error(e);
      alert(`Error: ${e.message}`);
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
    if (error) {
      alert('Delete failed');
    } else {
      setPredictionHistory((p) => p.filter((x) => x.id !== id));
    }
  };

  // --------------------------------------------------------------
  return (
    <div className="flex min-h-screen bg-blue-50">
      <Sidebar />
      <div className="flex-1 p-8 ml-64">
        <div className="max-w-10xl mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900">Prediction</h1>
              <p className="text-gray-600 mt-1">Estimate quantity using the trained model</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            {/* ---------- INPUT CARD ---------- */}
            <div className="lg:col-span-1">
              <Card title="Inputs">
                <div className="flex flex-col gap-4">
                  <Field label="Target Month">
                    <input
                      type="month"
                      min="2019-01"
                      className="w-full px-3 py-2 rounded-lg border-2 border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none hover:border-gray-400 transition-colors"
                      value={monthPicker}
                      onChange={(e) => setMonthPicker(e.target.value)}
                    />
                  </Field>

                  <Field label="Species">
                    <select
                      className="w-full px-3 py-2 rounded-lg border-2 border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none hover:border-gray-400 transition-colors cursor-pointer"
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
                      list="municipality-options"
                      className="w-full px-3 py-2 rounded-lg border-2 border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none hover:border-gray-400 transition-colors"
                      value={municipality}
                      onChange={(e) => setMunicipality(e.target.value)}
                      placeholder="e.g. Alburquerque"
                    />
                    <datalist id="municipality-options">
                      {[
                        'Alburquerque', 'Alicia', 'Antequera', 'Baclayon', 'Balilihan',
                        'Batuan', 'Bien Unido', 'Bilar', 'Buenavista', 'Calape',
                        'Candijay', 'Carmen', 'Catigbian', 'Clarin', 'Corella',
                        'Cortes', 'Dagohoy', 'Danao', 'Dauis', 'Dimiao',
                        'Duero', 'Garcia Hernandez', 'Getafe', 'Guindulman', 'Inabanga',
                        'Jagna', 'Lila', 'Loon', 'Mabini', 'Maribojoc',
                        'Panglao', 'Pilar', 'President Carlos P. Garcia', 'Sagbayan',
                        'San Isidro', 'San Miguel', 'Sevilla', 'Sierra Bullones',
                        'Sikatuna', 'Tagbilaran', 'Talibon', 'Trinidad', 'Tubigon',
                        'Ubay', 'Valencia'
                      ].map((m) => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
                  </Field>

                  <Field label="Transaction Type">
                    <select
                      className="w-full px-3 py-2 rounded-lg border-2 border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none hover:border-gray-400 transition-colors cursor-pointer"
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
                      min={transactionType === 'Sale' ? '0.01' : '0'}
                      step="0.01"
                      className="w-full px-3 py-2 rounded-lg border-2 border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none hover:border-gray-400 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                      value={cost}
                      onChange={(e) => {
                        if (transactionType === 'Sale' && parseFloat(e.target.value) <= 0) return;
                        setCost(e.target.value);
                      }}
                      placeholder="e.g. 120"
                      disabled={transactionType === 'Dispersal'}
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

            {/* ---------- RESULT & HISTORY ---------- */}
            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Predicted Quantity">
                  <div className="flex flex-col gap-2">
                    <p className="text-4xl font-semibold text-gray-900">
                      {predictedQuantity !== null
                        ? predictedQuantity.toLocaleString(undefined, { maximumFractionDigits: 0 })
                        : 'N/A'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {predictedQuantity !== null
                        ? 'Predicted by trained model'
                        : 'Enter values and generate prediction'}
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
                          {new Date(predictionHistory[0].created_at).toLocaleDateString()} at{' '}
                          {new Date(predictionHistory[0].created_at).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  }
                >
                  {predictionHistory.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No predictions saved yet.</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Generate a prediction to start tracking history.
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
                                  return `${m}-${y}`;
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
                              <p className="text-gray-600">Predicted</p>
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
    </div>
  );
};

export default Prediction;
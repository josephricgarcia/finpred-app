import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar.jsx';
import { useUser } from '../contexts/UserContext';
import supabase from '../helper/supabaseClient';
import * as ort from 'onnxruntime-web';

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

const MUNICIPALITY_MAP = {
  'alburquerque': 1, 'alicia': 2, 'antequera': 3, 'baclayon': 4, 'balilihan': 5, 'batuan': 6,
  'bien unido': 7, 'bilar': 8, 'buenavista': 9, 'calape': 10, 'candijay': 11, 'carmen': 12,
  'catigbian': 13, 'clarin': 14, 'corella': 15, 'cortes': 16, 'dagohoy': 17, 'danao': 18,
  'dauis': 19, 'dimiao': 20, 'duero': 21, 'garcia hernandez': 22, 'getafe': 23, 'guindulman': 24,
  'inabanga': 25, 'jagna': 26, 'lila': 27, 'loon': 28, 'mabini': 29, 'maribojoc': 30, 'panglao': 31,
  'pilar': 32, 'president carlos p. garcia': 33, 'sagbayan': 34, 'san isidro': 35, 'san miguel': 36,
  'sevilla': 37, 'sierra bullones': 38, 'sikatuna': 39, 'tagbilaran': 40, 'talibon': 41,
  'trinidad': 42, 'tubigon': 43, 'ubay': 44, 'valencia': 45,
};

const toTitleCase = (str) =>
  str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

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
  const [session, setSession] = useState(null);

  // Load ONNX model
  useEffect(() => {
    const loadModel = async () => {
      try {
        const sess = await ort.InferenceSession.create('/finpred_model.onnx');
        setSession(sess);
      } catch (err) {
        console.error('Error loading ONNX model:', err);
      }
    };
    loadModel();
  }, []);

  // Fetch prediction history
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

  const predictONNX = async (features) => {
    if (!session) throw new Error('Model not loaded yet');
    const tensor = new ort.Tensor('float32', new Float32Array(features), [1, features.length]);
    const feeds = { float_input: tensor }; // replace 'float_input' with your ONNX input name
    const results = await session.run(feeds);
    const outputName = Object.keys(results)[0];
    return results[outputName].data[0];
  };

  const generatePrediction = async () => {
    if (!month || !municipality || !cost || !species || !transactionType) {
      alert('Please fill all required fields.');
      return;
    }
    if (transactionType === '0' && parseFloat(cost) === 0) {
      alert('Cost must be greater than 0 for Sale transactions.');
      return;
    }
    if (!isAuthenticated || !userData?.uid) {
      alert('You must log in first.');
      return;
    }

    const monthNum = parseInt(month.split('-')[1]);
    const yearNum = parseInt(month.split('-')[0]);
    const speciesMap = { 'Tilapia': 1, 'Koi Carp': 2, 'Common Carp': 3, 'Hito': 4 };

    const features = [
      monthNum,
      yearNum,
      MUNICIPALITY_MAP[municipality],
      parseInt(transactionType),
      parseFloat(cost),
      speciesMap[species],
    ];

    try {
      setLoading(true);
      const pred = await predictONNX(features);
      const roundedPred = Math.max(0, Math.round(pred));
      setPredictedQuantity(roundedPred);

      const newPrediction = {
        userId: userData.uid,
        month,
        municipality: toTitleCase(municipality),
        species,
        transaction_type: parseInt(transactionType),
        cost: parseFloat(cost),
        predicted_quantity: roundedPred,
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
      setMonth(''); setSpecies(''); setMunicipality(''); setTransactionType(''); setCost('');
    } catch (err) {
      console.error('Prediction error:', err);
      alert(`Error generating prediction: ${err.message}`);
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
      if (error) throw error;
      setPredictionHistory(prev => prev.filter(p => p.id !== id));
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
          <h1 className="text-3xl font-semibold text-gray-900">Prediction</h1>
          <p className="text-gray-600 mt-1">Estimate quantity based on inputs using the trained model</p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            {/* Input Card */}
            <div className="lg:col-span-1">
              <Card title="Inputs">
                <div className="flex flex-col gap-4">
                  <Field label="Target Month">
                    <input type="month" min="2019-01" className="w-full ..." value={month} onChange={e => setMonth(e.target.value)} />
                  </Field>
                  <Field label="Species">
                    <select value={species} onChange={e => setSpecies(e.target.value)} className="w-full ...">
                      <option value="">Select species...</option>
                      <option value="Tilapia">Tilapia</option>
                      <option value="Koi Carp">Koi Carp</option>
                      <option value="Common Carp">Common Carp</option>
                      <option value="Hito">Hito</option>
                    </select>
                  </Field>
                  <Field label="Municipality">
                    <select value={municipality} onChange={e => setMunicipality(e.target.value)} className="w-full ...">
                      <option value="">Select municipality...</option>
                      {Object.keys(MUNICIPALITY_MAP).sort().map(m => (
                        <option key={m} value={m}>{toTitleCase(m)}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Transaction Type">
                    <select value={transactionType} onChange={e => {
                      setTransactionType(e.target.value);
                      if (e.target.value === '1') setCost('0');
                    }} className="w-full ...">
                      <option value="">Select transaction type...</option>
                      <option value="0">Sale</option>
                      <option value="1">Dispersal</option>
                    </select>
                  </Field>
                  <Field label="Cost">
                    <input type="number" min={transactionType==='0'?'1':'0'} step="0.01"
                      value={cost} onChange={e=>{ if(transactionType==='0' && e.target.value==='0') return; setCost(e.target.value)}} disabled={transactionType==='1'} className="w-full ..." />
                  </Field>
                  <button onClick={generatePrediction} disabled={loading} className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    {loading ? 'Generating...' : 'Generate Prediction'}
                  </button>
                </div>
              </Card>
            </div>

            {/* Prediction & History */}
            <div className="lg:col-span-2 space-y-6">
              <Card title="Predicted Quantity">
                <p className="text-4xl font-semibold text-gray-900">{predictedQuantity !== null ? predictedQuantity.toLocaleString() : 'N/A'}</p>
                <p className="text-sm text-gray-600">{predictedQuantity !== null ? 'Predicted by trained model' : 'Enter values and generate prediction'}</p>
              </Card>

              <Card title="Prediction History">
                {predictionHistory.length === 0 ? (
                  <p className="text-gray-500">No predictions saved yet.</p>
                ) : (
                  predictionHistory.map(p => (
                    <div key={p.id} className="border p-3 rounded-lg mb-2">
                      <div className="flex justify-between">
                        <p>{p.species} - {p.municipality}</p>
                        <button onClick={() => deletePrediction(p.id)} className="text-red-600">Delete</button>
                      </div>
                      <p>Month: {p.month} | Transaction: {p.transaction_type===0?'Sale':'Dispersal'} | Cost: {p.cost} | Predicted: {p.predicted_quantity}</p>
                    </div>
                  ))
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

import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import supabase from '../helper/supabaseClient';

const AddTransaction = ({ onClose, onTransactionAdded }) => {
  const { userData } = useUser();
  const [form, setForm] = useState({
    distribution_date: '',
    beneficiary_name: '',
    gender: '',
    barangay: '',
    municipality: '',
    contact_number: '',
    species: '',
    quantity_received: '',
    distribution: '',
    cost: '',
    type: '',
    feedback: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  useEffect(() => {
    if (form.distribution === 'Dispersal') {
      setForm((prev) => ({ ...prev, cost: '0' }));
    }
  }, [form.distribution]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!userData) {
      setError('You must be logged in to add a transaction.');
      return;
    }

    if (!form.distribution_date || !form.beneficiary_name || !form.distribution) {
      setError('Please fill in all required fields.');
      return;
    }

    if (form.distribution === 'Sale' && (!form.cost || parseFloat(form.cost) <= 0)) {
      setError('For Sale transactions, cost must be greater than 0.');
      return;
    }

    try {
      const userId = userData?.uid;
      if (!userId) {
        setError('No authenticated user. Please log in again.');
        return;
      }

      const toInsert = {
        userId,
        distribution_date: form.distribution_date,
        beneficiary_name: form.beneficiary_name,
        gender: form.gender || null,
        barangay: form.barangay || null,
        municipality: form.municipality || null,
        contact_number: form.contact_number || null,
        species: form.species || null,
        quantity_received: form.quantity_received ? parseInt(form.quantity_received, 10) : 0,
        cost: form.cost ? parseFloat(form.cost) : 0,
        distribution: form.distribution,
        type: form.type || null,
        feedback: form.feedback || null,
      };

      const { data, error: insertError } = await supabase
        .from('transactions')
        .insert(toInsert)
        .select('*')
        .single();

      if (insertError) {
        setError(insertError.message || 'Failed to add transaction. Please try again.');
        return;
      }

      setSuccess('Transaction added successfully!');

      if (onTransactionAdded && data) {
        onTransactionAdded(data);
      }

      setTimeout(() => {
        setForm({
          distribution_date: '',
          beneficiary_name: '',
          gender: '',
          barangay: '',
          municipality: '',
          contact_number: '',
          species: '',
          quantity_received: '',
          distribution: '',
          cost: '',
          type: '',
          feedback: '',
        });
        if (onClose) onClose();
      }, 800);
    } catch (err) {
      console.error('Error adding transaction:', err);
      setError('Failed to add transaction. Please try again.');
    }
  };

  // Municipality options
  const municipalities = [
    'alburquerque', 'alicia', 'antequera', 'baclayon', 'balilihan', 'batuan', 'bien unido', 
    'bilar', 'buenavista', 'calape', 'candijay', 'carmen', 'catigbian', 'clarin', 'corella', 
    'cortes', 'danao', 'dagohoy', 'dauis', 'dimiao', 'duero', 'garcia hernandez', 'getafe', 
    'guindulman', 'inabanga', 'jagna', 'lila', 'loon', 'mabini', 'maribojoc', 'panglao', 
    'pilar', 'president carlos p. garcia', 'sagbayan', 'san isidro', 'san miguel', 
    'sevilla', 'sierra bullones', 'sikatuna', 'tagbilaran', 'talibon', 'trinidad', 
    'tubigon', 'ubay', 'valencia'
  ].sort();

  return (
    <div>
      {error && (
        <p className="text-red-700 bg-red-100 border border-red-300 rounded px-4 py-2 mb-4">{error}</p>
      )}
      {success && (
        <p className="text-green-700 bg-green-100 border border-green-300 rounded px-4 py-2 mb-4">{success}</p>
      )}
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
        <input
          type="date"
          name="distribution_date"
          placeholder="Distribution Date"
          value={form.distribution_date}
          onChange={handleChange}
          required
          className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <input
          type="text"
          name="beneficiary_name"
          placeholder="Name of Beneficiaries"
          value={form.beneficiary_name}
          onChange={handleChange}
          required
          className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <select
          name="gender"
          value={form.gender}
          onChange={handleChange}
          required
          className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
          <option value="Prefer not to say">Prefer not to say</option>
        </select>

        <input
          type="text"
          name="barangay"
          placeholder="Barangay"
          value={form.barangay}
          onChange={handleChange}
          className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Municipality input with datalist */}
        <input
          type="text"
          list="municipality-options"
          name="municipality"
          placeholder="Select or type municipality"
          value={form.municipality}
          onChange={handleChange}
          className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 capitalize"
        />
        <datalist id="municipality-options">
          {municipalities.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>

        <input
          type="text"
          name="contact_number"
          placeholder="Contact Number"
          value={form.contact_number}
          onChange={handleChange}
          className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Species input with datalist */}
        <input
          list="species-options"
          name="species"
          placeholder="Species"
          value={form.species}
          onChange={handleChange}
          className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <datalist id="species-options">
          <option value="Common carp" />
          <option value="Hito" />
          <option value="Koi" />
          <option value="Red Tilapia" />
          <option value="Tilapia" />
        </datalist>

        <input
          type="number"
          name="quantity_received"
          placeholder="Quantity"
          value={form.quantity_received}
          onChange={handleChange}
          className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <select
          name="distribution"
          value={form.distribution}
          onChange={handleChange}
          required
          className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Distribution Type</option>
          <option value="Sale">Sale</option>
          <option value="Dispersal">Dispersal</option>
        </select>

        <input
          type="number"
          name="cost"
          placeholder="Cost"
          value={form.cost}
          onChange={handleChange}
          disabled={form.distribution === 'Dispersal'}
          className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <input
          type="text"
          name="type"
          placeholder="Type (e.g. tank, pond, etc.)"
          value={form.type}
          onChange={handleChange}
          className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <select
          name="feedback"
          value={form.feedback}
          onChange={handleChange}
          className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Feedback</option>
          <option value="Satisfied">Satisfied</option>
          <option value="Neutral">Neutral</option>
          <option value="Unsatisfied">Unsatisfied</option>
        </select>

        <div className="flex justify-end gap-2 col-span-2">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Cancel
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Save Transaction
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddTransaction;
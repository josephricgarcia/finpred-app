import React, { useEffect, useState } from 'react';
import { useUser } from '../contexts/UserContext';
import supabase from '../helper/supabaseClient';

const UpdateTransaction = ({ id, initialData, onClose, onTransactionUpdated }) => {
  const { userData } = useUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  // Ensure date is compatible with input[type="date"] (YYYY-MM-DD)
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    // If already in YYYY-MM-DD, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
    try {
      const d = new Date(dateString);
      if (Number.isNaN(d.getTime())) return '';
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return '';
    }
  };
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

  // Using Supabase instead of REST backend

  useEffect(() => {
    // Prefill immediately if initial data is provided
    if (initialData) {
      setForm({
        distribution_date: formatDateForInput(initialData.distribution_date) || '',
        beneficiary_name: initialData.beneficiary_name || '',
        gender: initialData.gender || '',
        barangay: initialData.barangay || '',
        municipality: initialData.municipality || '',
        contact_number: initialData.contact_number || '',
        species: initialData.species || '',
        quantity_received: initialData.quantity_received || '',
        distribution: initialData.distribution || '',
        cost: initialData.cost || '',
        type: initialData.type || '',
        feedback: initialData.feedback || '',
      });
      setLoading(false);
    }

    const loadTransaction = async () => {
      if (!id) return;
      try {
        setLoading(true);
        setError('');

        const { data, error: selectError } = await supabase
          .from('transactions')
          .select('*')
          .eq('transactionId', id)
          .single();

        if (selectError) {
          if (selectError.message?.toLowerCase().includes('jwt') || selectError.code === 'PGRST301') {
            setError('Session expired. Please log in again.');
          } else if (selectError.code === 'PGRST116') {
            setError('Transaction not found');
          } else {
            throw selectError;
          }
        } else if (data) {
          setForm({
            distribution_date: formatDateForInput(data.distribution_date) || '',
            beneficiary_name: data.beneficiary_name || '',
            gender: data.gender || '',
            barangay: data.barangay || '',
            municipality: data.municipality || '',
            contact_number: data.contact_number || '',
            species: data.species || '',
            quantity_received: data.quantity_received || '',
            distribution: data.distribution || '',
            cost: data.cost || '',
            type: data.type || '',
            feedback: data.feedback || '',
          });
        }
      } catch (err) {
        console.error('Error loading transaction:', err);
        setError('Failed to load transaction. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadTransaction();
  }, [id, initialData]);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!userData) {
      setError('You must be logged in to update a transaction.');
      return;
    }

    try {
      setLoading(true);

      // Create transaction object for Supabase
      const transactionData = {
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

      const { data: updated, error: updateError } = await supabase
        .from('transactions')
        .update(transactionData)
        .eq('transactionId', id)
        .select('*')
        .single();

      if (updateError) {
        setError(updateError.message || 'Failed to update transaction. Please try again.');
      } else {
        setSuccess('Transaction updated successfully!');
        if (onTransactionUpdated && updated) {
          onTransactionUpdated(updated);
        }
        setTimeout(() => {
          if (onClose) onClose();
        }, 800);
      }
    } catch (err) {
      console.error('Error updating transaction:', err);
      setError('Failed to update transaction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {error && <p className="text-red-700 bg-red-100 border border-red-300 rounded px-4 py-2 mb-4">{error}</p>}
      {success && <p className="text-green-700 bg-green-100 border border-green-300 rounded px-4 py-2 mb-4">{success}</p>}
      
      {loading ? (
        <p className="text-gray-600">Loading transaction...</p>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <input type="date" name="distribution_date" placeholder="Distribution Date" value={form.distribution_date} onChange={handleChange}  className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
          
          <input type="text" name="beneficiary_name" placeholder="Name of Beneficiaries" value={form.beneficiary_name} onChange={handleChange} className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />

          <select name="gender" value={form.gender} onChange={handleChange} className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
            <option value="Prefer not to say">Prefer not to say</option>
          </select>
          <input type="text" name="barangay" placeholder="Barangay" value={form.barangay} onChange={handleChange} className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />

          <input type="text" name="municipality" placeholder="Municipality" value={form.municipality} onChange={handleChange} className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input type="text" name="contact_number" placeholder="Contact Number" value={form.contact_number} onChange={handleChange} className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />

          <input type="text" name="species" placeholder="Species" value={form.species} onChange={handleChange} className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input type="number" name="quantity_received" placeholder="Quantity" value={form.quantity_received} onChange={handleChange} className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
          
          <select name="distribution" value={form.distribution} onChange={handleChange}  className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Distribution Type</option>
            <option value="Sale">Sale</option>
            <option value="Dispersal">Dispersal</option>
          </select>

          <input type="number" name="cost" placeholder="Cost" value={form.cost} onChange={handleChange} className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input type="text" name="type" placeholder="Type (e.g. tank, pond, etc.)" value={form.type} onChange={handleChange} className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />

          <select name="feedback" value={form.feedback} onChange={handleChange} className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Feedback</option>
            <option value="Satisfied">Satisfied</option>
            <option value="Neutral">Neutral</option>
            <option value="Unsatisfied">Unsatisfied</option>
          </select>

          <div className="flex justify-end gap-2 col-span-2">
            <button type="button" onClick={onClose} className="flex items-center gap-2 bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 transition">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </button>
            <button type="submit" className="flex items-center gap-2 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition" disabled={loading}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {loading ? 'Updating...' : 'Update Transaction'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default UpdateTransaction;

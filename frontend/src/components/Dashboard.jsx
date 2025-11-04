import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from './Sidebar.jsx';
import { useUser } from '../contexts/UserContext';
import supabase from '../helper/supabaseClient';

const MetricCard = ({ title, value, helper, icon }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">{title}</p>
        {icon ? <img src={icon} alt="" className="w-4 h-4" /> : null}
      </div>
      <p className="text-3xl font-semibold text-gray-900">{value}</p>
      {helper ? <p className="text-sm text-gray-500 leading-tight">{helper}</p> : null}
    </div>
  );
};

const Badge = ({ children, tone = 'default' }) => {
  const palette = {
    sale: 'bg-blue-600 text-white',
    purchase: 'bg-blue-50 text-blue-700 border border-blue-200',
    completed: 'bg-blue-600 text-white',
    default: 'bg-blue-50 text-blue-700 border border-blue-200',
  };
  return (
    <span className={`text-xs px-3 py-1 rounded-full capitalize ${palette[tone] || palette.default}`}>
      {children}
    </span>
  );
};

const Dashboard = () => {
  const { isAuthenticated, userData } = useUser();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!isAuthenticated || !userData?.uid) {
        setTransactions([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const PAGE_SIZE = 1000;
        const allRows = [];
        let from = 0;
        while (true) {
          const to = from + PAGE_SIZE - 1;
          const { data, error: fetchError } = await supabase
            .from('transactions')
            .select('*')
            .eq('userId', userData.uid)
            .order('distribution_date', { ascending: false })
            .range(from, to);

          if (fetchError) {
            if (fetchError.message?.toLowerCase().includes('jwt') || fetchError.code === 'PGRST301') {
              setError('Session expired. Please log in again.');
              setTransactions([]);
              break;
            } else {
              throw fetchError;
            }
          }

          if (!data || data.length === 0) break;
          allRows.push(...data);
          if (data.length < PAGE_SIZE) break;
          from += PAGE_SIZE;
        }

        setTransactions(allRows);
      } catch (err) {
        setError('Failed to load transactions. Please try again.');
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [isAuthenticated]);

  const metrics = useMemo(() => {
    const formatNumber = (n) => new Intl.NumberFormat('en-PH').format(n);
    const formatCurrency = (n) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(n);

    // Sum of all costs (revenue)
    const totalRevenue = transactions
      .map((t) => Number(t.cost))
      .filter((n) => !isNaN(n))
      .reduce((sum, n) => sum + n, 0);

    // Total transactions
    const totalTransactions = transactions.length;

    // Total unique fish species (across all data)
    const speciesSet = new Set(
      transactions
        .map((t) => (t.species || '').toString().trim().toLowerCase())
        .filter((s) => s.length > 0)
    );
    const uniqueSpecies = speciesSet.size;

    // Active species for the current year only
    const currentYear = new Date().getFullYear();
    const activeSpeciesSet = new Set(
      transactions
        .filter((t) => {
          const d = new Date(t.distribution_date);
          return d instanceof Date && !isNaN(d) && d.getFullYear() === currentYear;
        })
        .map((t) => (t.species || '').toString().trim().toLowerCase())
        .filter((s) => s.length > 0)
    );
    const activeSpecies = activeSpeciesSet.size;

    return {
      totalRevenue: formatCurrency(totalRevenue),
      totalTransactions: formatNumber(totalTransactions),
      uniqueSpecies: formatNumber(uniqueSpecies),
      activeSpecies: formatNumber(activeSpecies),
    };
  }, [transactions]);

  return (
    <div className="flex min-h-screen bg-blue-50">
      <Sidebar />
      <div className="flex-1 p-8 ml-64">
        <div className="max-w-10xl mx-auto">
          <h1 className="text-3xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Overview of your fish transaction business</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <MetricCard title="Total Revenue" value={metrics.totalRevenue} helper="From completed sales" />
            <MetricCard title="Total Transactions" value={metrics.totalTransactions} helper="Sales and Dispersal combined" />
            <MetricCard title="Fish Species" value={metrics.uniqueSpecies} helper="Different species in inventory" />
            <MetricCard title="Active Species" value={metrics.activeSpecies} helper="Species with transactions this year" />
          </div>

          <div className="bg-white border border-gray-200 rounded-xl mt-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
              <p className="text-sm text-gray-600">Your latest fish transactions</p>
            </div>
            
            {loading ? (
              <div className="p-6 text-center text-gray-500">Loading...</div>
            ) : error ? (
              <div className="p-6 text-red-700 bg-red-100 border border-red-300 rounded mx-6 my-4">
                {error}
              </div>
            ) : transactions.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No transactions yet. Add some to see them here.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead className="text-sm text-gray-500">
                    <tr>
                      <th className="px-6 py-3 font-medium">Fish</th>
                      <th className="px-6 py-3 font-medium">Beneficiary</th>
                      <th className="px-6 py-3 font-medium">Quantity</th>
                      <th className="px-6 py-3 font-medium">Cost</th>
                      <th className="px-6 py-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                    {transactions.slice(0, 5).map((t) => (
                      <tr key={t.transactionId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 capitalize">{t.species || 'N/A'}</td>
                        <td className="px-6 py-4">{t.beneficiary_name || 'N/A'}</td>
                        <td className="px-6 py-4">{Number(t.quantity_received) > 0 ? `${Number(t.quantity_received)}` : 'N/A'}</td>
                        <td className="px-6 py-4">{Number(t.cost) > 0 ? `₱${Number(t.cost).toFixed(2)}` : 'N/A'}</td>
                        <td className="px-6 py-4 text-gray-500">{t.distribution_date ? new Date(t.distribution_date).toLocaleDateString() : 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
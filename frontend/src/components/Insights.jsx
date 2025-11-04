import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from './Sidebar.jsx';
import supabase from '../helper/supabaseClient';

const Insights = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        setError(null);

        // Paginate to ensure we load all rows
        const PAGE_SIZE = 1000;
        const allRows = [];
        let from = 0;
        while (true) {
          const to = from + PAGE_SIZE - 1;
          const { data, error: fetchError } = await supabase
            .from('transactions')
            .select('distribution_date, species, quantity_received')
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

        const normalized = (allRows || []).map((t) => ({
          date: t.distribution_date ? new Date(t.distribution_date) : null,
          species: (t.species || '').toString().trim(),
          quantity: Number(t.quantity_received) || 0,
        }));
        setTransactions(normalized);
      } catch (e) {
        console.error('Failed to load insights:', e);
        setError('Failed to load insights. Please try again.');
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  // Derive years available from data (min..max), fallback to current year
  const availableYears = useMemo(() => {
    const yearsSet = new Set();
    for (const t of transactions) {
      if (t.date instanceof Date && !isNaN(t.date)) {
        yearsSet.add(t.date.getFullYear());
      }
    }
    const years = Array.from(yearsSet).sort((a, b) => a - b);
    return years.length > 0 ? years : [new Date().getFullYear()];
  }, [transactions]);

  // Ensure selectedYear is always valid given availableYears
  useEffect(() => {
    if (!availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[availableYears.length - 1]);
    }
  }, [availableYears, selectedYear]);

  // Compute species list dynamically for the selected year
  const speciesList = useMemo(() => {
    const set = new Set();
    for (const t of transactions) {
      if (t.date instanceof Date && !isNaN(t.date) && t.date.getFullYear() === selectedYear) {
        const s = t.species.toString().trim();
        if (s.length > 0) set.add(s);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [transactions, selectedYear]);

  // Global species list across all years to stabilize color mapping
  const globalSpeciesList = useMemo(() => {
    const set = new Set();
    for (const t of transactions) {
      const s = (t.species || '').toString().trim();
      if (s.length > 0) set.add(s);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [transactions]);

  // Shared color mapping for species used by legend and bars
  const getColorForSpecies = useMemo(() => {
    // Exclude red/yellow which are reserved
    const palette = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500',
      'bg-orange-500',
      'bg-lime-500',
      'bg-cyan-500',
      'bg-emerald-500',
    ];
    const fixedMap = {
      tilapia: 'bg-red-500',
      'koi carp': 'bg-yellow-500',
      koi: 'bg-yellow-500',
    };
    return (species) => {
      const key = species.toString().trim().toLowerCase();
      if (fixedMap[key]) return fixedMap[key];
      const index = Math.max(0, globalSpeciesList.findIndex((s) => s.toLowerCase() === key));
      return palette[index % palette.length];
    };
  }, [globalSpeciesList]);

  // Process data for chart (grouped by month and dynamic species)
  const months = useMemo(
    () => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    []
  );

  const chartData = useMemo(() => {
    const yearTransactions = transactions.filter(
      (t) => t.date instanceof Date && !isNaN(t.date) && t.date.getFullYear() === selectedYear
    );

    const perMonth = months.map((month, monthIndex) => {
      const monthData = { month };
      for (const speciesName of speciesList) {
        const total = yearTransactions
          .filter(
            (t) => t.species.toLowerCase() === speciesName.toLowerCase() && t.date.getMonth() === monthIndex
          )
          .reduce((sum, t) => sum + (t.quantity || 0), 0);
        monthData[speciesName] = total;
      }
      return monthData;
    });
    return perMonth;
  }, [transactions, selectedYear, months, speciesList]);

  const maxValue = useMemo(() => {
    const vals = [];
    for (const row of chartData) {
      for (const s of speciesList) {
        vals.push(row[s] || 0);
      }
    }
    return vals.length ? Math.max(...vals) : 0;
  }, [chartData, speciesList]);

  // Bar chart component
  const BarChart = () => {
    const chartHeight = 240;
    // Calculate dynamic bar width based on available space and number of species
    const availableWidth = 100; // Percentage of container width
    const barWidth = Math.max(8, Math.min(16, (availableWidth / 12) / Math.max(1, speciesList.length) * 0.8));

    return (
      <div className="relative w-full" style={{ height: chartHeight + 40 }}>
        {/* Chart */}
        <div className="relative" style={{ height: chartHeight }}>
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500">
            <span>{maxValue}</span>
            <span>{Math.round(maxValue * 0.75)}</span>
            <span>{Math.round(maxValue * 0.5)}</span>
            <span>{Math.round(maxValue * 0.25)}</span>
            <span>0</span>
          </div>

          {/* Bars */}
          <div className="ml-6 flex items-end h-full w-full" style={{ gap: '2px' }}>
            {chartData.map((monthData, monthIndex) => (
              <div 
                key={monthData.month} 
                className="flex items-end justify-center" 
                style={{ 
                  flex: '1 1 0',
                  minWidth: 0
                }}
              >
                <div className="flex items-end gap-0.5">
                  {speciesList.map((s) => (
                    <div
                      key={s}
                      className={`${getColorForSpecies(s)} rounded-t`}
                      style={{
                        width: barWidth,
                        height: maxValue > 0 ? ((monthData[s] || 0) / maxValue) * chartHeight : 0,
                      }}
                      title={`${s}: ${monthData[s] || 0}`}
                    ></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* X-axis labels */}
        <div className="ml-6 flex mt-1.5 w-full">
          {chartData.map((monthData, monthIndex) => (
            <div 
              key={monthData.month} 
              className="flex-1 text-center"
              style={{ minWidth: 0 }}
            >
              <span className="text-xs text-gray-600">{monthData.month}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const years = availableYears;

  return (
    <div className="flex min-h-screen bg-blue-50 overflow-x-hidden">
      <Sidebar />
      <div className="flex-1 p-6 ml-64">
        <div className="max-w-10xl mx-auto overflow-x-hidden">
          <h1 className="text-3xl font-semibold text-gray-900">Insights</h1>
          <p className="text-gray-600 mt-1">Overview of your fish transaction business</p>

          {error && (
            <div className="mb-4 text-red-700 bg-red-100 border border-red-300 rounded px-4 py-2">
              {error}
            </div>
          )}

          {/* Insights Card */}
          <div className="bg-white border border-gray-200 rounded-xl mt-6 min-h-[500px] overflow-x-hidden">

            <div className="px-6 py-6 h-full overflow-x-auto">
              {/* Year Selection */}
              <div className="flex gap-2 mb-4 flex-wrap">
                {years.map((year) => (
                  <button
                    key={year}
                    onClick={() => setSelectedYear(year)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                      selectedYear === year
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>

              {/* Species Legend (moved out of chart to save space) */}
              <div className="flex justify-end gap-3 mb-2 flex-wrap">
                {speciesList.map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <div className={`w-3.5 h-3.5 rounded ${getColorForSpecies(s)}`}></div>
                    <span className="text-sm text-gray-600">{s}</span>
                  </div>
                ))}
              </div>

              {/* Chart Area */}
              <div className="min-h-[300px] flex items-center justify-center w-full">
                {loading ? (
                  <p className="text-gray-500">Loading chart data...</p>
                ) : transactions.length === 0 ? (
                  <p className="text-gray-500">
                    No transaction data available for insights.
                  </p>
                ) : (
                  <div className="w-full max-w-full">
                    <BarChart />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Insights;

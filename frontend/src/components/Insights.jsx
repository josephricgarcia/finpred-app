import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from './Sidebar.jsx';
import supabase from '../helper/supabaseClient';

const Insights = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  /* ──────────────────────────────────────── FETCH ──────────────────────────────────────── */
  useEffect(() => {
    const fetchTransactions = async () => {
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

  /* ────────────────────────────────────── YEARS ────────────────────────────────────── */
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

  useEffect(() => {
    if (!availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[availableYears.length - 1]);
    }
  }, [availableYears, selectedYear]);

  /* ───────────────────────────────────── SPECIES ───────────────────────────────────── */
  const speciesList = useMemo(() => {
    const set = new Set();
    for (const t of transactions) {
      if (t.date instanceof Date && !isNaN(t.date) && t.date.getFullYear() === selectedYear) {
        const s = t.species.toString().trim();
        if (s) set.add(s);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [transactions, selectedYear]);

  const globalSpeciesList = useMemo(() => {
    const set = new Set();
    for (const t of transactions) {
      const s = (t.species || '').toString().trim();
      if (s) set.add(s);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [transactions]);

  const getColorForSpecies = useMemo(() => {
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
    return (species) => {
      const key = species.toString().trim().toLowerCase();
      const index = Math.max(0, globalSpeciesList.findIndex((s) => s.toLowerCase() === key));
      return palette[index % palette.length];
    };
  }, [globalSpeciesList]);

  /* ───────────────────────────────────── CHART DATA ─────────────────────────────────── */
  const months = useMemo(
    () => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    []
  );

  const chartData = useMemo(() => {
    const yearTx = transactions.filter(
      (t) => t.date instanceof Date && !isNaN(t.date) && t.date.getFullYear() === selectedYear
    );

    return months.map((month, idx) => {
      const row = { month };
      for (const sp of speciesList) {
        const total = yearTx
          .filter(
            (t) => t.species.toLowerCase() === sp.toLowerCase() && t.date.getMonth() === idx
          )
          .reduce((sum, t) => sum + t.quantity, 0);
        row[sp] = total;
      }
      return row;
    });
  }, [transactions, selectedYear, months, speciesList]);

  const maxValue = useMemo(() => {
    const vals = [];
    for (const row of chartData) {
      for (const s of speciesList) vals.push(row[s] ?? 0);
    }
    return vals.length ? Math.max(...vals) : 0;
  }, [chartData, speciesList]);

  /* ───────────────────────────────────── SUMMARY STATS ───────────────────────────────── */
  const yearTotal = useMemo(() => {
    return transactions
      .filter((t) => t.date?.getFullYear() === selectedYear)
      .reduce((sum, t) => sum + t.quantity, 0);
  }, [transactions, selectedYear]);

  const topSpecies = useMemo(() => {
    const map = new Map();
    for (const t of transactions) {
      if (t.date?.getFullYear() === selectedYear) {
        const cur = map.get(t.species) ?? 0;
        map.set(t.species, cur + t.quantity);
      }
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [transactions, selectedYear]);

  const avgMonthly = useMemo(() => {
    const monthSums = new Array(12).fill(0);
    let count = 0;
    for (const t of transactions) {
      if (t.date?.getFullYear() === selectedYear) {
        monthSums[t.date.getMonth()] += t.quantity;
        count++;
      }
    }
    const total = monthSums.reduce((a, b) => a + b, 0);
    return count ? Math.round(total / 12) : 0;
  }, [transactions, selectedYear]);

  /* ───────────────────────────────────── BAR CHART ─────────────────────────────────── */
  const BarChart = () => {
    const chartHeight = 260;
    const barWidth = Math.max(8, Math.min(16, (100 / 12) / Math.max(1, speciesList.length) * 0.8));

    return (
      <div className="relative w-full" style={{ height: chartHeight + 40 }}>
        {/* Y-axis */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500">
          <span>{maxValue}</span>
          <span>{Math.round(maxValue * 0.75)}</span>
          <span>{Math.round(maxValue * 0.5)}</span>
          <span>{Math.round(maxValue * 0.25)}</span>
          <span>0</span>
        </div>

        {/* Bars */}
        <div className="ml-6 flex items-end h-full w-full" style={{ gap: '2px' }}>
          {chartData.map((monthData, idx) => (
            <div key={monthData.month} className="flex-1 flex items-end justify-center">
              <div className="flex items-end gap-0.5">
                {speciesList.map((s) => (
                  <div
                    key={s}
                    className={`${getColorForSpecies(s)} rounded-t`}
                    style={{
                      width: barWidth,
                      height: maxValue > 0 ? ((monthData[s] ?? 0) / maxValue) * chartHeight : 0,
                    }}
                    title={`${s}: ${monthData[s] ?? 0}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* X-axis */}
        <div className="ml-6 flex mt-1.5 w-full">
          {chartData.map((m) => (
            <div key={m.month} className="flex-1 text-center text-xs text-gray-600">
              {m.month}
            </div>
          ))}
        </div>
      </div>
    );
  };

  /* ────────────────────────────────────── RENDER ───────────────────────────────────── */
  return (
    <div className="flex min-h-screen bg-blue-50 overflow-x-hidden">
      <Sidebar />
      <div className="flex-1 p-6 ml-64">
        <div className="max-w-10xl mx-auto">
          <h1 className="text-3xl font-semibold text-gray-900">Insights</h1>
          <p className="text-gray-600 mt-1">Overview of your fish transaction business</p>

          {error && (
            <div className="mb-4 text-red-700 bg-red-100 border border-red-300 rounded px-4 py-2">
              {error}
            </div>
          )}

          {/* Main Card */}
          <div className="bg-white border border-gray-200 rounded-xl mt-6 overflow-x-auto">

            {/* Year Buttons */}
            <div className="px-6 pt-6 flex gap-2 flex-wrap">
              {availableYears.map((y) => (
                <button
                  key={y}
                  onClick={() => setSelectedYear(y)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                    selectedYear === y
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>

            <div className="px-6 pb-6">

              {/* Legend */}
              <div className="flex justify-end gap-3 mt-4 mb-2 flex-wrap">
                {speciesList.map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <div className={`w-3.5 h-3.5 rounded ${getColorForSpecies(s)}`} />
                    <span className="text-sm text-gray-600">{s}</span>
                  </div>
                ))}
              </div>

              {/* Chart */}
              <div className="min-h-[300px] w-full">
                {loading ? (
                  <p className="text-center text-gray-500 mt-12">Loading chart data...</p>
                ) : transactions.length === 0 ? (
                  <p className="text-center text-gray-500 mt-12">
                    No transaction data available for insights.
                  </p>
                ) : (
                  <BarChart />
                )}
              </div>

              {/* ────── NEW SUMMARY SECTION ────── */}
              {!loading && transactions.length > 0 && (
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">

                  {/* Total Distributed */}
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-5 rounded-lg shadow-sm">
                    <h3 className="text-lg font-medium">Total Distributed</h3>
                    <p className="text-3xl font-bold mt-1">{yearTotal.toLocaleString()}</p>
                    <p className="text-sm opacity-90">fish in {selectedYear}</p>
                  </div>

                  {/* Top Species */}
                  <div className="bg-white border border-gray-200 p-5 rounded-lg shadow-sm">
                    <h3 className="text-lg font-medium text-gray-800">Top 3 Species</h3>
                    <ul className="mt-2 space-y-1">
                      {topSpecies.map(([sp, qty], i) => (
                        <li key={sp} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded ${getColorForSpecies(sp)}`} />
                            <span className="text-sm text-gray-700">{sp}</span>
                          </div>
                          <span className="text-sm font-medium">{qty.toLocaleString()}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Avg Monthly */}
                  <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-5 rounded-lg shadow-sm">
                    <h3 className="text-lg font-medium">Avg. Monthly</h3>
                    <p className="text-3xl font-bold mt-1">{avgMonthly.toLocaleString()}</p>
                    <p className="text-sm opacity-90">fish per month</p>
                  </div>

                </div>
              )}
              {/* ────── END NEW SECTION ────── */}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Insights;
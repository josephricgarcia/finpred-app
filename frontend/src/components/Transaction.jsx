import React, { useEffect, useRef, useState } from 'react';
import Sidebar from './Sidebar.jsx';
import supabase from '../helper/supabaseClient';
import { useUser } from '../contexts/UserContext';
import AddTransaction from './Add_Transaction.jsx';
import UpdateTransaction from './Update_Transaction.jsx';
import ImportCSV from './Import_CSV.jsx';
// Bulk delete removed

// Utility function to format date from distribution_date field
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    const month = date.toLocaleString('en-US', { month: 'long' });
    const year = date.getFullYear();
    const day = date.getDate();
    // If day is 1 (our default when CSV had no day), show only Month YYYY
    if (day === 1 && dateString.endsWith('-01')) {
      return `${month} ${year}`;
    }
    return `${month} ${day}, ${year}`;
  } catch {
    return 'N/A';
  }
};

const IconPlus = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14"/>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14"/>
  </svg>
);

const Transactions = () => {
  const { userData, isAuthenticated } = useUser();
  const [rows, setRows] = useState([]);
  const [filteredRows, setFilteredRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false); // State to control modal visibility
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  // Bulk delete removed
  const [selectedRow, setSelectedRow] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // Bulk delete removed
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState({ visible: false, type: 'info', message: '' });
  const [loadProgress, setLoadProgress] = useState({ visible: false, percent: 0, fetched: 0, total: 0 });

  // Virtualization and search optimization
  const [searchInput, setSearchInput] = useState('');
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const ROW_HEIGHT = 44; // approximate row height in px
  const OVERSCAN = 6; // render extra rows above/below viewport

  const showToast = (message, type = 'info') => {
    setToast({ visible: true, type, message });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 3000);
  };

  // Using Supabase instead of REST backend

  // Fetch transactions from Supabase
  const fetchTransactions = async () => {
    if (!isAuthenticated) {
      setRows([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setLoadProgress({ visible: true, percent: 0, fetched: 0, total: 0 });
      const PAGE_SIZE = 1000; // Supabase default max is typically 1000
      const allRows = [];
      let from = 0;
      let totalCount = 0;

      // Obtain total count for progress computation
      const { count, error: countError } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true });
      if (countError) {
        // Proceed without percentage if count fails
        totalCount = 0;
      } else {
        totalCount = count || 0;
        setLoadProgress((p) => ({ ...p, total: totalCount }));
      }

      while (true) {
        const to = from + PAGE_SIZE - 1;
        const { data, error: fetchError } = await supabase
          .from('transactions')
          .select('*')
          .order('distribution_date', { ascending: false })
          .range(from, to);

        if (fetchError) {
          if (fetchError.message?.toLowerCase().includes('jwt') || fetchError.code === 'PGRST301') {
            setError('Session expired. Please log in again.');
            showToast('Session expired. Please log in again.', 'error');
            setRows([]);
            break;
          } else {
            throw fetchError;
          }
        }

        if (!data || data.length === 0) {
          break;
        }

        allRows.push(...data);

        // Update progress
        if (totalCount > 0) {
          const fetched = allRows.length;
          const percent = Math.min(100, Math.round((fetched / totalCount) * 100));
          setLoadProgress({ visible: true, percent, fetched, total: totalCount });
        }

        // If fewer than PAGE_SIZE returned, we've reached the end
        if (data.length < PAGE_SIZE) {
          break;
        }

        from += PAGE_SIZE;
      }

      setRows(allRows);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Failed to load transactions. Please try again.');
      showToast('Failed to load transactions. Please try again.', 'error');
      setRows([]);
    } finally {
      setLoading(false);
      // Hide progress UI immediately when loading completes
      setLoadProgress({ visible: false, percent: 0, fetched: 0, total: 0 });
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [isAuthenticated]);

  // Debounce search input to reduce re-filtering cost
  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearchTerm(searchInput);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  // Measure scroll container height and keep updated on resize
  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      setContainerHeight(el.clientHeight || 0);
      setScrollTop(el.scrollTop || 0);
    }
    const onResize = () => {
      const node = containerRef.current;
      if (node) setContainerHeight(node.clientHeight || 0);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Function to add a new transaction
  const handleAddTransaction = (transactionData) => {
    setRows(prevRows => [...prevRows, transactionData]);
  };

  // Function to update a transaction
  const handleUpdateTransaction = (updatedTransaction) => {
    setRows(prevRows => 
      prevRows.map(row => 
        row.transactionId === updatedTransaction.transactionId ? updatedTransaction : row
      )
    );
  };

  // Function to refresh transactions
  const handleRefresh = () => {
    fetchTransactions();
  };

  // Filter and sort functionality
  useEffect(() => {
    let filtered = [...rows];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(row => 
        row.beneficiary_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.species?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.barangay?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.municipality?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.contact_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Type filter removed

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.distribution_date);
          bValue = new Date(b.distribution_date);
          break;
        case 'name':
          aValue = a.beneficiary_name || '';
          bValue = b.beneficiary_name || '';
          break;
        case 'cost':
          aValue = Number(a.cost) || 0;
          bValue = Number(b.cost) || 0;
          break;
        case 'quantity':
          aValue = Number(a.quantity_received) || 0;
          bValue = Number(b.quantity_received) || 0;
          break;
        case 'species':
          aValue = a.species || '';
          bValue = b.species || '';
          break;
        default:
          aValue = a[sortBy] || '';
          bValue = b[sortBy] || '';
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredRows(filtered);
  }, [rows, searchTerm, sortBy, sortOrder]);

  // Navigate handlers for actions
  const goToUpdate = (transactionId) => {
    setSelectedRow(rows.find((x) => x.transactionId === transactionId) || null);
    setIsUpdateOpen(true);
  };
  const openDelete = (row) => {
    setSelectedRow(row);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedRow) return;
    try {
      setIsDeleting(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('transactionId', selectedRow.transactionId);

      if (deleteError) {
        setError(deleteError.message || 'Failed to delete transaction');
        showToast(deleteError.message || 'Failed to delete transaction', 'error');
      } else {
        setRows(prevRows => prevRows.filter(row => row.transactionId !== selectedRow.transactionId));
        setIsDeleteOpen(false);
        setSelectedRow(null);
        showToast('Transaction deleted successfully', 'success');
      }
    } catch (e) {
      console.error('Delete error:', e);
      setError(e.message || 'Failed to delete transaction');
      showToast(e.message || 'Failed to delete transaction', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Bulk delete removed

  // Bulk delete removed

  // Bulk delete removed

  return (
    <div className="flex min-h-screen bg-blue-50">
      <Sidebar />
      <div className="flex-1 p-8 ml-64">
        <div className="max-w-10xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900">Transactions</h1>
              <p className="text-gray-600 mt-1">Overview of your fish transaction business</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                className="flex items-center gap-2 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition"
                onClick={handleRefresh}
                disabled={loading}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                  <path d="M21 3v5h-5"/>
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                  <path d="M3 21v-5h5"/>
                </svg>
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
              {/* Bulk delete button removed */}
              <button
                className="flex items-center gap-2 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition"
                onClick={() => setIsImportOpen(true)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"/>
                </svg>
                Import from CSV
              </button>
              <button
                className="flex items-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition"
                onClick={() => setIsModalOpen(true)}
              >
                <IconPlus />
                Add Transaction
              </button>
            </div>
          </div>

            <div className="bg-white border border-gray-200 rounded-xl mt-8 p-6">
              {/* Search and Filter Controls */}
              <div className="mb-6 space-y-4">
                <div className="flex flex-wrap gap-4 items-center">
                  {/* Search Input */}
                  <div className="flex-1 min-w-64">
                    <input
                      type="text"
                      placeholder="Search by beneficiary name, species, barangay, municipality, contact..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Filter by Type removed */}

                {/* Sort by */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="date">Sort by Date</option>
                  <option value="name">Sort by Beneficiary Name</option>
                  <option value="cost">Sort by Cost</option>
                  <option value="quantity">Sort by Quantity</option>
                  <option value="species">Sort by Species</option>
                </select>

                {/* Sort Order */}
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition"
                >
                  {sortOrder === 'asc' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4"/>
                    </svg>
                  )}
                  {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                </button>

                {/* Clear Filters */}
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSearchInput('');
                    setSortBy('date');
                    setSortOrder('desc');
                  }}
                  className="px-3 py-2 text-gray-600 hover:text-gray-800 transition"
                >
                  Clear Filters
                </button>
              </div>
            </div>

            {/* Toast is handled globally below; no inline banner here */}

            <div className="rounded-md border border-gray-200 overflow-hidden shadow">
              <div className="overflow-x-auto">
                <div className="max-h-[60vh] overflow-y-auto" ref={containerRef} onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}>
                  <table className="w-full text-xs table-fixed">
                    <thead className="bg-blue-50 text-gray-700 sticky top-0 z-10">
                      <tr className="text-center text-xs">
                        {/* Bulk selection checkbox removed */}
                        <th className="px-4 py-3 border-b text-center align-middle">Date</th>
                        <th className="px-4 py-3 border-b text-center align-middle">Beneficiary</th>
                        <th className="px-4 py-3 border-b text-center align-middle">Gender</th>
                        <th className="px-4 py-3 border-b text-center align-middle">Barangay</th>
                        <th className="px-4 py-3 border-b text-center align-middle">Municipality</th>
                        <th className="px-4 py-3 border-b text-center align-middle">Contact</th>
                        <th className="px-4 py-3 border-b text-center align-middle">Species</th>
                        <th className="px-4 py-3 border-b text-center align-middle">Quantity</th>
                        <th className="px-4 py-3 border-b text-center align-middle">Cost</th>
                        <th className="px-4 py-3 border-b text-center align-middle">Distribution</th>
                        <th className="px-4 py-3 border-b text-center align-middle">Type</th>
                        <th className="px-4 py-3 border-b text-center align-middle">Feedback</th>
                        <th className="px-4 py-3 text-center border-b align-middle">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {loading ? (
                        <tr>
                          <td colSpan="13" className="px-4 py-6 text-center text-gray-500 text-xs">Loading...</td>
                        </tr>
                      ) : filteredRows.length === 0 ? (
                        <tr>
                          <td colSpan="13" className="px-4 py-6 text-center text-gray-500 text-xs">
                            {rows.length === 0 
                              ? "No transactions yet. Click \"Add Transaction\" to get started."
                              : "No transactions match your search criteria."}
                          </td>
                        </tr>
                      ) : (
                        (() => {
                          const totalRows = filteredRows.length;
                          const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
                          const visibleCount = Math.ceil((containerHeight || 0) / ROW_HEIGHT) + OVERSCAN * 2;
                          const endIndex = Math.min(totalRows, startIndex + visibleCount);
                          const topSpacerHeight = startIndex * ROW_HEIGHT;
                          const bottomSpacerHeight = (totalRows - endIndex) * ROW_HEIGHT;
                          const slice = filteredRows.slice(startIndex, endIndex);

                          return (
                            <>
                              {topSpacerHeight > 0 && (
                                <tr key="top-spacer">
                                  <td colSpan="13" style={{ height: `${topSpacerHeight}px` }} />
                                </tr>
                              )}
                              {slice.map((r) => (
                                <tr key={r.transactionId} className="hover:bg-gray-50 text-center">
                                  {/* Row selection checkbox removed */}
                                  <td className="px-4 py-3 text-xs text-center align-middle">{formatDate(r.distribution_date)}</td>
                                  <td className="px-4 py-3 font-medium text-center align-middle">{r.beneficiary_name || 'N/A'}</td>
                                  <td className="px-4 py-3 capitalize text-center align-middle">{r.gender || 'N/A'}</td>
                                  <td className="px-4 py-3 text-center align-middle">{r.barangay || 'N/A'}</td>
                                  <td className="px-4 py-3 text-center align-middle">{r.municipality || 'N/A'}</td>
                                  <td className="px-4 py-3 text-center align-middle">{r.contact_number || 'N/A'}</td>
                                  <td className="px-4 py-3 capitalize text-center align-middle">{r.species || 'N/A'}</td>
                                  <td className="px-4 py-3 text-center align-middle">{r.quantity_received > 0 ? r.quantity_received : 'N/A'}</td>
                                  <td className="px-4 py-3 text-center align-middle">{Number(r.cost) > 0 ? `₱${Number(r.cost).toFixed(2)}` : 'N/A'}</td>
                                  <td className="px-4 py-3 capitalize text-center align-middle">{r.distribution || 'N/A'}</td>
                                  <td className="px-4 py-3 capitalize text-center align-middle">{r.type || 'N/A'}</td>
                                  <td className="px-4 py-3 capitalize text-center align-middle">{r.feedback || 'N/A'}</td>
                                  <td className="px-4 py-3 text-center align-middle">
                                    <div className="flex items-center justify-center gap-3">
                                      <button
                                        onClick={() => goToUpdate(r.transactionId)}
                                        className="text-blue-600 hover:text-blue-800"
                                        aria-label="Edit transaction"
                                        title="Edit"
                                        disabled={loading}
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                                          <path d="M12 20h9"/>
                                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
                                        </svg>
                                      </button>
                                      <button
                                        onClick={() => openDelete(r)}
                                        className="text-red-600 hover:text-red-800"
                                        aria-label="Delete transaction"
                                        title="Delete"
                                        disabled={loading}
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                                          <path d="M3 6h18"/>
                                          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                          <path d="M10 11v6"/>
                                          <path d="M14 11v6"/>
                                        </svg>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                              {bottomSpacerHeight > 0 && (
                                <tr key="bottom-spacer">
                                  <td colSpan="13" style={{ height: `${bottomSpacerHeight}px` }} />
                                </tr>
                              )}
                            </>
                          );
                        })()
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Modal for Add Transaction */}
          {isModalOpen && (
            <div className="fixed inset-0 bg-black/50 grid place-items-center z-50 p-4">
              <div className="bg-white rounded-lg p-6 w-full max-w-4xl shadow-lg max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center border-b pb-3 mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Add New Transaction</h2>
                  <button
                    className="text-gray-500 hover:text-gray-700"
                    onClick={() => setIsModalOpen(false)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <AddTransaction 
                  onClose={() => setIsModalOpen(false)} 
                  onTransactionAdded={handleAddTransaction}
                />
              </div>
            </div>
          )}

          {/* Modal for Update Transaction */}
          {isUpdateOpen && selectedRow && (
            <div className="fixed inset-0 bg-black/50 grid place-items-center z-50 p-4">
              <div className="bg-white rounded-lg p-6 w-full max-w-4xl shadow-lg max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center border-b pb-3 mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Update Transaction</h2>
                  <button
                    className="text-gray-500 hover:text-gray-700"
                    onClick={() => setIsUpdateOpen(false)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <UpdateTransaction 
                  id={selectedRow.transactionId}
                  initialData={selectedRow}
                  onClose={() => setIsUpdateOpen(false)}
                  onTransactionUpdated={handleUpdateTransaction}
                />
              </div>
            </div>
          )}

          {/* Modal for Delete Transaction */}
          {isDeleteOpen && (
            <div className="fixed inset-0 bg-black/50 grid place-items-center z-50 p-4">
              <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-lg">
                <div className="flex justify-between items-center border-b pb-3 mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Delete Transaction</h2>
                  <button className="text-gray-500 hover:text-gray-700" onClick={() => setIsDeleteOpen(false)}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-gray-700 mb-4">Are you sure you want to delete this transaction?</p>
                <div className="bg-gray-50 rounded-md border border-gray-200 p-4 text-sm text-gray-700 mb-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6">
                    <div className="grid grid-cols-[140px,1fr] items-center gap-2">
                      <span className="text-gray-500">Distribution Date</span>
                      <span className="font-medium text-gray-900">{formatDate(selectedRow?.distribution_date)}</span>
                    </div>
                    <div className="grid grid-cols-[140px,1fr] items-center gap-2">
                      <span className="text-gray-500">Beneficiary Name</span>
                      <span className="font-medium text-gray-900">{selectedRow?.beneficiary_name || 'N/A'}</span>
                    </div>
                    <div className="grid grid-cols-[140px,1fr] items-center gap-2">
                      <span className="text-gray-500">Gender</span>
                      <span className="font-medium text-gray-900 capitalize">{selectedRow?.gender || 'N/A'}</span>
                    </div>
                    <div className="grid grid-cols-[140px,1fr] items-center gap-2">
                      <span className="text-gray-500">Barangay</span>
                      <span className="font-medium text-gray-900">{selectedRow?.barangay || 'N/A'}</span>
                    </div>
                    <div className="grid grid-cols-[140px,1fr] items-center gap-2">
                      <span className="text-gray-500">Municipality</span>
                      <span className="font-medium text-gray-900">{selectedRow?.municipality || 'N/A'}</span>
                    </div>
                    <div className="grid grid-cols-[140px,1fr] items-center gap-2">
                      <span className="text-gray-500">Contact Number</span>
                      <span className="font-medium text-gray-900">{selectedRow?.contact_number || 'N/A'}</span>
                    </div>
                    <div className="grid grid-cols-[140px,1fr] items-center gap-2">
                      <span className="text-gray-500">Species</span>
                      <span className="font-medium text-gray-900">{selectedRow?.species || 'N/A'}</span>
                    </div>
                    <div className="grid grid-cols-[140px,1fr] items-center gap-2">
                      <span className="text-gray-500">Quantity Received</span>
                      <span className="font-medium text-gray-900">{selectedRow?.quantity_received ?? 'N/A'}</span>
                    </div>
                    <div className="grid grid-cols-[140px,1fr] items-center gap-2">
                      <span className="text-gray-500">Cost</span>
                      <span className="font-medium text-gray-900">{typeof selectedRow?.cost === 'number' ? `₱${selectedRow.cost.toFixed(2)}` : (selectedRow?.cost || 'N/A')}</span>
                    </div>
                    <div className="grid grid-cols-[140px,1fr] items-center gap-2">
                      <span className="text-gray-500">Distribution</span>
                      <span className="font-medium text-gray-900 capitalize">{selectedRow?.distribution || 'N/A'}</span>
                    </div>
                    <div className="grid grid-cols-[140px,1fr] items-center gap-2">
                      <span className="text-gray-500">Type</span>
                      <span className="font-medium text-gray-900 capitalize">{selectedRow?.type || 'N/A'}</span>
                    </div>
                    <div className="grid grid-cols-[140px,1fr] items-center gap-2">
                      <span className="text-gray-500">Feedback</span>
                      <span className="font-medium text-gray-900 capitalize">{selectedRow?.feedback || 'N/A'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button onClick={() => setIsDeleteOpen(false)} className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
                  <button onClick={confirmDelete} className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-60" disabled={isDeleting}>
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal for Import CSV */}
          {isImportOpen && (
            <div className="fixed inset-0 bg-black/50 grid place-items-center z-50 p-4">
              <div className="bg-white rounded-lg p-6 w-full max-w-4xl shadow-lg max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center border-b pb-3 mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Import Transactions from CSV</h2>
                  <button
                    className="text-gray-500 hover:text-gray-700"
                    onClick={() => setIsImportOpen(false)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <ImportCSV 
                  onClose={() => {
                    setIsImportOpen(false);
                    // Refresh transactions after import
                    fetchTransactions();
                  }} 
                />
              </div>
            </div>
          )}

          {/* Bulk delete modal removed */}
        </div>
      </div>
    {/* Toast notifications */}
    {loadProgress.visible && (
      <div className="fixed inset-0 z-[110] grid place-items-center">
        <div className="w-[min(90vw,28rem)] rounded-md border border-gray-200 bg-white shadow-lg">
          <div className="px-4 py-3 text-sm text-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900">Loading transactions</span>
              <span className="tabular-nums text-gray-600">{loadProgress.total > 0 ? `${loadProgress.percent}%` : ''}</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full"
                style={{ width: `${loadProgress.total > 0 ? loadProgress.percent : 100}%`, transition: 'width 200ms ease' }}
              />
            </div>
            {loadProgress.total > 0 && (
              <div className="mt-2 text-[11px] text-gray-500 tabular-nums">
                {loadProgress.fetched} / {loadProgress.total}
              </div>
            )}
          </div>
        </div>
      </div>
    )}
    {toast.visible && (
      <div
        className={`fixed top-4 right-4 z-[100] min-w-64 max-w-sm rounded-md shadow-lg border px-4 py-3 text-sm transition-opacity ${
          toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
          toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
          'bg-blue-50 border-blue-200 text-blue-800'
        }`}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5">
            {toast.type === 'success' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
            ) : toast.type === 'error' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"/></svg>
            )}
          </div>
          <div className="flex-1 pr-4">{toast.message}</div>
          <button
            onClick={() => setToast((prev) => ({ ...prev, visible: false }))}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close notification"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      </div>
    )}
    </div>
  );
};

export default Transactions;
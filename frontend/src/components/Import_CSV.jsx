import React, { useEffect, useState } from 'react';
import { useUser } from '../contexts/UserContext';
import supabase from '../helper/supabaseClient';

const ImportCSV = ({ onClose }) => {
  const { userData } = useUser();
  const [file, setFile] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 640px)');
    const update = () => {
      const mobile = media.matches;
      setIsMobile(mobile);
      setShowPreview(!mobile); // collapse preview on small screens
    };
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setError('');
      setSuccess('');
      parseCSV(selectedFile);
    } else {
      setError('Please select a valid CSV file.');
      setFile(null);
    }
  };

  const parseCSV = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      // Expected headers mapping based on transactions table schema
      const expectedHeaders = {
        'month': 'month',
        'day': 'day',
        'year': 'year',
        'beneficiaries': 'beneficiary_name',
        'gender': 'gender',
        'barangay': 'barangay',
        'municipality': 'municipality',
        'contact number': 'contact_number',
        'conatct number': 'contact_number', // Note: keeping original typo for compatibility
        'species': 'species',
        'quantity received': 'quantity_received',
        'quantity': 'quantity_received', // Alternative mapping
        'cost': 'cost',
        'distribution': 'distribution',
        'type': 'type',
        'feedback': 'feedback'
      };

      // Helper: normalize month input; also support values like "January 2025"
      const getMonthNameAndMaybeYear = (raw) => {
        if (!raw) return { monthName: null, yearInMonth: null };
        const input = String(raw).trim();
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                            'July', 'August', 'September', 'October', 'November', 'December'];

        // Case 1: "January 2025" or "Jan 2025"
        const m = input.match(/^([A-Za-z]+)\s+(\d{4})$/);
        if (m) {
          const name = m[1];
          const year = m[2];
          // Normalize short names like Jan -> January
          const full = monthNames.find((mn) => mn.toLowerCase().startsWith(name.toLowerCase()));
          return { monthName: full || name, yearInMonth: year };
        }

        // Case 2: numeric month with year e.g. "1 2025" or "01 2025"
        const m2 = input.match(/^(\d{1,2})\s+(\d{4})$/);
        if (m2) {
          const monthNum = parseInt(m2[1], 10);
          const year = m2[2];
          const name = monthNum >= 1 && monthNum <= 12 ? monthNames[monthNum - 1] : null;
          return { monthName: name, yearInMonth: year };
        }

        // Case 3: numeric only
        const monthNum = parseInt(input, 10);
        if (Number.isFinite(monthNum) && monthNum >= 1 && monthNum <= 12) {
          return { monthName: monthNames[monthNum - 1], yearInMonth: null };
        }

        // Case 4: textual month only (January)
        const full = monthNames.find((mn) => mn.toLowerCase() === input.toLowerCase() || mn.toLowerCase().startsWith(input.toLowerCase()));
        if (full) return { monthName: full, yearInMonth: null };

        // Otherwise return as-is (let later logic handle)
        return { monthName: input, yearInMonth: null };
      };

      // Helper function to get month index for date creation
      const getMonthIndex = (month) => {
        const monthIndex = {
          'January': 0, 'February': 1, 'March': 2, 'April': 3,
          'May': 4, 'June': 5, 'July': 6, 'August': 7,
          'September': 8, 'October': 9, 'November': 10, 'December': 11
        };
        return monthIndex[month] || 0;
      };

      const data = [];
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',').map(v => v.trim());
          const row = {};
          
          headers.forEach((header, index) => {
            const value = values[index] || '';
            if (expectedHeaders[header]) {
              row[expectedHeaders[header]] = value;
            }
          });
          
          // Convert numeric fields
          if (row.quantity_received) row.quantity_received = parseInt(row.quantity_received) || 0;
          if (row.cost) row.cost = parseFloat(row.cost) || 0;
          
          // Normalize month and capture year if provided in the month cell (e.g., "January 2025")
          if (row.month) {
            const { monthName, yearInMonth } = getMonthNameAndMaybeYear(row.month);
            row.month = monthName;
            if (!row.year && yearInMonth) row.year = yearInMonth;
          }
          
          // Create distribution_date from month, day, year
          if (row.month && row.year) {
            const monthIndex = getMonthIndex(row.month);
            const dayValue = row.day ? parseInt(row.day) : 1; // default to 1 if day missing
            const date = new Date(parseInt(row.year), monthIndex, dayValue);
            row.distribution_date = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
          }
          
          // Add userId (required field) - will be set during upload
          row.userId = userData?.uid || null;
          
          // Accept rows even if some fields are missing; log for visibility
          const requiredFields = ['beneficiary_name', 'gender', 'barangay', 'municipality', 'species', 'distribution_date'];
          const missingFields = requiredFields.filter(field => !row[field] || row[field].toString().trim() === '');
          if (missingFields.length > 0) {
            console.warn(`Row ${i + 1} has missing fields: ${missingFields.join(', ')}`);
          }
          data.push(row);
        }
      }
      
      setCsvData(data);
      setSuccess(`Successfully parsed ${data.length} transactions from CSV.`);
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (!userData) {
      setError('You must be logged in to import transactions.');
      return;
    }

    if (csvData.length === 0) {
      setError('No data to upload. Please select a valid CSV file.');
      return;
    }

    setIsUploading(true);
    setError('');
    setSuccess('');

    // Map a parsed CSV row to the transactions table schema, tolerating missing fields
    const mapRowToTransaction = (row) => {
      const safeNumber = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };

      return {
        // Required by schema but allow nulls; RLS/DB constraints will enforce as needed
        distribution_date: row.distribution_date || null,
        beneficiary_name: row.beneficiary_name || null,
        gender: row.gender || null,
        barangay: row.barangay || null,
        municipality: row.municipality || null,
        contact_number: row.contact_number || null,
        species: row.species || null,
        quantity_received: safeNumber(row.quantity_received),
        cost: safeNumber(row.cost),
        distribution: row.distribution || null,
        type: row.type || null,
        feedback: row.feedback || null,
        userId: userData?.uid || row.userId || null,
      };
    };

    try {
      // Prepare data
      const rows = csvData.map(mapRowToTransaction);

      // Chunk inserts to avoid payload limits
      const CHUNK_SIZE = 100;
      let importedCount = 0;
      const errors = [];

      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE);
        const { error: insertError, count } = await supabase
          .from('transactions')
          .insert(chunk)
          .select('*', { count: 'exact' });

        if (insertError) {
          errors.push({ indexStart: i + 1, message: insertError.message });
        } else {
          importedCount += count ?? chunk.length;
        }
      }

      if (errors.length > 0) {
        setSuccess(`Imported ${importedCount} out of ${rows.length} transactions. Some rows had errors.`);
        console.warn('Import errors:', errors);
      } else {
        setSuccess(`Successfully imported ${importedCount} transactions!`);
      }

      // Reset after short delay and close
      setTimeout(() => {
        setFile(null);
        setCsvData([]);
        if (onClose) onClose();
      }, 1500);

    } catch (err) {
      console.error('Error uploading transactions:', err);
      setError(err.message || 'Failed to import transactions. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const headers = [
      'Month',
      'Day',
      'Year',
      'Beneficiaries',
      'Gender',
      'Barangay',
      'Municipality',
      'Contact Number',
      'Species',
      'Quantity Received',
      'Cost',
      'Distribution',
      'Type',
      'Feedback'
    ];
    
    const sampleData = [
      'January',
      '15',
      '2024',
      'John Doe',
      'Male',
      'Sample Barangay',
      'Sample Municipality',
      '09123456789',
      'Tilapia',
      '100',
      '5000.00',
      'Sale',
      'pond',
      'satisfied'
    ];

    const csvContent = [headers.join(','), sampleData.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transaction_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="w-[92vw] sm:w-full max-w-[560px] md:max-w-[800px]">
      {error && <p className="text-red-700 bg-red-100 border border-red-300 rounded px-4 py-2 mb-4">{error}</p>}
      {success && <p className="text-green-700 bg-green-100 border border-green-300 rounded px-4 py-2 mb-4">{success}</p>}

      <div className="space-y-6">
        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-blue-900 mb-0 text-sm sm:text-base">CSV Import Instructions</h3>
            <button
              type="button"
              onClick={() => setShowInstructions(v => !v)}
              className="text-blue-700 text-xs sm:text-sm underline"
            >
              {showInstructions ? 'Hide' : 'Show'}
            </button>
          </div>
          {showInstructions && (
            <ul className="text-xs sm:text-sm text-blue-800 space-y-1 mt-2">
            <li>• CSV file must have headers in the first row</li>
            <li>• Required columns: Month, Day, Year, Beneficiaries, Gender, Barangay, Municipality, Contact Number, Species, Quantity Received, Cost, Distribution, Type, Feedback</li>
            <li>• Date format: Separate Month (January-December), Day (1-31), Year (YYYY) columns</li>
            <li>• Gender: Male or Female</li>
            <li>• Distribution: Sale, Donation, etc.</li>
            <li>• Type: pond, tank, etc.</li>
            <li>• Feedback: satisfied, neutral, unsatisfied</li>
            <li>• Quantity Received and Cost should be numeric values</li>
            <li>• Contact Number is optional but recommended</li>
            </ul>
          )}
        </div>

        {/* Template Download */}
        <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-2 sm:p-4">
          <div>
            <h3 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">Need a template?</h3>
            <p className="text-xs sm:text-sm text-gray-600">Download our CSV template to get started</p>
          </div>
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            Download Template
          </button>
        </div>

        {/* File Upload */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 sm:p-6 text-center">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
            id="csv-upload"
          />
          <label
            htmlFor="csv-upload"
            className="cursor-pointer flex flex-col items-center space-y-2 w-full"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-12 h-12 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"/>
            </svg>
            <div>
              <p className="text-lg font-medium text-gray-900">Choose CSV file to upload</p>
              <p className="text-sm text-gray-500">or drag and drop your CSV file here</p>
            </div>
          </label>
          {file && (
            <div className="mt-3 p-2 sm:p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-xs sm:text-sm text-green-800">
                <strong>Selected file:</strong> {file.name} ({csvData.length} transactions found)
              </p>
            </div>
          )}
        </div>

        {/* Preview Data */}
        {csvData.length > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 sm:p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Preview Data ({csvData.length} transactions)</h3>
              <button
                type="button"
                onClick={() => setShowPreview(v => !v)}
                className="text-blue-700 text-xs sm:text-sm underline"
              >
                {showPreview ? 'Hide' : 'Show'}
              </button>
            </div>
            {showPreview && (
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-[11px] sm:text-xs">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-2 py-1 text-left">Date</th>
                      <th className="px-2 py-1 text-left">Beneficiary</th>
                      <th className="px-2 py-1 text-left">Gender</th>
                      <th className="px-2 py-1 text-left">Species</th>
                      <th className="px-2 py-1 text-left">Quantity</th>
                      <th className="px-2 py-1 text-left">Cost</th>
                      <th className="px-2 py-1 text-left">Distribution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.slice(0, isMobile ? 3 : 5).map((row, index) => (
                      <tr key={index} className="border-b border-gray-200">
                        <td className="px-2 py-1">{(() => {
                          if (!row.distribution_date) return 'N/A';
                          const d = new Date(row.distribution_date);
                          const month = d.toLocaleString('en-US', { month: 'long' });
                          const year = d.getFullYear();
                          const day = d.getDate();
                          return day === 1 && row.day === undefined ? `${month} ${year}` : `${month} ${day}, ${year}`;
                        })()}</td>
                        <td className="px-2 py-1">{row.beneficiary_name || 'N/A'}</td>
                        <td className="px-2 py-1">{row.gender || 'N/A'}</td>
                        <td className="px-2 py-1">{row.species || 'N/A'}</td>
                        <td className="px-2 py-1">{row.quantity_received || 'N/A'}</td>
                        <td className="px-2 py-1">{row.cost ? `₱${row.cost}` : 'N/A'}</td>
                        <td className="px-2 py-1">{row.distribution || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {csvData.length > (isMobile ? 3 : 5) && (
                  <p className="text-[11px] sm:text-xs text-gray-500 mt-2">... and {csvData.length - (isMobile ? 3 : 5)} more transactions</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={csvData.length === 0 || isUploading}
            className="w-full sm:w-auto px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isUploading ? 'Importing...' : `Import ${csvData.length} Transactions`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportCSV;
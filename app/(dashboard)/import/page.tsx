"use client";

import { useState, useRef } from "react";
import {
  Upload, Download, FileSpreadsheet, CheckCircle,
  XCircle, AlertCircle, ChevronDown, ChevronUp,
} from "lucide-react";
import { clsx } from "clsx";
import * as XLSX from "xlsx";
import { getToken } from "@/lib/auth";
import { apiImportData, ImportResult } from "@/lib/api";
import RoleGuard from "@/components/auth/RoleGuard";

const IMPORT_TYPES = [
  {
    key: "products",
    label: "Products",
    description: "Import product catalog",
    color: "bg-blue-50 border-blue-200 text-blue-700",
    columns: ["code*", "name*", "description", "unit"],
    sample: [
      { code: "PRD001", name: "LED Bulb 9W", description: "9 Watt LED Bulb", unit: "PCS" },
      { code: "PRD002", name: "LED Bulb 12W", description: "12 Watt LED Bulb", unit: "PCS" },
    ],
  },
  {
    key: "customers",
    label: "Customers",
    description: "Import customer list",
    color: "bg-green-50 border-green-200 text-green-700",
    columns: ["code*", "name*", "contactName", "phone", "email", "address"],
    sample: [
      { code: "CUST001", name: "ABC Enterprises", contactName: "John Doe", phone: "9876543210", email: "abc@example.com", address: "Mumbai" },
    ],
  },
  {
    key: "processes",
    label: "Processes",
    description: "Import production processes",
    color: "bg-purple-50 border-purple-200 text-purple-700",
    columns: ["code*", "name*", "description"],
    sample: [
      { code: "SMT001", name: "SMT", description: "Surface Mount Technology" },
      { code: "ASM001", name: "Assembly", description: "Manual Assembly" },
    ],
  },
  {
    key: "lines",
    label: "Lines",
    description: "Import production lines",
    color: "bg-orange-50 border-orange-200 text-orange-700",
    columns: ["code*", "name*", "capacity"],
    sample: [
      { code: "L001", name: "Line 1", capacity: 50 },
      { code: "L002", name: "Line 2", capacity: 40 },
    ],
  },
  {
    key: "rate-targets",
    label: "Rate Targets",
    description: "Import rate target master",
    color: "bg-red-50 border-red-200 text-red-700",
    columns: ["productCode*", "customerCode*", "processCode*", "hourlyRate*", "targetPerHour*", "ratePerPiece*", "effectiveFrom*", "effectiveTo"],
    sample: [
      { productCode: "PRD001", customerCode: "CUST001", processCode: "ASM001", hourlyRate: 500, targetPerHour: 100, ratePerPiece: 5.5, effectiveFrom: "2026-01-01", effectiveTo: "" },
    ],
  },
  {
    key: "production-entries",
    label: "Production Entries",
    description: "Import historical production data",
    color: "bg-indigo-50 border-indigo-200 text-indigo-700",
    columns: ["date*", "productCode*", "customerCode*", "processCode*", "lineCode*", "shiftName", "manpowerCount*", "shiftHours*", "actualOutput*", "rejectedQty", "remarks"],
    sample: [
      { date: "2026-06-01", productCode: "PRD001", customerCode: "CUST001", processCode: "ASM001", lineCode: "L001", shiftName: "Morning Shift", manpowerCount: 10, shiftHours: 8, actualOutput: 850, rejectedQty: 5, remarks: "Good production" },
    ],
  },
];

export default function ImportPage() {
  const [selectedType, setSelectedType] = useState(IMPORT_TYPES[0]);
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<Record<string, unknown>[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [showSkipped, setShowSkipped] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const headers = selectedType.columns.map((c) => c.replace('*', ''));
    const ws = XLSX.utils.aoa_to_sheet([
      headers,
      ...selectedType.sample.map((row) => headers.map((h) => (row as any)[h] ?? '')),
    ]);
    ws['!cols'] = headers.map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(wb, ws, selectedType.label);
    XLSX.writeFile(wb, `template-${selectedType.key}.xlsx`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = ev.target?.result;
      const wb = XLSX.read(data, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[];
      setParsedRows(rows);
    };
    reader.readAsBinaryString(f);
  };

  const handleImport = async () => {
    if (!parsedRows.length) return;
    const token = getToken();
    if (!token) return;
    setImporting(true);
    setResult(null);
    try {
      const res = await apiImportData(token, selectedType.key, parsedRows);
      setResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedRows([]);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-gray-900">Import Center</h2>
          <p className="text-sm text-gray-500 mt-1">Bulk import data from Excel files</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left — Type Selection */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Select Import Type</p>
            {IMPORT_TYPES.map((type) => (
              <button key={type.key}
                onClick={() => { setSelectedType(type); handleReset(); }}
                className={clsx(
                  "w-full text-left px-4 py-3 rounded-xl border-2 transition-all",
                  selectedType.key === type.key
                    ? type.color + " border-current"
                    : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                )}>
                <p className="font-semibold text-sm">{type.label}</p>
                <p className="text-xs opacity-70 mt-0.5">{type.description}</p>
              </button>
            ))}
          </div>

          {/* Right — Import Panel */}
          <div className="lg:col-span-2 space-y-5">
            {/* Template Download */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-800">
                    {selectedType.label} Import
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Required columns: {selectedType.columns.filter((c) => c.includes('*')).map((c) => c.replace('*', '')).join(', ')}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Optional: {selectedType.columns.filter((c) => !c.includes('*')).join(', ') || 'none'}
                  </p>
                </div>
                <button onClick={handleDownloadTemplate}
                  className="flex items-center gap-2 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-medium border border-green-200 transition-colors">
                  <Download size={14} />
                  Sample Template
                </button>
              </div>

              {/* Column Guide */}
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedType.columns.map((col) => (
                  <span key={col} className={clsx(
                    "text-xs px-2 py-1 rounded-lg font-mono",
                    col.includes('*')
                      ? "bg-blue-100 text-blue-700 font-semibold"
                      : "bg-gray-100 text-gray-600"
                  )}>
                    {col}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">* = required field</p>
            </div>

            {/* File Upload */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-800 mb-4">Upload File</h3>

              <div
                onClick={() => fileInputRef.current?.click()}
                className={clsx(
                  "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
                  file ? "border-blue-300 bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                )}>
                <FileSpreadsheet size={32} className={clsx("mx-auto mb-3", file ? "text-blue-500" : "text-gray-300")} />
                {file ? (
                  <div>
                    <p className="text-sm font-semibold text-blue-700">{file.name}</p>
                    <p className="text-xs text-blue-500 mt-1">{parsedRows.length} rows found</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-500">Click to upload Excel file</p>
                    <p className="text-xs text-gray-400 mt-1">.xlsx or .xls files only</p>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" />
              </div>

              {parsedRows.length > 0 && !result && (
                <div className="mt-4">
                  {/* Preview */}
                  <div className="bg-gray-50 rounded-xl overflow-hidden mb-4">
                    <div className="px-4 py-2 bg-gray-100 border-b border-gray-200">
                      <p className="text-xs font-semibold text-gray-600">Preview (first 3 rows)</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr>
                            {Object.keys(parsedRows[0]).map((k) => (
                              <th key={k} className="text-left px-3 py-2 text-gray-500 font-medium whitespace-nowrap">{k}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {parsedRows.slice(0, 3).map((row, i) => (
                            <tr key={i} className="border-t border-gray-200">
                              {Object.values(row).map((val, j) => (
                                <td key={j} className="px-3 py-2 text-gray-700 whitespace-nowrap">{String(val ?? '')}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={handleReset}
                      className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
                      Cancel
                    </button>
                    <button onClick={handleImport} disabled={importing}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium">
                      {importing ? (
                        <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Importing...</>
                      ) : (
                        <><Upload size={16} />Import {parsedRows.length} Rows</>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Result */}
            {result && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
                <h3 className="text-sm font-bold text-gray-800">Import Result</h3>

                {/* Summary Cards */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: "Total", value: result.total, color: "text-gray-700 bg-gray-50" },
                    { label: "Imported", value: result.imported, color: "text-green-700 bg-green-50", icon: <CheckCircle size={14} /> },
                    { label: "Skipped", value: result.skipped, color: "text-yellow-700 bg-yellow-50", icon: <AlertCircle size={14} /> },
                    { label: "Errors", value: result.errors.length, color: "text-red-700 bg-red-50", icon: <XCircle size={14} /> },
                  ].map((card) => (
                    <div key={card.label} className={clsx("rounded-xl p-3 text-center", card.color)}>
                      <div className="flex items-center justify-center gap-1">
                        {card.icon}
                        <p className="text-2xl font-black">{card.value}</p>
                      </div>
                      <p className="text-xs font-medium mt-0.5">{card.label}</p>
                    </div>
                  ))}
                </div>

                {/* Overall status */}
                <div className={clsx("flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium",
                  result.errors.length === 0 ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"
                )}>
                  {result.errors.length === 0
                    ? <><CheckCircle size={16} /> Import completed successfully!</>
                    : <><AlertCircle size={16} /> Import completed with {result.errors.length} error(s)</>
                  }
                </div>

                {/* Errors */}
                {result.errors.length > 0 && (
                  <div className="border border-red-200 rounded-xl overflow-hidden">
                    <button onClick={() => setShowErrors(!showErrors)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-red-50 text-red-700 text-sm font-medium">
                      <span className="flex items-center gap-2">
                        <XCircle size={14} />
                        {result.errors.length} Errors
                      </span>
                      {showErrors ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {showErrors && (
                      <div className="divide-y divide-red-100 max-h-48 overflow-y-auto">
                        {result.errors.map((err, i) => (
                          <div key={i} className="px-4 py-2.5 text-xs">
                            <span className="font-medium text-red-700">Row {err.row}</span>
                            <span className="text-gray-500 mx-1">·</span>
                            <span className="text-gray-600">{err.field}</span>
                            <span className="text-gray-500 mx-1">·</span>
                            <span className="text-red-600">{err.message}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Skipped */}
                {result.skippedRows.length > 0 && (
                  <div className="border border-yellow-200 rounded-xl overflow-hidden">
                    <button onClick={() => setShowSkipped(!showSkipped)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-yellow-50 text-yellow-700 text-sm font-medium">
                      <span className="flex items-center gap-2">
                        <AlertCircle size={14} />
                        {result.skippedRows.length} Skipped (duplicates)
                      </span>
                      {showSkipped ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {showSkipped && (
                      <div className="divide-y divide-yellow-100 max-h-36 overflow-y-auto">
                        {result.skippedRows.map((row, i) => (
                          <div key={i} className="px-4 py-2 text-xs text-yellow-700">{row}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <button onClick={handleReset}
                  className="w-full px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
                  Import Another File
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}

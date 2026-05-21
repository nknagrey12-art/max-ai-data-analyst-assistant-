import React, { useRef, useState } from "react";
import Papa from "papaparse";
import { Upload, ChevronRight, CheckCircle2, AlertTriangle, HelpCircle, FileText, Database, Sparkles } from "lucide-react";
import { DATASET_PRESETS, DatasetSummary, ColumnAnalysis } from "../types";

interface DataSetExplorerProps {
  onDataParsed: (summary: DatasetSummary, rawRows: any[]) => void;
  activeSummary: DatasetSummary | null;
}

export default function DataSetExplorer({ onDataParsed, activeSummary }: DataSetExplorerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<"step1" | "step2" | "step3">("step1");

  // Dynamic analysis engine
  const processCSVContent = (csvHeader: string[], csvRows: any[]) => {
    const totalRows = csvRows.length;
    const totalCols = csvHeader.length;
    
    // Identify columns types and statistics
    const columns: ColumnAnalysis[] = [];
    const columnsWithMissing: { name: string; count: number }[] = [];
    const suspiciousColumns: { name: string; reason: string }[] = [];

    csvHeader.forEach(colName => {
      const nonNullValues = csvRows
        .map(row => row[colName])
        .filter(val => val !== undefined && val !== null && String(val).trim() !== "");
      
      const missingCount = totalRows - nonNullValues.length;
      if (missingCount > 0) {
        columnsWithMissing.push({ name: colName, count: missingCount });
      }

      // Sample first few string values
      const sampleValues = nonNullValues.slice(0, 5).map(v => String(v));

      // Test numeric candidate
      let isNumeric = false;
      let numericVals: number[] = [];
      if (nonNullValues.length > 0) {
        numericVals = nonNullValues
          .map(val => Number(val))
          .filter(val => !isNaN(val));
        
        // If > 70% of non-null values are numeric, classify as numeric
        if (numericVals.length / nonNullValues.length > 0.70) {
          isNumeric = true;
        }
      }

      const uniqueValuesSet = new Set(nonNullValues);
      const uniqueCount = uniqueValuesSet.size;

      // Calculate frequency distribution for top values
      const freqMap: Record<string, number> = {};
      nonNullValues.forEach(val => {
        const strVal = String(val).trim();
        freqMap[strVal] = (freqMap[strVal] || 0) + 1;
      });

      const topValues = Object.entries(freqMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([value, count]) => ({
          value,
          count,
          percentage: totalRows > 0 ? (count / totalRows) * 100 : 0
        }));

      // Flags for suspicious data (negative values where positive expected, single values repeating)
      if (isNumeric) {
        const hasNegativeVal = numericVals.some(v => v < 0);
        const colLower = colName.toLowerCase();
        if (hasNegativeVal && (colLower.includes("inquir") || colLower.includes("ticket") || colLower.includes("revenue") || colLower.includes("sold") || colLower.includes("age") || colLower.includes("wait"))) {
          suspiciousColumns.push({ name: colName, reason: "Contains negative value entries which violates physical metric constraints." });
        }

        // Standard statistical computations
        const sorted = [...numericVals].sort((a, b) => a - b);
        const min = sorted[0] || 0;
        const max = sorted[sorted.length - 1] || 0;
        const sum = sorted.reduce((a, b) => a + b, 0);
        const mean = sorted.length > 0 ? sum / sorted.length : 0;
        
        // Median
        let median = 0;
        if (sorted.length > 0) {
          const mid = Math.floor(sorted.length / 2);
          median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
        }

        // Standard deviation
        let std = 0;
        if (sorted.length > 1) {
          const sqDiffSum = sorted.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0);
          std = Math.sqrt(sqDiffSum / (sorted.length - 1));
        }

        columns.push({
          name: colName,
          type: "numeric",
          sampleValues,
          min,
          max,
          mean,
          median,
          std,
          uniqueCount,
          topValues,
          missingCount
        });
      } else {
        // Categorical or Date detection
        const isDatePattern = nonNullValues.some(val => {
          return !isNaN(Date.parse(String(val))) && String(val).includes("-");
        });

        columns.push({
          name: colName,
          type: isDatePattern ? "date" : (uniqueCount < totalRows * 0.4 ? "category" : "text"),
          sampleValues,
          uniqueCount,
          topValues,
          missingCount
        });
      }
    });

    // Check for duplicate rows
    const stringifiedRows = csvRows.map(r => JSON.stringify(r));
    const uniqueStringified = new Set(stringifiedRows);
    const hasDuplicates = uniqueStringified.size < stringifiedRows.length;
    const duplicateCount = stringifiedRows.length - uniqueStringified.size;
    if (hasDuplicates) {
      suspiciousColumns.push({
        name: "Entire Dataset",
        reason: `Dataset contains exactly ${duplicateCount} repeating duplicate row signatures.`
      });
    }

    // Compute Data Quality Rating
    let dataQualityScore = 10.0;
    
    // Deduct for missing columns
    dataQualityScore -= (columnsWithMissing.length * 0.4);
    // Deduct for duplicates
    if (hasDuplicates) {
      dataQualityScore -= 1.0;
    }
    // Deduct for suspicious anomalies
    dataQualityScore -= (suspiciousColumns.length * 0.5);
    
    // Ensure quality bounds
    dataQualityScore = Math.max(1.0, Math.min(10.0, parseFloat(dataQualityScore.toFixed(1))));

    // Extract first 3 rows
    const sampleRows = csvRows.slice(0, 3);

    const summary: DatasetSummary = {
      totalRows,
      totalCols,
      columns,
      sampleRows,
      hasDuplicates,
      duplicateCount,
      columnsWithMissing,
      suspiciousColumns,
      dataQualityScore
    };

    onDataParsed(summary, csvRows);
  };

  // Papa CSV handler
  const handleCSVTextToReport = (text: string) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          console.warn("CSV Row processing warning, skipping invalid rows:", results.errors);
        }
        if (results.data && results.data.length > 0 && results.meta.fields) {
          processCSVContent(results.meta.fields, results.data);
        }
      }
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const textStr = event.target?.result as string;
        handleCSVTextToReport(textStr);
      };
      reader.readAsText(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith(".csv")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const textStr = event.target?.result as string;
        handleCSVTextToReport(textStr);
      };
      reader.readAsText(file);
    }
  };

  const triggerFileSelection = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Selector: Choose custom presets */}
      {!activeSummary && (
        <div className="bg-[#141417] border border-white/10 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-blue-400" />
            <h3 className="font-sans font-semibold text-white/90 text-sm tracking-tight">
              Select an Analyst Presets Dataset to Benchmark Immediately
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {DATASET_PRESETS.map((preset, idx) => (
              <div
                key={`preset-${idx}`}
                onClick={() => handleCSVTextToReport(preset.csvData)}
                className="group border border-white/5 bg-white/[0.02] hover:border-blue-500 hover:bg-white/5 cursor-pointer rounded p-4 transition-all duration-200"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-blue-600/10 rounded group-hover:bg-blue-600/20 text-blue-400 transition-colors">
                    <Database className="w-4 h-4" />
                  </div>
                  <h4 className="font-sans font-bold text-white/80 text-xs transition-colors group-hover:text-blue-450">
                    {preset.name}
                  </h4>
                </div>
                <p className="font-sans text-[11px] text-white/40 leading-relaxed">
                  {preset.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CSV Intersecting Drop Zone */}
      {!activeSummary && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerFileSelection}
          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-all duration-250 ${
            isDragging
              ? "border-blue-500 bg-blue-500/10 text-blue-400"
              : "border-white/15 hover:border-blue-500 bg-[#141417] text-white/80"
          }`}
        >
          <input
            id="csv_file_uploader_input"
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv"
            className="hidden"
          />
          <div className="p-3 bg-white/5 rounded-full text-blue-400 shadow-sm border border-white/10 mb-3 transition-transform group-hover:scale-105">
            <Upload className="w-6 h-6 text-blue-400" />
          </div>
          <h3 className="font-sans font-semibold text-white text-sm tracking-tight">Upload Dataset Filestation</h3>
          <p className="font-sans text-xs text-white/40 mt-1 max-w-sm">
            Drag and drop your spreadsheet file here, or click to browse local CSV paths.
          </p>
          <span className="font-mono text-[9px] text-white/40 bg-white/5 px-2 py-0.5 rounded mt-4 uppercase">
            CSV files only
          </span>
        </div>
      )}

      {/* Show Dataset Statistics and Tables (Step 1, 2, 3 Active Summary) */}
      {activeSummary && (
        <div className="bg-[#141417] border border-white/10 rounded-lg shadow-lg flex flex-col flex-1 h-full min-h-[500px]">
          
          {/* Section Step Tabs Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-white/[0.02] rounded-t-lg">
            <div className="flex items-center gap-1.5 sm:gap-4 overflow-x-auto">
              {/* Tab 1: Dataset Overview */}
              <button
                id="tab_step1"
                onClick={() => setActiveTab("step1")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeTab === "step1"
                    ? "bg-blue-600 text-white"
                    : "text-white/70 bg-white/5 hover:bg-white/10 border border-white/10"
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Dataset Overview (Step 1)</span>
              </button>

              {/* Tab 2: Quality report */}
              <button
                id="tab_step2"
                onClick={() => setActiveTab("step2")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeTab === "step2"
                    ? "bg-blue-600 text-white"
                    : "text-white/70 bg-white/5 hover:bg-white/10 border border-white/10"
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Quality Report (Step 2)</span>
              </button>

              {/* Tab 3: Statistical summary */}
              <button
                id="tab_step3"
                onClick={() => setActiveTab("step3")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeTab === "step3"
                    ? "bg-blue-600 text-white"
                    : "text-white/70 bg-white/5 hover:bg-white/10 border border-white/10"
                }`}
              >
                <Database className="w-4 h-4" />
                <span>Statistical Summary (Step 3)</span>
              </button>
            </div>
            
            <div className="hidden md:flex items-center gap-2">
              <span className="font-mono text-[10px] text-white/40 font-semibold bg-white/5 border border-white/10 px-2 py-0.5 rounded uppercase">
                {activeSummary.totalRows} Rows × {activeSummary.totalCols} Cols
              </span>
            </div>
          </div>

          {/* Tab Contents */}
          <div className="p-6 flex-1 overflow-y-auto">
            {activeTab === "step1" && (
              <div className="space-y-6">
                
                {/* Visual Overview Matrix Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white/5 border border-white/10 rounded p-4">
                    <h4 className="font-sans text-[10px] uppercase tracking-wider font-bold text-white/40">Total Rows Collected</h4>
                    <p className="font-mono font-bold text-white text-2xl mt-1 tracking-tight">{activeSummary.totalRows.toLocaleString()}</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded p-4">
                    <h4 className="font-sans text-[10px] uppercase tracking-wider font-bold text-white/40">Active Columns Selected</h4>
                    <p className="font-mono font-bold text-white text-2xl mt-1 tracking-tight">{activeSummary.totalCols.toLocaleString()}</p>
                  </div>
                </div>

                {/* Columns Definition List */}
                <div>
                  <h3 className="font-sans font-bold uppercase text-[11px] tracking-widest text-white/50 mb-3">Active Fields Metadata Index</h3>
                  <div className="border border-white/10 rounded overflow-hidden text-left bg-white/[0.02]">
                    <table className="w-full text-xs font-sans">
                      <thead>
                        <tr className="bg-white/5 border-b border-white/10 text-white/40 font-semibold uppercase text-[10px] tracking-wide">
                          <th className="py-2.5 px-4">Column Name</th>
                          <th className="py-2.5 px-4">Data Type</th>
                          <th className="py-2.5 px-4">Sample Values</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-white/80">
                        {activeSummary.columns.map((col, idx) => (
                          <tr key={`meta-row-${idx}`} className="hover:bg-white/5 transition-colors">
                            <td className="py-3 px-4 font-semibold text-white/95">{col.name}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold uppercase tracking-wider ${
                                col.type === "numeric" 
                                  ? "bg-blue-500/15 text-blue-400 border border-blue-500/25"
                                  : col.type === "date"
                                    ? "bg-purple-500/15 text-purple-400 border border-purple-500/25"
                                    : col.type === "category"
                                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                                      : "bg-white/5 text-white/50 border border-white/10"
                              }`}>
                                {col.type}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-[10px] text-white/40 truncate max-w-xs sm:max-w-md">
                              {col.sampleValues.join(" , ")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* First 3 Rows Preview */}
                <div>
                  <h3 className="font-sans font-bold uppercase text-[11px] tracking-widest text-white/50 mb-3">First 3 Rows Data Preview</h3>
                  <div className="border border-white/10 rounded overflow-x-auto bg-white/[0.02]">
                    <table className="w-full text-xs font-sans text-left">
                      <thead>
                        <tr className="bg-white/5 border-b border-white/10 text-white/50 font-semibold uppercase text-[10px] tracking-wide">
                          {activeSummary.columns.map((col, idx) => (
                            <th key={`head-row-${idx}`} className="py-2.5 px-4 whitespace-nowrap">{col.name}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-white/80 font-mono text-[11px]">
                        {activeSummary.sampleRows.map((row, rIdx) => (
                          <tr key={`sample-data-${rIdx}`} className="hover:bg-white/5 transition-colors">
                            {activeSummary.columns.map((col, cIdx) => (
                              <td key={`cell-${rIdx}-${cIdx}`} className="py-2.5 px-4 whitespace-nowrap">
                                {String(row[col.name] ?? "—")}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Data Quality Report */}
            {activeTab === "step2" && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6 bg-white/[0.02] border border-white/10 rounded-lg p-6">
                  {/* Gauge Scoring Representation */}
                  <div className="relative flex items-center justify-center p-3 shrink-0 mx-auto md:mx-0">
                    <svg className="w-24 h-24 transform -rotate-90">
                      <circle cx="48" cy="48" r="38" className="stroke-white/10" strokeWidth="8" fill="transparent" />
                      <circle 
                        cx="48" 
                        cy="48" 
                        r="38" 
                        className={`${
                          activeSummary.dataQualityScore >= 8.5 
                            ? "stroke-emerald-500" 
                            : activeSummary.dataQualityScore >= 7.0 
                              ? "stroke-amber-500" 
                              : "stroke-red-500"
                        }`} 
                        strokeWidth="8" 
                        fill="transparent" 
                        strokeDasharray={2 * Math.PI * 38}
                        strokeDashoffset={2 * Math.PI * 38 * (1 - activeSummary.dataQualityScore / 10)}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="font-mono text-xl font-bold tracking-tight text-white">
                        {activeSummary.dataQualityScore}
                      </span>
                      <span className="font-sans text-[9px] font-semibold text-white/40 uppercase tracking-wide">Score</span>
                    </div>
                  </div>

                  {/* Summary Text Quality */}
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="font-sans font-bold text-white/90 text-sm tracking-tight">Comprehensive Workspace Integration Score</h3>
                    <p className="font-sans text-xs text-white/40 leading-relaxed mt-1">
                      Our automated profiling evaluates indices uniformity, row duplication checks, bounds validation, and metrics missing percentages. This dataset scores a robust <strong className="text-white font-mono">{activeSummary.dataQualityScore}/10</strong>.
                    </p>
                  </div>
                </div>

                {/* Duplicates and Anomalies List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left">
                  {/* Missing Rows Info Card */}
                  <div className="bg-white/[0.02] border border-white/10 rounded-lg p-5">
                    <h4 className="font-sans font-bold uppercase text-[11px] tracking-widest text-white/50 mb-3">Field Missingness Profiler</h4>
                    {activeSummary.columnsWithMissing.length === 0 ? (
                      <div className="flex items-center gap-2.5 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                        <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400" />
                        <span className="font-sans text-xs font-semibold">Perfect integrity. Zero missing values detected.</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {activeSummary.columnsWithMissing.map((item, idx) => (
                          <div key={`missing-${idx}`} className="flex items-center justify-between border-b border-white/5 pb-1.5 last:border-b-0 text-xs">
                            <span className="font-sans font-semibold text-white/80">{item.name}</span>
                            <span className="font-mono bg-red-500/15 text-red-400 font-bold px-2 py-0.5 rounded text-[10px]">
                              {item.count} missing rows
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Suspicious Anomalies Info Card */}
                  <div className="bg-white/[0.02] border border-white/10 rounded-lg p-5">
                    <h4 className="font-sans font-bold uppercase text-[11px] tracking-widest text-white/50 mb-3">Inconsistencies & Anomaly Flags</h4>
                    {activeSummary.suspiciousColumns.length === 0 ? (
                      <div className="flex items-center gap-2.5 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                        <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400" />
                        <span className="font-sans text-xs font-semibold">Workspace completely clean. No metric anomalies flagged.</span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {activeSummary.suspiciousColumns.map((item, idx) => (
                          <div key={`suspicious-${idx}`} className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs leading-relaxed">
                            <AlertTriangle className="w-4.5 h-4.5 text-amber-400 shrink-0 mt-0.5" />
                            <div>
                              <strong className="font-sans text-white/90 font-bold block">{item.name}</strong>
                              <span className="font-sans text-white/50 block mt-0.5">{item.reason}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Statistical Summary */}
            {activeTab === "step3" && (
              <div className="space-y-8 text-left">
                
                {/* Numeric Columns Card */}
                <div>
                  <div className="flex items-center gap-1.5 mb-3.5">
                    <HelpCircle className="w-4.5 h-4.5 text-blue-400" />
                    <h3 className="font-sans font-bold uppercase text-[11px] tracking-widest text-white/50">Quantitative Variables Summary</h3>
                  </div>
                  
                  {activeSummary.columns.filter(c => c.type === "numeric").length === 0 ? (
                    <p className="font-sans text-xs text-white/40 italic">No numeric continuous fields found in this dataset.</p>
                  ) : (
                    <div className="border border-white/10 rounded overflow-hidden bg-white/[0.02]">
                      <table className="w-full text-xs font-sans">
                        <thead>
                          <tr className="bg-white/5 border-b border-white/10 text-white/50 font-semibold uppercase text-[10px] tracking-wide">
                            <th className="py-2.5 px-4 text-left">Numeric Field</th>
                            <th className="py-2.5 px-4 text-left">Min</th>
                            <th className="py-2.5 px-4 text-left">Max</th>
                            <th className="py-2.5 px-4 text-left">Mean (Avg)</th>
                            <th className="py-2.5 px-4 text-left">Median</th>
                            <th className="py-2.5 px-4 text-left">Std Dev (spread)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-mono text-[11px] text-white/80">
                          {activeSummary.columns.filter(c => c.type === "numeric").map((col, idx) => (
                            <tr key={`stat-num-${idx}`} className="hover:bg-white/5 transition-colors">
                              <td className="py-3 px-4 font-sans font-semibold text-white/90">{col.name}</td>
                              <td className="py-3 px-4">{(col.min ?? 0).toLocaleString()}</td>
                              <td className="py-3 px-4">{(col.max ?? 0).toLocaleString()}</td>
                              <td className="py-3 px-4">{(col.mean ?? 0).toFixed(2)}</td>
                              <td className="py-3 px-4">{(col.median ?? 0).toFixed(2)}</td>
                              <td className="py-3 px-4">{(col.std ?? 0).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Categorical / Text Columns Lists */}
                <div>
                  <div className="flex items-center gap-1.5 mb-3.5">
                    <HelpCircle className="w-4.5 h-4.5 text-emerald-450" />
                    <h3 className="font-sans font-bold uppercase text-[11px] tracking-widest text-white/50">Qualitative & Categorical Variables Summary</h3>
                  </div>

                  {activeSummary.columns.filter(c => c.type !== "numeric").length === 0 ? (
                    <p className="font-sans text-xs text-white/40 italic">No text or categorical parameters found in this layout.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {activeSummary.columns.filter(c => c.type !== "numeric").map((col, idx) => (
                        <div key={`stat-cat-${idx}`} className="bg-white/[0.02] border border-white/10 rounded-lg p-4">
                          <div className="flex justify-between items-center mb-2.5">
                            <h4 className="font-sans font-bold text-white/90 text-xs truncate max-w-[140px]" title={col.name}>
                              {col.name}
                            </h4>
                            <span className="font-mono text-[9px] font-bold text-white/40 uppercase bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
                              {col.uniqueCount} Uniques
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            <span className="font-sans text-[10px] text-white/40 font-semibold block">Top Freq Values:</span>
                            {col.topValues.map((val, vIdx) => (
                              <div key={`top-${idx}-${vIdx}`} className="flex items-center justify-between text-[11px] bg-white/5 border border-white/5 rounded px-2 py-1 shadow-2xs font-sans">
                                <span className="text-white/85 italic truncate max-w-[95px]" title={val.value}>{val.value || "—"}</span>
                                <span className="font-mono text-white/40 text-[10px] shrink-0 font-semibold">
                                  {val.count}x ({val.percentage.toFixed(1)}%)
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

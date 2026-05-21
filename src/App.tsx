/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import Header from "./components/Header";
import DataSetExplorer from "./components/DataSetExplorer";
import MaxAssistant from "./components/MaxAssistant";
import { DatasetSummary, AnalysisResult, ChatMessage } from "./types";
import { Bot, Sparkles, Database } from "lucide-react";

export default function App() {
  const [activeSummary, setActiveSummary] = useState<DatasetSummary | null>(null);
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [geminiStatus, setGeminiStatus] = useState<{
    active: boolean;
    type: "quota_exceeded" | "no_key" | "other" | null;
    message: string | null;
    timestamp: string | null;
    retryAfterSeconds: number | null;
  }>({
    active: true,
    type: null,
    message: null,
    timestamp: null,
    retryAfterSeconds: null
  });

  const fetchStatus = async (isTest = false) => {
    try {
      const url = isTest ? "/api/gemini/status?test=true" : "/api/gemini/status";
      const res = await fetch(url);
      const data = await res.json();
      setGeminiStatus(data);
    } catch (err) {
      console.error("Failed to fetch Gemini status:", err);
    }
  };

  React.useEffect(() => {
    fetchStatus();
  }, []);

  // Cooldown countdown timer logic
  React.useEffect(() => {
    if (geminiStatus.retryAfterSeconds !== null && geminiStatus.retryAfterSeconds > 0) {
      const timer = setInterval(() => {
        setGeminiStatus(prev => {
          if (prev.retryAfterSeconds !== null && prev.retryAfterSeconds > 1) {
            return { ...prev, retryAfterSeconds: prev.retryAfterSeconds - 1 };
          } else {
            clearInterval(timer);
            // Auto re-fetch status when countdown reaches 0 to see if it has cleared
            setTimeout(() => {
              fetchStatus();
            }, 200);
            return { ...prev, retryAfterSeconds: null };
          }
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [geminiStatus.retryAfterSeconds]);

  // Triggers automatically whenever a dataset is parsed
  const handleDataParsed = async (summary: DatasetSummary, rows: any[]) => {
    setActiveSummary(summary);
    setRawRows(rows);
    setIsLoading(true);

    try {
      // POST summary statistics to Express Gemini analytics endpoint
      const response = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datasetSummary: summary })
      });

      const data = await response.json();
      
      // Inline update the connection status diagnostics state
      if (data._diagnostics) {
        setGeminiStatus(data._diagnostics);
      }
      
      setAnalysisResult(data);

      // Formulate MAX's automated file-load report detailing Step 1 through Step 6
      const previewRows = rows.slice(0, 3);
      const colsToUse = summary.columns.slice(0, 6); // Keep it clean for readable markdown width
      const tableHeader = `| ${colsToUse.map(c => c.name).join(" | ")} |`;
      const tableDivider = `| ${colsToUse.map(() => "---").join(" | ")} |`;
      const tableBody = previewRows.map(row => {
        return `| ${colsToUse.map(c => {
          const val = row[c.name];
          if (val === undefined || val === null) return "—";
          const str = String(val);
          return str.length > 20 ? str.slice(0, 17) + "..." : str;
        }).join(" | ")} |`;
      }).join("\n");
      const markdownTable = `${tableHeader}\n${tableDivider}\n${tableBody}`;

      const overviewText = `Hi! I am MAX. 📊 I've automatically ingested and analyzed your dataset. Here is my senior analyst report:\n\n` +
        `•\t**DATASET OVERVIEW**:\n` +
        `  - **Total Rows**: ${summary.totalRows}\n` +
        `  - **Total Columns**: ${summary.totalCols}\n` +
        `  - **Attributes Index**:\n` +
        summary.columns.map(c => `    * **${c.name}** *(${c.type})*: Sample values: [ ${c.sampleValues.slice(0, 2).join(", ")} ]`).join("\n") + "\n\n" +
        `  - **First 3 Rows Data Preview**:\n\n${markdownTable}\n\n` +
        `•\t**DATA QUALITY REPORT**:\n` +
        `  - **Missing Values per Column**:\n` +
        summary.columns.map(c => {
          const item = summary.columnsWithMissing.find(m => m.name === c.name);
          return `    * **${c.name}**: ${item ? `${item.count} missing rows` : "0 missing rows"}`;
        }).join("\n") + "\n" +
        `  - **Duplicate Rows**: ${summary.duplicateCount} duplicate row signatures.\n` +
        `  - **Suspicious Values & Anomalies**:\n` +
        (summary.suspiciousColumns.length === 0 
          ? "    * No high-grade anomalies or physical metric constraint violations flag.\n" 
          : summary.suspiciousColumns.map(item => `    * **${item.name}**: ${item.reason}`).join("\n") + "\n") +
        `  - **Overall Data Quality Score**: ${summary.dataQualityScore} out of 10\n\n` +
        `•\t**STATISTICAL SUMMARY**:\n` +
        `  - **Numeric Continuous Columns**:\n` +
        (summary.columns.filter(c => c.type === "numeric").length === 0
          ? "    * No numeric parameters to compute continuous bounds.\n"
          : summary.columns.filter(c => c.type === "numeric").map(c => `    * **${c.name}**: min = ${c.min}, max = ${c.max}, mean = ${(c.mean || 0).toFixed(2)}, median = ${(c.median || 0).toFixed(2)}`).join("\n")) + "\n" +
        `  - **Category & Qualitative Columns**:\n` +
        (summary.columns.filter(c => c.type !== "numeric").length === 0
          ? "    * No categorical parameters located.\n"
          : summary.columns.filter(c => c.type !== "numeric").map(c => {
              const top3Str = c.topValues.map((v, i) => `${i + 1}. '${v.value || "—"}' (${v.percentage.toFixed(1)}%)`).join(", ");
              return `    * **${c.name}** (${c.uniqueCount} unique values): [ ${top3Str} ]`;
            }).join("\n")) + "\n\n" +
        `•\t**KEY INSIGHTS**:\n` +
        data.insights.map((ins, i) => `  ${i + 1}. ${ins}`).join("\n") + "\n\n" +
        `•\t**SUGGESTED TASKS**:\n` +
        data.tasks.map((tsk) => `  ${tsk.id}. ${tsk.label}`).join("\n") + "\n" +
        `  *Type the number of any task to run it instantly in Pandas python!*\n\n` +
        `•\t**CHART MENU**:\n` +
        data.charts.map((crt) => `  - **Chart ${crt.id}**: type "chart ${crt.id}" to visualize ${crt.title}`).join("\n") + "\n" +
        `  *Or type "dashboard" to build the complete 4-chart layout.*\n\n` +
        `Type a number for a task or chart 1/2/3 to visualize. What first?`;

      const initialMaxMessage: ChatMessage = {
        id: `m-ast-start-${Date.now()}`,
        role: "assistant",
        content: overviewText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setChatHistory([initialMaxMessage]);
    } catch (err: any) {
      console.error("Failed to run full-stack analytical profiling:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetWorkspace = () => {
    setActiveSummary(null);
    setRawRows([]);
    setAnalysisResult(null);
    setChatHistory([]);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0A0A0B] text-[#E0E0E0]">
      
      {/* Top Brand Navigation Header */}
      <Header
        onReset={handleResetWorkspace}
        hasData={!!activeSummary}
        score={activeSummary?.dataQualityScore}
        geminiStatus={geminiStatus}
        onCheckStatus={() => fetchStatus(true)}
      />

      {/* Primary Workspace Panels */}
      <main className="flex-1 overflow-hidden p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto h-full flex flex-col md:flex-row gap-6">
          
          {/* Column Left: Dataset Loader, Tables & Quality Metrics */}
          <div className="w-full md:w-[50%] h-full overflow-hidden flex flex-col">
            <DataSetExplorer
              onDataParsed={handleDataParsed}
              activeSummary={activeSummary}
            />
          </div>

          {/* Column Right: MAX Assistant Conversation Flow + Dynamic Charts */}
          <div className="w-full md:w-[50%] h-full overflow-hidden flex flex-col">
            {isLoading ? (
              <div className="bg-[#141417] border border-white/10 rounded-lg flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="relative mb-5 flex items-center justify-center">
                  <div className="w-12 h-12 border-4 border-white/5 border-t-blue-600 rounded-full animate-spin" />
                  <Bot className="w-5 h-5 text-blue-400 absolute" />
                </div>
                <h3 className="font-sans font-semibold text-white text-sm tracking-tight">
                  MAX is analyzing your dataset...
                </h3>
                <p className="font-sans text-xs text-white/40 max-w-xs mt-1.5">
                  Analyzing statistical metrics, scanning row duplicates patterns, and querying Gemini senior analyst insights.
                </p>
              </div>
            ) : (
              <MaxAssistant
                summary={activeSummary}
                rawRows={rawRows}
                analysisResult={analysisResult}
                chatHistory={chatHistory}
                setChatHistory={setChatHistory}
                isLoadingAnalysis={isLoading}
                onGenerateChart={(type, title, xKey, yKey) => {}}
                geminiStatus={geminiStatus}
                setGeminiStatus={setGeminiStatus}
              />
            )}
          </div>

        </div>
      </main>

    </div>
  );
}

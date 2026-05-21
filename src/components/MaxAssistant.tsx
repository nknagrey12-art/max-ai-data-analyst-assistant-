import React, { useState, useEffect, useRef } from "react";
import { Send, Sparkles, Terminal, Code, MessageSquare, Bot, ArrowRight, LayoutDashboard, ChevronRight, Play } from "lucide-react";
import { DatasetSummary, ChatMessage, AnalysisResult, AnalysisTask, RecommendedChart } from "../types";
import VisualChart from "./VisualChart";

interface MaxAssistantProps {
  summary: DatasetSummary | null;
  rawRows: any[];
  analysisResult: AnalysisResult | null;
  chatHistory: ChatMessage[];
  setChatHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  onGenerateChart: (type: string, title: string, xKey: string, yKey: string) => void;
  isLoadingAnalysis: boolean;
  geminiStatus: {
    active: boolean;
    type: "quota_exceeded" | "no_key" | "other" | null;
    message: string | null;
    timestamp: string | null;
    retryAfterSeconds: number | null;
  };
  setGeminiStatus: React.Dispatch<React.SetStateAction<{
    active: boolean;
    type: "quota_exceeded" | "no_key" | "other" | null;
    message: string | null;
    timestamp: string | null;
    retryAfterSeconds: number | null;
  }>>;
}

export default function MaxAssistant({
  summary,
  rawRows,
  analysisResult,
  chatHistory,
  setChatHistory,
  onGenerateChart,
  isLoadingAnalysis,
  geminiStatus,
  setGeminiStatus
}: MaxAssistantProps) {
  const [userInput, setUserInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to chat bottom on change
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const handleSendMessage = async (customMessage?: string, selectedItemCtx?: string) => {
    const textToSend = customMessage?.trim() || userInput.trim();
    if (!textToSend || !summary) return;

    if (!customMessage) {
      setUserInput("");
    }

    const newUserMessage: ChatMessage = {
      id: `m-usr-${Date.now()}`,
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatHistory(prev => [...prev, newUserMessage]);
    setIsTyping(true);

    // Dynamic processing if it is an automated short command (such as '1', '2', 'chart 1', 'dashboard', etc)
    const lowerTxt = textToSend.toLowerCase();
    
    // Check if user is asking for single chart visualization or complete dashboard
    let handledLocally = false;
    let fallbackText = "";
    let codeBlock = "";
    let chartPayload: any = null;

    const numericCols = summary.columns.filter(c => c.type === "numeric").map(c => c.name);
    const textCols = summary.columns.filter(c => c.type === "text" || c.type === "category" || c.type === "date").map(c => c.name);
    const firstNumCol = numericCols[0] || "count";
    const secondNumCol = numericCols[1] || numericCols[0] || "count";
    const firstTextCol = textCols[0] || "index";

    // Detect direct chart orders: "chart 1", "chart 2", "chart 3"
    if (lowerTxt.includes("chart 1") || (analysisResult && lowerTxt.includes(analysisResult.charts[0]?.title.toLowerCase()))) {
      handledLocally = true;
      const chartTitle = analysisResult ? analysisResult.charts[0].title : `Distribution of ${firstNumCol} across ${firstTextCol}`;
      const chartType = analysisResult ? analysisResult.charts[0].type : "bar";
      fallbackText = `Sure thing, I'm on it! Generating **Chart 1: ${chartTitle}** immediately. Here is a clean visual representation based on real data extracted directly from your dataset.\n\nAs your senior analyst, I recommend using this representation to quickly isolate outliers.`;
      chartPayload = {
        type: chartType,
        title: chartTitle,
        xAxisKey: firstTextCol,
        yAxisKey: firstNumCol,
        data: rawRows
      };
      codeBlock = `import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# Plot distribution
df = pd.read_csv("dataset.csv")
plt.figure(figsize=(10, 6))
sns.${chartType === "bar" ? "barplot" : chartType === "line" ? "lineplot" : "scatterplot"}(
    data=df, x="${firstTextCol}", y="${firstNumCol}", palette="viridis"
)
plt.title("${chartTitle}")
plt.xticks(rotation=45)
plt.tight_layout()
plt.show()`;
    } 
    else if (lowerTxt.includes("chart 2") || (analysisResult && lowerTxt.includes(analysisResult.charts[1]?.title.toLowerCase()))) {
      handledLocally = true;
      const chartTitle = analysisResult ? analysisResult.charts[1].title : `Trend of ${secondNumCol} performance`;
      const chartType = analysisResult ? analysisResult.charts[1].type : "line";
      fallbackText = `Understood. Generating **Chart 2: ${chartTitle}** from your active records now.\n\nThe trend line tracks operational changes across standard metric categories.`;
      chartPayload = {
        type: chartType,
        title: chartTitle,
        xAxisKey: firstTextCol,
        yAxisKey: secondNumCol,
        data: rawRows
      };
      codeBlock = `import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv("dataset.csv")
# Cumulative distribution metrics
df.groupby("${firstTextCol}")["${secondNumCol}"].mean().plot(kind="${chartType === "bar" ? "bar" : "line"}", color="#10b981", marker="o")
plt.title("${chartTitle}")
plt.grid(True, linestyle="--", alpha=0.6)
plt.show()`;
    } 
    else if (lowerTxt.includes("chart 3") || (analysisResult && lowerTxt.includes(analysisResult.charts[2]?.title.toLowerCase()))) {
      handledLocally = true;
      const chartTitle = analysisResult ? analysisResult.charts[2].title : `Composition of ${firstNumCol}`;
      const chartType = analysisResult ? analysisResult.charts[2].type : "pie";
      fallbackText = `Awesome request! Chart 3 generated: **${chartTitle}**.\n\nThis visually maps part-to-whole segment share representing the top categories.`;
      chartPayload = {
        type: chartType,
        title: chartTitle,
        xAxisKey: firstTextCol,
        yAxisKey: firstNumCol,
        data: rawRows
      };
      codeBlock = `import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv("dataset.csv")
# Create composition layout
shares = df.groupby("${firstTextCol}")["${firstNumCol}"].sum()
plt.figure(figsize=(8, 8))
plt.pie(shares, labels=shares.index, autopct='%1.1f%%', startangle=140)
plt.title("${chartTitle}")
plt.show()`;
    }
    // Detect "dashboard" request
    else if (lowerTxt.includes("dashboard") || lowerTxt.includes("all charts") || lowerTxt.includes("visualize all")) {
      handledLocally = true;
      fallbackText = `MAX here! Launching complete interactive dashboard immediately. I have built 4 concurrent visualizers: **Bar, Line, Pie**, and a **Scatter plot** side-by-side using real values extracted directly from your dataset.`;
      chartPayload = {
        type: "dashboard",
        title: `Interactive Bento Analytics Dashboard`,
        xAxisKey: firstTextCol,
        yAxisKey: firstNumCol,
        data: rawRows
      };
      codeBlock = `import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv("dataset.csv")
fig, axes = plt.subplots(2, 2, figsize=(14, 10))

# Subplot 1: Bar
df.groupby("${firstTextCol}")["${firstNumCol}"].mean().plot(kind="bar", ax=axes[0, 0], color="indigo")
axes[0, 0].set_title("Distribution Bar")

# Subplot 2: Line
df.groupby("${firstTextCol}")["${secondNumCol}"].mean().plot(kind="line", ax=axes[0, 1], color="emerald", marker="o")
axes[0, 1].set_title("Trends Line")

# Subplot 3: Pie
df.groupby("${firstTextCol}")["${firstNumCol}"].sum().plot(kind="pie", ax=axes[1, 0], autopct='%1.1f%%')
axes[1, 0].set_title("Composition Breakdown")

# Subplot 4: Scatter
axes[1, 1].scatter(df["${firstNumCol}"], df["${secondNumCol}"], color="orange")
axes[1, 1].set_title("Bivariate Scatter")

plt.tight_layout()
plt.show()`;
    }
    // Detect menu tasks 1-6
    else if (/^[1-6]$/.test(textToSend)) {
      handledLocally = true;
      const idx = parseInt(textToSend) - 1;
      const taskLabel = analysisResult ? analysisResult.tasks[idx]?.label : `Analysis task ${textToSend}`;
      fallbackText = `Sure! Let's drill into **Task ${textToSend}: ${taskLabel}**.\n\nTo help you implement this analysis robustly in a pipeline outside the workspace, here is a polished Python Pandas script customized for your dataset schema:`;
      
      codeBlock = `import pandas as pd
import numpy as np

# Load CSV dataset
df = pd.read_csv("dataset.csv")

# Perform Task ${textToSend}: ${taskLabel}
print("=== Running MAX Analytics Pipeline ===")
grouped = df.groupby("${firstTextCol}").agg({
    "${firstNumCol}": ["mean", "median", "std", "count", "sum"]
})
print(grouped)

# Quality Checks
print("\\nMissing percentages:")
print(df.isnull().sum() / len(df) * 100)
`;
    }

    // Call fallback locally or send to server endpoint
    try {
      if (handledLocally) {
        // Inject local custom response directly (which feels instant, professional, and includes code block)
        setTimeout(() => {
          const assistantReply: ChatMessage = {
            id: `m-ast-${Date.now()}`,
            role: "assistant",
            content: fallbackText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            codeSnippet: {
              language: "python",
              code: codeBlock
            },
            chartPayload: chartPayload || undefined
          };
          setChatHistory(prev => [...prev, assistantReply]);
          setIsTyping(false);
        }, 850);
      } else {
        // Post conversation request to backend Express controller
        const response = await fetch("/api/gemini/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...chatHistory, newUserMessage].map(m => ({ role: m.role, content: m.content })),
            datasetSummary: summary,
            selectedItem: selectedItemCtx
          })
        });

        const data = await response.json();
        
        // Update connection status details
        if (data._diagnostics) {
          setGeminiStatus(data._diagnostics);
        }

        const assistantReply: ChatMessage = {
          id: `m-ast-${Date.now()}`,
          role: "assistant",
          content: data.text || "I processed your request, let me know how we should proceed!",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setChatHistory(prev => [...prev, assistantReply]);
        setIsTyping(false);
      }
    } catch (err) {
      console.error("Express Chat Failure, using rules:", err);
      setIsTyping(false);
    }
  };

  const handleTaskClick = (task: AnalysisTask) => {
    handleSendMessage(`${task.id}`, task.label);
  };

  const handleChartClick = (chart: RecommendedChart) => {
    handleSendMessage(`chart ${chart.id}`, chart.title);
  };

  const renderMessageContent = (content: string) => {
    const chartRegex = /chart\s*(\{[\s\S]*?\})/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    
    // Normalize code fence boundaries sometimes emitted by LLMs around charts
    let normalized = content;
    normalized = normalized.replace(/```chart\s*(\{[\s\S]*?\})\s*```/g, "chart$1");
    normalized = normalized.replace(/```\s*chart\s*(\{[\s\S]*?\})\s*```/g, "chart$1");
    normalized = normalized.replace(/```json\s*chart\s*(\{[\s\S]*?\})\s*```/g, "chart$1");

    while ((match = chartRegex.exec(normalized)) !== null) {
      const matchIndex = match.index;
      const jsonStr = match[1];
      
      if (matchIndex > lastIndex) {
        const textPiece = normalized.substring(lastIndex, matchIndex);
        parts.push(
          <p key={`text-${lastIndex}`} className="font-sans text-xs leading-relaxed whitespace-pre-wrap mb-2">
            {textPiece}
          </p>
        );
      }
      
      try {
        const parsedObj = JSON.parse(jsonStr.trim());
        const labels = parsedObj.labels || [];
        const values = parsedObj.data || [];
        const color = parsedObj.color || "#6366f1";
        
        const chartData = labels.map((lbl: string, idx: number) => ({
          category: lbl,
          value: parseFloat(String(values[idx] || 0))
        }));
        
        parts.push(
          <div key={`chart-block-${matchIndex}`} className="mt-3.5 mb-3.5 border border-white/10 shadow-lg rounded overflow-hidden bg-[#0A0A0B] text-white h-64">
            <VisualChart
              type={parsedObj.type || "bar"}
              title={parsedObj.title || "Custom Analytic Visual"}
              data={chartData}
              xAxisKey="category"
              yAxisKey="value"
              colors={[color]}
            />
          </div>
        );
      } catch (parseErr) {
        console.error("Failed to parse inline visual chart JSON:", parseErr, jsonStr);
        parts.push(
          <pre key={`fallback-err-${matchIndex}`} className="text-[10px] bg-red-900/10 border border-red-500/10 text-red-400 p-2 font-mono whitespace-pre-wrap rounded">
            {match[0]}
          </pre>
        );
      }
      
      lastIndex = chartRegex.lastIndex;
    }
    
    if (lastIndex < normalized.length) {
      const remainingText = normalized.substring(lastIndex);
      parts.push(
        <p key={`text-end-${lastIndex}`} className="font-sans text-xs leading-relaxed whitespace-pre-wrap">
          {remainingText}
        </p>
      );
    }
    
    return parts.length > 0 ? parts : <p className="font-sans text-xs leading-relaxed whitespace-pre-wrap">{content}</p>;
  };

  // Human friendly introduction if no file uploaded yet
  if (!summary) {
    return (
      <div className="bg-[#141417] border border-white/10 rounded-lg p-6 shadow flex flex-col items-center justify-center text-center h-full min-h-[380px]">
        <Bot className="w-12 h-12 text-blue-400 mb-3" />
        <h3 className="font-sans font-semibold text-white text-base tracking-tight">Meet Your Personal Data Advisor</h3>
        <p className="font-sans text-xs text-white/40 max-w-sm mt-1 leading-relaxed">
          Hi! I am **MAX**, your professional senior data analyst. Drop any CSV spreadsheet file or choose from the presets on the left to start our real-time interactive workspace.
        </p>
        <span className="font-mono text-[9px] text-white/40 bg-white/5 rounded px-2 py-0.5 mt-4 uppercase">
          Ready for data ingestion
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Step 4: Key Insights */}
      {analysisResult && (
        <div className="bg-[#141417] border border-white/10 rounded-lg p-6 shadow-xl text-left text-white">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3.5 mb-4">
            <Sparkles className="w-5 h-5 text-blue-400" />
            <h3 className="font-sans font-bold tracking-tight text-white text-sm">
              MAX's Key Business Insights (Step 4)
            </h3>
          </div>
          <ul className="space-y-3.5 font-sans text-xs leading-relaxed text-white/80">
            {analysisResult.insights.map((insight, idx) => (
              <li key={`insight-${idx}`} className="flex gap-2.5 items-start">
                <span className="w-5 h-5 bg-blue-600/20 text-blue-400 rounded flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-0.5 border border-blue-500/30">
                  {idx + 1}
                </span>
                <span className="flex-1 text-white/80">{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Grid: Actions Step 5 and Chart Recommendations Step 6 */}
      {analysisResult && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left">
          
          {/* Step 5: Clickable Tasks Menu */}
          <div className="bg-[#141417] border border-white/10 rounded-lg p-5 flex flex-col shadow-sm">
            <div className="flex items-center gap-1.5 border-b border-white/10 pb-2.5 mb-3.5">
              <Terminal className="w-4.5 h-4.5 text-blue-400" />
              <h4 className="font-sans font-bold text-white/50 text-[11px] uppercase tracking-widest">
                Clickable Task Menu (Step 5)
              </h4>
            </div>
            
            <div className="space-y-2 flex-1">
              {analysisResult.tasks.slice(0, 6).map((task) => (
                <button
                  key={`task-action-${task.id}`}
                  onClick={() => handleTaskClick(task)}
                  className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/5 hover:border-blue-500 rounded p-2.5 transition-all text-xs font-semibold text-white/90 flex items-center justify-between group"
                >
                  <span className="truncate max-w-[210px]">{task.label}</span>
                  <div className="flex items-center gap-1 shrink-0 font-mono text-[9px] text-white/20 font-semibold group-hover:text-blue-400 transition-colors">
                    <span>Task {task.id}</span>
                    <Play className="w-2.5 h-2.5 fill-current" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Step 6: Chart Recommendations */}
          <div className="bg-[#141417] border border-white/10 rounded-lg p-5 flex flex-col shadow-sm">
            <div className="flex items-center gap-1.5 border-b border-white/10 pb-2.5 mb-3.5">
              <Code className="w-4.5 h-4.5 text-emerald-400" />
              <h4 className="font-sans font-bold text-white/50 text-[11px] uppercase tracking-widest">
                Chart Recommendations (Step 6)
              </h4>
            </div>

            <div className="space-y-2 flex-1">
              {analysisResult.charts.slice(0, 3).map((chart) => (
                <button
                  key={`chart-rec-${chart.id}`}
                  onClick={() => handleChartClick(chart)}
                  className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/5 hover:border-emerald-500 rounded p-2.5 transition-all text-xs font-semibold text-white/90 flex items-center justify-between group"
                >
                  <span className="truncate max-w-[210px]">{chart.title}</span>
                  <div className="flex items-center gap-1 shrink-0 font-mono text-[9px] text-white/20 font-semibold group-hover:text-emerald-450 transition-colors">
                    <span className="uppercase">{chart.type}</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </button>
              ))}

              {/* Complete Dashboard shortcut button */}
              <button
                onClick={() => handleSendMessage("dashboard")}
                className="w-full text-left bg-blue-600 hover:bg-blue-500 border border-blue-700/50 rounded px-3.5 py-2.5 transition-all text-xs font-bold text-white flex items-center justify-between mt-3 group"
              >
                <span className="flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4 text-white" />
                  <span>Generate Full 4-Chart Dashboard</span>
                </span>
                <ChevronRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

        </div>
      )}

      {/* Interactive Chat Console System */}
      <div className="bg-[#141417] border border-white/10 rounded-lg shadow-lg flex flex-col flex-1 min-h-[420px] max-h-[600px] text-left">
        <div className="px-5 py-3 border-b border-white/10 bg-white/[0.02] rounded-t-lg flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-400" />
            <h4 className="font-sans font-bold text-white/50 text-[11px] uppercase tracking-widest">
              MAX Analysts Chat console
            </h4>
          </div>
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
        </div>

        {/* Chat History Flow (Step 4, 5, 6 visual charts inline) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {chatHistory.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
              
              <div className={`max-w-[85%] rounded p-4 shadow ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-tr-none"
                  : "bg-white/5 text-white/90 border border-white/10 rounded-tl-none"
              }`}>
                {/* Text feedback & parsed inline charts */}
                {renderMessageContent(msg.content)}

                {/* Optional chart loaded inline */}
                {msg.chartPayload && (
                  <div className="mt-4 border border-white/10 shadow-lg rounded overflow-hidden bg-[#0A0A0B] text-white h-64">
                    <VisualChart
                      type={msg.chartPayload.type}
                      title={msg.chartPayload.title}
                      data={msg.chartPayload.data}
                      xAxisKey={msg.chartPayload.xAxisKey}
                      yAxisKey={msg.chartPayload.yAxisKey}
                    />
                  </div>
                )}

                {/* Optional python programmatic script view */}
                {msg.codeSnippet && (
                  <div className="mt-3.5 bg-[#060607]/80 text-white rounded overflow-hidden p-3 border border-white/5 font-mono text-[10px]">
                    <div className="flex justify-between items-center text-white/45 uppercase text-[8px] font-bold tracking-wider mb-2 pb-1.5 border-b border-white/5">
                      <span>Python Source (Pandas)</span>
                      <span>MAX code generated</span>
                    </div>
                    <pre className="overflow-x-auto text-left leading-relaxed text-blue-300">
                      {msg.codeSnippet.code}
                    </pre>
                  </div>
                )}
              </div>

              {/* Timestamp label */}
              <span className="font-mono text-[9px] text-white/30 mt-1 px-1">{msg.timestamp}</span>

            </div>
          ))}

          {isTyping && (
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded px-4 py-3 text-white/40 font-sans text-xs w-32 shadow">
              <Bot className="w-4 h-4 text-blue-400 animate-bounce" />
              <span>MAX is typing...</span>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Inline user entry controller */}
        <div className="p-4 border-t border-white/10 bg-white/[0.02] rounded-b-lg shrink-0 flex gap-2 items-center">
          <input
            id="assistant_msg_input_field"
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Type a number to run a task, type 'chart 1', or ask MAX anything..."
            className="flex-1 bg-white/5 border border-white/10 rounded-full py-3 px-6 text-sm text-white focus:outline-none focus:border-blue-500 w-full font-sans leading-tight transition-colors focus:ring-1 focus:ring-blue-500"
          />
          <button
            id="assistant_send_msg_btn"
            onClick={() => handleSendMessage()}
            className="p-3 bg-blue-600 hover:bg-blue-500 rounded-full text-white transition-colors cursor-pointer shadow-lg"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

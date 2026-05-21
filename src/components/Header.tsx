import React, { useState } from "react";
import { Database, BadgePercent, Sparkles, AlertTriangle, Wifi, WifiOff, X, RefreshCw, Key, ExternalLink } from "lucide-react";

interface HeaderProps {
  onReset: () => void;
  hasData: boolean;
  score?: number;
  geminiStatus: {
    active: boolean;
    type: "quota_exceeded" | "no_key" | "other" | null;
    message: string | null;
    timestamp: string | null;
    retryAfterSeconds: number | null;
  };
  onCheckStatus: () => Promise<void>;
}

export default function Header({ onReset, hasData, score, geminiStatus, onCheckStatus }: HeaderProps) {
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualCheck = async () => {
    setIsRefreshing(true);
    await onCheckStatus();
    // Simulate minor delay for high-fidelity interactive feel
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  // Determine connection status styles
  const getBadgeStyles = () => {
    if (geminiStatus.active) {
      return {
        bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        label: "Gemini Online",
        icon: <Wifi className="w-3 h-3 text-emerald-400" />,
        dot: "bg-emerald-500"
      };
    }
    if (geminiStatus.type === "quota_exceeded") {
      return {
        bg: "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/25 cursor-pointer animate-pulse",
        label: "Gemini Offline (Quota Maxed)",
        icon: <AlertTriangle className="w-3 h-3 text-amber-400" />,
        dot: "bg-amber-400"
      };
    }
    if (geminiStatus.type === "no_key") {
      return {
        bg: "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/25 cursor-pointer",
        label: "Gemini Offline (No Key)",
        icon: <WifiOff className="w-3 h-3 text-rose-400" />,
        dot: "bg-rose-500"
      };
    }
    return {
      bg: "bg-white/5 hover:bg-white/10 text-white/60 border-white/10 cursor-pointer",
      label: "Gemini Offline",
      icon: <WifiOff className="w-3 h-3 text-white/50" />,
      dot: "bg-white/30"
    };
  };

  const badge = getBadgeStyles();

  return (
    <>
      <header className="bg-[#0F0F12] text-[#E0E0E0] border-b border-white/10 shadow-lg py-4 px-6 md:px-8 shrink-0 relative z-40">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          
          {/* Core Title and Avatar Container */}
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center font-bold text-white text-base tracking-wider shadow-[0_2px_10px_rgba(37,99,235,0.4)]">
                M
              </div>
              <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-[2px] border-[#0F0F12] rounded-full ${badge.dot}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-sans font-semibold tracking-tight text-white text-base">MAX <span className="text-white/40 font-normal">— Senior Analyst</span></h1>
                
                {/* Connections Badge with diagnostic anchor */}
                <button
                  onClick={() => setShowDiagnostic(true)}
                  className={`flex items-center gap-1.5 font-mono text-[9px] font-bold px-2.5 py-0.5 rounded border uppercase tracking-wider transition-all duration-200 ${badge.bg}`}
                  title="Click to view Gemini diagnostics"
                >
                  {badge.icon}
                  <span>{badge.label}</span>
                </button>
              </div>
              <p className="font-sans text-[10px] uppercase tracking-wider text-blue-400 font-bold mt-0.5">Your personal data analyst & storytelling assistant</p>
            </div>
          </div>

          {/* Global Analytics Actions / Status */}
          <div className="flex items-center gap-3 self-end sm:self-auto">
            {hasData && (
              <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
                {score !== undefined && (
                  <div className="flex items-center gap-1.5 border-r border-white/10 pr-3">
                    <BadgePercent className="w-4 h-4 text-emerald-400" />
                    <span className="font-sans text-xs text-white/70">
                      Quality Rating: <strong className="text-emerald-400 font-mono">{score}/10</strong>
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-blue-400" />
                  <span className="font-sans text-xs text-white/50">Active Workspace Connected</span>
                </div>
              </div>
            )}

            {hasData && (
              <button
                id="header_reset_btn"
                onClick={onReset}
                className="px-4 py-2 bg-white/5 hover:bg-red-500/10 hover:text-red-400 transition-colors text-white/80 font-sans text-xs font-medium rounded border border-white/10 flex items-center gap-1.5"
              >
                Clear Workspace
              </button>
            )}
          </div>

        </div>
      </header>

      {/* Connection Diagnostic Modal */}
      {showDiagnostic && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
          <div className="bg-[#141417] border border-white/10 rounded-xl max-w-lg w-full overflow-hidden shadow-2xl animate-scale-up">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <WifiOff className="w-5 h-5 text-amber-400" />
                <h3 className="font-sans font-bold text-white text-sm tracking-tight uppercase">
                  Gemini API Connection Diagnostics
                </h3>
              </div>
              <button
                onClick={() => setShowDiagnostic(false)}
                className="p-1 hover:bg-white/10 text-white/50 hover:text-white rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 text-left">
              
              {/* Type 1: Quota Exceeded */}
              {geminiStatus.type === "quota_exceeded" && (
                <>
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2 text-amber-400 font-sans font-semibold text-xs">
                      <AlertTriangle className="w-4.5 h-4.5 text-amber-500" />
                      <span>API Rate Limit Exceeded (429 RESOURCE_EXHAUSTED)</span>
                    </div>
                    <p className="font-sans text-xs text-white/70 leading-relaxed">
                      You have exceeded your request limits. Gemini 3.5 Flash models on the Free Tier are limited to **20 requests per day per project**.
                    </p>
                  </div>

                  {geminiStatus.retryAfterSeconds !== null ? (
                    <div className="flex flex-col items-center justify-center py-4 bg-white/[0.02] border border-white/5 rounded-lg text-center">
                      <div className="relative mb-2 flex items-center justify-center">
                        <div className="w-14 h-14 border-4 border-white/5 border-t-amber-500 rounded-full animate-spin duration-1000" />
                        <span className="font-mono text-xs font-bold text-amber-400 absolute">
                          {geminiStatus.retryAfterSeconds}s
                        </span>
                      </div>
                      <span className="font-sans text-[11px] text-white/60">
                        Cooldown active. Standard API server will accept retries in <strong>{geminiStatus.retryAfterSeconds} seconds</strong>.
                      </span>
                    </div>
                  ) : (
                    <div className="p-3 bg-white/[0.02] border border-white/5 rounded text-center text-xs text-white/50">
                      Standard Daily limit of 20 free requests has been fully exhausted. 
                    </div>
                  )}

                  <div className="space-y-3 pt-1">
                    <h4 className="font-sans font-bold text-white text-xs">How can I solve this?</h4>
                    <p className="font-sans text-xs text-white/60 leading-relaxed">
                      To swap or configure a new API key without restrictions, open the main platform's **Settings &gt; Secrets** panel on the bottom left and provide a valid key supporting higher tier operations.
                    </p>
                    <div className="flex gap-4">
                      <a
                        href="https://ai.google.dev/gemini-api/docs/rate-limits"
                        target="_blank"
                        rel="noreferrer"
                        className="font-sans text-[11px] text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <span>Learn more about Gemini Quotas</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </>
              )}

              {/* Type 2: No Key Configured */}
              {geminiStatus.type === "no_key" && (
                <>
                  <div className="bg-rose-500/5 border border-rose-500/20 rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2 text-rose-400 font-sans font-semibold text-xs">
                      <Key className="w-4.5 h-4.5 text-rose-500" />
                      <span>API Key Missing</span>
                    </div>
                    <p className="font-sans text-xs text-white/70 leading-relaxed">
                      No key has been found in your development variables. The application needs a `GEMINI_API_KEY` to query actual live intelligence from the Google API suite.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-sans font-bold text-white text-xs">Where do I specify a key?</h4>
                    <p className="font-sans text-xs text-white/60 leading-relaxed">
                      You can create a free API key at **Google AI Studio** and configure it inside this workspace's **Settings &gt; Secrets** panel. The application will receive it on-demand.
                    </p>
                  </div>
                </>
              )}

              {/* Type 3: Online */}
              {geminiStatus.active && (
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-5 space-y-2 text-center py-8">
                  <Wifi className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                  <h4 className="font-sans font-semibold text-white text-sm">Standard Gemini Connection Online</h4>
                  <p className="font-sans text-xs text-white/60 max-w-xs mx-auto">
                    API keys and quota limits are running normally. All analysis routines query standard live models directly.
                  </p>
                </div>
              )}

              {/* Offline Sandbox Active reassurance (Very important so user knows they can still play) */}
              {!geminiStatus.active && (
                <div className="bg-blue-600/10 border border-blue-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-400 font-sans font-semibold text-[11px] uppercase tracking-wider mb-1.5">
                    <Sparkles className="w-4 h-4 text-blue-400" />
                    <span>⚡ Offline Sandbox Active & Functional</span>
                  </div>
                  <p className="font-sans text-xs text-white/80 leading-relaxed">
                    You can continue your data analysis perfectly! **MAX is fully powered offline** using an internal logical rule-engine. Clicking numerical tasks, plotting charts (bar, line, pie, full dashboards), and generating Python scripts continues to run with real-time accuracy!
                  </p>
                </div>
              )}

            </div>

            {/* Modal Footer with interactive Refresh button */}
            <div className="px-6 py-4 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
              <span className="font-sans text-[10px] text-white/30">
                Last checked: {geminiStatus.timestamp ? new Date(geminiStatus.timestamp).toLocaleTimeString() : "Upon startup"}
              </span>
              <button
                onClick={handleManualCheck}
                disabled={isRefreshing}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-white font-sans text-xs font-semibold rounded border border-white/10 flex items-center gap-2 disabled:opacity-55 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isRefreshing ? "animate-spin" : ""}`} />
                <span>{isRefreshing ? "Checking..." : "Test Connection"}</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}

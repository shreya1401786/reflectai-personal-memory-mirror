import React, { useState, useEffect } from "react";
import { Sparkles, Activity, TrendingUp, AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { JournalEntry } from "../types";
import { apiPost } from "../lib/api";

interface PatternRadarProps {
  entries: JournalEntry[];
  onSelectEntry?: (entry: JournalEntry) => void;
}

export const PatternRadar: React.FC<PatternRadarProps> = ({ entries }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<{
    themes: { name: string; count: number; description: string }[];
    emotions: { emotion: string; trend: string; context: string }[];
    goals: { goal: string; status: string; occurrences: number }[];
    challenges: { challenge: string; recurrence: string; copingPattern: string }[];
    positivePatterns: { pattern: string; observation: string }[];
    narrativeObservation: string;
    modelUsed?: string;
  } | null>(null);

  const runAnalysis = async () => {
    if (entries.length < 2) return;
    setLoading(true);
    setError(null);

    try {
      const data = await apiPost("/api/gemini/pattern-radar", { entries });
      setAnalysis(data);
    } catch (err: any) {
      setError(err.message || "Could not analyze patterns.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (entries.length >= 2 && !analysis) {
      runAnalysis();
    }
  }, [entries.length]);

  if (entries.length < 2) {
    return (
      <div className="bg-[#FAF9F6] border border-[#E5E1D8] p-12 text-center space-y-4">
        <Activity className="w-10 h-10 text-[#A0A0A0] mx-auto stroke-1" />
        <h2 className="font-serif text-2xl italic text-[#1A1A1A]">Pattern Radar Needs More Reflections</h2>
        <p className="text-sm font-sans text-[#666] max-w-lg mx-auto leading-relaxed">
          Pattern Radar requires at least two journal entries to detect recurring themes, emotional cycles, challenges, and positive trajectories across your memories.
        </p>
        <p className="text-xs font-sans uppercase tracking-widest text-[#8C8C8C]">
          Current reflections: {entries.length} / 2 minimum
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-[#FAF9F6] border border-[#E5E1D8] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-sans uppercase tracking-[0.2em] text-[#D4A373] font-bold">
            <Activity className="w-3.5 h-3.5" />
            <span>Behavioral & Mindset Synthesis</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#1A1A1A] font-medium tracking-tight mt-2 italic">
            Pattern Radar
          </h1>
          <p className="text-xs sm:text-sm font-sans text-[#666] mt-2 max-w-2xl">
            Objective cross-reflection analysis of recurring themes, emotional rhythms, persistent challenges, and positive habits from {entries.length} personal entries.
          </p>
        </div>

        <button
          onClick={runAnalysis}
          disabled={loading}
          className="px-4 py-2.5 bg-white border border-[#E5E1D8] hover:border-[#1A1A1A] text-xs font-sans uppercase tracking-wider text-[#1A1A1A] flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shadow-xs"
        >
          <RefreshCw className={`w-3 h-3 text-[#D4A373] ${loading ? "animate-spin" : ""}`} />
          <span>{loading ? "Synthesizing Patterns..." : "Re-scan Memories"}</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs font-sans flex items-center justify-between">
          <span>{error}</span>
          <button onClick={runAnalysis} className="underline font-bold cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {loading && !analysis && (
        <div className="py-20 text-center space-y-4">
          <Loader2 className="w-8 h-8 text-[#1A1A1A] animate-spin mx-auto" />
          <p className="text-xs font-sans uppercase tracking-widest text-[#8C8C8C]">
            Gemini is analyzing themes across your entries...
          </p>
        </div>
      )}

      {analysis && (
        <div className="space-y-6">
          {/* Narrative Synthesis */}
          <div className="bg-white border border-[#E5E1D8] p-6 sm:p-8 space-y-3">
            <div className="flex items-center gap-2 pb-3 border-b border-[#EAE7DF]">
              <Sparkles className="w-4 h-4 text-[#D4A373]" />
              <h3 className="font-serif italic text-lg font-semibold text-[#1A1A1A]">
                The Story Your Memories Are Telling
              </h3>
            </div>
            <div className="font-serif text-base text-[#222] leading-relaxed whitespace-pre-line pt-2">
              {analysis.narrativeObservation}
            </div>
          </div>

          {/* 3-Column Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Recurring Themes */}
            <div className="bg-[#FAF9F6] border border-[#E5E1D8] p-5 space-y-3">
              <h4 className="text-xs font-sans uppercase tracking-wider font-bold text-[#1A1A1A] border-b border-[#EAE7DF] pb-2 flex items-center justify-between">
                <span>Recurring Themes</span>
                <span className="text-[10px] text-[#8C8C8C]">Frequencies</span>
              </h4>
              <div className="space-y-3 pt-1">
                {analysis.themes?.map((t, idx) => (
                  <div key={idx} className="p-3 bg-white border border-[#E5E1D8]">
                    <div className="flex items-center justify-between">
                      <span className="font-serif text-sm font-semibold text-[#1A1A1A]">{t.name}</span>
                      <span className="px-2 py-0.5 bg-[#F4F1EA] text-[10px] font-sans font-bold text-[#1A1A1A] border border-[#E5E1D8]">
                        {t.count} entries
                      </span>
                    </div>
                    <p className="text-xs text-[#666] font-sans mt-1.5 leading-relaxed">{t.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Persistent Challenges & Coping */}
            <div className="bg-[#FAF9F6] border border-[#E5E1D8] p-5 space-y-3">
              <h4 className="text-xs font-sans uppercase tracking-wider font-bold text-[#1A1A1A] border-b border-[#EAE7DF] pb-2 flex items-center justify-between">
                <span>Challenges & Coping</span>
                <AlertCircle className="w-3.5 h-3.5 text-[#A0A0A0]" />
              </h4>
              <div className="space-y-3 pt-1">
                {analysis.challenges?.map((c, idx) => (
                  <div key={idx} className="p-3 bg-white border border-[#E5E1D8] space-y-2">
                    <div className="text-xs font-serif font-bold text-[#1A1A1A]">{c.challenge}</div>
                    <div className="text-[11px] font-sans text-[#777]">
                      <strong className="text-[#333]">Recurrence:</strong> {c.recurrence}
                    </div>
                    <div className="text-[11px] font-sans text-[#444] bg-[#F9F7F1] p-2 border border-[#EAE7DF]">
                      <strong className="text-[#1A1A1A]">What Helps:</strong> {c.copingPattern}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Positive Patterns & Strengths */}
            <div className="bg-[#FAF9F6] border border-[#E5E1D8] p-5 space-y-3">
              <h4 className="text-xs font-sans uppercase tracking-wider font-bold text-[#1A1A1A] border-b border-[#EAE7DF] pb-2 flex items-center justify-between">
                <span>Positive Patterns</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#15803D]" />
              </h4>
              <div className="space-y-3 pt-1">
                {analysis.positivePatterns?.map((p, idx) => (
                  <div key={idx} className="p-3 bg-white border border-[#BBF7D0]/40 bg-[#F0FDF4]/20 space-y-1.5">
                    <div className="text-xs font-serif font-bold text-[#15803D]">{p.pattern}</div>
                    <p className="text-xs text-[#555] font-sans leading-relaxed">{p.observation}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

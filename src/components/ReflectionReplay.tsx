import React, { useState } from "react";
import { History, Sparkles, ArrowRight, Calendar, Loader2, RefreshCw } from "lucide-react";
import { JournalEntry } from "../types";
import { apiPost } from "../lib/api";

interface ReflectionReplayProps {
  entries: JournalEntry[];
  onSelectEntry?: (entry: JournalEntry) => void;
}

export const ReflectionReplay: React.FC<ReflectionReplayProps> = ({ entries }) => {
  const [timeframe, setTimeframe] = useState<string>("Last Month");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [replay, setReplay] = useState<{
    thenSummary: string;
    alongTheWaySummary: string;
    nowSummary: string;
    keyMilestones: { date: string; title: string; significance: string }[];
    shifts: { from: string; to: string; dimension: string }[];
    sentimentEvolution: string;
    narrative: string;
    modelUsed?: string;
  } | null>(null);

  const timeframes = ["Last Week", "Last Month", "Last 3 Months", "All Time"];

  const handleGenerateReplay = async (tf: string) => {
    setTimeframe(tf);
    setLoading(true);
    setError(null);

    try {
      const data = await apiPost("/api/gemini/reflection-replay", { timeframe: tf, entries });
      setReplay(data);
    } catch (err: any) {
      setError(err.message || "Failed to generate reflection replay.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-[#FAF9F6] border border-[#E5E1D8] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-sans uppercase tracking-[0.2em] text-[#D4A373] font-bold">
            <History className="w-3.5 h-3.5" />
            <span>Chronological Journey Replay</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#1A1A1A] font-medium tracking-tight mt-2 italic">
            Reflection Replay
          </h1>
          <p className="text-xs sm:text-sm font-sans text-[#666] mt-2 max-w-2xl">
            Revisit your inner journey across time through a structured progression: THEN → ALONG THE WAY → NOW. Observe how your mindset, challenges, and aspirations transformed.
          </p>
        </div>

        {/* Timeframe selector */}
        <div className="flex items-center gap-1.5 bg-white border border-[#E5E1D8] p-1 shadow-xs">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => handleGenerateReplay(tf)}
              className={`px-3 py-1.5 text-xs font-sans uppercase tracking-wider transition-colors cursor-pointer ${
                timeframe === tf
                  ? "bg-[#1A1A1A] text-white font-medium"
                  : "text-[#555] hover:bg-[#F4F1EA]"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs font-sans flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => handleGenerateReplay(timeframe)} className="underline font-bold cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {loading && (
        <div className="py-20 text-center space-y-4">
          <Loader2 className="w-8 h-8 text-[#1A1A1A] animate-spin mx-auto" />
          <p className="text-xs font-sans uppercase tracking-widest text-[#8C8C8C]">
            Synthesizing your journey from {timeframe.toLowerCase()}...
          </p>
        </div>
      )}

      {!replay && !loading && (
        <div className="p-12 border border-dashed border-[#E5E1D8] text-center space-y-4 bg-[#FAF9F6]">
          <History className="w-8 h-8 text-[#A0A0A0] mx-auto stroke-1" />
          <h3 className="font-serif text-lg italic text-[#1A1A1A]">Ready to Replay Your Narrative</h3>
          <p className="text-xs font-sans text-[#777] max-w-md mx-auto leading-relaxed">
            Select a timeframe above to generate a thoughtful retrospective comparing your thoughts then vs. now.
          </p>
          <button
            onClick={() => handleGenerateReplay(timeframe)}
            className="px-5 py-2.5 bg-[#1A1A1A] text-white text-xs font-sans uppercase tracking-wider hover:bg-[#333] cursor-pointer"
          >
            Generate {timeframe} Replay
          </button>
        </div>
      )}

      {replay && !loading && (
        <div className="space-y-8 animate-fadeIn">
          {/* THEN -> ALONG THE WAY -> NOW Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* THEN */}
            <div className="bg-white border border-[#E5E1D8] p-6 space-y-3 relative">
              <div className="flex items-center justify-between pb-3 border-b border-[#EAE7DF]">
                <span className="text-xs font-sans uppercase tracking-widest font-bold text-[#8C8C8C]">
                  1. Then
                </span>
                <span className="text-[10px] font-sans text-[#A0A0A0]">Starting Mindset</span>
              </div>
              <p className="font-serif text-sm sm:text-base text-[#222] leading-relaxed">
                {replay.thenSummary}
              </p>
            </div>

            {/* ALONG THE WAY */}
            <div className="bg-white border border-[#E5E1D8] p-6 space-y-3 relative">
              <div className="flex items-center justify-between pb-3 border-b border-[#EAE7DF]">
                <span className="text-xs font-sans uppercase tracking-widest font-bold text-[#D4A373]">
                  2. Along the Way
                </span>
                <span className="text-[10px] font-sans text-[#A0A0A0]">Pivots & Growth</span>
              </div>
              <p className="font-serif text-sm sm:text-base text-[#222] leading-relaxed">
                {replay.alongTheWaySummary}
              </p>
            </div>

            {/* NOW */}
            <div className="bg-white border border-[#1A1A1A] p-6 space-y-3 shadow-xs relative">
              <div className="flex items-center justify-between pb-3 border-b border-[#EAE7DF]">
                <span className="text-xs font-sans uppercase tracking-widest font-bold text-[#1A1A1A]">
                  3. Now
                </span>
                <span className="text-[10px] font-sans text-[#A0A0A0]">Present Standing</span>
              </div>
              <p className="font-serif text-sm sm:text-base text-[#1A1A1A] font-medium leading-relaxed">
                {replay.nowSummary}
              </p>
            </div>
          </div>

          {/* Core Mindset Shifts */}
          {replay.shifts && replay.shifts.length > 0 && (
            <div className="bg-[#FAF9F6] border border-[#E5E1D8] p-6 space-y-4">
              <h3 className="text-xs font-sans uppercase tracking-wider font-bold text-[#1A1A1A] pb-2 border-b border-[#EAE7DF]">
                Observable Mindset Shifts
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {replay.shifts.map((shift, idx) => (
                  <div key={idx} className="p-4 bg-white border border-[#E5E1D8] space-y-2">
                    <span className="text-[9px] font-sans uppercase tracking-wider px-2 py-0.5 bg-[#F4F1EA] text-[#555] border border-[#E5E1D8] inline-block">
                      {shift.dimension}
                    </span>
                    <div className="flex items-center gap-2 text-xs font-serif text-[#1A1A1A]">
                      <span className="text-[#8C8C8C] line-through">{shift.from}</span>
                      <ArrowRight className="w-3 h-3 text-[#D4A373] shrink-0" />
                      <span className="font-bold text-[#1A1A1A]">{shift.to}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full Narrative Essay */}
          <div className="bg-white border border-[#E5E1D8] p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#EAE7DF]">
              <Sparkles className="w-4 h-4 text-[#D4A373]" />
              <h3 className="font-serif italic text-lg font-semibold text-[#1A1A1A]">
                Journey Narrative Synthesis
              </h3>
            </div>
            <div className="font-serif text-base text-[#333] leading-relaxed whitespace-pre-line">
              {replay.narrative}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

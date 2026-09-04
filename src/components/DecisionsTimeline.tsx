import React, { useState } from "react";
import { Scale, ArrowRight, CheckCircle2, HelpCircle, Compass, Plus, Loader2, Sparkles } from "lucide-react";
import { JournalEntry, DecisionTracking } from "../types";
import { apiPost } from "../lib/api";

interface DecisionsTimelineProps {
  entries: JournalEntry[];
  onSelectEntry: (entry: JournalEntry) => void;
  onNavigateToJournal: () => void;
  onUpdateEntryDecision: (entry: JournalEntry, decision?: DecisionTracking) => Promise<void>;
}

export const DecisionsTimeline: React.FC<DecisionsTimelineProps> = ({
  entries,
  onSelectEntry,
  onNavigateToJournal,
  onUpdateEntryDecision,
}) => {
  const [selectedDecisionId, setSelectedDecisionId] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [decisionEvaluation, setDecisionEvaluation] = useState<any | null>(null);
  const [isMarkingDecision, setIsMarkingDecision] = useState(false);

  // Form State
  const [targetEntryId, setTargetEntryId] = useState("");
  const [decisionStage, setDecisionStage] = useState<"considering" | "decided" | "outcome" | "reflection">("decided");
  const [decisionText, setDecisionText] = useState("");

  const decisionEntries = entries.filter((e) => e.decision?.isDecision);
  const activeDecision = decisionEntries.find((e) => e.id === selectedDecisionId) || (decisionEntries.length > 0 ? decisionEntries[0] : null);

  const handleEvaluateDecision = async (decEntry: JournalEntry) => {
    setSelectedDecisionId(decEntry.id);
    setEvaluating(true);
    setDecisionEvaluation(null);

    try {
      // Find subsequent entries created after this decision
      const decDate = new Date(decEntry.createdAt).getTime();
      const subsequent = entries.filter(
        (e) => e.id !== decEntry.id && new Date(e.createdAt).getTime() >= decDate
      );

      const data = await apiPost("/api/gemini/evaluate-decision", {
        decisionEntry: decEntry,
        subsequentEntries: subsequent,
      });

      setDecisionEvaluation(data);
    } catch (err: any) {
      // Graceful error state
    } finally {
      setEvaluating(false);
    }
  };

  const handleSaveDecisionMark = async () => {
    if (!targetEntryId || !decisionText.trim()) return;
    const entry = entries.find((e) => e.id === targetEntryId);
    if (!entry) return;

    await onUpdateEntryDecision(entry, {
      isDecision: true,
      stage: decisionStage,
      decisionText: decisionText.trim(),
    });

    setIsMarkingDecision(false);
    setDecisionText("");
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-[#FAF9F6] border border-[#E5E1D8] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-sans uppercase tracking-[0.2em] text-[#D4A373] font-bold">
            <Scale className="w-3.5 h-3.5" />
            <span>Deliberation & Outcomes</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#1A1A1A] font-medium tracking-tight mt-2 italic">
            Decision Timeline
          </h1>
          <p className="text-xs sm:text-sm font-sans text-[#666] mt-2 max-w-2xl">
            Track turning points across stages: Considering → Decided → Outcome → Reflection. Ask ReflectAI "How did this decision turn out?" grounded in what you later documented.
          </p>
        </div>

        <button
          onClick={() => {
            setIsMarkingDecision(!isMarkingDecision);
            if (entries.length > 0) setTargetEntryId(entries[0].id);
          }}
          className="px-4 py-2.5 bg-[#1A1A1A] hover:bg-[#333] text-white text-xs font-sans uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Mark Entry as Decision</span>
        </button>
      </div>

      {/* Decision Tagging Form */}
      {isMarkingDecision && (
        <div className="p-6 bg-white border border-[#1A1A1A] shadow-xs space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-[#EAE7DF]">
            <h3 className="font-serif text-base font-bold text-[#1A1A1A]">
              Record a Crossroads or Decision
            </h3>
            <button
              onClick={() => setIsMarkingDecision(false)}
              className="text-xs text-[#8C8C8C] hover:text-[#1A1A1A] cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-sans uppercase tracking-wider text-[#8C8C8C] block mb-1">
                Reflection Entry
              </label>
              <select
                value={targetEntryId}
                onChange={(e) => setTargetEntryId(e.target.value)}
                className="w-full p-2.5 bg-[#FAF9F6] border border-[#E5E1D8] text-xs font-sans text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
              >
                {entries.map((e) => (
                  <option key={e.id} value={e.id}>
                    {new Date(e.createdAt).toLocaleDateString()} — {e.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-sans uppercase tracking-wider text-[#8C8C8C] block mb-1">
                Stage in Process
              </label>
              <select
                value={decisionStage}
                onChange={(e) => setDecisionStage(e.target.value as any)}
                className="w-full p-2.5 bg-[#FAF9F6] border border-[#E5E1D8] text-xs font-sans text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
              >
                <option value="considering">Considering (Weighing options)</option>
                <option value="decided">Decided (Choice made)</option>
                <option value="outcome">Outcome (Result observed)</option>
                <option value="reflection">Reflection (Looking back)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-sans uppercase tracking-wider text-[#8C8C8C] block mb-1">
                Core Decision Essence
              </label>
              <input
                type="text"
                value={decisionText}
                onChange={(e) => setDecisionText(e.target.value)}
                placeholder="e.g., Decided to leave agency & freelance"
                className="w-full p-2.5 bg-[#FAF9F6] border border-[#E5E1D8] text-xs font-sans text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveDecisionMark}
              disabled={!decisionText.trim() || !targetEntryId}
              className="px-5 py-2 bg-[#1A1A1A] text-white text-xs font-sans uppercase tracking-wider hover:bg-[#333] cursor-pointer disabled:opacity-40"
            >
              Save Decision Marker
            </button>
          </div>
        </div>
      )}

      {decisionEntries.length === 0 ? (
        <div className="bg-[#FAF9F6] border border-[#E5E1D8] p-12 text-center space-y-4">
          <Scale className="w-10 h-10 text-[#A0A0A0] mx-auto stroke-1" />
          <h2 className="font-serif text-2xl italic text-[#1A1A1A]">No Decisions Marked Yet</h2>
          <p className="text-sm font-sans text-[#666] max-w-lg mx-auto leading-relaxed">
            Mark reflections where you considered a path, took a leap, or evaluated an outcome. ReflectAI helps you see how past choices actually unfolded over subsequent months.
          </p>
          <button
            onClick={() => {
              setIsMarkingDecision(true);
              if (entries.length > 0) setTargetEntryId(entries[0].id);
            }}
            className="px-5 py-2.5 bg-[#1A1A1A] text-white text-xs font-sans uppercase tracking-wider hover:bg-[#333] cursor-pointer inline-flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Mark First Decision</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Decision List */}
          <div className="bg-white border border-[#E5E1D8] p-5 space-y-3">
            <h3 className="text-xs font-sans uppercase tracking-wider font-bold text-[#1A1A1A] pb-3 border-b border-[#EAE7DF]">
              Documented Crossroads ({decisionEntries.length})
            </h3>
            <div className="space-y-2">
              {decisionEntries.map((dec) => {
                const isSelected = activeDecision?.id === dec.id;
                return (
                  <div
                    key={dec.id}
                    onClick={() => {
                      setSelectedDecisionId(dec.id);
                      handleEvaluateDecision(dec);
                    }}
                    className={`p-3 border transition-all cursor-pointer space-y-1.5 ${
                      isSelected
                        ? "bg-[#FAF9F6] border-[#1A1A1A] shadow-xs"
                        : "bg-white border-[#E5E1D8] hover:border-[#BFB8AA]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-sans uppercase tracking-widest px-2 py-0.5 bg-[#F4F1EA] text-[#1A1A1A] border border-[#E5E1D8]">
                        {dec.decision?.stage || "Decided"}
                      </span>
                      <span className="text-[10px] text-[#8C8C8C]">
                        {new Date(dec.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 className="font-serif text-sm font-semibold text-[#1A1A1A]">
                      {dec.decision?.decisionText || dec.title}
                    </h4>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Decision Analysis */}
          <div className="lg:col-span-2 space-y-6">
            {activeDecision && (
              <div className="bg-white border border-[#E5E1D8] p-6 sm:p-8 space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-[#EAE7DF]">
                  <div>
                    <span className="text-[10px] font-sans uppercase tracking-widest text-[#D4A373] font-bold">
                      Selected Decision
                    </span>
                    <h3 className="font-serif text-2xl font-bold text-[#1A1A1A] mt-1">
                      {activeDecision.decision?.decisionText || activeDecision.title}
                    </h3>
                    <p className="text-xs font-sans text-[#777] mt-0.5">
                      Logged on {new Date(activeDecision.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <button
                    onClick={() => handleEvaluateDecision(activeDecision)}
                    disabled={evaluating}
                    className="px-4 py-2 bg-[#1A1A1A] text-white text-xs font-sans uppercase tracking-wider hover:bg-[#333] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {evaluating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-[#D4A373]" />
                    )}
                    <span>How did this turn out?</span>
                  </button>
                </div>

                {/* Retrospective evaluation output */}
                {decisionEvaluation && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="bg-[#FAF9F6] border border-[#E5E1D8] p-5 space-y-2">
                      <h4 className="text-xs font-sans uppercase tracking-wider font-bold text-[#1A1A1A]">
                        Evidence from Later Journal Entries
                      </h4>
                      <p className="font-serif text-base text-[#222] leading-relaxed">
                        {decisionEvaluation.summary}
                      </p>
                    </div>

                    {decisionEvaluation.timelineStages && decisionEvaluation.timelineStages.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-sans uppercase tracking-wider font-bold text-[#1A1A1A]">
                          Decision Arc Progression
                        </h4>
                        <div className="space-y-2">
                          {decisionEvaluation.timelineStages.map((stage: any, idx: number) => (
                            <div key={idx} className="p-3.5 bg-white border border-[#E5E1D8] flex items-start gap-3">
                              <span className="px-2 py-0.5 bg-[#1A1A1A] text-white text-[9px] font-sans uppercase tracking-wider shrink-0 mt-0.5">
                                {stage.stage}
                              </span>
                              <div className="text-xs font-sans text-[#444] leading-relaxed">
                                {stage.notes}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

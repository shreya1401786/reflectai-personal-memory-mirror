import React, { useState } from "react";
import { Sparkles, ArrowRight, MessageSquare, Compass, Search, Loader2, BookOpen, AlertCircle } from "lucide-react";
import { JournalEntry, MemoryQueryResult } from "../types";
import { apiPost } from "../lib/api";

interface MemoryMirrorProps {
  entries: JournalEntry[];
  onSelectEntry: (entry: JournalEntry) => void;
  onNavigateToJournal: () => void;
}

export const MemoryMirror: React.FC<MemoryMirrorProps> = ({
  entries,
  onSelectEntry,
  onNavigateToJournal,
}) => {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MemoryQueryResult | null>(null);

  const sampleQuestions = [
    "Have I felt this way before?",
    "What was I thinking about this time last month?",
    "What helped me the last time I felt stuck?",
    "Have I written about this place or project before?",
    "Which moments brought me the deepest sense of peace?",
    "How has my perspective on work evolved?",
  ];

  const handleAsk = async (queryText: string) => {
    const q = queryText.trim();
    if (!q) return;
    setQuestion(q);
    setLoading(true);
    setError(null);

    try {
      const data = await apiPost("/api/gemini/memory-query", { question: q, entries });
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Could not retrieve reflection insights. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const relevantEntries = (result?.relevantEntryIds || [])
    .map((id) => entries.find((e) => e.id === id))
    .filter(Boolean) as JournalEntry[];

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-[#FAF9F6] border border-[#E5E1D8] p-6 sm:p-8">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-[10px] font-sans uppercase tracking-[0.2em] text-[#D4A373] font-bold">
            <Compass className="w-3.5 h-3.5" />
            <span>Flagship Inquiry</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#1A1A1A] font-medium tracking-tight mt-2 italic">
            Talk to Your Past Self
          </h1>
          <p className="text-sm font-sans text-[#666] leading-relaxed mt-3">
            Ask questions of your authorized reflections across time. ReflectAI searches your personal journal archive, retrieves relevant memories without exposing them to other users, and lets Gemini synthesize how your perspective has evolved.
          </p>
        </div>

        {/* Input Bar */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#8C8C8C] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="input-memory-mirror-query"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAsk(question);
              }}
              placeholder="Ask your memories anything: 'What was I struggling with in July?', 'What helped me get unstuck?'..."
              className="w-full pl-10 pr-4 py-3 bg-white border border-[#E5E1D8] text-sm font-sans text-[#1A1A1A] placeholder-[#8C8C8C] focus:outline-none focus:border-[#1A1A1A] shadow-xs"
            />
          </div>

          <button
            id="btn-ask-past-self"
            onClick={() => handleAsk(question)}
            disabled={loading || !question.trim()}
            className="px-6 py-3 bg-[#1A1A1A] hover:bg-[#333] text-white text-xs font-sans uppercase tracking-[0.15em] transition-colors flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer shadow-xs whitespace-nowrap"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Consulting Memories...</span>
              </>
            ) : (
              <>
                <span>Ask My Memory</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>

        {/* Sample Inquiries */}
        <div className="mt-4 pt-4 border-t border-[#EAE7DF]">
          <span className="text-[10px] font-sans uppercase tracking-wider text-[#8C8C8C] block mb-2">
            Suggested Inquiries into Past Reflections:
          </span>
          <div className="flex flex-wrap gap-2">
            {sampleQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleAsk(q)}
                className="px-2.5 py-1 text-xs font-serif italic text-[#444] bg-white border border-[#E5E1D8] hover:border-[#1A1A1A] hover:text-[#1A1A1A] transition-colors text-left cursor-pointer"
              >
                "{q}"
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs font-sans flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => handleAsk(question)}
            className="underline font-bold hover:text-black cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Results Section */}
      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          {/* Main Answer Column (2 spans) */}
          <div className="lg:col-span-2 bg-white border border-[#E5E1D8] p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#EAE7DF]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#D4A373]" />
                <span className="font-serif italic text-base font-bold text-[#1A1A1A]">
                  Synthesis from Your Past Self
                </span>
              </div>
              <span className="text-[10px] font-sans uppercase tracking-widest text-[#8C8C8C]">
                {result.modelUsed || "Gemini 3.6 Flash"}
              </span>
            </div>

            {/* Insufficient Evidence Warning Banner */}
            {result.hasSufficientEvidence === false && (
              <div className="p-4 bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] text-xs font-sans flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold block">Limited or Insufficient Evidence in Journal Archive</span>
                  <p className="leading-relaxed text-[#B45309]">
                    {result.insufficientEvidenceNote ||
                      "There isn't enough evidence in your past journal entries to answer this inquiry with certainty. Factual claims are limited strictly to what was explicitly written in your archive."}
                  </p>
                </div>
              </div>
            )}

            {/* Clearly Separated Sections */}
            {result.fromYourMemories || result.possiblePattern ? (
              <div className="space-y-5">
                {/* 1. From your memories */}
                <div className="bg-[#FAF9F6] border border-[#E5E1D8] p-5 space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-[#EAE7DF]">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-[#D4A373]" />
                      <span className="font-serif font-bold text-sm text-[#1A1A1A]">
                        From your memories
                      </span>
                    </div>
                    <span className="text-[10px] font-sans uppercase tracking-wider text-[#666] bg-white px-2 py-0.5 border border-[#E5E1D8]">
                      Supported by Entries
                    </span>
                  </div>
                  <p className="text-[11px] font-sans text-[#777]">
                    Facts directly supported by your retrieved journal entries, with dates and entry titles:
                  </p>
                  <div className="font-serif text-[#222] text-sm leading-relaxed whitespace-pre-line pt-1">
                    {result.fromYourMemories || "No specific memories were found directly mentioning this topic."}
                  </div>
                </div>

                {/* 2. Possible pattern */}
                <div className="bg-white border border-[#E5E1D8] p-5 space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-[#EAE7DF]">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#D4A373]" />
                      <span className="font-serif font-bold text-sm text-[#1A1A1A]">
                        Possible pattern
                      </span>
                    </div>
                    <span className="text-[10px] font-sans uppercase tracking-wider text-[#D4A373] bg-[#FAF9F6] px-2 py-0.5 border border-[#EAE7DF] font-semibold">
                      Gemini's Interpretation
                    </span>
                  </div>
                  <p className="text-[11px] font-sans text-[#777]">
                    Gemini's reflective interpretation of potential patterns across your reflections (clearly labeled as interpretation):
                  </p>
                  <div className="font-serif text-[#222] text-sm leading-relaxed whitespace-pre-line pt-1">
                    {result.possiblePattern || "No conclusive pattern can be confirmed from available records."}
                  </div>
                </div>
              </div>
            ) : (
              /* Fallback for unstructured string answer */
              <div className="font-serif text-[#222] text-base leading-relaxed space-y-4 whitespace-pre-line">
                {result.answer}
              </div>
            )}

            {/* Structured Insights if present */}
            {result.insights && result.insights.length > 0 && (
              <div className="pt-5 border-t border-[#EAE7DF] space-y-2">
                <span className="text-[10px] font-sans uppercase tracking-wider text-[#8C8C8C] block">
                  Recurring Observations & Patterns:
                </span>
                <ul className="space-y-1.5">
                  {result.insights.map((insight, idx) => (
                    <li key={idx} className="text-xs font-sans text-[#444] flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D4A373] mt-1.5 shrink-0" />
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Retrieved Grounded Memories (1 span) */}
          <div className="space-y-4">
            <div className="bg-[#FAF9F6] border border-[#E5E1D8] p-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#EAE7DF]">
                <span className="text-xs font-sans uppercase tracking-wider font-bold text-[#1A1A1A] flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-[#D4A373]" />
                  Retrieved Memories ({relevantEntries.length})
                </span>
              </div>
              <p className="text-[11px] font-sans text-[#666] mt-2 mb-4 leading-relaxed">
                Gemini was provided only with these authorized past entries from your private Firestore database.
              </p>

              {relevantEntries.length === 0 ? (
                <p className="text-xs font-serif italic text-[#8C8C8C] py-4 text-center">
                  No direct previous entries cited for this query.
                </p>
              ) : (
                <div className="space-y-3">
                  {relevantEntries.map((entry) => (
                    <div
                      key={entry.id}
                      onClick={() => {
                        onSelectEntry(entry);
                        onNavigateToJournal();
                      }}
                      className="p-3 bg-white border border-[#E5E1D8] hover:border-[#1A1A1A] transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between text-[10px] font-sans uppercase tracking-wider text-[#8C8C8C] mb-1">
                        <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                        {entry.location?.name && (
                          <span className="text-[#D4A373] truncate max-w-[100px]">{entry.location.name}</span>
                        )}
                      </div>
                      <h4 className="font-serif text-sm font-semibold text-[#1A1A1A] group-hover:underline">
                        {entry.title || "Untitled Reflection"}
                      </h4>
                      <p className="text-xs text-[#666] font-sans line-clamp-2 mt-1 leading-relaxed">
                        {entry.summary || entry.messages?.[0]?.content || "Empty entry"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty State when no inquiry yet */}
      {!result && !loading && (
        <div className="p-12 border border-dashed border-[#E5E1D8] text-center space-y-3 bg-[#FAF9F6]">
          <MessageSquare className="w-8 h-8 text-[#A0A0A0] mx-auto stroke-1" />
          <h3 className="font-serif text-lg italic text-[#1A1A1A]">Your Archive Awaits</h3>
          <p className="text-xs font-sans text-[#777] max-w-md mx-auto leading-relaxed">
            Enter any thought or choose an inquiry above. ReflectAI compares your current state with your past words to illuminate your personal growth.
          </p>
        </div>
      )}
    </div>
  );
};

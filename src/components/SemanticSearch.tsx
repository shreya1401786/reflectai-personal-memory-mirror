import React, { useState } from "react";
import { Search, Sparkles, ArrowRight, Loader2, BookOpen } from "lucide-react";
import { JournalEntry } from "../types";
import { apiPost } from "../lib/api";

interface SemanticSearchProps {
  entries: JournalEntry[];
  onSelectEntry: (entry: JournalEntry) => void;
  onNavigateToJournal: () => void;
}

export const SemanticSearch: React.FC<SemanticSearchProps> = ({
  entries,
  onSelectEntry,
  onNavigateToJournal,
}) => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<
    { entryId: string; relevanceScore: number; reason: string }[] | null
  >(null);

  const sampleSearches = [
    "Times I felt completely calm and present",
    "Creative ideas I never ended up launching",
    "Moments where I hesitated before making a career choice",
    "Reflections about feeling burnt out or overwhelmed",
    "Gratitude toward close friends or family",
  ];

  const handleSearch = async (qText: string) => {
    const q = qText.trim();
    if (!q) return;
    setQuery(q);
    setLoading(true);
    setError(null);

    try {
      const data = await apiPost("/api/gemini/semantic-search", { query: q, entries });
      setResults(data.matches || []);
    } catch (err: any) {
      setError(err.message || "Could not complete semantic search.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-[#FAF9F6] border border-[#E5E1D8] p-6 sm:p-8">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-[10px] font-sans uppercase tracking-[0.2em] text-[#D4A373] font-bold">
            <Search className="w-3.5 h-3.5" />
            <span>Conceptual Retrieval</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#1A1A1A] font-medium tracking-tight mt-2 italic">
            Semantic Memory Search
          </h1>
          <p className="text-sm font-sans text-[#666] leading-relaxed mt-3">
            Search your reflections by meaning, mood, and abstract concepts rather than exact keywords. Powered by Gemini context understanding across your private entries.
          </p>
        </div>

        {/* Search input bar */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#8C8C8C] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch(query);
              }}
              placeholder="Search by meaning: 'feeling at peace in nature', 'reluctance to take risks'..."
              className="w-full pl-10 pr-4 py-3 bg-white border border-[#E5E1D8] text-sm font-sans text-[#1A1A1A] placeholder-[#8C8C8C] focus:outline-none focus:border-[#1A1A1A] shadow-xs"
            />
          </div>

          <button
            onClick={() => handleSearch(query)}
            disabled={loading || !query.trim()}
            className="px-6 py-3 bg-[#1A1A1A] hover:bg-[#333] text-white text-xs font-sans uppercase tracking-[0.15em] transition-colors flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer shadow-xs whitespace-nowrap"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Searching Meaning...</span>
              </>
            ) : (
              <>
                <span>Search</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>

        {/* Prompt suggestions */}
        <div className="mt-4 pt-4 border-t border-[#EAE7DF]">
          <span className="text-[10px] font-sans uppercase tracking-wider text-[#8C8C8C] block mb-2">
            Try conceptual themes:
          </span>
          <div className="flex flex-wrap gap-2">
            {sampleSearches.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSearch(s)}
                className="px-2.5 py-1 text-xs font-serif italic text-[#444] bg-white border border-[#E5E1D8] hover:border-[#1A1A1A] transition-colors cursor-pointer"
              >
                "{s}"
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs font-sans flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => handleSearch(query)} className="underline font-bold cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#EAE7DF]">
            <span className="text-xs font-sans uppercase tracking-wider font-bold text-[#1A1A1A]">
              Matching Reflections ({results.length})
            </span>
          </div>

          {results.length === 0 ? (
            <div className="p-12 text-center text-xs font-sans text-[#8C8C8C] bg-[#FAF9F6] border border-[#E5E1D8]">
              No reflections closely matched this concept. Try phrasing your search differently.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.map((item, idx) => {
                const entry = entries.find((e) => e.id === item.entryId);
                if (!entry) return null;
                return (
                  <div
                    key={idx}
                    className="p-5 bg-white border border-[#E5E1D8] hover:border-[#1A1A1A] transition-all space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-sans text-[#8C8C8C]">
                        <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                        <span className="px-2 py-0.5 bg-[#FAF9F6] border border-[#E5E1D8] font-bold text-[#1A1A1A]">
                          {Math.round(item.relevanceScore * 100)}% Match
                        </span>
                      </div>

                      <h3
                        onClick={() => {
                          onSelectEntry(entry);
                          onNavigateToJournal();
                        }}
                        className="font-serif text-base font-bold text-[#1A1A1A] hover:underline cursor-pointer"
                      >
                        {entry.title || "Untitled Reflection"}
                      </h3>

                      <p className="text-xs font-sans text-[#666] line-clamp-3 leading-relaxed">
                        {entry.summary || entry.messages?.[0]?.content || "Empty reflection"}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-[#EAE7DF] space-y-2">
                      <p className="text-[11px] font-sans text-[#D4A373] italic">
                        <strong>Why it matches:</strong> {item.reason}
                      </p>
                      <button
                        onClick={() => {
                          onSelectEntry(entry);
                          onNavigateToJournal();
                        }}
                        className="text-xs font-sans uppercase tracking-wider text-[#1A1A1A] hover:underline cursor-pointer font-medium"
                      >
                        Open Reflection →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

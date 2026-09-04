import React, { useState } from "react";
import { Link2, Sparkles, ArrowRight, Loader2, BookOpen } from "lucide-react";
import { JournalEntry } from "../types";
import { apiPost } from "../lib/api";

interface MemoryConnectionCardProps {
  currentEntry: JournalEntry;
  entries: JournalEntry[];
  onSelectEntry: (entry: JournalEntry) => void;
}

export const MemoryConnectionCard: React.FC<MemoryConnectionCardProps> = ({
  currentEntry,
  entries,
  onSelectEntry,
}) => {
  const [loading, setLoading] = useState(false);
  const [connection, setConnection] = useState<{
    hasConnection: boolean;
    connectedEntryId: string | null;
    explanation: string;
    sharedThemes: string[];
    evolutionNote: string;
    modelUsed?: string;
  } | null>(null);

  // Need at least 1 other entry
  const pastEntries = entries.filter((e) => e.id !== currentEntry.id);

  const handleFindConnection = async () => {
    if (pastEntries.length === 0) return;
    setLoading(true);

    try {
      const data = await apiPost("/api/gemini/find-connection", {
        currentText: currentEntry.messages?.[0]?.content || currentEntry.summary || currentEntry.title,
        pastEntries,
      });

      setConnection(data);
    } catch (err) {
      // Graceful failure
    } finally {
      setLoading(false);
    }
  };

  if (pastEntries.length === 0) return null;

  const connectedEntry = connection?.connectedEntryId
    ? entries.find((e) => e.id === connection.connectedEntryId)
    : null;

  return (
    <div className="bg-[#FAF9F6] border border-[#E5E1D8] p-5 space-y-4 my-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-[#D4A373]" />
          <span className="text-xs font-sans uppercase tracking-wider font-bold text-[#1A1A1A]">
            Memory Association Engine
          </span>
        </div>

        {!connection && (
          <button
            onClick={handleFindConnection}
            disabled={loading}
            className="px-3 py-1.5 bg-white border border-[#E5E1D8] hover:border-[#1A1A1A] text-xs font-sans uppercase tracking-wider text-[#1A1A1A] flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            {loading ? (
              <Loader2 className="w-3 h-3 animate-spin text-[#1A1A1A]" />
            ) : (
              <Sparkles className="w-3 h-3 text-[#D4A373]" />
            )}
            <span>{loading ? "Searching Past Reflections..." : "Find Connected Memory"}</span>
          </button>
        )}
      </div>

      {connection && (
        <div className="space-y-4 pt-2 border-t border-[#EAE7DF] animate-fadeIn">
          {connection.hasConnection && connectedEntry ? (
            <div className="space-y-3">
              <div className="p-4 bg-white border border-[#E5E1D8] space-y-2">
                <div className="flex items-center justify-between text-[10px] font-sans text-[#8C8C8C]">
                  <span>Connected to reflection from:</span>
                  <span>{new Date(connectedEntry.createdAt).toLocaleDateString()}</span>
                </div>
                <h4
                  onClick={() => onSelectEntry(connectedEntry)}
                  className="font-serif text-base font-bold text-[#1A1A1A] hover:underline cursor-pointer flex items-center justify-between"
                >
                  <span>"{connectedEntry.title || "Untitled"}"</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#D4A373]" />
                </h4>
                <p className="text-xs font-sans text-[#666] line-clamp-2">
                  {connectedEntry.summary || connectedEntry.messages?.[0]?.content}
                </p>
              </div>

              <div className="text-xs font-serif text-[#333] leading-relaxed bg-white p-3.5 border border-[#E5E1D8]">
                <strong>Why they connect:</strong> {connection.explanation}
              </div>

              {connection.evolutionNote && (
                <div className="text-xs font-sans text-[#555] bg-[#F4F1EA] p-3 border border-[#E5E1D8]">
                  <strong className="text-[#1A1A1A]">Perspective Evolution:</strong>{" "}
                  {connection.evolutionNote}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs font-serif italic text-[#8C8C8C] py-2">
              This reflection touches on novel ground—no strongly associated past memories were identified.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

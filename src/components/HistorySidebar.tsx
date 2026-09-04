import React, { useState, useMemo } from "react";
import { Search, Plus, Trash2, Calendar, Tag, MessageSquare, ChevronRight, X } from "lucide-react";
import { JournalEntry } from "../types";
import { getEntrySentiment } from "../lib/sentiment";

interface HistorySidebarProps {
  entries: JournalEntry[];
  currentEntryId: string | null;
  onSelectEntry: (entry: JournalEntry) => void;
  onNewEntry: () => void;
  onDeleteEntry: (entryId: string) => Promise<void>;
  isOpen: boolean;
  onClose: () => void;
  loading: boolean;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  entries,
  currentEntryId,
  onSelectEntry,
  onNewEntry,
  onDeleteEntry,
  isOpen,
  onClose,
  loading,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Extract unique tags
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    entries.forEach((e) => {
      (e.tags || []).forEach((t) => tagsSet.add(t));
    });
    return Array.from(tagsSet);
  }, [entries]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (entry.summary && entry.summary.toLowerCase().includes(searchQuery.toLowerCase())) ||
        entry.messages.some((m) => m.content.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesTag = !selectedTag || (entry.tags && entry.tags.includes(selectedTag));

      return matchesSearch && matchesTag;
    });
  }, [entries, searchQuery, selectedTag]);

  const handleDelete = async (e: React.MouseEvent, entryId: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this reflection and all its dialogue history from Firestore?")) {
      setDeletingId(entryId);
      try {
        await onDeleteEntry(entryId);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "Recent";
    }
  };

  return (
    <aside
      id="history-sidebar"
      className={`fixed inset-y-0 left-0 z-40 w-80 sm:w-88 bg-[#FBF9F5] border-r border-[#E5E1D8] flex flex-col transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* Sidebar Header */}
      <div className="p-5 border-b border-[#E5E1D8] flex items-center justify-between bg-[#F4F1EA]">
        <div>
          <h2 className="font-serif text-lg font-bold italic text-[#1A1A1A] flex items-center gap-2">
            <span>Archive</span>
            <span className="text-[10px] font-sans font-medium px-2 py-0.5 bg-white text-[#1A1A1A] border border-[#E5E1D8]">
              {entries.length}
            </span>
          </h2>
          <p className="text-[10px] font-sans uppercase tracking-[0.15em] text-[#8C8C8C] mt-0.5">
            Private & Cloud Isolated
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            id="btn-sidebar-new-entry"
            onClick={() => {
              onNewEntry();
              if (window.innerWidth < 768) onClose();
            }}
            className="p-2 bg-[#1A1A1A] hover:bg-[#333] text-white transition-colors cursor-pointer"
            title="Start New Reflection"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            id="btn-sidebar-close"
            onClick={onClose}
            className="p-2 text-[#8C8C8C] hover:text-[#1A1A1A] hover:bg-[#EAE7DF] transition-colors md:hidden cursor-pointer"
            title="Close Sidebar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p-4 border-b border-[#E5E1D8] space-y-3 bg-[#FAF9F6]">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#8C8C8C] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-history-search"
            type="text"
            placeholder="Search entries or thoughts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-7 py-2 bg-white border border-[#E5E1D8] text-xs font-sans text-[#1A1A1A] placeholder-[#8C8C8C] focus:outline-none focus:border-[#1A1A1A]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8C8C8C] hover:text-[#1A1A1A] text-xs"
            >
              ×
            </button>
          )}
        </div>

        {/* Tag chips */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto py-0.5">
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-2.5 py-1 text-[10px] font-sans uppercase tracking-wider transition-colors cursor-pointer ${
                selectedTag === null
                  ? "bg-[#1A1A1A] text-white font-medium"
                  : "bg-[#F4F1EA] text-[#666] hover:bg-[#EAE7DF] border border-[#E5E1D8]"
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`px-2.5 py-1 text-[10px] font-sans uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer ${
                  selectedTag === tag
                    ? "bg-[#1A1A1A] text-white font-medium"
                    : "bg-[#F4F1EA] text-[#666] hover:bg-[#EAE7DF] border border-[#E5E1D8]"
                }`}
              >
                <Tag className="w-2.5 h-2.5 text-[#D4A373]" />
                <span>{tag}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Entry List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading && entries.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <div className="w-6 h-6 border-2 border-[#1A1A1A] border-t-transparent rounded-full animate-spin mb-3" />
            <span className="text-xs font-sans uppercase tracking-widest text-[#8C8C8C]">Syncing journal...</span>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <p className="font-serif italic text-sm text-[#8C8C8C]">No archived records found</p>
            <p className="text-[10px] font-sans uppercase tracking-wider text-[#A0A0A0] mt-1.5">
              {searchQuery ? "Try altering search keywords." : "Begin a new session to preserve your reflections."}
            </p>
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const isSelected = entry.id === currentEntryId;
            const isDeleting = deletingId === entry.id;

            return (
              <div
                key={entry.id}
                id={`history-item-${entry.id}`}
                onClick={() => {
                  onSelectEntry(entry);
                  if (window.innerWidth < 768) onClose();
                }}
                className={`group relative p-3.5 cursor-pointer transition-all border ${
                  isSelected
                    ? "bg-white border-[#1A1A1A] shadow-xs"
                    : "bg-[#FAF9F6] border-[#E5E1D8] hover:border-[#BFB8AA] hover:bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3
                    className={`font-serif text-sm font-semibold leading-snug truncate ${
                      isSelected ? "text-[#1A1A1A]" : "text-[#333]"
                    }`}
                  >
                    {entry.title || "Untitled Reflection"}
                  </h3>

                  <button
                    onClick={(e) => handleDelete(e, entry.id)}
                    disabled={isDeleting}
                    className="opacity-0 group-hover:opacity-100 p-1 text-[#8C8C8C] hover:text-[#991b1b] transition-opacity cursor-pointer"
                    title="Delete Entry"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Summary or latest snippet */}
                <p className="text-xs text-[#666] mt-1.5 line-clamp-2 leading-relaxed font-sans">
                  {entry.summary ||
                    (entry.messages.length > 0 ? entry.messages[0].content : "Empty entry")}
                </p>

                {/* Footer info: date, turns, sentiment */}
                <div className="mt-3 flex items-center justify-between text-[10px] font-sans uppercase tracking-wider text-[#8C8C8C] pt-2 border-t border-[#EAE7DF]">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-[#A0A0A0]" />
                    <span>{formatDate(entry.updatedAt || entry.createdAt)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {(() => {
                      const sentiment = getEntrySentiment(entry);
                      return (
                        <span
                          className={`text-[9px] px-1.5 py-0.2 border ${
                            sentiment.valence === "positive"
                              ? "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]"
                              : sentiment.valence === "negative"
                              ? "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]"
                              : "bg-[#F4F1EA] text-[#666] border-[#E5E1D8]"
                          }`}
                        >
                          {sentiment.label}
                        </span>
                      );
                    })()}
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3 text-[#D4A373]" />
                      <span>{entry.messages?.length || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                {entry.tags && entry.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {entry.tags.slice(0, 2).map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 bg-[#F4F1EA] text-[9px] font-sans uppercase tracking-wider text-[#555] border border-[#E5E1D8]"
                      >
                        {t}
                      </span>
                    ))}
                    {entry.tags.length > 2 && (
                      <span className="text-[9px] font-sans text-[#8C8C8C]">+{entry.tags.length - 2}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};

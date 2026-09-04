import React, { useState } from "react";
import { Star, Tag, Calendar, Sparkles, Filter, Plus, BookOpen } from "lucide-react";
import { JournalEntry, MemoryCategory } from "../types";

interface ImportantMemoriesProps {
  entries: JournalEntry[];
  onSelectEntry: (entry: JournalEntry) => void;
  onNavigateToJournal: () => void;
  onToggleImportant: (entry: JournalEntry, category?: MemoryCategory) => Promise<void>;
}

export const ImportantMemories: React.FC<ImportantMemoriesProps> = ({
  entries,
  onSelectEntry,
  onNavigateToJournal,
  onToggleImportant,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isMarking, setIsMarking] = useState(false);
  const [targetEntryId, setTargetEntryId] = useState("");
  const [chosenCategory, setChosenCategory] = useState<MemoryCategory>("Milestone");

  const categories: MemoryCategory[] = [
    "Achievement",
    "Decision",
    "Person",
    "Place",
    "Challenge",
    "Goal",
    "Idea",
    "Milestone",
  ];

  const importantEntries = entries.filter((e) => e.isImportant);
  const filtered = selectedCategory === "all"
    ? importantEntries
    : importantEntries.filter((e) => e.importanceCategory === selectedCategory);

  const handleSaveImportantMark = async () => {
    if (!targetEntryId) return;
    const entry = entries.find((e) => e.id === targetEntryId);
    if (!entry) return;

    await onToggleImportant(entry, chosenCategory);
    setIsMarking(false);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-[#FAF9F6] border border-[#E5E1D8] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-sans uppercase tracking-[0.2em] text-[#D4A373] font-bold">
            <Star className="w-3.5 h-3.5" />
            <span>Curated Milestones</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#1A1A1A] font-medium tracking-tight mt-2 italic">
            Important Memories
          </h1>
          <p className="text-xs sm:text-sm font-sans text-[#666] mt-2 max-w-2xl">
            Keep pivotal turning points, breakthroughs, decisions, and cherished people accessible. Filter your highlighted reflections by category.
          </p>
        </div>

        <button
          onClick={() => {
            setIsMarking(!isMarking);
            if (entries.length > 0) setTargetEntryId(entries[0].id);
          }}
          className="px-5 py-2.5 bg-[#1A1A1A] hover:bg-[#333] text-white text-xs font-sans uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shadow-xs"
        >
          <Star className="w-3.5 h-3.5 text-[#D4A373]" />
          <span>Mark Important Memory</span>
        </button>
      </div>

      {/* Mark Modal */}
      {isMarking && (
        <div className="bg-white border border-[#1A1A1A] p-6 space-y-4 shadow-xs animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-[#EAE7DF]">
            <h3 className="font-serif text-base font-bold text-[#1A1A1A]">
              Highlight an Important Memory
            </h3>
            <button
              onClick={() => setIsMarking(false)}
              className="text-xs text-[#8C8C8C] hover:text-[#1A1A1A] cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-sans uppercase tracking-wider text-[#8C8C8C] block mb-1">
                Choose Reflection
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
                Category
              </label>
              <select
                value={chosenCategory}
                onChange={(e) => setChosenCategory(e.target.value as MemoryCategory)}
                className="w-full p-2.5 bg-[#FAF9F6] border border-[#E5E1D8] text-xs font-sans text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveImportantMark}
              disabled={!targetEntryId}
              className="px-5 py-2 bg-[#1A1A1A] text-white text-xs font-sans uppercase tracking-wider hover:bg-[#333] cursor-pointer"
            >
              Save to Important Memories
            </button>
          </div>
        </div>
      )}

      {/* Category Pills */}
      <div className="flex flex-wrap items-center gap-2 pb-2">
        <button
          onClick={() => setSelectedCategory("all")}
          className={`px-3 py-1.5 text-xs font-sans uppercase tracking-wider border cursor-pointer ${
            selectedCategory === "all"
              ? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
              : "bg-white text-[#666] border-[#E5E1D8] hover:bg-[#FAF9F6]"
          }`}
        >
          All ({importantEntries.length})
        </button>

        {categories.map((cat) => {
          const count = importantEntries.filter((e) => e.importanceCategory === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-sans uppercase tracking-wider border cursor-pointer ${
                selectedCategory === cat
                  ? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
                  : "bg-white text-[#666] border-[#E5E1D8] hover:bg-[#FAF9F6]"
              }`}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* Memory Grid */}
      {filtered.length === 0 ? (
        <div className="bg-[#FAF9F6] border border-[#E5E1D8] p-12 text-center space-y-4">
          <Star className="w-10 h-10 text-[#A0A0A0] mx-auto stroke-1" />
          <h2 className="font-serif text-2xl italic text-[#1A1A1A]">No Highlighted Memories in this Category</h2>
          <p className="text-sm font-sans text-[#666] max-w-lg mx-auto leading-relaxed">
            Star important turning points and milestones in your journal to bookmark your growth.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((entry) => (
            <div
              key={entry.id}
              className="bg-white border border-[#E5E1D8] hover:border-[#1A1A1A] p-6 space-y-3 transition-all group flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-[#EAE7DF]">
                  <span className="text-[10px] font-sans uppercase tracking-widest px-2 py-0.5 bg-[#F4F1EA] text-[#1A1A1A] font-bold border border-[#E5E1D8]">
                    {entry.importanceCategory || "Important"}
                  </span>
                  <button
                    onClick={() => onToggleImportant(entry, undefined)}
                    className="text-[#D4A373] hover:text-[#991B1B] p-1 text-xs cursor-pointer"
                    title="Remove from important memories"
                  >
                    <Star className="w-3.5 h-3.5 fill-[#D4A373]" />
                  </button>
                </div>

                <span className="text-[10px] font-sans text-[#8C8C8C] block">
                  {new Date(entry.createdAt).toLocaleDateString(undefined, {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>

                <h3
                  onClick={() => {
                    onSelectEntry(entry);
                    onNavigateToJournal();
                  }}
                  className="font-serif text-lg font-bold text-[#1A1A1A] group-hover:underline cursor-pointer"
                >
                  {entry.title || "Untitled Milestone"}
                </h3>

                <p className="text-xs font-sans text-[#666] leading-relaxed line-clamp-3">
                  {entry.summary || entry.messages?.[0]?.content || "Empty memory"}
                </p>
              </div>

              <div className="pt-3 border-t border-[#EAE7DF] flex items-center justify-between">
                <span className="text-[10px] font-sans uppercase tracking-wider text-[#8C8C8C]">
                  {entry.messages?.length || 0} conversation turns
                </span>
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
          ))}
        </div>
      )}
    </div>
  );
};

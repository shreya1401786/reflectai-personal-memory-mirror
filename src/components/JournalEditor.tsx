import React, { useRef, useEffect } from "react";
import { Send, Sparkles, Compass, FileText, Lightbulb, ListChecks, Check, Cloud, Loader2 } from "lucide-react";
import { ReflectionMode } from "../types";

interface JournalEditorProps {
  inputPrompt: string;
  setInputPrompt: (val: string) => void;
  selectedMode: ReflectionMode;
  setSelectedMode: (mode: ReflectionMode) => void;
  onSubmitPrompt: () => void;
  onAutoSummarize: () => void;
  isGenerating: boolean;
  isSummarizing: boolean;
  saveStatus: "synced" | "saving" | "error";
  hasMessages: boolean;
}

export const JournalEditor: React.FC<JournalEditorProps> = ({
  inputPrompt,
  setInputPrompt,
  selectedMode,
  setSelectedMode,
  onSubmitPrompt,
  onAutoSummarize,
  isGenerating,
  isSummarizing,
  saveStatus,
  hasMessages,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        220
      )}px`;
    }
  }, [inputPrompt]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (!isGenerating && inputPrompt.trim()) {
        onSubmitPrompt();
      }
    }
  };

  const modes: { id: ReflectionMode; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: "reflection",
      label: "Deep Reflection",
      icon: <Compass className="w-3.5 h-3.5" />,
      desc: "Introspective sounding board & questions",
    },
    {
      id: "summary",
      label: "Summary",
      icon: <FileText className="w-3.5 h-3.5" />,
      desc: "Key emotions & themes synthesis",
    },
    {
      id: "brainstorm",
      label: "Brainstorming",
      icon: <Lightbulb className="w-3.5 h-3.5" />,
      desc: "Fresh angles & exploratory ideas",
    },
    {
      id: "action_items",
      label: "Action Plan",
      icon: <ListChecks className="w-3.5 h-3.5" />,
      desc: "Realistic next steps & self-care",
    },
  ];

  return (
    <div id="journal-editor-container" className="bg-white border border-[#E5E1D8] p-5 sm:p-6 shadow-xs">
      {/* Modes & Persistence Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E5E1D8] mb-4 text-xs">
        {/* Reflection Mode Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[#8C8C8C] text-[10px] font-sans uppercase tracking-widest mr-1 hidden sm:inline">
            Inquiry Lens:
          </span>
          {modes.map((m) => {
            const isSelected = selectedMode === m.id;
            return (
              <button
                key={m.id}
                id={`mode-select-${m.id}`}
                type="button"
                onClick={() => setSelectedMode(m.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans uppercase tracking-wider transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#1A1A1A] text-white font-medium"
                    : "bg-[#FAF9F6] text-[#555] border border-[#E5E1D8] hover:bg-[#F4F1EA]"
                }`}
                title={m.desc}
              >
                {m.icon}
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Real-time Firestore Sync Status & Auto-summarize */}
        <div className="flex items-center gap-3 ml-auto">
          {hasMessages && (
            <button
              id="btn-auto-summarize"
              onClick={onAutoSummarize}
              disabled={isSummarizing || isGenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-sans uppercase tracking-wider text-[#1A1A1A] bg-[#F4F1EA] hover:bg-[#EAE7DF] border border-[#E5E1D8] transition-colors disabled:opacity-50 cursor-pointer"
              title="Generate title & synthesis tags with Gemini"
            >
              <Sparkles className={`w-3 h-3 text-[#D4A373] ${isSummarizing ? "animate-spin" : ""}`} />
              <span>{isSummarizing ? "Synthesizing..." : "Synthesize Entry"}</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 text-[10px] font-sans uppercase tracking-wider text-[#8C8C8C]">
            {saveStatus === "saving" ? (
              <span className="flex items-center gap-1 text-[#D4A373]">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span className="hidden sm:inline">Saving to Cloud</span>
              </span>
            ) : saveStatus === "synced" ? (
              <span className="flex items-center gap-1 text-[#1A1A1A]">
                <Cloud className="w-3 h-3 text-[#1A1A1A]" />
                <span className="hidden sm:inline">Encrypted & Saved</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[#991B1B]">
                <Cloud className="w-3 h-3" />
                <span>Pending Sync</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Editor Textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          id="journal-input-textarea"
          rows={3}
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pen your journal entry, introspective queries, or daily observations... (Press ⌘+Enter to submit)"
          disabled={isGenerating}
          className="w-full bg-[#FAF9F6] border border-[#E5E1D8] p-4 text-[#1A1A1A] text-base placeholder-[#8C8C8C] focus:outline-none focus:border-[#1A1A1A] resize-none font-serif leading-relaxed transition-all"
        />

        {/* Bottom controls */}
        <div className="flex items-center justify-between pt-3">
          <div className="text-[10px] font-sans uppercase tracking-wider text-[#8C8C8C]">
            <span>{inputPrompt.length} glyphs</span>
            <span className="hidden sm:inline ml-2 text-[#A0A0A0]">• Press ⌘+Enter to Submit</span>
          </div>

          <button
            id="btn-submit-reflection"
            onClick={onSubmitPrompt}
            disabled={isGenerating || !inputPrompt.trim()}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-sans uppercase tracking-[0.15em] bg-[#1A1A1A] hover:bg-[#333] text-white transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Gemini Reflecting...</span>
              </>
            ) : (
              <>
                <span>Submit Reflection</span>
                <Send className="w-3 h-3" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

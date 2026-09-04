import React, { useState } from "react";
import Markdown from "react-markdown";
import { Sparkles, User, Copy, Check, Lightbulb, Compass, ListChecks, FileText } from "lucide-react";
import { JournalMessage, ReflectionMode } from "../types";

interface JournalThreadProps {
  messages: JournalMessage[];
  isGenerating: boolean;
  onSelectSuggestedPrompt: (prompt: string) => void;
}

export const JournalThread: React.FC<JournalThreadProps> = ({
  messages,
  isGenerating,
  onSelectSuggestedPrompt,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getModeBadge = (mode?: ReflectionMode) => {
    switch (mode) {
      case "summary":
        return {
          label: "Executive Summary",
          icon: <FileText className="w-3 h-3 text-sky-400" />,
          color: "bg-sky-500/10 text-sky-300 border-sky-500/20",
        };
      case "brainstorm":
        return {
          label: "Brainstorming & Perspectives",
          icon: <Lightbulb className="w-3 h-3 text-amber-400" />,
          color: "bg-amber-500/10 text-amber-300 border-amber-500/20",
        };
      case "action_items":
        return {
          label: "Action Plan",
          icon: <ListChecks className="w-3 h-3 text-emerald-400" />,
          color: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
        };
      case "reflection":
      default:
        return {
          label: "Deep Reflection",
          icon: <Compass className="w-3 h-3 text-purple-400" />,
          color: "bg-purple-500/10 text-purple-300 border-purple-500/20",
        };
    }
  };

  const suggestedPrompts = [
    "What went surprisingly well today, and what made that possible?",
    "I'm feeling conflicted between two choices right now...",
    "Help me reflect on a challenge I'm facing at work/projects.",
    "Summarize the emotional themes of my recent week.",
  ];

  return (
    <div id="journal-thread-container" className="space-y-6 pb-6">
      {messages.length === 0 ? (
        <div className="py-16 px-4 text-center max-w-xl mx-auto">
          <div className="w-12 h-12 mx-auto bg-[#F4F1EA] border border-[#E5E1D8] flex items-center justify-center text-[#1A1A1A] mb-5 shadow-xs">
            <Sparkles className="w-5 h-5 text-[#D4A373]" />
          </div>
          <h3 className="font-serif text-3xl font-normal italic text-[#1A1A1A]">
            Begin Your Reflection
          </h3>
          <p className="text-base text-[#666] mt-3 leading-relaxed font-serif">
            Unburden your mind onto the page. Pose queries, outline uncertainties, or recount events. Gemini 3.6 Flash serves as your discerning, empathetic sounding board.
          </p>

          <div className="mt-8 text-left">
            <span className="text-[10px] font-sans uppercase tracking-[0.2em] text-[#8C8C8C] block mb-3 text-center">
              Suggested Inquiries
            </span>
            <div className="grid grid-cols-1 gap-2.5">
              {suggestedPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectSuggestedPrompt(prompt)}
                  className="p-3.5 text-xs font-sans text-[#333] bg-white hover:bg-[#FAF9F6] border border-[#E5E1D8] hover:border-[#1A1A1A] transition-all text-left flex items-center justify-between group cursor-pointer shadow-xs"
                >
                  <span className="font-serif italic text-sm text-[#1A1A1A]">{prompt}</span>
                  <span className="text-[#8C8C8C] group-hover:text-[#1A1A1A] text-xs transition-colors">
                    →
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        messages.map((msg) => {
          const isUser = msg.role === "user";
          const badge = !isUser ? getModeBadge(msg.mode) : null;

          return (
            <div
              key={msg.id}
              id={`message-${msg.id}`}
              className={`flex flex-col gap-2 ${
                isUser ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`max-w-3xl w-full p-6 transition-all border ${
                  isUser
                    ? "bg-[#F4F1EA] text-[#1A1A1A] border-[#E5E1D8]"
                    : "bg-white text-[#1A1A1A] border-[#E5E1D8] shadow-xs"
                }`}
              >
                {/* Header info */}
                <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-[#E5E1D8] text-xs">
                  <div className="flex items-center gap-2.5">
                    {isUser ? (
                      <>
                        <div className="w-6 h-6 bg-[#1A1A1A] text-white flex items-center justify-center text-[10px] font-sans font-bold">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-sans uppercase tracking-wider text-[11px] font-bold text-[#1A1A1A]">
                          Author's Entry
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="w-6 h-6 bg-[#FAF9F6] border border-[#E5E1D8] text-[#1A1A1A] flex items-center justify-center">
                          <Sparkles className="w-3.5 h-3.5 text-[#D4A373]" />
                        </div>
                        <span className="font-sans uppercase tracking-wider text-[11px] font-bold text-[#1A1A1A]">
                          Gemini 3.6 Flash
                        </span>
                        {badge && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-sans uppercase tracking-wider px-2 py-0.5 border border-[#E5E1D8] bg-[#FAF9F6] text-[#555]"
                          >
                            {badge.icon}
                            <span>{badge.label}</span>
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[10px] font-sans uppercase tracking-wider text-[#8C8C8C]">
                    <span>
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {!isUser && (
                      <button
                        onClick={() => copyToClipboard(msg.id, msg.content)}
                        className="p-1 text-[#8C8C8C] hover:text-[#1A1A1A] transition-colors cursor-pointer"
                        title="Copy reflection"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-[#1A1A1A]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Body Content */}
                {isUser ? (
                  <div className="font-serif text-[#1A1A1A] text-base sm:text-lg leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </div>
                ) : (
                  <div className="markdown-body font-serif text-[#222] text-base sm:text-lg leading-relaxed space-y-4">
                    <Markdown>{msg.content}</Markdown>
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}

      {/* Generation in progress indicator */}
      {isGenerating && (
        <div className="flex items-start gap-3.5 p-5 bg-white border border-[#E5E1D8] max-w-lg shadow-xs animate-pulse">
          <div className="w-7 h-7 bg-[#F4F1EA] border border-[#E5E1D8] text-[#1A1A1A] flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4 text-[#D4A373] animate-spin" />
          </div>
          <div>
            <div className="text-xs font-sans uppercase tracking-wider font-bold text-[#1A1A1A]">
              Gemini is reflecting...
            </div>
            <div className="text-xs font-serif italic text-[#666] mt-1">
              Synthesizing emotional subtleties and framing thoughtful perspectives
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

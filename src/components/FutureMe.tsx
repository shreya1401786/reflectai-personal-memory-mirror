import React, { useState } from "react";
import { Mail, Clock, Send, Sparkles, CheckCircle2, Trash2, Calendar, Lock } from "lucide-react";
import { FutureLetter } from "../types";

interface FutureMeProps {
  letters: FutureLetter[];
  onSaveLetter: (letter: FutureLetter) => Promise<void>;
  onDeleteLetter: (letterId: string) => Promise<void>;
}

export const FutureMe: React.FC<FutureMeProps> = ({
  letters,
  onSaveLetter,
  onDeleteLetter,
}) => {
  const [isComposing, setIsComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [monthsAhead, setMonthsAhead] = useState(3);
  const [customDate, setCustomDate] = useState("");
  const [saving, setSaving] = useState(false);

  const now = new Date();

  // Categorize letters
  const readyToOpen = letters.filter((l) => new Date(l.deliverAt) <= now);
  const inTransit = letters.filter((l) => new Date(l.deliverAt) > now);

  const handleCompose = async () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);

    try {
      let targetDelivery: Date;
      if (customDate) {
        targetDelivery = new Date(customDate);
      } else {
        targetDelivery = new Date();
        targetDelivery.setMonth(targetDelivery.getMonth() + monthsAhead);
      }

      const newLetter: FutureLetter = {
        id: "letter_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
        userId: "", // Will be assigned by backend/firebase
        title: title.trim(),
        content: content.trim(),
        createdAt: new Date().toISOString(),
        deliverAt: targetDelivery.toISOString(),
        isRead: false,
      };

      await onSaveLetter(newLetter);
      setTitle("");
      setContent("");
      setIsComposing(false);
    } catch (err) {
      console.error("Failed to compose future letter:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-[#FAF9F6] border border-[#E5E1D8] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-sans uppercase tracking-[0.2em] text-[#D4A373] font-bold">
            <Mail className="w-3.5 h-3.5" />
            <span>Time-Capsule Reflection</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#1A1A1A] font-medium tracking-tight mt-2 italic">
            Future Me
          </h1>
          <p className="text-xs sm:text-sm font-sans text-[#666] mt-2 max-w-2xl">
            Pen a private letter to your future self. When that future date arrives, ReflectAI surfaces your past perspective so you can reflect on how your thoughts, priorities, and life unfolded.
          </p>
        </div>

        <button
          onClick={() => setIsComposing(!isComposing)}
          className="px-5 py-2.5 bg-[#1A1A1A] hover:bg-[#333] text-white text-xs font-sans uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shadow-xs"
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Write to Future Self</span>
        </button>
      </div>

      {/* Composition Form */}
      {isComposing && (
        <div className="bg-white border border-[#1A1A1A] p-6 sm:p-8 space-y-5 shadow-xs animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-[#EAE7DF]">
            <h3 className="font-serif text-lg font-bold text-[#1A1A1A]">
              Compose a Letter Across Time
            </h3>
            <button
              onClick={() => setIsComposing(false)}
              className="text-xs text-[#8C8C8C] hover:text-[#1A1A1A] cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-sans uppercase tracking-wider text-[#8C8C8C] block mb-1">
                Letter Subject / Intention
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Are you still anxious about this pivot? What matters to you today?"
                className="w-full p-3 bg-[#FAF9F6] border border-[#E5E1D8] text-sm font-serif text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
              />
            </div>

            <div>
              <label className="text-[10px] font-sans uppercase tracking-wider text-[#8C8C8C] block mb-1">
                When should this message be unlocked?
              </label>
              <div className="flex flex-wrap gap-2">
                {[1, 3, 6, 12].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setMonthsAhead(m);
                      setCustomDate("");
                    }}
                    className={`px-3 py-1.5 text-xs font-sans uppercase tracking-wider border cursor-pointer ${
                      monthsAhead === m && !customDate
                        ? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
                        : "bg-[#FAF9F6] text-[#555] border-[#E5E1D8] hover:bg-[#F4F1EA]"
                    }`}
                  >
                    In {m} {m === 1 ? "Month" : "Months"}
                  </button>
                ))}
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="px-3 py-1 bg-[#FAF9F6] border border-[#E5E1D8] text-xs font-sans text-[#1A1A1A]"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-sans uppercase tracking-wider text-[#8C8C8C] block mb-1">
                Your Letter
              </label>
              <textarea
                rows={6}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write honestly to who you will be. What do you hope you've remembered? What are you holding onto that you hope you've let go of?"
                className="w-full p-4 bg-[#FAF9F6] border border-[#E5E1D8] text-base font-serif text-[#1A1A1A] leading-relaxed focus:outline-none focus:border-[#1A1A1A] resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={handleCompose}
              disabled={saving || !title.trim() || !content.trim()}
              className="px-6 py-2.5 bg-[#1A1A1A] hover:bg-[#333] text-white text-xs font-sans uppercase tracking-wider transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{saving ? "Sealing Letter..." : "Seal Letter to Future Self"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Letters Ready to Open */}
      {readyToOpen.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#EAE7DF]">
            <Sparkles className="w-4 h-4 text-[#D4A373]" />
            <h3 className="font-serif italic text-lg font-bold text-[#1A1A1A]">
              Messages Unlocked From Your Past Self ({readyToOpen.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {readyToOpen.map((letter) => (
              <div
                key={letter.id}
                className="bg-white border-2 border-[#1A1A1A] p-6 space-y-4 shadow-sm relative"
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#EAE7DF]">
                  <span className="text-[10px] font-sans uppercase tracking-widest px-2 py-0.5 bg-[#F4F1EA] text-[#1A1A1A] font-bold">
                    Unlocked
                  </span>
                  <span className="text-[10px] font-sans text-[#8C8C8C]">
                    Written on {new Date(letter.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <h4 className="font-serif text-xl font-bold text-[#1A1A1A]">{letter.title}</h4>
                <p className="font-serif text-sm text-[#333] leading-relaxed whitespace-pre-line bg-[#FAF9F6] p-4 border border-[#E5E1D8]">
                  "{letter.content}"
                </p>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[10px] font-sans uppercase tracking-wider text-[#8C8C8C]">
                    Delivered: {new Date(letter.deliverAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => onDeleteLetter(letter.id)}
                    className="text-[#8C8C8C] hover:text-[#991B1B] text-xs p-1 cursor-pointer"
                    title="Archive this letter"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Letters Currently in Transit */}
      <div className="space-y-4">
        <h3 className="font-serif italic text-base font-bold text-[#1A1A1A] pb-2 border-b border-[#EAE7DF] flex items-center justify-between">
          <span>Letters in Transit ({inTransit.length})</span>
          <span className="text-[10px] font-sans uppercase tracking-wider text-[#8C8C8C]">
            Locked until delivery
          </span>
        </h3>

        {inTransit.length === 0 ? (
          <div className="p-8 border border-dashed border-[#E5E1D8] text-center text-xs font-sans text-[#8C8C8C] bg-[#FAF9F6]">
            No future letters scheduled. Write one to check in on yourself 3 or 6 months down the road.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {inTransit.map((letter) => (
              <div key={letter.id} className="bg-white border border-[#E5E1D8] p-5 space-y-3">
                <div className="flex items-center justify-between text-[10px] font-sans text-[#8C8C8C]">
                  <span className="flex items-center gap-1">
                    <Lock className="w-3 h-3 text-[#D4A373]" />
                    <span>Locked</span>
                  </span>
                  <span>Unlocks {new Date(letter.deliverAt).toLocaleDateString()}</span>
                </div>
                <h4 className="font-serif text-base font-bold text-[#1A1A1A] truncate">
                  {letter.title}
                </h4>
                <p className="text-xs font-sans text-[#8C8C8C] italic line-clamp-2">
                  Content encrypted until arrival date.
                </p>
                <div className="flex justify-end pt-2 border-t border-[#EAE7DF]">
                  <button
                    onClick={() => onDeleteLetter(letter.id)}
                    className="text-xs text-[#8C8C8C] hover:text-[#991B1B] cursor-pointer"
                  >
                    Cancel Delivery
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

import React from "react";
import {
  Sparkles,
  LogOut,
  PlusCircle,
  BookOpen,
  Compass,
  Activity,
  MapPin,
  History,
  Scale,
  Mail,
  Star,
  Search,
  Layers,
  ShieldCheck,
  BookMarked,
} from "lucide-react";
import { UserProfile, ActiveView } from "../types";

interface NavbarProps {
  user: UserProfile | null;
  onSignOut: () => void;
  onNewEntry: () => void;
  onToggleHistory: () => void;
  historyOpen: boolean;
  entryCount: number;
  activeView: ActiveView;
  onSelectView: (view: ActiveView) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onSignOut,
  onNewEntry,
  onToggleHistory,
  historyOpen,
  entryCount,
  activeView,
  onSelectView,
}) => {
  const navItems: { id: ActiveView; label: string; icon: React.ReactNode }[] = [
    { id: "journal", label: "Journal", icon: <BookMarked className="w-3.5 h-3.5" /> },
    { id: "ask_memory", label: "Ask My Memory", icon: <Compass className="w-3.5 h-3.5" /> },
    { id: "pattern_radar", label: "Pattern Radar", icon: <Activity className="w-3.5 h-3.5" /> },
    { id: "memory_map", label: "Memory Map", icon: <MapPin className="w-3.5 h-3.5" /> },
    { id: "reflection_replay", label: "Replay", icon: <History className="w-3.5 h-3.5" /> },
    { id: "decisions", label: "Decisions", icon: <Scale className="w-3.5 h-3.5" /> },
    { id: "future_me", label: "Future Me", icon: <Mail className="w-3.5 h-3.5" /> },
    { id: "important", label: "Important", icon: <Star className="w-3.5 h-3.5" /> },
    { id: "constellation", label: "Constellation", icon: <Layers className="w-3.5 h-3.5" /> },
    { id: "semantic_search", label: "Search", icon: <Search className="w-3.5 h-3.5" /> },
    { id: "privacy", label: "Privacy", icon: <ShieldCheck className="w-3.5 h-3.5" /> },
  ];

  return (
    <header id="main-header" className="sticky top-0 z-30 bg-[#FAF9F6]/95 text-[#1A1A1A] border-b border-[#E5E1D8] backdrop-blur-md">
      {/* Top Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-18 flex items-center justify-between">
        {/* Logo & Brand */}
        <div
          onClick={() => onSelectView("journal")}
          className="flex items-center gap-3.5 cursor-pointer select-none group"
        >
          <div className="w-9 h-9 border border-[#1A1A1A] bg-[#F4F1EA] group-hover:bg-[#1A1A1A] group-hover:text-white transition-colors flex items-center justify-center italic text-xl font-serif text-[#1A1A1A] shadow-xs">
            R
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-serif text-2xl font-bold tracking-tight italic text-[#1A1A1A] underline decoration-1 underline-offset-4">
                ReflectAI
              </span>
              <span className="text-[9px] uppercase tracking-[0.2em] font-sans font-bold text-[#D4A373] bg-[#F4F1EA] border border-[#E5E1D8] px-2 py-0.5">
                Memory Mirror
              </span>
            </div>
            <p className="text-[9px] uppercase tracking-[0.2em] font-sans text-[#8C8C8C] hidden sm:block">
              Understanding the Story Your Memories Tell
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user && (
            <>
              <button
                id="btn-toggle-history"
                onClick={onToggleHistory}
                className={`flex items-center gap-2 px-3 py-1.5 text-[11px] font-sans uppercase tracking-widest transition-colors border cursor-pointer ${
                  historyOpen
                    ? "bg-[#EAE7DF] text-[#1A1A1A] border-[#1A1A1A]"
                    : "bg-[#F4F1EA] text-[#4A4A4A] border-[#E5E1D8] hover:bg-[#EAE7DF]"
                }`}
                title="View Past Journal Entries"
              >
                <BookOpen className="w-3.5 h-3.5 text-[#D4A373]" />
                <span className="hidden md:inline">Past Reflections</span>
                <span className="text-[10px] bg-white text-[#1A1A1A] px-1.5 py-0.2 border border-[#E5E1D8]">
                  {entryCount}
                </span>
              </button>

              <button
                id="btn-new-entry"
                onClick={() => {
                  onSelectView("journal");
                  onNewEntry();
                }}
                className="flex items-center gap-1.5 px-4 py-1.5 text-[11px] font-sans uppercase tracking-widest bg-[#1A1A1A] hover:bg-[#333] text-white transition-colors cursor-pointer shadow-xs whitespace-nowrap"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>New Reflection</span>
              </button>

              {/* User Profile */}
              <div className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-[#E5E1D8]">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || "User"}
                    className="w-7 h-7 rounded-full border border-[#E5E1D8] object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center text-[10px] font-sans font-bold">
                    {(user.displayName || user.email || "U")[0].toUpperCase()}
                  </div>
                )}

                <div className="hidden lg:block text-left">
                  <div className="text-xs font-bold font-sans text-[#1A1A1A] truncate max-w-[120px]">
                    {user.displayName || "Author"}
                  </div>
                  <button
                    onClick={onSignOut}
                    className="text-[9px] text-[#8C8C8C] hover:text-[#1A1A1A] font-sans uppercase tracking-wider block text-left cursor-pointer"
                  >
                    Log Out
                  </button>
                </div>

                <button
                  id="btn-sign-out"
                  onClick={onSignOut}
                  className="p-1.5 text-[#8C8C8C] hover:text-[#1A1A1A] transition-colors lg:hidden cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Memory Mirror Navigation Bar */}
      {user && (
        <div className="border-t border-[#EAE7DF] bg-[#FAF9F6] overflow-x-auto scrollbar-none">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 flex items-center gap-1 py-1.5 min-w-max">
            {navItems.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => onSelectView(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-sans uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? "bg-[#1A1A1A] text-white font-medium shadow-xs"
                      : "text-[#666] hover:bg-[#F4F1EA] hover:text-[#1A1A1A]"
                  }`}
                >
                  <span className={isActive ? "text-[#D4A373]" : "text-[#8C8C8C]"}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};

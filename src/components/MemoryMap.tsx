import React, { useState, useMemo } from "react";
import { MapPin, Navigation, Compass, Calendar, BookOpen, Sparkles, Plus, Trash2, Globe2 } from "lucide-react";
import { JournalEntry, EntryLocation } from "../types";

interface MemoryMapProps {
  entries: JournalEntry[];
  onSelectEntry: (entry: JournalEntry) => void;
  onNavigateToJournal: () => void;
  onUpdateEntryLocation: (entry: JournalEntry, location?: EntryLocation) => Promise<void>;
}

export const MemoryMap: React.FC<MemoryMapProps> = ({
  entries,
  onSelectEntry,
  onNavigateToJournal,
  onUpdateEntryLocation,
}) => {
  const [selectedLocationName, setSelectedLocationName] = useState<string | null>(null);
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [targetEntryId, setTargetEntryId] = useState<string>("");
  const [customPlaceName, setCustomPlaceName] = useState("");
  const [gpsLoading, setGpsLoading] = useState(false);

  // Group entries by location
  const locationGroups = useMemo(() => {
    const groups: { [name: string]: JournalEntry[] } = {};
    entries.forEach((e) => {
      if (e.location && e.location.name) {
        const key = e.location.name.trim();
        if (!groups[key]) groups[key] = [];
        groups[key].push(e);
      }
    });
    return groups;
  }, [entries]);

  const locationKeys = Object.keys(locationGroups);

  // Auto-select first location if none selected
  const activeLocation = selectedLocationName || (locationKeys.length > 0 ? locationKeys[0] : null);
  const activeEntries = activeLocation ? locationGroups[activeLocation] || [] : [];

  // Request browser geolocation on explicit user click ONLY
  const handleUseCurrentGPS = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false);
        const lat = pos.coords.latitude.toFixed(3);
        const lng = pos.coords.longitude.toFixed(3);
        setCustomPlaceName(`Coordinates (${lat}, ${lng})`);
      },
      (err) => {
        setGpsLoading(false);
        console.warn("Geolocation denied or error:", err);
      },
      { timeout: 8000 }
    );
  };

  const handleSaveLocationToEntry = async () => {
    if (!targetEntryId || !customPlaceName.trim()) return;
    const targetEntry = entries.find((e) => e.id === targetEntryId);
    if (!targetEntry) return;

    await onUpdateEntryLocation(targetEntry, {
      name: customPlaceName.trim(),
    });
    setIsAddingLocation(false);
    setCustomPlaceName("");
    setSelectedLocationName(customPlaceName.trim());
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-[#FAF9F6] border border-[#E5E1D8] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-sans uppercase tracking-[0.2em] text-[#D4A373] font-bold">
            <Globe2 className="w-3.5 h-3.5" />
            <span>Geographic Memory Archive</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#1A1A1A] font-medium tracking-tight mt-2 italic">
            Memory Map
          </h1>
          <p className="text-xs sm:text-sm font-sans text-[#666] mt-2 max-w-2xl">
            Explore memories associated with places you've paused to write in. ReflectAI protects your privacy with strict per-user isolation: location is never tracked continuously and is only saved when explicitly attached.
          </p>
        </div>

        <button
          onClick={() => {
            setIsAddingLocation(!isAddingLocation);
            if (entries.length > 0) setTargetEntryId(entries[0].id);
          }}
          className="px-4 py-2.5 bg-[#1A1A1A] hover:bg-[#333] text-white text-xs font-sans uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tag Location to Entry</span>
        </button>
      </div>

      {/* Manual Tagging Form Modal / Drawer */}
      {isAddingLocation && (
        <div className="p-6 bg-white border border-[#1A1A1A] shadow-sm space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-[#EAE7DF]">
            <h3 className="font-serif text-base font-bold text-[#1A1A1A]">
              Attach Location to a Reflection
            </h3>
            <button
              onClick={() => setIsAddingLocation(false)}
              className="text-xs text-[#8C8C8C] hover:text-[#1A1A1A] cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-sans uppercase tracking-wider text-[#8C8C8C] block mb-1">
                Select Reflection
              </label>
              <select
                value={targetEntryId}
                onChange={(e) => setTargetEntryId(e.target.value)}
                className="w-full p-2.5 bg-[#FAF9F6] border border-[#E5E1D8] text-xs font-sans text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
              >
                {entries.map((e) => (
                  <option key={e.id} value={e.id}>
                    {new Date(e.createdAt).toLocaleDateString()} — {e.title || "Untitled"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-sans uppercase tracking-wider text-[#8C8C8C] block mb-1">
                Place Name / Sanctuary
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customPlaceName}
                  onChange={(e) => setCustomPlaceName(e.target.value)}
                  placeholder="e.g., Kyoto Zen Garden, Home Office, Central Park"
                  className="flex-1 p-2.5 bg-[#FAF9F6] border border-[#E5E1D8] text-xs font-sans text-[#1A1A1A] placeholder-[#8C8C8C] focus:outline-none focus:border-[#1A1A1A]"
                />
                <button
                  type="button"
                  onClick={handleUseCurrentGPS}
                  disabled={gpsLoading}
                  className="px-3 py-2 bg-[#F4F1EA] hover:bg-[#EAE7DF] border border-[#E5E1D8] text-[10px] font-sans uppercase tracking-wider text-[#555] flex items-center gap-1 cursor-pointer"
                  title="Detect GPS coordinate (optional)"
                >
                  <Navigation className="w-3 h-3 text-[#D4A373]" />
                  <span>{gpsLoading ? "..." : "GPS"}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveLocationToEntry}
              disabled={!customPlaceName.trim() || !targetEntryId}
              className="px-5 py-2 bg-[#1A1A1A] text-white text-xs font-sans uppercase tracking-wider hover:bg-[#333] transition-colors disabled:opacity-40 cursor-pointer"
            >
              Save Location to Reflection
            </button>
          </div>
        </div>
      )}

      {/* Main Map & Location Grid */}
      {locationKeys.length === 0 ? (
        <div className="bg-[#FAF9F6] border border-[#E5E1D8] p-12 text-center space-y-4">
          <MapPin className="w-10 h-10 text-[#A0A0A0] mx-auto stroke-1" />
          <h2 className="font-serif text-2xl italic text-[#1A1A1A]">No Geotagged Memories Yet</h2>
          <p className="text-sm font-sans text-[#666] max-w-lg mx-auto leading-relaxed">
            Attach a meaningful location to your reflections (like your favorite writing café, quiet park, or travel destination) to visualize where your thoughts took flight.
          </p>
          <button
            onClick={() => {
              setIsAddingLocation(true);
              if (entries.length > 0) setTargetEntryId(entries[0].id);
            }}
            className="px-5 py-2.5 bg-[#1A1A1A] text-white text-xs font-sans uppercase tracking-wider hover:bg-[#333] cursor-pointer inline-flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tag Your First Location</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Location Explorer Sidebar */}
          <div className="bg-white border border-[#E5E1D8] p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE7DF]">
              <span className="text-xs font-sans uppercase tracking-wider font-bold text-[#1A1A1A]">
                Memory Sanctuaries ({locationKeys.length})
              </span>
            </div>

            <div className="space-y-2">
              {locationKeys.map((locName) => {
                const count = locationGroups[locName].length;
                const isSelected = activeLocation === locName;
                return (
                  <button
                    key={locName}
                    onClick={() => setSelectedLocationName(locName)}
                    className={`w-full text-left p-3 border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? "bg-[#FAF9F6] border-[#1A1A1A] shadow-xs"
                        : "bg-white border-[#E5E1D8] hover:border-[#BFB8AA]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <MapPin
                        className={`w-3.5 h-3.5 ${
                          isSelected ? "text-[#1A1A1A]" : "text-[#D4A373]"
                        }`}
                      />
                      <span className="font-serif text-sm font-semibold text-[#1A1A1A] truncate max-w-[170px]">
                        {locName}
                      </span>
                    </div>
                    <span className="text-[10px] font-sans font-medium px-2 py-0.5 bg-[#F4F1EA] text-[#555] border border-[#E5E1D8]">
                      {count} {count === 1 ? "memory" : "memories"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reflections at selected location */}
          <div className="lg:col-span-2 space-y-4">
            {activeLocation && (
              <div className="bg-white border border-[#E5E1D8] p-6 sm:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#EAE7DF] gap-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-[#F4F1EA] border border-[#E5E1D8]">
                      <MapPin className="w-5 h-5 text-[#1A1A1A]" />
                    </div>
                    <div>
                      <h3 className="font-serif text-2xl font-bold italic text-[#1A1A1A]">
                        {activeLocation}
                      </h3>
                      <p className="text-[10px] font-sans uppercase tracking-widest text-[#8C8C8C] mt-0.5">
                        {activeEntries.length} Recorded Memories at this Sanctuary
                      </p>
                    </div>
                  </div>
                </div>

                {/* List of memories at location */}
                <div className="space-y-4">
                  {activeEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-4 bg-[#FAF9F6] border border-[#E5E1D8] hover:border-[#1A1A1A] transition-all space-y-2 group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-sans uppercase tracking-wider text-[#8C8C8C]">
                          {new Date(entry.createdAt).toLocaleDateString(undefined, {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>

                        <div className="flex items-center gap-2">
                          {entry.sentimentLabel && (
                            <span className="text-[9px] px-2 py-0.5 bg-white border border-[#E5E1D8] text-[#555]">
                              {entry.sentimentLabel}
                            </span>
                          )}
                          <button
                            onClick={() => onUpdateEntryLocation(entry, undefined)}
                            className="text-[#8C8C8C] hover:text-[#991B1B] p-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            title="Remove location from this entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <h4
                        onClick={() => {
                          onSelectEntry(entry);
                          onNavigateToJournal();
                        }}
                        className="font-serif text-base font-bold text-[#1A1A1A] hover:underline cursor-pointer"
                      >
                        {entry.title || "Untitled Reflection"}
                      </h4>

                      <p className="text-xs font-sans text-[#666] leading-relaxed line-clamp-2">
                        {entry.summary || entry.messages?.[0]?.content || "Empty reflection"}
                      </p>

                      {entry.tags && entry.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {entry.tags.map((t, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-white text-[9px] font-sans uppercase tracking-wider text-[#555] border border-[#E5E1D8]"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

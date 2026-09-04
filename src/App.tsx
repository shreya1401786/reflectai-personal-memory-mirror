/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { User } from "firebase/auth";
import {
  signInWithGoogle,
  signOutUser,
  onUserAuthStateChanged,
  saveJournalEntry,
  getUserJournalEntries,
  deleteJournalEntry,
  saveFutureLetter,
  getUserFutureLetters,
  deleteFutureLetter,
} from "./lib/firebase";
import {
  JournalEntry,
  JournalMessage,
  ReflectionMode,
  UserProfile,
  ActiveView,
  FutureLetter,
  EntryLocation,
  DecisionTracking,
  MemoryCategory,
} from "./types";
import { Navbar } from "./components/Navbar";
import { LandingPage } from "./components/LandingPage";
import { HistorySidebar } from "./components/HistorySidebar";
import { JournalThread } from "./components/JournalThread";
import { JournalEditor } from "./components/JournalEditor";
import { ErrorBanner } from "./components/ErrorBanner";
import { SentimentTrendChart } from "./components/SentimentTrendChart";
import { MemoryMirror } from "./components/MemoryMirror";
import { PatternRadar } from "./components/PatternRadar";
import { MemoryMap } from "./components/MemoryMap";
import { ReflectionReplay } from "./components/ReflectionReplay";
import { DecisionsTimeline } from "./components/DecisionsTimeline";
import { FutureMe } from "./components/FutureMe";
import { ImportantMemories } from "./components/ImportantMemories";
import { MemoryConstellation } from "./components/MemoryConstellation";
import { SemanticSearch } from "./components/SemanticSearch";
import { PrivacyCenter } from "./components/PrivacyCenter";
import { MemoryConnectionCard } from "./components/MemoryConnectionCard";
import { getEntrySentiment } from "./lib/sentiment";
import { apiPost } from "./lib/api";
import { Edit3, Tag, Calendar, Sparkles, MapPin, Scale, Star } from "lucide-react";

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Active View State for Memory Mirror navigation
  const [activeView, setActiveView] = useState<ActiveView>("journal");

  // Journal State
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [currentEntry, setCurrentEntry] = useState<JournalEntry | null>(null);
  const [entriesLoading, setEntriesLoading] = useState<boolean>(false);

  // Future Me Letters State
  const [futureLetters, setFutureLetters] = useState<FutureLetter[]>([]);

  // Interaction State
  const [inputPrompt, setInputPrompt] = useState<string>("");
  const [selectedMode, setSelectedMode] = useState<ReflectionMode>("reflection");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<"synced" | "saving" | "error">("synced");

  // Error & Retry State
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingSaveEntry, setPendingSaveEntry] = useState<JournalEntry | null>(null);
  const [isRetryingSave, setIsRetryingSave] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of message thread smoothly
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentEntry?.messages, isGenerating]);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onUserAuthStateChanged((user: User | null) => {
      if (user) {
        setCurrentUser({
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
        });
      } else {
        setCurrentUser(null);
        setEntries([]);
        setCurrentEntry(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch entries when user logs in
  const loadUserEntries = useCallback(async (userId: string) => {
    setEntriesLoading(true);
    try {
      const userEntries = await getUserJournalEntries(userId);
      setEntries(userEntries);

      if (userEntries.length > 0) {
        setCurrentEntry(userEntries[0]);
      } else {
        createNewEntry(userId);
      }

      // Load future letters
      const letters = await getUserFutureLetters(userId);
      setFutureLetters(letters);
    } catch (err: any) {
      console.error("Failed to load user entries from Firestore:", err);
      setErrorMessage("Could not load your past reflections from Firestore. Check your connection.");
    } finally {
      setEntriesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser?.uid) {
      loadUserEntries(currentUser.uid);
    }
  }, [currentUser?.uid, loadUserEntries]);

  // Create a brand new blank entry
  const createNewEntry = (userId?: string) => {
    const uid = userId || currentUser?.uid;
    if (!uid) return;

    const newId = "entry_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
    const dateStr = new Date().toISOString();

    const freshEntry: JournalEntry = {
      id: newId,
      userId: uid,
      title: "New Reflection",
      summary: "",
      tags: ["Reflection"],
      createdAt: dateStr,
      updatedAt: dateStr,
      messages: [],
    };

    setCurrentEntry(freshEntry);
    setSaveStatus("synced");
    setErrorMessage(null);
  };

  // Google Sign-In handler
  const handleSignIn = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Sign in error:", err);
      setAuthError(err.message || "Failed to sign in with Google.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Sign out handler
  const handleSignOut = async () => {
    try {
      await signOutUser();
    } catch (err: any) {
      console.error("Sign out error:", err);
    }
  };

  // Safe Firestore Persistence Wrapper with Error Escalation
  const persistEntry = async (entryToSave: JournalEntry): Promise<boolean> => {
    if (!currentUser?.uid) return false;
    setSaveStatus("saving");
    setPendingSaveEntry(entryToSave);

    try {
      await saveJournalEntry(currentUser.uid, entryToSave);

      // Update local entry list state
      setEntries((prev) => {
        const index = prev.findIndex((e) => e.id === entryToSave.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = entryToSave;
          return updated.sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
        } else {
          return [entryToSave, ...prev];
        }
      });

      setSaveStatus("synced");
      setPendingSaveEntry(null);
      setErrorMessage(null);
      return true;
    } catch (err: any) {
      console.error("Firestore persistence failed:", err);
      setSaveStatus("error");
      setErrorMessage(
        `Failed to save your reflection to Firestore: ${err.message || "Network or permission error"}.`
      );
      return false;
    }
  };

  // Handlers for Memory Mirror metadata
  const handleUpdateEntryLocation = async (entry: JournalEntry, location?: EntryLocation) => {
    const updated: JournalEntry = {
      ...entry,
      location: location || undefined,
      updatedAt: new Date().toISOString(),
    };
    if (currentEntry?.id === entry.id) {
      setCurrentEntry(updated);
    }
    await persistEntry(updated);
  };

  const handleUpdateEntryDecision = async (entry: JournalEntry, decision?: DecisionTracking) => {
    const updated: JournalEntry = {
      ...entry,
      decision: decision || undefined,
      updatedAt: new Date().toISOString(),
    };
    if (currentEntry?.id === entry.id) {
      setCurrentEntry(updated);
    }
    await persistEntry(updated);
  };

  const handleToggleImportant = async (entry: JournalEntry, category?: MemoryCategory) => {
    const isNowImportant = !entry.isImportant || Boolean(category && entry.importanceCategory !== category);
    const updated: JournalEntry = {
      ...entry,
      isImportant: isNowImportant,
      importanceCategory: isNowImportant ? category || "Milestone" : undefined,
      updatedAt: new Date().toISOString(),
    };
    if (currentEntry?.id === entry.id) {
      setCurrentEntry(updated);
    }
    await persistEntry(updated);
  };

  const handleSaveFutureLetter = async (letter: FutureLetter) => {
    if (!currentUser?.uid) return;
    try {
      await saveFutureLetter(currentUser.uid, {
        ...letter,
        userId: currentUser.uid,
      });
      setFutureLetters((prev) => [letter, ...prev]);
    } catch (err: any) {
      console.error("Save future letter failed:", err);
      setErrorMessage(`Failed to seal future letter: ${err.message}`);
    }
  };

  const handleDeleteFutureLetter = async (letterId: string) => {
    if (!currentUser?.uid) return;
    try {
      await deleteFutureLetter(currentUser.uid, letterId);
      setFutureLetters((prev) => prev.filter((l) => l.id !== letterId));
    } catch (err: any) {
      console.error("Delete future letter failed:", err);
      setErrorMessage(`Failed to delete letter: ${err.message}`);
    }
  };

  // Retry failed persistence
  const handleRetrySave = async () => {
    if (!pendingSaveEntry) return;
    setIsRetryingSave(true);
    try {
      await persistEntry(pendingSaveEntry);
    } finally {
      setIsRetryingSave(false);
    }
  };

  // Submit Prompt to Gemini and save interaction to Firestore
  const handleSubmitPrompt = async () => {
    if (!inputPrompt.trim() || !currentEntry || !currentUser) return;

    const userText = inputPrompt.trim();
    const timestamp = new Date().toISOString();

    const userMsg: JournalMessage = {
      id: "msg_user_" + Date.now(),
      role: "user",
      content: userText,
      timestamp,
      mode: selectedMode,
    };

    // Optimistically update current conversation UI
    const updatedMessages = [...currentEntry.messages, userMsg];
    const workingEntry: JournalEntry = {
      ...currentEntry,
      messages: updatedMessages,
      updatedAt: timestamp,
      // If title is default and this is first message, auto-title briefly
      title:
        currentEntry.title === "New Reflection"
          ? userText.slice(0, 30) + (userText.length > 30 ? "..." : "")
          : currentEntry.title,
    };

    setCurrentEntry(workingEntry);
    setIsGenerating(true);

    try {
      // Call server-side Gemini API endpoint via resilient apiPost with automated retries
      const data = await apiPost("/api/gemini/reflect", {
        prompt: userText,
        history: currentEntry.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        mode: selectedMode,
      });

      const modelText = data.response || "No response received.";
      const modelUsed = data.modelUsed || "gemini-3.8-flash";

      const modelMsg: JournalMessage = {
        id: "msg_model_" + Date.now(),
        role: "model",
        content: modelText,
        timestamp: new Date().toISOString(),
        mode: selectedMode,
        modelUsed,
      };

      const finalEntry: JournalEntry = {
        ...workingEntry,
        messages: [...workingEntry.messages, modelMsg],
        updatedAt: new Date().toISOString(),
      };

      setCurrentEntry(finalEntry);

      // Persist to user-isolated Firestore
      const saveSucceeded = await persistEntry(finalEntry);
      if (saveSucceeded) {
        // Clear input buffer ONLY after successful save
        setInputPrompt("");
      }
    } catch (err: any) {
      setErrorMessage(
        `Reflective insight could not be generated: ${err.message || "Network request failed"}. Your written reflection is safely preserved.`
      );
      setSaveStatus("error");
    } finally {
      setIsGenerating(false);
    }
  };

  // Summarize the current reflection entry with Gemini
  const handleAutoSummarize = async () => {
    if (!currentEntry || currentEntry.messages.length === 0) return;

    setIsSummarizing(true);
    try {
      const fullText = currentEntry.messages
        .map((m) => `${m.role === "user" ? "User" : "Gemini"}: ${m.content}`)
        .join("\n\n");

      const data = await apiPost("/api/gemini/summarize-entry", { text: fullText });

      const updated: JournalEntry = {
        ...currentEntry,
        title: data.title || currentEntry.title,
        summary: data.summary || currentEntry.summary,
        tags: Array.isArray(data.tags) && data.tags.length > 0 ? data.tags : currentEntry.tags,
        sentimentScore: typeof data.sentimentScore === "number" ? data.sentimentScore : currentEntry.sentimentScore,
        sentimentLabel: data.sentimentLabel || currentEntry.sentimentLabel,
        updatedAt: new Date().toISOString(),
      };

      setCurrentEntry(updated);
      await persistEntry(updated);
    } catch (err: any) {
      setErrorMessage(`Summarization could not complete: ${err.message}`);
    } finally {
      setIsSummarizing(false);
    }
  };

  // Delete Entry
  const handleDeleteEntry = async (entryId: string) => {
    if (!currentUser?.uid) return;

    try {
      await deleteJournalEntry(currentUser.uid, entryId);
      setEntries((prev) => prev.filter((e) => e.id !== entryId));

      if (currentEntry?.id === entryId) {
        const remaining = entries.filter((e) => e.id !== entryId);
        if (remaining.length > 0) {
          setCurrentEntry(remaining[0]);
        } else {
          createNewEntry(currentUser.uid);
        }
      }
    } catch (err: any) {
      console.error("Delete failed:", err);
      setErrorMessage(`Failed to delete entry from Firestore: ${err.message}`);
    }
  };

  // If still checking initial auth state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center text-[#1A1A1A]">
        <div className="w-10 h-10 border-2 border-[#1A1A1A] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-serif italic text-base tracking-wide text-[#8C8C8C]">
          ReflectAI is opening your archive...
        </p>
      </div>
    );
  }

  // Not signed in: show Landing Page
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] font-sans">
        <Navbar
          user={null}
          onSignOut={() => {}}
          onNewEntry={() => {}}
          onToggleHistory={() => {}}
          historyOpen={false}
          entryCount={0}
          activeView="journal"
          onSelectView={() => {}}
        />
        <LandingPage
          onSignIn={handleSignIn}
          authLoading={authLoading}
          authError={authError}
        />
      </div>
    );
  }

  // Authenticated Private Dashboard
  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1A1A1A] flex flex-col font-sans">
      <Navbar
        user={currentUser}
        onSignOut={handleSignOut}
        onNewEntry={() => {
          setActiveView("journal");
          createNewEntry(currentUser.uid);
        }}
        onToggleHistory={() => setHistoryOpen(!historyOpen)}
        historyOpen={historyOpen}
        entryCount={entries.length}
        activeView={activeView}
        onSelectView={setActiveView}
      />

      <div className="flex-1 flex overflow-hidden relative max-w-7xl w-full mx-auto">
        {/* Past Reflections Sidebar */}
        <HistorySidebar
          entries={entries}
          currentEntryId={currentEntry?.id || null}
          onSelectEntry={(entry) => {
            setCurrentEntry(entry);
            setActiveView("journal");
            setErrorMessage(null);
          }}
          onNewEntry={() => {
            setActiveView("journal");
            createNewEntry(currentUser.uid);
          }}
          onDeleteEntry={handleDeleteEntry}
          isOpen={historyOpen}
          onClose={() => setHistoryOpen(false)}
          loading={entriesLoading}
        />

        {/* Main Dashboard Workspace based on ActiveView */}
        <main className="flex-1 flex flex-col overflow-y-auto px-4 sm:px-8 py-8">
          {/* Error Banner */}
          {errorMessage && (
            <ErrorBanner
              message={errorMessage}
              onRetry={pendingSaveEntry ? handleRetrySave : undefined}
              onDismiss={() => setErrorMessage(null)}
              isRetrying={isRetryingSave}
            />
          )}

          {/* VIEW: Flagship "Ask My Memory" */}
          {activeView === "ask_memory" && (
            <MemoryMirror
              entries={entries}
              onSelectEntry={(entry) => {
                setCurrentEntry(entry);
                setActiveView("journal");
              }}
              onNavigateToJournal={() => setActiveView("journal")}
            />
          )}

          {/* VIEW: Pattern Radar */}
          {activeView === "pattern_radar" && (
            <PatternRadar
              entries={entries}
              onSelectEntry={(entry) => {
                setCurrentEntry(entry);
                setActiveView("journal");
              }}
            />
          )}

          {/* VIEW: Memory Map */}
          {activeView === "memory_map" && (
            <MemoryMap
              entries={entries}
              onSelectEntry={(entry) => {
                setCurrentEntry(entry);
                setActiveView("journal");
              }}
              onNavigateToJournal={() => setActiveView("journal")}
              onUpdateEntryLocation={handleUpdateEntryLocation}
            />
          )}

          {/* VIEW: Reflection Replay */}
          {activeView === "reflection_replay" && (
            <ReflectionReplay
              entries={entries}
              onSelectEntry={(entry) => {
                setCurrentEntry(entry);
                setActiveView("journal");
              }}
            />
          )}

          {/* VIEW: Decisions Timeline */}
          {activeView === "decisions" && (
            <DecisionsTimeline
              entries={entries}
              onSelectEntry={(entry) => {
                setCurrentEntry(entry);
                setActiveView("journal");
              }}
              onNavigateToJournal={() => setActiveView("journal")}
              onUpdateEntryDecision={handleUpdateEntryDecision}
            />
          )}

          {/* VIEW: Future Me Letters */}
          {activeView === "future_me" && (
            <FutureMe
              letters={futureLetters}
              onSaveLetter={handleSaveFutureLetter}
              onDeleteLetter={handleDeleteFutureLetter}
            />
          )}

          {/* VIEW: Important Memories */}
          {activeView === "important" && (
            <ImportantMemories
              entries={entries}
              onSelectEntry={(entry) => {
                setCurrentEntry(entry);
                setActiveView("journal");
              }}
              onNavigateToJournal={() => setActiveView("journal")}
              onToggleImportant={handleToggleImportant}
            />
          )}

          {/* VIEW: Memory Constellation */}
          {activeView === "constellation" && (
            <MemoryConstellation
              entries={entries}
              onSelectEntry={(entry) => {
                setCurrentEntry(entry);
                setActiveView("journal");
              }}
              onNavigateToJournal={() => setActiveView("journal")}
            />
          )}

          {/* VIEW: Semantic Search */}
          {activeView === "semantic_search" && (
            <SemanticSearch
              entries={entries}
              onSelectEntry={(entry) => {
                setCurrentEntry(entry);
                setActiveView("journal");
              }}
              onNavigateToJournal={() => setActiveView("journal")}
            />
          )}

          {/* VIEW: Privacy Architecture */}
          {activeView === "privacy" && <PrivacyCenter />}

          {/* VIEW: Core Journal Editor & Thread */}
          {activeView === "journal" && (
            <>
              {/* D3.js Sentiment Trend Visualization */}
              {entries.length > 0 && (
                <SentimentTrendChart
                  entries={entries}
                  selectedEntryId={currentEntry?.id || null}
                  onSelectEntry={(entry) => {
                    setCurrentEntry(entry);
                    setErrorMessage(null);
                  }}
                />
              )}

              {/* Current Entry Header Banner */}
              {currentEntry && (
                <div className="bg-white border border-[#E5E1D8] p-5 sm:p-6 mb-8 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <input
                          id="input-entry-title"
                          type="text"
                          value={currentEntry.title}
                          onChange={(e) => {
                            const updated = { ...currentEntry, title: e.target.value };
                            setCurrentEntry(updated);
                            persistEntry(updated);
                          }}
                          placeholder="Title this reflection..."
                          className="font-serif text-xl sm:text-2xl font-bold italic text-[#1A1A1A] bg-transparent border-b border-transparent hover:border-[#E5E1D8] focus:border-[#1A1A1A] focus:outline-none transition-colors w-full"
                        />
                        <Edit3 className="w-4 h-4 text-[#8C8C8C] shrink-0" />
                      </div>

                      {currentEntry.summary && (
                        <p className="text-xs font-serif italic text-[#666] mt-2 leading-relaxed">
                          "{currentEntry.summary}"
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#8C8C8C]">
                      <div className="flex items-center gap-1.5 font-sans uppercase tracking-wider text-[10px]">
                        <Calendar className="w-3.5 h-3.5 text-[#A0A0A0]" />
                        <span>
                          {new Date(currentEntry.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      {/* Location Chip if present */}
                      {currentEntry.location?.name && (
                        <div className="flex items-center gap-1 pl-3 border-l border-[#E5E1D8] text-[#D4A373]">
                          <MapPin className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-sans uppercase tracking-wider truncate max-w-[120px]">
                            {currentEntry.location.name}
                          </span>
                        </div>
                      )}

                      {/* Decision Chip if present */}
                      {currentEntry.decision?.isDecision && (
                        <div className="flex items-center gap-1 pl-3 border-l border-[#E5E1D8] text-[#1A1A1A]">
                          <Scale className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-sans uppercase tracking-wider">
                            {currentEntry.decision.stage}
                          </span>
                        </div>
                      )}

                      {/* Important Star */}
                      {currentEntry.isImportant && (
                        <div className="flex items-center gap-1 pl-3 border-l border-[#E5E1D8] text-[#D4A373]">
                          <Star className="w-3.5 h-3.5 fill-[#D4A373]" />
                          <span className="text-[9px] font-sans uppercase tracking-wider">
                            {currentEntry.importanceCategory || "Milestone"}
                          </span>
                        </div>
                      )}

                      {/* Sentiment Tone Chip */}
                      {(() => {
                        const sentiment = getEntrySentiment(currentEntry);
                        return (
                          <div className="flex items-center gap-1 pl-3 border-l border-[#E5E1D8]">
                            <span
                              className={`text-[9px] font-sans uppercase tracking-wider px-2 py-0.5 border ${
                                sentiment.valence === "positive"
                                  ? "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]"
                                  : sentiment.valence === "negative"
                                  ? "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]"
                                  : "bg-[#F4F1EA] text-[#666] border-[#E5E1D8]"
                              }`}
                            >
                              Tone: {sentiment.label} ({sentiment.score > 0 ? `+${sentiment.score}` : sentiment.score})
                            </span>
                          </div>
                        );
                      })()}

                      {/* Tags */}
                      {currentEntry.tags && currentEntry.tags.length > 0 && (
                        <div className="flex items-center gap-1.5 pl-3 border-l border-[#E5E1D8]">
                          <Tag className="w-3.5 h-3.5 text-[#D4A373]" />
                          <div className="flex gap-1.5">
                            {currentEntry.tags.map((t, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 text-[9px] font-sans uppercase tracking-wider bg-[#F4F1EA] text-[#555] border border-[#E5E1D8]"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Memory Association Engine card connecting to past memories */}
              {currentEntry && (
                <MemoryConnectionCard
                  currentEntry={currentEntry}
                  entries={entries}
                  onSelectEntry={(entry) => {
                    setCurrentEntry(entry);
                    setErrorMessage(null);
                  }}
                />
              )}

              {/* Dialogue / Journal Thread */}
              <div className="flex-1">
                {currentEntry && (
                  <JournalThread
                    messages={currentEntry.messages}
                    isGenerating={isGenerating}
                    onSelectSuggestedPrompt={(prompt) => {
                      setInputPrompt(prompt);
                    }}
                  />
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Sticky Journal Editor & Mode Controls */}
              <div className="sticky bottom-0 pt-4 pb-2 z-10 bg-gradient-to-t from-[#FAF9F6] via-[#FAF9F6]/90 to-transparent">
                <JournalEditor
                  inputPrompt={inputPrompt}
                  setInputPrompt={setInputPrompt}
                  selectedMode={selectedMode}
                  setSelectedMode={setSelectedMode}
                  onSubmitPrompt={handleSubmitPrompt}
                  onAutoSummarize={handleAutoSummarize}
                  isGenerating={isGenerating}
                  isSummarizing={isSummarizing}
                  saveStatus={saveStatus}
                  hasMessages={Boolean(currentEntry && currentEntry.messages.length > 0)}
                />
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

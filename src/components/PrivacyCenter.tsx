import React from "react";
import { ShieldCheck, Lock, EyeOff, KeyRound, Server, UserCheck, Database, CheckCircle2 } from "lucide-react";

export const PrivacyCenter: React.FC = () => {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-[#FAF9F6] border border-[#E5E1D8] p-6 sm:p-8">
        <div className="flex items-center gap-2 text-[10px] font-sans uppercase tracking-[0.2em] text-[#D4A373] font-bold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Security & Data Sovereignty</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl text-[#1A1A1A] font-medium tracking-tight mt-2 italic">
          ReflectAI Privacy Architecture
        </h1>
        <p className="text-sm font-sans text-[#666] leading-relaxed mt-3">
          Reflections are deeply personal. We built ReflectAI with strict data isolation, zero cross-user leakage, and server-side secret management. Here is exactly how your data is protected.
        </p>
      </div>

      {/* 4 Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pillar 1 */}
        <div className="bg-white border border-[#E5E1D8] p-6 space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#FAF9F6] border border-[#E5E1D8]">
              <Lock className="w-5 h-5 text-[#1A1A1A]" />
            </div>
            <h3 className="font-serif text-lg font-bold text-[#1A1A1A]">
              1. Strict User Path Isolation
            </h3>
          </div>
          <p className="text-xs font-sans text-[#666] leading-relaxed">
            All reflections, locations, and time-capsule letters are stored under authenticated paths:
          </p>
          <div className="bg-[#FAF9F6] p-2.5 border border-[#E5E1D8] text-[11px] font-mono text-[#333]">
            /users/&#123;userId&#125;/interactions/...
            <br />
            /users/&#123;userId&#125;/future_letters/...
          </div>
          <p className="text-xs font-sans text-[#666] leading-relaxed">
            Firestore Security Rules reject any query attempting to view another user's records with{" "}
            <code>request.auth.uid == userId</code>.
          </p>
        </div>

        {/* Pillar 2 */}
        <div className="bg-white border border-[#E5E1D8] p-6 space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#FAF9F6] border border-[#E5E1D8]">
              <Server className="w-5 h-5 text-[#1A1A1A]" />
            </div>
            <h3 className="font-serif text-lg font-bold text-[#1A1A1A]">
              2. Zero-Exposure Secret Management
            </h3>
          </div>
          <p className="text-xs font-sans text-[#666] leading-relaxed">
            Your browser never sees the Gemini API key. All AI operations are proxied through an Express backend service:
          </p>
          <ul className="space-y-1.5 text-xs font-sans text-[#555]">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#15803D]" />
              <span><code>GEMINI_API_KEY</code> stored server-side only</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#15803D]" />
              <span>Sanitized requests with zero prompt injection execution</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#15803D]" />
              <span>No user password storage (Federated Google Auth)</span>
            </li>
          </ul>
        </div>

        {/* Pillar 3 */}
        <div className="bg-white border border-[#E5E1D8] p-6 space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#FAF9F6] border border-[#E5E1D8]">
              <EyeOff className="w-5 h-5 text-[#1A1A1A]" />
            </div>
            <h3 className="font-serif text-lg font-bold text-[#1A1A1A]">
              3. Opt-in Location & Telemetry
            </h3>
          </div>
          <p className="text-xs font-sans text-[#666] leading-relaxed">
            ReflectAI NEVER tracks your location in the background. Geotagging is 100% voluntary and only attached when you click "Tag Location to Entry" in the Memory Map.
          </p>
          <p className="text-xs font-sans text-[#666] leading-relaxed">
            You can remove or edit location tags from any reflection at any time.
          </p>
        </div>

        {/* Pillar 4 */}
        <div className="bg-white border border-[#E5E1D8] p-6 space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#FAF9F6] border border-[#E5E1D8]">
              <UserCheck className="w-5 h-5 text-[#1A1A1A]" />
            </div>
            <h3 className="font-serif text-lg font-bold text-[#1A1A1A]">
              4. You Own Your Memories
            </h3>
          </div>
          <p className="text-xs font-sans text-[#666] leading-relaxed">
            Your reflections belong exclusively to you. We do not sell user data, train public frontier foundational models on private user logs, or expose shared memory spaces.
          </p>
          <p className="text-xs font-sans text-[#666] leading-relaxed">
            Every entry can be individually deleted from the journal view, instantly wiping it from your Cloud Firestore database.
          </p>
        </div>
      </div>

      {/* Security Rules Snippet Showcase */}
      <div className="bg-white border border-[#E5E1D8] p-6 sm:p-8 space-y-4">
        <h3 className="font-serif text-lg font-bold text-[#1A1A1A]">
          Audited Firestore Security Rules
        </h3>
        <p className="text-xs font-sans text-[#666]">
          These rules are actively deployed to the production Firestore database to enforce owner-bound authorization at the database layer:
        </p>
        <pre className="p-4 bg-[#1A1A1A] text-[#FAF9F6] text-xs font-mono overflow-x-auto leading-relaxed">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Isolated User Journals
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    // Isolated Time Capsule Letters
    match /users/{userId}/future_letters/{letterId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}`}
        </pre>
      </div>
    </div>
  );
};

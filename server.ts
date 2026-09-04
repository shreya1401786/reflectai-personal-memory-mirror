import express, { Request, Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

// Lazy initialized Gemini client
let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY environment variable is not set. Requests will fail if attempted.");
    }
    genAIClient = new GoogleGenAI({ apiKey: apiKey || "" });
  }
  return genAIClient;
}

// Fallback Model Ladder ordered by real-time benchmarked responsiveness
const MODEL_FALLBACK_LADDER = [
  "gemini-3.7-flash",      // Verified fast responder (<3s)
  "gemini-3.1-flash-lite", // Verified fast responder (<3.5s)
  "gemini-3.8-flash",      // General text fallback
  "gemini-flash-latest",   // Dynamic alias
  "gemini-3.6-flash",      // Standard flash fallback
];

// Adaptive Cooldown tracker to prevent hammering models with active 503/429 spikes
const modelCooldowns = new Map<string, number>();

/**
 * Returns prioritized models, placing healthy models ahead of models on active cooldown
 */
function getHealthyModelCandidates(): string[] {
  const now = Date.now();
  const available: string[] = [];
  const inCooldown: string[] = [];

  for (const model of MODEL_FALLBACK_LADDER) {
    const cooldownUntil = modelCooldowns.get(model) || 0;
    if (now < cooldownUntil) {
      inCooldown.push(model);
    } else {
      available.push(model);
    }
  }

  // Attempt healthy models first; use cooling-down models only as last resort
  return [...available, ...inCooldown];
}

interface ChatMessageInput {
  role: "user" | "model" | "assistant";
  content: string;
}

/**
 * Executes content generation through the resilient fallback ladder with adaptive cooldown
 */
async function generateContentWithFallback(
  systemInstruction: string,
  contents: any[],
  temperature: number = 0.7
): Promise<{ text: string; modelUsed: string }> {
  const ai = getGenAI();
  let lastError: any = null;
  const candidateModels = getHealthyModelCandidates();

  for (const model of candidateModels) {
    try {
      const generatePromise = ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          temperature,
        },
      });

      // 8.5s candidate timeout to guarantee no model hangs the request
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout after 8500ms on ${model}`)), 8500)
      );

      const response: any = await Promise.race([generatePromise, timeoutPromise]);

      const text = response.text || "";
      if (text) {
        // Success: clear any existing cooldown on this model
        if (modelCooldowns.has(model)) {
          modelCooldowns.delete(model);
        }
        return { text, modelUsed: model };
      }
    } catch (err: any) {
      lastError = err;
      const statusCode = err?.status || err?.statusCode || 500;
      
      // If model is experiencing temporary demand spike (503) or rate limit (429) or timeout, place on temporary 3-minute cooldown
      if (statusCode === 503 || statusCode === 429 || err?.message?.includes("Timeout")) {
        modelCooldowns.set(model, Date.now() + 3 * 60 * 1000);
      }
      
      // Graceful progression to next candidate without polluting server logs with API 503 JSON
    }
  }

  throw new Error(`All Gemini models failed. Last error: ${lastError?.message || "Unknown error"}`);
}

async function startServer() {
  const app = express();

  // Top-Level Request Deserialization (Ordering Guarantee)
  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ extended: true }));

  // Cross-Origin & Preflight Headers for dev preview, iframes, and local proxies
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // Health check endpoint
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      modelsAvailable: MODEL_FALLBACK_LADDER,
      geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  // Gemini Reflection / Multi-turn Conversation Endpoint
  app.post("/api/gemini/reflect", async (req: Request, res: Response) => {
    try {
      // Defensive Payload Ingestion
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const { prompt, history, mode = "reflection" } = body;

      if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
        res.status(400).json({ error: "A valid non-empty 'prompt' is required." });
        return;
      }

      if (!process.env.GEMINI_API_KEY) {
        res.status(500).json({
          error: "Gemini API key is not configured on the server. Please check your environment variables.",
        });
        return;
      }

      let modeInstruction = "";
      switch (mode) {
        case "summary":
          modeInstruction = "Provide a high-level empathetic summary of the thoughts shared, key emotions identified, and core themes.";
          break;
        case "brainstorm":
          modeInstruction = "Offer fresh perspectives, creative possibilities, and brainstorming angles to expand on what the user is exploring.";
          break;
        case "action_items":
          modeInstruction = "Extract actionable, gentle, realistic next steps or self-care habits the user might consider following up on.";
          break;
        case "reflection":
        default:
          modeInstruction = "Act as an empathetic sounding board. Mirror key insights with psychological warmth, ask 1-2 open-ended deepening questions, and suggest constructive perspectives.";
          break;
      }

      const systemInstruction = `You are ReflectAI, an empathetic, emotionally intelligent, and constructive personal reflection and journaling partner.
Your role is to help the user unpack thoughts, gain self-awareness, reflect on feelings, and find clarity.
Mode: ${modeInstruction}
Keep responses warm, supportive, clear, and formatted cleanly with markdown. Avoid robotic clichés or over-dramatic platitudes. Speak directly and thoughtfully.`;

      // Build conversation history for multi-turn dialogue
      const conversationContents: any[] = [];

      if (Array.isArray(history)) {
        for (const msg of history) {
          if (msg && typeof msg === "object" && msg.content) {
            const role = msg.role === "assistant" || msg.role === "model" ? "model" : "user";
            conversationContents.push({
              role,
              parts: [{ text: String(msg.content) }],
            });
          }
        }
      }

      // Append current user message
      conversationContents.push({
        role: "user",
        parts: [{ text: prompt.trim() }],
      });

      const { text, modelUsed } = await generateContentWithFallback(
        systemInstruction,
        conversationContents,
        0.7
      );

      res.json({
        response: text,
        modelUsed,
        mode,
      });
    } catch (err: any) {
      console.error("[/api/gemini/reflect error]", err);
      res.status(500).json({
        error: err?.message || "An unexpected error occurred while generating reflection.",
      });
    }
  });

  // Quick Summarizer / Title Generator for Journal Entries
  app.post("/api/gemini/summarize-entry", async (req: Request, res: Response) => {
    try {
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const { text } = body;

      if (!text || typeof text !== "string" || !text.trim()) {
        res.status(400).json({ error: "Text is required to summarize." });
        return;
      }

      const systemInstruction = `You are an editorial assistant for a personal journal.
Analyze the provided journal text and output a JSON object with:
1. "title": A concise, evocative title (3 to 6 words) that captures the core essence.
2. "summary": A 2-sentence thoughtful synthesis of the entry's emotional tone and main topic.
3. "tags": An array of 2-4 keywords (e.g., ["Gratitude", "Career", "Mindfulness"]).
4. "sentimentScore": A float between -1.0 (very distressed/negative) and +1.0 (very joyful/uplifted), with 0.0 being neutral/calm.
5. "sentimentLabel": One emotional label from: "Uplifted", "Optimistic", "Peaceful", "Reflective", "Tense", "Melancholic", or "Overwhelmed".
Output STRICTLY valid JSON with no markdown backticks or commentary.`;

      const { text: aiOutput, modelUsed } = await generateContentWithFallback(
        systemInstruction,
        [{ role: "user", parts: [{ text: text.trim().slice(0, 4000) }] }],
        0.3
      );

      let parsed: any;
      try {
        const clean = aiOutput.replace(/```json/gi, "").replace(/```/g, "").trim();
        parsed = JSON.parse(clean);
      } catch {
        parsed = {
          title: "Personal Reflection",
          summary: aiOutput.slice(0, 200),
          tags: ["Reflection"],
        };
      }

      res.json({
        ...parsed,
        modelUsed,
      });
    } catch (err: any) {
      console.error("[/api/gemini/summarize-entry error]", err);
      res.status(500).json({
        error: err?.message || "Failed to summarize journal entry.",
      });
    }
  });

  // ==========================================
  // MEMORY MIRROR: Flagship "Ask My Memory" / "Talk to Your Past Self"
  // ==========================================
  app.post("/api/gemini/memory-query", async (req: Request, res: Response) => {
    try {
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const { question, entries } = body;

      if (!question || typeof question !== "string" || !question.trim()) {
        res.status(400).json({ error: "A valid 'question' is required." });
        return;
      }

      const cleanEntries = Array.isArray(entries) ? entries : [];

      if (cleanEntries.length === 0) {
        res.json({
          hasSufficientEvidence: false,
          insufficientEvidenceNote: "You haven't written any reflections in your journal yet.",
          fromYourMemories: "No journal entries found in your archive.",
          possiblePattern: "No patterns can be analyzed without past journal entries.",
          answer: "**From your memories:**\nNo journal entries exist in your archive yet.\n\n**Possible pattern:**\nNo patterns can be inferred without past reflections.",
          relevantEntryIds: [],
          insights: [],
          modelUsed: "local-empty-state",
        });
        return;
      }

      // Compact authorized memory excerpts to feed into the model with explicit dates and titles
      const formattedMemories = cleanEntries.map((e: any, idx: number) => {
        const textSnippets = Array.isArray(e.messages)
          ? e.messages.map((m: any) => `${m.role === "user" ? "User" : "ReflectAI"}: ${m.content}`).join("\n")
          : e.summary || "";
        const loc = e.location?.name ? ` | Location: ${e.location.name}` : "";
        const dec = e.decision?.isDecision ? ` | Decision [${e.decision.stage}]: ${e.decision.decisionText || ""}` : "";
        const imp = e.isImportant ? ` | Important Memory [${e.importanceCategory || "Milestone"}]` : "";
        const dateStr = e.createdAt
          ? new Date(e.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
          : "Undated";

        return `--- ENTRY #${idx + 1} (ID: ${e.id}) ---
Date: ${dateStr} (ISO: ${e.createdAt || "N/A"})
Title: ${e.title || "Untitled"}
Tags: ${(e.tags || []).join(", ")}${loc}${dec}${imp}
Tone: ${e.sentimentLabel || "Reflective"} (Valence: ${e.sentimentScore ?? 0})
Content:
${textSnippets.slice(0, 1500)}
`;
      }).join("\n\n");

      const systemInstruction = `You are the flagship "Personal Memory Mirror" intelligence for ReflectAI.
The authenticated user is asking a question about their own past reflections, experiences, emotions, or decisions.
You are provided with their authorized journal entries.

MANDATORY GROUNDING & ACCURACY DIRECTIVES:
1. STRICT FACTUAL GROUNDING: Every single factual claim MUST be grounded strictly in the provided journal entries.
   - NEVER invent memories, events, dates, locations, people, emotions, outcomes, psychological claims, or facts not supported by the user's entries.
   - Do NOT assume what the user felt or did unless it is explicitly written in the entries.
2. CLEAR SEPARATION OF FACTS VS INTERPRETATION:
   You MUST clearly divide your answer into two distinct parts:
   - "fromYourMemories": Facts strictly supported by entries, with the exact date and entry title cited when useful (e.g., 'On Oct 12, 2025 in "Autumn Rain", you wrote...'). This section must contain ONLY factual claims backed by the text.
   - "possiblePattern": Gemini's reflective interpretation and potential patterns across the entries. This MUST be clearly labeled as an interpretation or potential pattern (never stated as an objective fact).
3. INSUFFICIENT EVIDENCE RULE:
   - If there isn't enough evidence in the provided entries to answer the question or substantiate a claim, you MUST explicitly say so.
   - For example: "There is not enough evidence in your journal entries to determine..." or "None of your recorded reflections mention...".
   - Set "hasSufficientEvidence": false, and explain in "insufficientEvidenceNote" what is missing from the archive.
   - NEVER attempt to guess, extrapolate, or fill in gaps when evidence is lacking.

STRICT JSON OUTPUT SCHEMA:
Output a JSON object matching this schema:
{
  "hasSufficientEvidence": boolean,
  "insufficientEvidenceNote": string or null,
  "fromYourMemories": "Factual claims strictly supported by retrieved entries with date/title citations. If not enough evidence, explicitly state so.",
  "possiblePattern": "Gemini's interpretation, clearly labeled as a potential pattern. If not enough evidence, state that no pattern can be confirmed.",
  "relevantEntryIds": ["id1", "id2"],
  "insights": ["Observation 1 grounded in entries", "Observation 2 grounded in entries"]
}
Output STRICTLY valid JSON with no markdown wrapping or text outside the JSON object.`;

      const promptPayload = `User's Question to Past Self: "${question.trim()}"

User's Past Journal Entries:
${formattedMemories.slice(0, 30000)}`;

      // Use low temperature (0.1) for high factual grounding and anti-hallucination
      const { text: aiOutput, modelUsed } = await generateContentWithFallback(
        systemInstruction,
        [{ role: "user", parts: [{ text: promptPayload }] }],
        0.1
      );

      let parsed: any;
      try {
        const clean = aiOutput.replace(/```json/gi, "").replace(/```/g, "").trim();
        parsed = JSON.parse(clean);
      } catch {
        parsed = {
          hasSufficientEvidence: true,
          insufficientEvidenceNote: null,
          fromYourMemories: aiOutput,
          possiblePattern: "Pattern inferred from available entries.",
          relevantEntryIds: cleanEntries.slice(0, 2).map((e: any) => e.id),
          insights: [],
        };
      }

      // Build backward-compatible formatted answer
      let formattedAnswer = "";
      if (parsed.hasSufficientEvidence === false && parsed.insufficientEvidenceNote) {
        formattedAnswer += `**Note on Evidence:** ${parsed.insufficientEvidenceNote}\n\n`;
      }
      formattedAnswer += `### From your memories\n${parsed.fromYourMemories || "No direct factual entries cited."}\n\n### Possible pattern (Gemini's interpretation)\n${parsed.possiblePattern || "No conclusive pattern identified."}`;

      res.json({
        hasSufficientEvidence: parsed.hasSufficientEvidence ?? true,
        insufficientEvidenceNote: parsed.insufficientEvidenceNote || null,
        fromYourMemories: parsed.fromYourMemories || "",
        possiblePattern: parsed.possiblePattern || "",
        answer: formattedAnswer,
        relevantEntryIds: Array.isArray(parsed.relevantEntryIds) ? parsed.relevantEntryIds : [],
        insights: Array.isArray(parsed.insights) ? parsed.insights : [],
        modelUsed,
      });
    } catch (err: any) {
      console.error("[/api/gemini/memory-query error]", err);
      res.status(500).json({
        error: err?.message || "Failed to query past memories.",
      });
    }
  });

  // ==========================================
  // PATTERN RADAR: Cross-reflection pattern analysis
  // ==========================================
  app.post("/api/gemini/pattern-radar", async (req: Request, res: Response) => {
    try {
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const { entries } = body;

      const cleanEntries = Array.isArray(entries) ? entries : [];
      if (cleanEntries.length < 2) {
        res.json({
          themes: [],
          emotions: [],
          goals: [],
          challenges: [],
          positivePatterns: [],
          narrativeObservation: "Pattern Radar requires at least 2 journal entries to detect meaningful recurring themes, emotional shifts, and personal rhythms.",
          modelUsed: "insufficient-data",
        });
        return;
      }

      const formattedEntries = cleanEntries.map((e: any, idx: number) => {
        const text = Array.isArray(e.messages) && e.messages[0] ? e.messages[0].content : e.summary || "";
        return `[Entry ${idx + 1}] Date: ${e.createdAt} | Title: ${e.title} | Tags: ${(e.tags || []).join(", ")} | Tone: ${e.sentimentLabel || "Neutral"} | Text: ${text.slice(0, 400)}`;
      }).join("\n");

      const systemInstruction = `You are the Pattern Radar engine for ReflectAI.
Analyze the user's journal entries to discover recurring patterns, themes, emotional rhythms, goals, challenges, and positive trajectories.
GROUNDING & ETHICAL DIRECTIVES:
- Base every single observation STRICTLY on the user's provided reflections.
- DO NOT present psychological diagnoses or medical conclusions. Frame all insights as gentle observations of their written journal ("In your reflections...", "You frequently note...").
- Quantify frequencies where clear (e.g., "appears in 4 reflections").

Output STRICTLY valid JSON formatted as:
{
  "themes": [{"name": string, "count": number, "description": string}],
  "emotions": [{"emotion": string, "trend": "Increasing" | "Decreasing" | "Stable", "context": string}],
  "goals": [{"goal": string, "status": "In Progress" | "Achieved" | "Evolving", "occurrences": number}],
  "challenges": [{"challenge": string, "recurrence": string, "copingPattern": string}],
  "positivePatterns": [{"pattern": string, "observation": string}],
  "narrativeObservation": "A warm, 2-3 paragraph editorial synthesis of the overarching story and patterns their memories are revealing."
}`;

      const { text: aiOutput, modelUsed } = await generateContentWithFallback(
        systemInstruction,
        [{ role: "user", parts: [{ text: formattedEntries.slice(0, 20000) }] }],
        0.3
      );

      let parsed: any;
      try {
        const clean = aiOutput.replace(/```json/gi, "").replace(/```/g, "").trim();
        parsed = JSON.parse(clean);
      } catch {
        parsed = {
          themes: [],
          emotions: [],
          goals: [],
          challenges: [],
          positivePatterns: [],
          narrativeObservation: aiOutput,
        };
      }

      res.json({
        ...parsed,
        modelUsed,
      });
    } catch (err: any) {
      console.error("[/api/gemini/pattern-radar error]", err);
      res.status(500).json({
        error: err?.message || "Failed to analyze pattern radar.",
      });
    }
  });

  // ==========================================
  // MEMORY CONNECTIONS: Compare current reflection to past memories
  // ==========================================
  app.post("/api/gemini/find-connection", async (req: Request, res: Response) => {
    try {
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const { currentText, pastEntries } = body;

      if (!currentText || !Array.isArray(pastEntries) || pastEntries.length === 0) {
        res.json({ hasConnection: false, message: "No past memories to connect." });
        return;
      }

      const summaries = pastEntries.map((e: any) => ({
        id: e.id,
        title: e.title,
        date: e.createdAt,
        location: e.location?.name,
        summary: e.summary || (e.messages?.[0]?.content || "").slice(0, 200),
        tags: e.tags,
      }));

      const systemInstruction = `You are a memory association engine for ReflectAI.
Analyze a newly written reflection against a list of the user's past journal entries.
Determine if there is a genuine, meaningful connection (recurring dilemma, similar emotional turning point, related project, or shared insight).
DO NOT fabricate connections or claim a connection when insufficient evidence exists. If no strong link exists, set "hasConnection": false.

Output STRICTLY valid JSON:
{
  "hasConnection": boolean,
  "connectedEntryId": string | null,
  "connectionSummary": "This reminds me of something you wrote on [Date]: [Insight]...",
  "sharedThemes": ["Theme1", "Theme2"],
  "reflectionPrompt": "A gentle question prompting the user to compare their past and present perspective."
}`;

      const { text: aiOutput, modelUsed } = await generateContentWithFallback(
        systemInstruction,
        [{
          role: "user",
          parts: [{
            text: `Current Reflection:\n"${currentText.slice(0, 2000)}"\n\nPast Entries:\n${JSON.stringify(summaries).slice(0, 15000)}`,
          }],
        }],
        0.3
      );

      let parsed: any;
      try {
        const clean = aiOutput.replace(/```json/gi, "").replace(/```/g, "").trim();
        parsed = JSON.parse(clean);
      } catch {
        parsed = { hasConnection: false };
      }

      res.json({ ...parsed, modelUsed });
    } catch (err: any) {
      console.error("[/api/gemini/find-connection error]", err);
      res.status(500).json({ error: "Failed to search memory connection." });
    }
  });

  // ==========================================
  // REFLECTION REPLAY: Chronological Journey Replay
  // ==========================================
  app.post("/api/gemini/reflection-replay", async (req: Request, res: Response) => {
    try {
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const { timeframe = "Last Month", entries } = body;

      const cleanEntries = Array.isArray(entries) ? entries : [];
      if (cleanEntries.length === 0) {
        res.json({
          thenSummary: "No reflections found in this timeframe.",
          alongTheWaySummary: "Pen your daily reflections to build this timeline.",
          nowSummary: "Your journey starts here.",
          keyMilestones: [],
          shifts: [],
          sentimentEvolution: "Balanced",
          narrative: "You do not have entries within this timeframe yet.",
          modelUsed: "insufficient-data",
        });
        return;
      }

      const formatted = cleanEntries.map((e: any, idx: number) => {
        return `[Entry #${idx + 1}] Date: ${e.createdAt} | Title: ${e.title} | Sentiment: ${e.sentimentLabel || "Reflective"} | Tags: ${(e.tags || []).join(", ")} | Summary: ${e.summary || (e.messages?.[0]?.content || "").slice(0, 300)}`;
      }).join("\n");

      const systemInstruction = `You are the Reflection Replay storyteller for ReflectAI.
Create a structured chronological evolution: "THEN → ALONG THE WAY → NOW" over the timeframe: "${timeframe}".
Clearly highlight:
- Changes in recurring themes and goals
- Major decisions made
- Repeated challenges and positive developments
- How their emotional state or mindset shifted

Clearly label observations as reflective interpretations from their journal.
Output STRICTLY valid JSON:
{
  "thenSummary": "Where you began at the start of this period...",
  "alongTheWaySummary": "The shifts, challenges, and turns you navigated...",
  "nowSummary": "Where you stand today in your latest reflections...",
  "keyMilestones": [{"date": string, "title": string, "significance": string}],
  "shifts": [{"from": string, "to": string, "dimension": "Mindset" | "Emotion" | "Focus" | "Habit"}],
  "sentimentEvolution": string,
  "narrative": "A cohesive, beautifully written editorial narrative of this season of your life (3-4 paragraphs)."
}`;

      const { text: aiOutput, modelUsed } = await generateContentWithFallback(
        systemInstruction,
        [{ role: "user", parts: [{ text: formatted.slice(0, 20000) }] }],
        0.4
      );

      let parsed: any;
      try {
        const clean = aiOutput.replace(/```json/gi, "").replace(/```/g, "").trim();
        parsed = JSON.parse(clean);
      } catch {
        parsed = {
          thenSummary: "Beginning of period",
          alongTheWaySummary: "Evolution across entries",
          nowSummary: "Current state",
          keyMilestones: [],
          shifts: [],
          sentimentEvolution: "Steady",
          narrative: aiOutput,
        };
      }

      res.json({ ...parsed, modelUsed });
    } catch (err: any) {
      console.error("[/api/gemini/reflection-replay error]", err);
      res.status(500).json({ error: "Failed to generate reflection replay." });
    }
  });

  // ==========================================
  // SEMANTIC MEMORY SEARCH
  // ==========================================
  app.post("/api/gemini/semantic-search", async (req: Request, res: Response) => {
    try {
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const { query: searchQuery, entries } = body;

      if (!searchQuery || typeof searchQuery !== "string") {
        res.status(400).json({ error: "Search query is required." });
        return;
      }

      const cleanEntries = Array.isArray(entries) ? entries : [];
      if (cleanEntries.length === 0) {
        res.json({ matches: [], reasoning: "No entries available to search." });
        return;
      }

      const entriesDigest = cleanEntries.map((e: any) => ({
        id: e.id,
        title: e.title,
        date: e.createdAt,
        tags: e.tags,
        location: e.location?.name,
        snippet: (e.summary || e.messages?.[0]?.content || "").slice(0, 500),
      }));

      const systemInstruction = `You are a semantic memory search engine for ReflectAI.
The user is searching for past reflections using natural conceptual language (e.g., "times I felt nervous before a presentation" or "when I was excited about starting something new").
Score each entry for semantic relevance to the concept (score 0.0 to 1.0).
Return only entries with relevance score >= 0.35, ranked highest first.

Output STRICTLY valid JSON:
{
  "matches": [
    {
      "id": string,
      "relevanceScore": number,
      "whyRelevant": "A short 1-sentence explanation of why this matches the user's search..."
    }
  ],
  "reasoning": "Brief overview of what themes matched the search."
}`;

      const { text: aiOutput, modelUsed } = await generateContentWithFallback(
        systemInstruction,
        [{
          role: "user",
          parts: [{
            text: `Search query: "${searchQuery}"\n\nEntries:\n${JSON.stringify(entriesDigest).slice(0, 18000)}`,
          }],
        }],
        0.2
      );

      let parsed: any;
      try {
        const clean = aiOutput.replace(/```json/gi, "").replace(/```/g, "").trim();
        parsed = JSON.parse(clean);
      } catch {
        parsed = { matches: [], reasoning: "Could not evaluate semantic matches." };
      }

      res.json({ ...parsed, modelUsed });
    } catch (err: any) {
      console.error("[/api/gemini/semantic-search error]", err);
      res.status(500).json({ error: "Failed to execute semantic search." });
    }
  });

  // ==========================================
  // DECISION EVALUATOR: "How did this decision turn out?"
  // ==========================================
  app.post("/api/gemini/evaluate-decision", async (req: Request, res: Response) => {
    try {
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const { decisionEntry, subsequentEntries } = body;

      if (!decisionEntry) {
        res.status(400).json({ error: "Decision entry is required." });
        return;
      }

      const decText = `Decision: ${decisionEntry.title} (${decisionEntry.createdAt})
Details: ${decisionEntry.decision?.decisionText || decisionEntry.summary || ""}`;

      const subs = Array.isArray(subsequentEntries)
        ? subsequentEntries.map((e: any) => `Date: ${e.createdAt} | Title: ${e.title} | Snippet: ${(e.summary || e.messages?.[0]?.content || "").slice(0, 400)}`).join("\n")
        : "None provided";

      const systemInstruction = `You are a decision retrospective evaluator for ReflectAI.
The user made or considered a decision in a past reflection.
Examine their subsequent reflections to trace:
1. Considering / Deliberation
2. Decision made
3. Outcome observed in later entries
4. Retrospective reflection & lessons learned

GROUNDING: ONLY use evidence actually present in the provided entries. Do NOT speculate or assume outcomes not mentioned in their journal.
Output STRICTLY valid JSON:
{
  "summary": "Concise summary of how the decision unfolded based on their journal entries...",
  "timelineStages": [
    {"stage": "Considering" | "Decided" | "Outcome" | "Reflection", "date": string, "notes": string}
  ],
  "lessonsLearned": ["Lesson 1...", "Lesson 2..."],
  "presentPerspective": "How their attitude toward this decision appears today."
}`;

      const { text: aiOutput, modelUsed } = await generateContentWithFallback(
        systemInstruction,
        [{ role: "user", parts: [{ text: `${decText}\n\nSubsequent Reflections:\n${subs.slice(0, 15000)}` }] }],
        0.3
      );

      let parsed: any;
      try {
        const clean = aiOutput.replace(/```json/gi, "").replace(/```/g, "").trim();
        parsed = JSON.parse(clean);
      } catch {
        parsed = { summary: aiOutput, timelineStages: [], lessonsLearned: [] };
      }

      res.json({ ...parsed, modelUsed });
    } catch (err: any) {
      console.error("[/api/gemini/evaluate-decision error]", err);
      res.status(500).json({ error: "Failed to evaluate decision." });
    }
  });


  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[ReflectAI Server] running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

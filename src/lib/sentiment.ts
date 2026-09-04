export interface SentimentAnalysisResult {
  /**
   * Continuous score from -1.0 (deeply distressed/negative) to +1.0 (joyful/uplifted).
   * 0 is neutral/balanced.
   */
  score: number;
  /**
   * Primary emotional label
   */
  label: "Uplifted" | "Optimistic" | "Peaceful" | "Reflective" | "Tense" | "Melancholic" | "Overwhelmed";
  /**
   * Secondary valence category
   */
  valence: "positive" | "neutral" | "negative";
  /**
   * Confidence score 0 to 1
   */
  confidence: number;
  /**
   * Highlight keywords detected
   */
  keywords: string[];
}

const POSITIVE_LEXICON: Record<string, number> = {
  grateful: 0.9,
  gratitude: 0.9,
  happy: 0.8,
  joy: 0.9,
  peaceful: 0.8,
  calm: 0.7,
  serene: 0.8,
  relieved: 0.7,
  hopeful: 0.8,
  optimistic: 0.85,
  inspired: 0.85,
  excited: 0.8,
  proud: 0.75,
  confident: 0.8,
  clear: 0.6,
  energized: 0.8,
  loved: 0.9,
  love: 0.8,
  kindness: 0.75,
  blessed: 0.85,
  progress: 0.6,
  accomplished: 0.8,
  thriving: 0.85,
  content: 0.7,
  wonderful: 0.85,
  good: 0.5,
  great: 0.7,
  solution: 0.5,
  clarity: 0.7,
  harmony: 0.8,
  growth: 0.65,
  healing: 0.7,
};

const NEGATIVE_LEXICON: Record<string, number> = {
  anxious: -0.75,
  anxiety: -0.8,
  stressed: -0.75,
  stress: -0.75,
  overwhelmed: -0.85,
  exhausted: -0.7,
  tired: -0.45,
  depressed: -0.9,
  sad: -0.7,
  lonely: -0.75,
  grief: -0.9,
  hopeless: -0.9,
  angry: -0.8,
  frustrated: -0.7,
  fear: -0.8,
  scared: -0.75,
  worried: -0.65,
  panic: -0.85,
  guilt: -0.7,
  shame: -0.8,
  doubt: -0.5,
  struggling: -0.7,
  pain: -0.8,
  hurt: -0.75,
  lost: -0.6,
  burnout: -0.85,
  failure: -0.8,
  disappointed: -0.7,
  stuck: -0.55,
  confused: -0.4,
};

const INTENSIFIERS: Record<string, number> = {
  very: 1.4,
  really: 1.3,
  extremely: 1.7,
  deeply: 1.5,
  incredibly: 1.6,
  quite: 1.2,
  so: 1.3,
  completely: 1.5,
  slightly: 0.6,
  somewhat: 0.7,
  barely: 0.4,
};

const NEGATORS = new Set(["not", "never", "no", "hardly", "seldom", "scarcely", "without", "isn't", "aren't", "wasn't", "weren't", "don't", "didn't", "can't", "cannot"]);

/**
 * Computes a sentiment score (-1.0 to 1.0) and emotional categorization from text.
 * Runs instantly client-side without external dependencies, with fallback for any text.
 */
export function analyzeSentiment(text: string): SentimentAnalysisResult {
  if (!text || !text.trim()) {
    return {
      score: 0,
      label: "Reflective",
      valence: "neutral",
      confidence: 0.5,
      keywords: [],
    };
  }

  const clean = text.toLowerCase().replace(/[^a-z0-9'\s]/g, " ");
  const tokens = clean.split(/\s+/).filter(Boolean);

  if (tokens.length === 0) {
    return {
      score: 0,
      label: "Reflective",
      valence: "neutral",
      confidence: 0.5,
      keywords: [],
    };
  }

  let totalScore = 0;
  let wordMatches = 0;
  const detectedKeywords: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    let isNegated = false;

    // Check up to 3 tokens back for negators
    for (let j = Math.max(0, i - 3); j < i; j++) {
      if (NEGATORS.has(tokens[j])) {
        isNegated = true;
        break;
      }
    }

    // Check 1 token back for intensifier
    let multiplier = 1.0;
    if (i > 0 && INTENSIFIERS[tokens[i - 1]]) {
      multiplier = INTENSIFIERS[tokens[i - 1]];
    }

    if (POSITIVE_LEXICON[token] !== undefined) {
      let score = POSITIVE_LEXICON[token] * multiplier;
      if (isNegated) score = -score * 0.7;
      totalScore += score;
      wordMatches++;
      if (!detectedKeywords.includes(token)) detectedKeywords.push(token);
    } else if (NEGATIVE_LEXICON[token] !== undefined) {
      let score = NEGATIVE_LEXICON[token] * multiplier;
      if (isNegated) score = -score * 0.7;
      totalScore += score;
      wordMatches++;
      if (!detectedKeywords.includes(token)) detectedKeywords.push(token);
    }
  }

  let normalizedScore = 0;
  if (wordMatches > 0) {
    // Average and bound strictly [-1, 1] with soft scaling
    const rawAverage = totalScore / wordMatches;
    normalizedScore = Math.max(-1, Math.min(1, rawAverage));
  } else {
    // Neutral contemplative baseline
    normalizedScore = 0;
  }

  // Round to 2 decimal points
  normalizedScore = Math.round(normalizedScore * 100) / 100;

  // Determine categorical label
  let label: SentimentAnalysisResult["label"] = "Reflective";
  let valence: SentimentAnalysisResult["valence"] = "neutral";

  if (normalizedScore >= 0.55) {
    label = "Uplifted";
    valence = "positive";
  } else if (normalizedScore >= 0.2) {
    label = "Optimistic";
    valence = "positive";
  } else if (normalizedScore > 0.05) {
    label = "Peaceful";
    valence = "positive";
  } else if (normalizedScore >= -0.05) {
    label = "Reflective";
    valence = "neutral";
  } else if (normalizedScore > -0.3) {
    label = "Tense";
    valence = "negative";
  } else if (normalizedScore > -0.6) {
    label = "Melancholic";
    valence = "negative";
  } else {
    label = "Overwhelmed";
    valence = "negative";
  }

  const confidence = wordMatches > 0 ? Math.min(1, 0.5 + wordMatches * 0.1) : 0.5;

  return {
    score: normalizedScore,
    label,
    valence,
    confidence,
    keywords: detectedKeywords.slice(0, 5),
  };
}

/**
 * Derives the composite sentiment for a journal entry based on all user thoughts
 */
export function getEntrySentiment(entry: {
  sentimentScore?: number;
  sentimentLabel?: string;
  messages: Array<{ role: string; content: string }>;
  summary?: string;
}): SentimentAnalysisResult {
  // If already computed and stored
  if (typeof entry.sentimentScore === "number" && entry.sentimentLabel) {
    let valence: SentimentAnalysisResult["valence"] = "neutral";
    if (entry.sentimentScore > 0.1) valence = "positive";
    else if (entry.sentimentScore < -0.1) valence = "negative";

    return {
      score: entry.sentimentScore,
      label: entry.sentimentLabel as any,
      valence,
      confidence: 0.85,
      keywords: [],
    };
  }

  // Combine user reflections & summary
  const userTexts = entry.messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join(" ");

  const combined = `${userTexts} ${entry.summary || ""}`.trim();
  return analyzeSentiment(combined);
}

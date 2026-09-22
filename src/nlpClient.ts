// Client-side NLP Analyzer mirroring nlp_engine.py for instant typing feedback

const CAMPUS_STOPWORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
  "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
  "below", "between", "both", "but", "by", "can't", "cannot", "could", "couldn't",
  "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during",
  "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't", "have",
  "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers",
  "herself", "him", "himself", "his", "how", "how's", "i", "i'd", "i'll", "i'm",
  "i've", "if", "in", "into", "is", "isn't", "it", "it's", "its", "itself", "let's",
  "me", "more", "most", "mustn't", "my", "myself", "no", "nor", "not", "of", "off",
  "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out",
  "over", "own", "same", "shan't", "she", "she'd", "she'll", "she's", "should",
  "shouldn't", "so", "some", "such", "than", "that", "that's", "the", "their",
  "theirs", "them", "themselves", "then", "there", "there's", "these", "they",
  "they'd", "they'll", "they're", "they've", "this", "those", "through", "to",
  "too", "under", "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll",
  "we're", "we've", "were", "weren't", "what", "what's", "when", "when's", "where",
  "where's", "which", "while", "who", "who's", "whom", "why", "why's", "with",
  "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've",
  "your", "yours", "yourself", "yourselves"
]);

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Academic": [
    "exam", "examination", "marks", "grade", "grading", "syllabus", "lecture",
    "professor", "faculty", "assignment", "course", "curriculum", "homework",
    "test", "teacher", "teaching", "quiz", "class", "semester", "academic",
    "textbook", "notes", "theory", "practical", "lab_evaluation", "doubt"
  ],
  "Support": [
    "counseling", "counselor", "mental", "stress", "advisor", "mentor",
    "financial", "scholarship", "fees", "fee", "health", "medical", "doctor",
    "clinic", "guidance", "anxiety", "depressed", "depression", "hostel",
    "warden", "room", "accommodation", "support", "help", "emergency"
  ],
  "Campus/Infrastructure": [
    "wifi", "internet", "network", "library", "canteen", "cafeteria", "food",
    "mess", "washroom", "restroom", "toilet", "water", "drinking", "bus",
    "transport", "parking", "projector", "lab", "computer", "pc", "ac",
    "air_conditioner", "fan", "electricity", "power", "building", "hall",
    "classroom", "bench", "chair", "maintenance", "broken", "dirty", "sound"
  ]
};

const SENTIMENT_LEXICON: Record<string, number> = {
  "terrible": -3.2, "horrible": -3.4, "worst": -3.5, "awful": -3.0,
  "failing": -2.8, "fail": -2.8, "failed": -2.8, "unacceptable": -2.7,
  "unfair": -2.6, "broken": -2.5, "useless": -2.5, "disaster": -3.0,
  "harsh": -2.2, "rude": -2.4, "unhelpful": -2.2, "frustrated": -2.3,
  "poor": -2.1, "bad": -2.0, "pathetic": -3.0, "disappointed": -2.2,
  "slow": -1.5, "dirty": -2.0, "noisy": -1.6, "complaint": -1.8,
  "stressful": -2.2, "confusing": -1.8, "difficult": -1.6, "lack": -1.5,
  "struggling": -2.0, "stuck": -1.5, "buggy": -1.8, "malfunctioning": -2.0,
  "boring": -1.2, "delayed": -1.3, "late": -1.1, "mediocre": -1.0,
  "issue": -1.1, "problem": -1.4, "doubt": -0.6, "crowded": -1.2,
  "strict": -0.9, "strictness": -1.0, "tough": -0.8, "mess": -1.4,

  "excellent": 3.2, "outstanding": 3.4, "best": 3.5, "superb": 3.2,
  "amazing": 3.0, "great": 2.6, "fantastic": 3.1, "wonderful": 3.0,
  "helpful": 2.4, "supportive": 2.5, "friendly": 2.2, "clean": 2.0,
  "fast": 2.0, "smooth": 2.1, "clear": 2.0, "inspiring": 2.8,
  "good": 1.8, "decent": 1.2, "fine": 0.8, "nice": 1.5, "satisfied": 1.8,
  "improved": 1.6, "punctual": 1.7, "organized": 1.8, "interesting": 1.5,
  "useful": 1.7, "reliable": 1.9, "appreciate": 2.0
};

const NEGATION_WORDS = new Set(["not", "never", "no", "hardly", "barely", "scarcely", "cannot", "isn't", "aren't", "wasn't", "weren't", "don't", "doesn't", "didn't", "won't"]);
const INTENSIFIERS: Record<string, number> = { "very": 1.4, "extremely": 1.6, "really": 1.3, "so": 1.2, "highly": 1.4, "totally": 1.3 };

export function analyzeFeedbackClient(text: string) {
  if (!text || !text.trim()) {
    return {
      tokens: [],
      contentTokens: [],
      sentiment: "Neutral",
      polarityScore: 0.0,
      category: "General",
      extractedKeywords: ""
    };
  }

  const cleaned = text.toLowerCase().replace(/[^\w\s\-]/g, " ").replace(/\s+/g, " ").trim();
  const tokens = cleaned.split(" ").filter(w => w.length > 0);
  const contentTokens = tokens.filter(t => !CAMPUS_STOPWORDS.has(t));

  // Polarity
  let totalScore = 0.0;
  let negationActive = false;
  let negationCountdown = 0;
  let currentMultiplier = 1.0;

  for (let i = 0; i < tokens.length; i++) {
    const word = tokens[i];
    if (NEGATION_WORDS.has(word)) {
      negationActive = true;
      negationCountdown = 3;
      continue;
    }
    if (INTENSIFIERS[word]) {
      currentMultiplier = INTENSIFIERS[word];
      continue;
    }
    if (SENTIMENT_LEXICON[word] !== undefined) {
      let wordScore = SENTIMENT_LEXICON[word] * currentMultiplier;
      if (negationActive && negationCountdown > 0) {
        wordScore = -wordScore * 0.8;
      }
      totalScore += wordScore;
    }
    if (negationCountdown > 0) {
      negationCountdown--;
      if (negationCountdown === 0) negationActive = false;
    }
    currentMultiplier = 1.0;
  }

  const normScore = Math.max(Math.min(totalScore / 3.5, 1.0), -1.0);
  const roundedPolarity = Math.round(normScore * 1000) / 1000;

  let sentiment = "Neutral";
  if (roundedPolarity >= 0.15) sentiment = "Positive";
  else if (roundedPolarity <= -0.15) sentiment = "Negative";

  // Category
  const catScores: Record<string, number> = { "Academic": 0, "Support": 0, "Campus/Infrastructure": 0 };
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (tokens.includes(kw) || cleaned.includes(kw)) {
        catScores[cat]++;
      }
    }
  }

  let maxCat = "General";
  let maxVal = 0;
  for (const [cat, val] of Object.entries(catScores)) {
    if (val > maxVal) {
      maxVal = val;
      maxCat = cat;
    }
  }

  // Keywords
  const scoredWords: { word: string; score: number }[] = [];
  const seen = new Set<string>();

  for (const token of contentTokens) {
    if (token.length < 3 || seen.has(token)) continue;
    seen.add(token);
    let score = 1.0;
    if (SENTIMENT_LEXICON[token] !== undefined) {
      score += Math.abs(SENTIMENT_LEXICON[token]) * 2.0;
    }
    for (const kws of Object.values(CATEGORY_KEYWORDS)) {
      if (kws.includes(token)) score += 1.5;
    }
    scoredWords.push({ word: token, score });
  }

  scoredWords.sort((a, b) => b.score - a.score);
  const topWords = scoredWords.slice(0, 3).map(w => w.word);

  return {
    tokens,
    contentTokens,
    sentiment,
    polarityScore: roundedPolarity,
    category: maxCat,
    extractedKeywords: topWords.join(", ") || "feedback"
  };
}

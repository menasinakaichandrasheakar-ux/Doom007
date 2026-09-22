"""
nlp_engine.py
Natural Language Processing & Feedback Sentiment Analysis Engine
Unit 6: NLP / AI Integration with Text Processing, Tokenization, and Rule-Based Scoring
"""

import re
from typing import Dict, List, Tuple, Any

# Standard English stopwords for educational & campus NLP
CAMPUS_STOPWORDS = {
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
}

# Domain Category Lexicons for Smart Campus Classification
CATEGORY_KEYWORDS: Dict[str, List[str]] = {
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
}

# Lexicon Polarity Weights (Campus-Specific Sentiment Lexicon)
SENTIMENT_LEXICON: Dict[str, float] = {
    # High Negatives (-2.0 to -3.5)
    "terrible": -3.2, "horrible": -3.4, "worst": -3.5, "awful": -3.0,
    "failing": -2.8, "fail": -2.8, "failed": -2.8, "unacceptable": -2.7,
    "unfair": -2.6, "broken": -2.5, "useless": -2.5, "disaster": -3.0,
    "harsh": -2.2, "rude": -2.4, "unhelpful": -2.2, "frustrated": -2.3,
    "poor": -2.1, "bad": -2.0, "pathetic": -3.0, "disappointed": -2.2,
    "slow": -1.5, "dirty": -2.0, "noisy": -1.6, "complaint": -1.8,
    "stressful": -2.2, "confusing": -1.8, "difficult": -1.6, "lack": -1.5,
    "struggling": -2.0, "stuck": -1.5, "buggy": -1.8, "malfunctioning": -2.0,
    
    # Mild Negatives (-0.5 to -1.4)
    "boring": -1.2, "delayed": -1.3, "late": -1.1, "mediocre": -1.0,
    "issue": -1.1, "problem": -1.4, "doubt": -0.6, "crowded": -1.2,
    "strict": -0.9, "strictness": -1.0, "tough": -0.8, "mess": -1.4,

    # High Positives (+2.0 to +3.5)
    "excellent": 3.2, "outstanding": 3.4, "best": 3.5, "superb": 3.2,
    "amazing": 3.0, "great": 2.6, "fantastic": 3.1, "wonderful": 3.0,
    "helpful": 2.4, "supportive": 2.5, "friendly": 2.2, "clean": 2.0,
    "fast": 2.0, "smooth": 2.1, "clear": 2.0, "inspiring": 2.8,

    # Mild Positives (+0.5 to +1.9)
    "good": 1.8, "decent": 1.2, "fine": 0.8, "nice": 1.5, "satisfied": 1.8,
    "improved": 1.6, "helpful": 2.0, "punctual": 1.7, "organized": 1.8,
    "interesting": 1.5, "useful": 1.7, "reliable": 1.9, "appreciate": 2.0
}

NEGATION_WORDS = {"not", "never", "no", "hardly", "barely", "scarcely", "cannot", "isn't", "aren't", "wasn't", "weren't", "don't", "doesn't", "didn't", "won't"}
INTENSIFIERS = {"very": 1.4, "extremely": 1.6, "really": 1.3, "so": 1.2, "highly": 1.4, "totally": 1.3}


class FeedbackProcessor:
    """
    NLP Feedback and Grievance Processing Engine.
    Executes preprocessing, tokenization, sentiment classification,
    category detection, and noun/verb concern keyword extraction.
    """

    def __init__(self):
        # Optional NLTK integration if available
        self.vader_analyzer = None
        try:
            import nltk
            from nltk.sentiment.vader import SentimentIntensityAnalyzer
            self.vader_analyzer = SentimentIntensityAnalyzer()
        except Exception:
            # Silent fallback to built-in rule-based campus NLP lexicon
            self.vader_analyzer = None

    def preprocess_text(self, text: str) -> str:
        """Lowercases text, removes special punctuation, and cleans extra whitespace."""
        if not text:
            return ""
        # Lowercase
        cleaned = text.lower().strip()
        # Replace non-alphanumeric (keep spaces and hyphens)
        cleaned = re.sub(r"[^\w\s\-]", " ", cleaned)
        # Collapse multiple spaces
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        return cleaned

    def tokenize(self, text: str) -> List[str]:
        """Splits cleaned text into alphanumeric word tokens."""
        cleaned = self.preprocess_text(text)
        return [word for word in cleaned.split() if len(word) > 0]

    def remove_stopwords(self, tokens: List[str]) -> List[str]:
        """Filters out standard English stop words."""
        return [token for token in tokens if token not in CAMPUS_STOPWORDS]

    def calculate_polarity_score(self, text: str) -> float:
        """
        Computes polarity score between -1.0 (extremely negative) and +1.0 (extremely positive).
        Uses VADER if initialized, combined with domain-specific campus lexicon weighting.
        """
        if not text.strip():
            return 0.0

        # Primary rule-based analyzer with negation and intensifier windows
        tokens = self.tokenize(text)
        if not tokens:
            return 0.0

        total_score = 0.0
        negation_active = False
        negation_countdown = 0
        current_multiplier = 1.0

        for i, word in enumerate(tokens):
            # Check negation
            if word in NEGATION_WORDS:
                negation_active = True
                negation_countdown = 3
                continue

            # Check intensifier
            if word in INTENSIFIERS:
                current_multiplier = INTENSIFIERS[word]
                continue

            # Check sentiment score
            if word in SENTIMENT_LEXICON:
                word_score = SENTIMENT_LEXICON[word] * current_multiplier
                if negation_active and negation_countdown > 0:
                    word_score = -word_score * 0.8
                total_score += word_score

            # Decrement negation countdown
            if negation_countdown > 0:
                negation_countdown -= 1
                if negation_countdown == 0:
                    negation_active = False

            # Reset intensifier
            current_multiplier = 1.0

        # If NLTK VADER is available, blend scores
        if self.vader_analyzer:
            try:
                vader_scores = self.vader_analyzer.polarity_scores(text)
                vader_compound = vader_scores["compound"]
                # 60% domain lexicon, 40% VADER compound
                domain_norm = max(min(total_score / 4.0, 1.0), -1.0)
                blended = (domain_norm * 0.6) + (vader_compound * 0.4)
                return round(blended, 3)
            except Exception:
                pass

        # Normalized bounded compound score
        norm_score = max(min(total_score / 3.5, 1.0), -1.0)
        return round(norm_score, 3)

    def classify_sentiment(self, text: str) -> Tuple[str, float]:
        """
        Classifies sentiment into 'Positive', 'Neutral', or 'Negative'
        based on calibrated polarity thresholds.
        """
        score = self.calculate_polarity_score(text)
        if score >= 0.15:
            sentiment = "Positive"
        elif score <= -0.15:
            sentiment = "Negative"
        else:
            sentiment = "Neutral"
        return sentiment, score

    def classify_category(self, text: str) -> str:
        """
        Matches keywords to classify input into:
        'Academic', 'Support', 'Campus/Infrastructure', or 'General'.
        """
        cleaned_text = self.preprocess_text(text)
        tokens = self.tokenize(cleaned_text)

        category_counts: Dict[str, int] = {
            "Academic": 0,
            "Support": 0,
            "Campus/Infrastructure": 0
        }

        for cat, keywords in CATEGORY_KEYWORDS.items():
            for kw in keywords:
                if kw in tokens or kw in cleaned_text:
                    category_counts[cat] += 1

        # Determine highest category match
        max_cat = max(category_counts, key=category_counts.get)
        if category_counts[max_cat] > 0:
            return max_cat
        return "General"

    def extract_critical_keywords(self, text: str, top_k: int = 3) -> List[str]:
        """
        Extracts the top critical concern nouns/verbs by scoring against
        sentiment and category significance.
        """
        tokens = self.tokenize(text)
        filtered = self.remove_stopwords(tokens)

        if not filtered:
            return ["general_feedback"]

        # Score candidate keywords: negative/critical sentiment words get higher priority
        scored_tokens: List[Tuple[str, float]] = []
        seen = set()

        for token in filtered:
            if len(token) < 3 or token in seen:
                continue
            seen.add(token)

            importance = 1.0
            # Higher weight for sentiment words
            if token in SENTIMENT_LEXICON:
                importance += abs(SENTIMENT_LEXICON[token]) * 2.0
            
            # Higher weight for domain keywords
            for cat, kws in CATEGORY_KEYWORDS.items():
                if token in kws:
                    importance += 1.5

            scored_tokens.append((token, importance))

        # Sort descending by importance
        scored_tokens.sort(key=lambda x: x[1], reverse=True)
        top_words = [t[0] for t in scored_tokens[:top_k]]
        return top_words if top_words else filtered[:top_k]

    def analyze_feedback(self, text: str) -> Dict[str, Any]:
        """
        Comprehensive NLP analysis pipeline returning all processed attributes.
        """
        cleaned = self.preprocess_text(text)
        tokens = self.tokenize(cleaned)
        content_tokens = self.remove_stopwords(tokens)
        sentiment, polarity = self.classify_sentiment(text)
        category = self.classify_category(text)
        keywords = self.extract_critical_keywords(text, top_k=3)

        return {
            "original_text": text,
            "cleaned_text": cleaned,
            "token_count": len(tokens),
            "content_tokens": content_tokens,
            "sentiment": sentiment,
            "polarity_score": polarity,
            "category": category,
            "extracted_keywords": ", ".join(keywords)
        }

// utils/language.js

export function detectLanguage(text) {
  if (!text) return "vi";
  const clean = text.trim();

  // 1. Check Nhật
  if (/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(clean))
    return "ja";

  // 2. Check Việt có dấu
  if (
    /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(
      clean,
    )
  )
    return "vi";

  // 3. Phân biệt Anh vs Việt không dấu
  const lower = clean.toLowerCase();
  const enKeywords = [
    "hello",
    "hi",
    "hey",
    "good",
    "morning",
    "afternoon",
    "evening",
    "bye",
    "goodbye",
    "i",
    "you",
    "we",
    "they",
    "he",
    "she",
    "it",
    "is",
    "am",
    "are",
    "was",
    "were",
    "how",
    "what",
    "where",
    "when",
    "why",
    "who",
    "which",
    "do",
    "does",
    "did",
    "vocabulary",
    "grammar",
    "noun",
    "verb",
    "adjective",
    "adverb",
    "sentence",
    "phrase",
    "example",
    "pronunciation",
    "ipa",
    "meaning",
    "lesson",
    "unit",
    "thank",
    "thanks",
    "sorry",
    "please",
    "yes",
    "no",
    "ok",
    "okay",
    "fine",
    "great",
    "one",
    "two",
    "three",
    "love",
    "like",
    "hate",
    "want",
    "need",
    "can",
    "will",
  ];

  const hasEnglishKeyword = enKeywords.some((keyword) => {
    const regex = new RegExp(`\\b${keyword}\\b`, "i");
    return regex.test(lower);
  });

  if (hasEnglishKeyword) return "en";
  if (/[ːʃʒθðŋæəɪʊʌɔɛ]/.test(clean)) return "en";

  const words = lower.split(/\s+/);
  if (words.length > 3) {
    const enCount = words.filter((w) =>
      enKeywords.includes(w.replace(/[^a-z]/g, "")),
    ).length;
    if (enCount / words.length > 0.5) return "en";
  }

  return "vi";
}

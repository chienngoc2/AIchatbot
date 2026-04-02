// utils/persona.js
import { friendPrompt } from "../prompts/friend.js";
import { japanesePrompt } from "../prompts/japanese.js";
import { englishPrompt } from "../prompts/english.js";
import { kanjiPrompt } from "../prompts/kanji.js";

export function selectPersona(userText) {
  const text = userText.toLowerCase();
  let selectedSystemPrompt = friendPrompt;

  if (
    text.includes("nhật") ||
    text.includes("minna") ||
    /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(text)
  ) {
    console.log("👉 Mode: JAPANESE SENSEI");
    selectedSystemPrompt += "\n" + japanesePrompt;
    if (typeof kanjiPrompt !== "undefined") {
      selectedSystemPrompt += "\n" + kanjiPrompt;
    }
    return selectedSystemPrompt;
  }

  if (
    text.includes("nói tiếng anh") ||
    text.includes("speak english") ||
    text.includes("vocabulary")
  ) {
    console.log("👉 Mode: ENGLISH PROFESSOR");
    return friendPrompt + "\n" + englishPrompt;
  }

  console.log("👉 Mode: FRIEND (Vietnamese)");
  return friendPrompt;
}

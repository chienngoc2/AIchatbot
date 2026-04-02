// utils/audio.js
import "dotenv/config";
import * as googleTTS from "google-tts-api";
import { detectLanguage } from "./language.js";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

export function cleanTextForTTS(text) {
  if (!text || typeof text !== "string") return "";
  let clean = text;

  clean = clean.replace(/[\u201C\u201D\u201E\u2033\u2036]/g, '"');
  clean = clean.replace(/\/\s*[\u3040-\u309f\u30a0-\u30ff]+/g, "");
  clean = clean.replace(/\(.*?\)|（.*?）|\[.*?\]/g, "");
  clean = clean.replace(/\/.*?\//g, "");
  clean = clean.replace(/[\*_`"!.~#@$%^&+=|<>]/g, "");
  clean = clean.replace(/\n+/g, ". ");
  clean = clean.replace(/\s+/g, " ");

  return clean.trim();
}

export async function generateSmartAudio(
  fullText,
  engine,
  userSelectedVoiceId,
) {
  const cleanGlobal = cleanTextForTTS(fullText);
  if (!cleanGlobal || cleanGlobal.length < 1) return [];

  if (engine === "elevenlabs" && ELEVENLABS_API_KEY) {
    // Logic ElevenLabs của bạn ở đây
  }

  console.log("🔹 Google TTS Processing...");
  const regexSplit =
    /([\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]+|"[^"]+")/g;
  const rawParts = cleanGlobal.split(regexSplit);
  const results = [];

  for (let part of rawParts) {
    let segment = part.trim();
    if (!segment) continue;

    const textToDetect = segment.replace(/^"|"$/g, "");
    if (!textToDetect) continue;

    let lang = detectLanguage(textToDetect);
    const safeText = textToDetect.replace(/[:;\-]/g, ", ");

    try {
      const googleResults = await googleTTS.getAllAudioBase64(safeText, {
        lang: lang,
        slow: false,
        host: "https://translate.google.com.vn",
        timeout: 30000,
      });
      googleResults.forEach((item) =>
        results.push(`data:audio/mp3;base64,${item.base64}`),
      );
    } catch (e) {
      console.error(`❌ TTS Error (${lang}):`, e.message);
    }
  }

  return results;
}

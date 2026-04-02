// utils/promptBuilder.js
import { selectPersona } from "./persona.js";
import {
  getRAGInstruction,
  getNormalInstruction,
} from "./prompts/systemPrompts.js";
import { financeExpertPrompt } from "./prompts/financePrompt.js";

export function buildRAGPrompt(userText, relatedMemories) {
  // 1. Khởi tạo Persona gốc
  let finalPrompt = selectPersona(userText);

  // 2. Lấy thời gian thực
  const now = new Date();
  const date = now.toLocaleDateString("vi-VN");
  const day = now.toLocaleDateString("vi-VN", { weekday: "long" });

  // 3. Logic: Kiểm tra chủ đề Tài chính để nạp Prompt chuyên gia (Tiết kiệm Token)
  const financeKeywords = [
    "vàng",
    "chứng khoán",
    "cổ phiếu",
    "bitcoin",
    "crypto",
    "tài chính",
    "đầu tư",
    "usd",
    "sjc",
  ];
  const isFinance = financeKeywords.some((key) =>
    userText.toLowerCase().includes(key),
  );

  if (isFinance) {
    finalPrompt += financeExpertPrompt;
  }

  // 4. Logic: Nạp hướng dẫn RAG hoặc Nhắc nhở thời gian
  if (relatedMemories) {
    finalPrompt += getRAGInstruction(day, date, relatedMemories);
  } else {
    finalPrompt += getNormalInstruction(day, date);
  }

  return finalPrompt;
}

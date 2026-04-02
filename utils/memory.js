// utils/memory.js
import "dotenv/config";
import { Pinecone } from "@pinecone-database/pinecone";

// 1. Khởi tạo kết nối
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const indexName = "nhat-ky-d4c-v2";

// 2. Trỏ đúng vào tên kho v2 và tạo không gian "diary"
const diaryIndex = pc.index(indexName).namespace("diary");

/**
 * Hàm 1: Tìm kiếm ký ức
 */
export async function searchMemory(userText) {
  if (!userText) return "";
  try {
    const results = await diaryIndex.searchRecords({
      query: {
        topK: 10,
        inputs: { text: userText },
      },
      fields: ["chunk_text"],
    });

    if (
      results.result &&
      results.result.hits &&
      results.result.hits.length > 0
    ) {
      return results.result.hits
        .map((hit) => hit.fields.chunk_text)
        .join(" | ");
    }
    return "";
  } catch (error) {
    console.error("❌ Lỗi tìm kiếm Pinecone:", error.message);
    return "";
  }
}

/**
 * Hàm 2: Lưu ký ức mới vào kho
 */
// utils/memory.js

export async function saveMemory(userText) {
  if (!userText) return;
  try {
    await diaryIndex.upsertRecords({
      records: [
        {
          _id: Date.now().toString(),
          chunk_text: userText,
          // 👇 Ném thẳng các thông tin này ra ngoài, không bọc trong block "metadata" nữa
          created_at: new Date().toISOString(),
          type: "user_note"
        },
      ],
    });
    console.log("💾 Đã lưu ký ức kèm nhãn thời gian vào Pinecone!");
  } catch (error) {
    console.error("❌ Lỗi Pinecone:", error.message);
  }
}

/**
 * Hàm 3: Giữ lại để server.js không bị báo lỗi thiếu hàm
 */
export async function getVector(text) {
  return text;
}

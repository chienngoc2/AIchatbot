// utils/tavilySearch.js
import { tavily } from "@tavily/core";
import "dotenv/config";

const tvlyClient = tavily({ apiKey: process.env.TAVILY_API_KEY });

export async function searchWeb(query) {
  try {
    console.log(`🌐 Đang cử Bot đi lướt web tìm: "${query}"...`);

    const response = await tvlyClient.search(query, {
      searchDepth: "advanced", // Ép tìm kiếm sâu để lấy tin mới nhất
      maxResults: 3,
    });

    // QUAN TRỌNG: Đã thêm mục URL: ${r.url} vào để AI copy link chuẩn 100%
    const results = response.results
      .map(
        (r) =>
          `[Nguồn: ${r.title} | URL: ${r.url}]\nNội dung: ${r.content.substring(0, 100)}...`,
      )
      .join("\n\n========================\n\n");

    return results;
  } catch (err) {
    console.error("❌ Lỗi search web:", err.message);
    return "Lỗi: Không thể truy cập internet lúc này.";
  }
}

// utils/tavilySearch.js
import { tavily } from "@tavily/core";
import "dotenv/config";

const tvlyClient = tavily({ apiKey: process.env.TAVILY_API_KEY });
const searchCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

export async function searchWeb(query) {
  try {
    const queryKey = query.toLowerCase().trim();

    if (searchCache.has(queryKey)) {
      const cachedData = searchCache.get(queryKey);
      if (Date.now() - cachedData.timestamp < CACHE_TTL) {
        console.log(`⚡ Lấy kết quả từ Cache cho: "${query}"`);
        return cachedData.results;
      }
    }

    console.log(`🌐 Đang cử Bot đi lướt web tìm: "${query}"...`);
    const isNews = /tin|báo|news|sự kiện|hôm nay|hôm qua/i.test(queryKey);

    const searchOptions = {
      searchDepth: "advanced",
      maxResults: 3,
      includeImages: true, // 🚀 BẬT TÍNH NĂNG LẤY ẢNH TỪ BÀI BÁO
    };

    if (isNews) {
      searchOptions.topic = "news";
      searchOptions.days = 2;
    }

    const response = await tvlyClient.search(query, searchOptions);

    // Xử lý text
    let results = response.results
      .map(
        (r) =>
          `[Nguồn: ${r.title} | URL: ${r.url}]\nNội dung: ${r.content.substring(0, 400)}...`,
      )
      .join("\n\n========================\n\n");

    // 🚀 LẤY LINK ẢNH (Lấy 1 ảnh đầu tiên đẹp nhất nếu có)
    if (response.images && response.images.length > 0) {
      // Gắn link ảnh vào cuối dữ liệu để báo cho AI biết
      results += `\n\n[LINK ẢNH MINH HỌA TỪ WEB: ${response.images[0]}]`;
    }

    searchCache.set(queryKey, { results, timestamp: Date.now() });
    return results;
  } catch (err) {
    console.error("❌ Lỗi search web:", err.message);
    return "Lỗi: Không thể truy cập internet lúc này.";
  }
}

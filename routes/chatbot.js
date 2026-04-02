// routes/chatbot.js
import express from "express";
import Groq from "groq-sdk";
import fs from "fs";
import path from "path";
import "dotenv/config";

// --- Import các công cụ hỗ trợ ---
import { generateSmartAudio } from "../utils/audio.js";
import { searchMemory } from "../utils/memory.js";
import { buildRAGPrompt } from "../utils/promptBuilder.js";
import { searchWeb } from "../utils/tavilySearch.js";

const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const HISTORY_DIR = path.join(process.cwd(), "chat_history");
if (!fs.existsSync(HISTORY_DIR)) fs.mkdirSync(HISTORY_DIR);

// ==========================================
// API CHÍNH: XỬ LÝ TRÒ CHUYỆN (CHAT)
// ==========================================
router.post("/chat", async (req, res) => {
  try {
    const { text, mode, voiceId, historyContext } = req.body;

    if (!text || typeof text !== "string" || text.trim() === "") {
      return res.json({ reply: "...", audio: [] });
    }

    console.log(`\n🗣️ User: ${text}`);

    // --- 1. KÍCH HOẠT TRÍ NHỚ (Truy xuất từ Pinecone) ---
    const relatedMemories = await searchMemory(text);

    // --- 2. CHUẨN BỊ PROMPT BẰNG FILE BUILDER ---
    const dynamicPrompt = buildRAGPrompt(text, relatedMemories);

    if (relatedMemories) {
      console.log(`🧠 Đã nạp ký ức và căn chỉnh thời gian cho AI.`);
    }

    // --- 3. ĐÓNG GÓI TIN NHẮN ---
    const messages = [{ role: "system", content: dynamicPrompt }];

    if (historyContext && Array.isArray(historyContext)) {
      messages.push(
        ...historyContext.slice(-4).map((m) => ({
          role: m.role === "bot" ? "assistant" : "user",
          content: m.text,
        })),
      );
    }

    messages.push({ role: "user", content: text });


    // --- 4. GỌI AI SUY NGHĨ (AI AGENT VỚI FUNCTION CALLING) ---
    const tools = [
      {
        type: "function",
        function: {
          name: "tavily_search",
          description:
            "CRITICAL: You MUST use this tool to fetch ANY public news, daily news, world events, and real-time prices (Crypto, stocks, gold). This applies to 'today' AND 'yesterday' news. DO NOT look at personal memory for public news. USE THIS TOOL IMMEDIATELY.",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description:
                  "Từ khóa tìm kiếm. MẸO: Tìm giá cả thì dùng Tiếng Anh (live BTC price). Tìm tin tức Việt Nam thì dùng Tiếng Việt (tin tức nổi bật Việt Nam hôm qua).",
              },
            },
            required: ["query"],
          },
        },
      },
    ];

    // Lần 1: Quyết định hành động (Temperature = 0 để tránh lỗi cú pháp)
    const firstResponse = await groq.chat.completions.create({
      messages: messages,
      model: "llama-3.1-8b-instant", // S(Nhỏ gọn, siêu nhanh, tốn 1/10 token)
      temperature: 0,
      max_tokens: 500,
      tools: tools,
      tool_choice: "auto",
    });

    const responseMessage = firstResponse.choices[0].message;
    let aiReply = "";

    // XỬ LÝ NẾU AI MUỐN GỌI TOOL (Lướt web)
    if (responseMessage.tool_calls) {
      const toolCall = responseMessage.tool_calls[0];
      const functionName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);

      if (functionName === "tavily_search") {
        console.log(`🌐 AI đang lướt web tìm: "${args.query}"`);

        // Gọi hàm search thực tế
        const webData = await searchWeb(args.query);

        // Tạo chuỗi data có gắn lệnh Tối cao
        const enforcedWebData =
          webData +
          `\n\n🚨 LỆNH TỐI CAO DÀNH CHO AI: Bạn vừa đọc dữ liệu từ Internet. BẮT BUỘC liệt kê tất cả các link (URL) có trong dữ liệu trên xuống CUỐI CÙNG của câu trả lời. 
Cú pháp BẮT BUỘC (không xuống dòng giữa các thẻ): 
[SOURCES: Tên Nguồn 1 | Link 1] [SOURCES: Tên Nguồn 2 | Link 2]`;

        // Bơm data mạng vào đầu AI
        messages.push(responseMessage);
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: enforcedWebData, // ✅ ĐÃ SỬA THÀNH enforcedWebData (Trọng tâm nằm ở đây!)
        });

        console.log(`🧠 Đang tổng hợp dữ liệu từ internet...`);
        messages.push({
          role: "system",
          content:
            "LỆNH TỐI CAO: Trong dữ liệu Web vừa nhận được, có chứa các mục 'URL: [đường_link]'. Bạn PHẢI copy chính xác 100% đường_link đó. TUYỆT ĐỐI KHÔNG TỰ BỊA LINK HAY VIẾT LINK TRANG CHỦ. Cú pháp: [SOURCES: Tên Báo | URL]",
        });

        // Lần 2: Bắt AI đọc dữ liệu Web và trả lời
        const secondResponse = await groq.chat.completions.create({
          messages: messages,
          model: "llama-3.3-70b-versatile",
          temperature: 0.1, // Hạ cực thấp để AI copy chữ chuẩn xác, không chế cháo
          max_tokens: 600,
        });

        aiReply = secondResponse.choices[0]?.message?.content || "...";
      }
    }
    // NẾU AI TỰ TRẢ LỜI (Dùng RAG hoặc chat thường)
    else {
      aiReply = responseMessage.content;
    }

    console.log(`🤖 AI: ${aiReply}`);

    // --- 5. TẠO GIỌNG NÓI ---
    const finalAudio = await generateSmartAudio(aiReply, mode, voiceId);

    res.json({ reply: aiReply, audio: finalAudio });
  } catch (err) {
    console.error("❌ SERVER ERROR:", err.message);
    res
      .status(500)
      .json({ reply: "Hệ thống đang bận, thử lại sau nhé!", audio: [] });
  }
});

// ==========================================
// API PHỤ: QUẢN LÝ LỊCH SỬ CHAT
// ==========================================
router.post("/save-history", (req, res) => {
  const { history } = req.body;
  const date = new Date();
  const fileName = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}.json`;
  const filePath = path.join(HISTORY_DIR, fileName);

  fs.writeFile(filePath, JSON.stringify(history, null, 2), (err) => {
    if (err) return res.status(500).json({ success: false });
    res.json({ success: true, fileName });
  });
});

router.get("/get-history", (req, res) => {
  const { date } = req.query;
  const filePath = path.join(HISTORY_DIR, `${date}.json`);

  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, "utf8");
    res.json({ success: true, data: JSON.parse(data) });
  } else {
    res.json({ success: false });
  }
});

export default router;

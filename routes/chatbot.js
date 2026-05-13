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
import { upload } from "../utils/upload.js";
import { getTokens, getAuthUrl, createEvent } from "../utils/googleCalendar.js";

const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const HISTORY_DIR = path.join(process.cwd(), "chat_history");
if (!fs.existsSync(HISTORY_DIR)) fs.mkdirSync(HISTORY_DIR);

// --- Route xác thực Google ---
router.get("/auth-google", (req, res) => {
  const url = getAuthUrl();
  res.send(
    `<div style="text-align:center; margin-top:50px;"><a href="${url}" style="font-size:24px; font-family:sans-serif; text-decoration:none; color:white; background:#4285f4; padding:15px 25px; border-radius:10px;">👉 Bấm vào đây để cấp quyền Google Calendar</a></div>`,
  );
});

router.get("/oauth2callback", async (req, res) => {
  const { code } = req.query;
  try {
    const tokens = await getTokens(code);
    fs.writeFileSync("google_tokens.json", JSON.stringify(tokens));
    res.send(
      "<h1>✅ Xác thực thành công! Giờ sếp có thể đặt lịch qua AI rồi.</h1>",
    );
  } catch (err) {
    res.status(500).send("Lỗi xác thực: " + err.message);
  }
});

// --- Xử lý Whisper (Giọng nói sang chữ) ---
router.post("/transcribe", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Không có file" });
    const tempFilePath = req.file.path + ".webm";
    fs.renameSync(req.file.path, tempFilePath);
    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: "whisper-large-v3",
      language: "vi",
    });
    fs.unlinkSync(tempFilePath);
    res.json({ success: true, text: transcription.text });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// API CHÍNH: XỬ LÝ TRÒ CHUYỆN (CHAT)
// ==========================================
router.post("/chat", async (req, res) => {
  try {
    const { text, mode, voiceId, historyContext } = req.body;
    if (!text?.trim()) return res.json({ reply: "...", audio: [] });

    console.log(`\n🗣️ User: ${text}`);

    const relatedMemories = await searchMemory(text);
    const dynamicPrompt = buildRAGPrompt(text, relatedMemories);

    const messages = [
      { role: "system", content: dynamicPrompt },
      ...(historyContext?.slice(-4).map((m) => ({
        role: m.role === "bot" ? "assistant" : "user",
        content: m.text,
      })) || []),
      { role: "user", content: text },
    ];

    const tools = [
      {
        type: "function",
        function: {
          name: "tavily_search",
          description:
            "Tìm tin tức, sự kiện thực tế. KHÔNG dùng khi người dùng yêu cầu đặt lịch.",
          parameters: {
            type: "object",
            properties: { query: { type: "string" } },
            required: ["query"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "create_calendar_event",
          
          description: "Tạo sự kiện Google Calendar. LƯU Ý CỰC KỲ QUAN TRỌNG: Hãy luôn hiểu thời gian theo múi giờ Việt Nam (GMT+7). Nếu người dùng nói 7 giờ chiều/tối, hãy chuyển chính xác thành 19:00:00. Định dạng ISO phải là YYYY-MM-DDTHH:mm:ss+07:00",
          parameters: {
            type: "object",
            properties: {
              summary: { type: "string", description: "Tiêu đề ngắn gọn" },
              start_time: {
                type: "string",
                description: "Thời gian bắt đầu ISO format",
              },
              description: { type: "string", description: "Chi tiết sự kiện" },
            },
            required: ["summary", "start_time"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "manage_task",
          description: "Ghi chú nhanh hoặc đặt báo thức cục bộ.",
          parameters: {
            type: "object",
            properties: {
              action: { type: "string", enum: ["reminder", "todo"] },
              content: { type: "string" },
              time: { type: "string" },
            },
            required: ["action", "content"],
          },
        },
      },
    ];

    // --- LẦN 1: AI QUYẾT ĐỊNH CÓ DÙNG TOOL HAY KHÔNG ---
    const firstResponse = await groq.chat.completions.create({
      messages,
      model: "llama-3.3-70b-versatile",
      temperature: 0,
      tools,
      tool_choice: "auto",
    });

    const responseMessage = firstResponse.choices[0].message;

    // --- NẾU AI MUỐN GỌI CÔNG CỤ ---
    if (responseMessage.tool_calls) {
      console.log("🛠️ AI đang thực thi công cụ...");
      messages.push(responseMessage);

      for (const toolCall of responseMessage.tool_calls) {
        const name = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);
        let toolContent = "";

        if (name === "tavily_search") {
          toolContent = await searchWeb(args.query);
        } else if (name === "create_calendar_event") {
          try {
            if (!fs.existsSync("google_tokens.json")) {
              toolContent =
                "⚠️ Lỗi: Sếp chưa xác thực Google. Hãy vào http://localhost:3000/auth-google";
            } else {
              const tokens = JSON.parse(fs.readFileSync("google_tokens.json"));
              const link = await createEvent(tokens, args);
              // Ép AI ở lần 2 phải chèn link này vào cuối câu
              toolContent = `THÀNH CÔNG. Link lịch: ${link}. YÊU CẦU: Hiển thị định dạng [SOURCES: Xem lịch trên Google | ${link}] ở cuối câu trả lời.`;
            }
          } catch (e) {
            toolContent = "❌ Lỗi hệ thống Google Calendar.";
          }
        } else if (name === "manage_task") {
          if (args.action === "reminder") {
            toolContent = `[SET_ALARM: ${args.time} | ${args.content}] Đã đặt báo thức cục bộ.`;
          } else {
            toolContent = `✅ Đã ghi chú: ${args.content}`;
          }
          fs.appendFileSync(
            "tasks.json",
            JSON.stringify({ ...args, date: new Date() }) + "\n",
          );
        }

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          name,
          content: toolContent,
        });
      }

      // --- LẦN 2: AI TỔNG HỢP CÂU TRẢ LỜI CUỐI CÙNG ---
      const finalResponse = await groq.chat.completions.create({
        messages,
        model: "llama-3.3-70b-versatile",
        temperature: 0.5,
      });

      const aiReply =
        finalResponse.choices[0].message.content ||
        "Đã xong việc sếp giao rồi ạ!";
      const finalAudio = await generateSmartAudio(aiReply, mode, voiceId);
      console.log("🤖 AI Reply (Tool):", aiReply);
      return res.json({ reply: aiReply, audio: finalAudio });
    }

    // --- TRẢ LỜI BÌNH THƯỜNG ---
    const aiReply = responseMessage.content || "...";
    const finalAudio = await generateSmartAudio(aiReply, mode, voiceId);
    console.log("🤖 AI Reply (Normal):", aiReply);
    res.json({ reply: aiReply, audio: finalAudio });
  } catch (err) {
    console.error("❌ Lỗi Server:", err.message);
    res.status(500).json({ reply: "Lỗi hệ thống rồi sếp ơi!", audio: [] });
  }
});

// --- Quản lý lịch sử chat ---
router.post("/save-history", (req, res) => {
  const { history } = req.body;
  const date = new Date();
  const fileName = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}.json`;
  const filePath = path.join(HISTORY_DIR, fileName);
  fs.writeFileSync(filePath, JSON.stringify(history, null, 2));
  res.json({ success: true });
});

router.get("/get-history", (req, res) => {
  const { date } = req.query;
  const filePath = path.join(HISTORY_DIR, `${date}.json`);
  if (fs.existsSync(filePath)) {
    res.json({
      success: true,
      data: JSON.parse(fs.readFileSync(filePath, "utf8")),
    });
  } else {
    res.json({ success: false });
  }
});

export default router;

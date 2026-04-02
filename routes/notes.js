// routes/notes.js
import express from "express";
import fs from "fs";
import path from "path";
import { saveMemory } from "../utils/memory.js";

const router = express.Router();

const NOTES_DIR = path.join(process.cwd(), "notes_history");
if (!fs.existsSync(NOTES_DIR)) fs.mkdirSync(NOTES_DIR);

// API: LƯU GHI CHÚ
router.post("/add-note", async (req, res) => {
  try {
    // Nhận thêm filename từ Frontend
    const { text, filename } = req.body;

    if (!text || text.trim() === "") {
      return res
        .status(400)
        .json({ success: false, message: "Ghi chú trống!" });
    }

    // --- XỬ LÝ TÊN FILE ---
    let safeFilename = "my_notes"; // Tên mặc định nếu user không nhập gì
    if (filename && filename.trim() !== "") {
      // Làm sạch tên file: Thay thế dấu cách và các ký tự đặc biệt bằng gạch ngang (-) để không bị lỗi Hệ điều hành
      safeFilename = filename
        .trim()
        .replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF]/g, "-")
        .toLowerCase();
    }

    // Đường dẫn file cuối cùng (VD: notes_history/cong-viec.json)
    const NOTES_FILE = path.join(NOTES_DIR, `${safeFilename}.json`);

    // 🕒 TẠO NHÃN THỜI GIAN CHO NÃO AI
    const now = new Date();
    const timeLabel = `[Ngày lưu: ${now.toLocaleDateString('vi-VN')} lúc ${now.getHours()}:${now.getMinutes()}]`;
    const contentWithTime = `${timeLabel}\nNội dung: ${text}`;

    // --- 1. LƯU VÀO PINECONE (Bơm cục content có chứa ngày tháng để AI nhớ) ---
    await saveMemory(contentWithTime);

    // --- 2. LƯU VÀO FILE CỤC BỘ (PHÂN LOẠI THEO TÊN FILE) ---
    const newNote = {
      id: Date.now(),
      date: new Date().toLocaleString("vi-VN"), // Lịch sử file json đã có sẵn ngày giờ
      content: text, // Lưu text gốc vào máy tính cho sạch, dễ đọc
    };

    let allNotes = [];

    // Nếu file chủ đề này đã có, đọc nó lên
    if (fs.existsSync(NOTES_FILE)) {
      try {
        const fileData = fs.readFileSync(NOTES_FILE, "utf-8");
        allNotes = JSON.parse(fileData);
      } catch (e) {
        allNotes = []; // Nếu file bị lỗi format thì tạo mảng mới
      }
    }

    // Nạp ghi chú mới và lưu lại
    allNotes.push(newNote);
    fs.writeFileSync(NOTES_FILE, JSON.stringify(allNotes, null, 2), "utf-8");

    console.log(
      `\n📝 [HỆ THỐNG]: Đã lưu vào Pinecone (kèm tgian) & file [${safeFilename}.json]`,
    );

    res.json({
      success: true,
      message: `Đã lưu vào bộ nhớ & file ${safeFilename}.json! 💾`,
    });
  } catch (err) {
    console.error("❌ Lỗi hệ thống Note:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Lỗi khi lưu trữ ghi chú." });
  }
});

export default router;

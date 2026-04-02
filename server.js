// server.js
import express from "express";
import cors from "cors";
import "dotenv/config";

// 👇 IMPORT CÁC ROUTER ĐÃ TÁCH
import noteRoutes from "./routes/notes.js";
import chatbotRoutes from "./routes/chatbot.js";

const app = express();

// Cấu hình Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public")); // Phục vụ HTML/CSS/JS

// 👇 KẾT NỐI ROUTER (Móc các API vào server chính)
app.use("/", noteRoutes); // Sẽ quản lý /add-note
app.use("/", chatbotRoutes); // Sẽ quản lý /chat, /save-history, /get-history

// Khởi động Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n=================================================`);
  console.log(`🚀 SERVER ĐÃ KHỞI ĐỘNG THÀNH CÔNG!`);
  console.log(`=================================================`);
  console.log(`🤖 Mở Chatbot tại đây : http://localhost:${PORT}`);
  console.log(`📝 Mở Ghi chú tại đây : http://localhost:${PORT}/note.html`);
  console.log(`=================================================`);
  console.log(`✅ Hệ thống RAG Pinecone Integrated đã sẵn sàng!\n`);
});

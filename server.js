// server.js
import express from "express";
import cors from "cors";
import "dotenv/config";
import vocabRoute from "./routes/vocab.js";
import noteRoutes from "./routes/notes.js";
import chatbotRoutes from "./routes/chatbot.js";
import mongoose from "mongoose";

const app = express();

// --- Cấu hình Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// --- Kết nối Router ---
app.use("/", noteRoutes);
app.use("/", chatbotRoutes);
app.use("/api/vocab", vocabRoute);

// --- KẾT NỐI MONGODB (SỬ DỤNG BIẾN MÔI TRƯỜNG) ---
// Sếp dùng process.env.MONGODB_URI để lấy link từ file .env hoặc cấu hình trên Render
const mongoURI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/d4c_vocab";

mongoose
  .connect(mongoURI)
  .then(() => console.log("✅ Đã kết nối MongoDB thành công!"))
  .catch((err) => {
    console.error("❌ Lỗi kết nối MongoDB:");
    console.error(err.message);
    process.exit(1); // Dừng server nếu không kết nối được DB
  });

// --- Khởi động Server ---
// Render sẽ tự động cấp PORT, nếu không có thì mặc định chạy 3000
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`\n=================================================`);
  console.log(`🚀 SERVER ĐÃ KHỞI ĐỘNG THÀNH CÔNG!`);
  console.log(`=================================================`);
  console.log(
    `🌍 Chế độ: ${process.env.MONGODB_URI ? "PRODUCTION (Cloud)" : "DEVELOPMENT (Local)"}`,
  );
  console.log(`🔗 URL: http://localhost:${PORT}`);
  console.log(`=================================================\n`);
});

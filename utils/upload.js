// utils/upload.js
import multer from "multer";
import fs from "fs";
import path from "path";

// 1. Lấy đường dẫn tuyệt đối đến thư mục uploads
const UPLOAD_DIR = path.join(process.cwd(), "uploads");

// 2. Tự động tạo thư mục nếu chưa tồn tại (tránh lỗi crash server)
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR);
}

// 3. Khởi tạo cấu hình multer lưu file tạm vào thư mục uploads
export const upload = multer({ dest: "uploads/" });

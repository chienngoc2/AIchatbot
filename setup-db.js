// setup-db.js
import "dotenv/config";
import { Pinecone } from "@pinecone-database/pinecone";

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

async function init() {
  console.log("🚀 Đang xây kho 'Integrated AI' mới (Tên: nhat-ky-d4c-v2)...");
  try {
    await pc.createIndexForModel({
      name: "nhat-ky-d4c-v2", // ĐỔI TÊN Ở ĐÂY
      cloud: "aws",
      region: "us-east-1",
      embed: {
        model: "multilingual-e5-large",
        fieldMap: { text: "chunk_text" },
      },
      waitUntilReady: true,
    });
    console.log("✅ Xong! Kho mới v2 đã được tạo thành công!");
  } catch (error) {
    console.error("❌ Lỗi tạo Kho:", error.message);
  }
}

init();

import express from "express";
import VocabList from "../models/VocabList.js";

const router = express.Router();

// 1. Lấy tất cả tên bài học đã lưu (để hiển thị ra kệ sách)
router.get("/lists", async (req, res) => {
  try {
    // Chỉ lấy trường title, createdAt và độ dài mảng words, sắp xếp mới nhất lên đầu
    const lists = await VocabList.find()
      .select("title createdAt words")
      .sort({ createdAt: -1 });
    res.json({ success: true, data: lists });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Lấy 1 bài học cụ thể theo ID để luyện tập
router.get("/list/:id", async (req, res) => {
  try {
    const list = await VocabList.findById(req.params.id);
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Lưu list mới kèm Tên Chủ Đề
router.post("/save", async (req, res) => {
  try {
    const { title, list } = req.body; // Backend bóc tách trường 'title' từ body gửi lên
    const newList = new VocabList({
      title: title, // Gán title vào đây
      words: list,
    });
    await newList.save();
    res.json({ success: true, data: newList });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/save-review", async (req, res) => {
  try {
    const { title, list } = req.body;
    // Tìm xem đã có list "Cần ôn tập" của bài này chưa, nếu có thì cập nhật, chưa thì tạo mới
    let existing = await VocabList.findOne({ title: title });
    if (existing) {
      // Logic gộp từ mới vào (tránh trùng)
      const oldWords = existing.words.map((w) => w.term);
      const newUniqueWords = list.filter((w) => !oldWords.includes(w.term));
      existing.words.push(...newUniqueWords);
      await existing.save();
    } else {
      const newList = new VocabList({ title, words: list });
      await newList.save();
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});
// [BACKEND] - Thêm API này để Cập nhật bài học đã có
router.put("/update/:id", async (req, res) => {
  try {
    const { title, list } = req.body;
    const updatedList = await VocabList.findByIdAndUpdate(
      req.params.id,
      { title: title, words: list },
      { new: true } // Trả về data mới sau khi update
    );
    res.json({ success: true, data: updatedList });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

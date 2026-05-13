import mongoose from "mongoose";

const VocabSchema = new mongoose.Schema({
  term: { type: String, required: true },
  def: { type: String, required: true },
});

const VocabListSchema = new mongoose.Schema({
  title: { type: String, default: "Bài học mới" },
  words: [VocabSchema],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("VocabList", VocabListSchema);

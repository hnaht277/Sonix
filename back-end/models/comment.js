const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
  // Nội dung
  text: { type: String, required: true, maxlength: 500 },

  // Liên kết
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // ai comment
  track: { type: mongoose.Schema.Types.ObjectId, ref: "Track" },    // comment vào track
  playlist: { type: mongoose.Schema.Types.ObjectId, ref: "Playlist" }, // hoặc vào playlist

  // Social
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  likedCount: { type: Number, default: 0 },
}, { timestamps: true });

// Index cho tìm kiếm nhanh
commentSchema.index({ text: "text" });
commentSchema.index({ track: 1 });
commentSchema.index({ playlist: 1 });

const Comment = mongoose.model("Comment", commentSchema);
module.exports = Comment;

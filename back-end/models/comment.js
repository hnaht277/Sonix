const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
  
  text: { type: String, required: true, maxlength: 500 },
  
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, 
  track: { type: mongoose.Schema.Types.ObjectId, ref: "Track" },   
  isOwner: { type: Boolean, default: false }, // có phải comment của chủ track không

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

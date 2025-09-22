const mongoose = require("mongoose");

const trackSchema = new mongoose.Schema({
  // Thông tin cơ bản
  title: { type: String, required: true, index: true }, // tên bài hát
  description: { type: String, maxlength: 500 },
  audioUrl: { type: String, required: true }, // link file nhạc (cloud/storage)
  coverArtUrl: { type: String }, // ảnh cover

  // Thông tin âm nhạc
  genre: { type: String, index: true }, // Pop, Rock, Rap...
  tags: [{ type: String, index: true }], // cho search
  duration: { type: Number }, // thời lượng tính bằng giây
  releaseDate: { type: Date },

  // Liên kết
  artist: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // ai upload
  featuredArtists: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // ft. ai đó

  // Social
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // danh sách user like
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }], // tham chiếu model Comment
  playCount: { type: Number, default: 0, index: true }, // số lượt nghe
  likedCount: { type: Number, default: 0 }, // tổng số like (dùng để sort nhanh hơn)
  
  // System
  isPublic: { type: Boolean, default: true }, // private/public
}, { timestamps: true });

// Indexes để search và sort nhanh
trackSchema.index({ title: "text", genre: "text", tags: "text" });
trackSchema.index({ playCount: -1 }); // để lấy top trending

const Track = mongoose.model("Track", trackSchema);
module.exports = Track;

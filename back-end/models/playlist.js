const mongoose = require("mongoose");

const playlistSchema = new mongoose.Schema({
  // Thông tin cơ bản
  title: { type: String, required: true, index: true }, // tên playlist
  description: { type: String, maxlength: 500 },
  coverArtUrl: { type: String }, // ảnh bìa playlist

  // Liên kết
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // ai tạo playlist
  tracks: [{
    track: { type: mongoose.Schema.Types.ObjectId, ref: "Track" },
    addedAt: { type: Date, default: Date.now } // khi nào được thêm vào
  }],

  // Social
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  likedCount: { type: Number, default: 0 },

  // System
  isPublic: { type: Boolean, default: true }, // private / public
}, { timestamps: true });

// Indexes
playlistSchema.index({ title: "text", description: "text" }); // hỗ trợ search
playlistSchema.index({ likedCount: -1 }); // sort nhanh playlist trending

const Playlist = mongoose.model("Playlist", playlistSchema);
module.exports = Playlist;

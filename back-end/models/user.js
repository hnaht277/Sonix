const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  // Auth
  username: { type: String, required: true, unique: true, index: true }, // index để query nhanh
  email: { type: String, required: true, unique: true, index: true },
  hashedPassword: { type: String, required: true },

  // Profile
  displayName: { type: String }, // tên hiển thị
  avatarUrl: { type: String },
  bio: { type: String, maxlength: 300 }, // giới thiệu ngắn
  location: { type: String },

  // Social
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }],

  // Music activity
  uploadedTracks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Track" }], // bài nhạc tự upload
  playlists: [{ type: mongoose.Schema.Types.ObjectId, ref: "Playlist" }],
  recentlyPlayed: [{ type: mongoose.Schema.Types.ObjectId, ref: "Track" }],
  currentListening: { type: mongoose.Schema.Types.ObjectId, ref: "Track" },

  // Messaging
  lastSeen: { type: Date, default: Date.now }, // lần online cuối
  activeConversations: [{ type: mongoose.Schema.Types.ObjectId, ref: "Conversation" }],

  // System
  isVerified: { type: Boolean, default: false }, // verified user
  role: { type: String, enum: ["user", "artist", "admin"], default: "user" },

}, { timestamps: true });

// Indexes cho tìm kiếm nhanh
userSchema.index({ username: "text", displayName: "text", email: 1 });

const User = mongoose.model("User", userSchema);
module.exports = User;

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  // Auth
  username: { type: String, required: true, unique: true, index: true }, // index để query nhanh
  email: { type: String, required: true, unique: true, index: true },
  hashedPassword: { type: String, required: true },

  // Profile
  displayName: { type: String, required: true }, // tên hiển thị
  gender: { type: String, enum: ["Male", "Female", "Other"] },
  dateOfBirth: { type: Date },
  phone: { type: String, required: true, unique: true },
  avatarUrl: { type: String },
  avatarPublicId: { type: String }, // ID file ảnh trên cloud (để xóa)
  bio: { type: String, maxlength: 300 }, // giới thiệu ngắn
  location: { type: String },

  // Social
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }],

  // Music activity
  currentListening: { type: mongoose.Schema.Types.ObjectId, ref: "Track" },

  // Messaging
  lastSeen: { type: Date, default: Date.now }, // lần online cuối
  activeConversations: [{ type: mongoose.Schema.Types.ObjectId, ref: "Conversation" }],

  // System
  lockInfo: {
    isLocked: { type: Boolean, default: false },
    lockedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    reason: { type: String, default: "" },
    lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  role: { type: String, enum: ["User", "Admin"], default: "User" },
  activationToken: { type: String },
  activationExpires: { type: Date },
  activateStatus: { type: Boolean, default: false },
  passwordResetToken: { type: String },
  passwordResetExpires: { type: Date },

}, { timestamps: true });

// Indexes cho tìm kiếm nhanh
userSchema.index({ username: "text", displayName: "text", email: 1 });

const User = mongoose.model("User", userSchema);
module.exports = User;

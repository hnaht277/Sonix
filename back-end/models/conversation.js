// models/Conversation.js
const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  isGroup: { type: Boolean, default: false },
  groupName: { type: String },

  // để hiển thị preview trong inbox
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },

  // đếm số tin chưa đọc cho từng user
  unreadCount: {
    type: Map,
    of: Number,
    default: {}
  }
}, { timestamps: true });

module.exports = mongoose.model("Conversation", conversationSchema);

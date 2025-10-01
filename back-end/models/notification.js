const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, 
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // ai tạo ra event
  type: {
    type: String,
    enum: ["NEW_MESSAGE", "NEW_FOLLOW", "LIKE_TRACK", "LIKE_PLAYLIST", "COMMENT_TRACK", "SYSTEM"],
    required: true
  },
  content: { type: String }, // nội dung tuỳ biến cho từng loại thông báo
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation" }, // cho NEW_MESSAGE
  message: { type: mongoose.Schema.Types.ObjectId, ref: "Message" }, // cho NEW_MESSAGE
  track: { type: mongoose.Schema.Types.ObjectId, ref: "Track" }, // cho LIKE/COMMENT
  playlist: { type: mongoose.Schema.Types.ObjectId, ref: "Playlist" }, // cho PLAYLIST
  comment: { type: mongoose.Schema.Types.ObjectId, ref: "Comment" }, // cho COMMENT
  isRead: { type: Boolean, default: false }, // user đã xem thông báo chưa
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Notification", notificationSchema);

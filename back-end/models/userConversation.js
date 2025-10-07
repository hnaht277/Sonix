const mongoose = require("mongoose");

const UserConversationSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true },
    deletedAt: { type: Date, default: null } // null nếu chưa xóa, có giá trị nếu đã xóa
}, { timestamps: true });

UserConversationSchema.index({ user: 1, conversation: 1 }, { unique: true });

module.exports = mongoose.model("UserConversation", UserConversationSchema);
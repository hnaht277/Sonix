const mongoose = require("mongoose");

const historySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  track: { type: mongoose.Schema.Types.ObjectId, ref: "Track", required: true },
  playedAt: { type: Date, default: Date.now}
}, { timestamps: true });

historySchema.index({ user: 1, playedAt: -1 });

// Xóa bản ghi cũ hơn 35 ngày
historySchema.index({ playedAt: 1 }, { expireAfterSeconds: 3024000 });


const History = mongoose.model("History", historySchema);

module.exports = History;
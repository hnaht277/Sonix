const mongoose = require("mongoose");

const historySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  track: { type: mongoose.Schema.Types.ObjectId, ref: "Track", required: true },
  playedAt: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

const History = mongoose.model("History", historySchema);

module.exports = History;
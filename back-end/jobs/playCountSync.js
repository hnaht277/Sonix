const cron = require("node-cron");
const Track = require("../models/track.js");
const { redisClient } = require("../config/redis.config.js");

// Chạy job mỗi phút

cron.schedule("*/1 * * * *", async () => {
  try {
    const mainKey = "track:playCount";
    const syncKey = `track:playCount:syncing:${Date.now()}`;

    // Nếu chưa có key nào thì bỏ qua
    const exists = await redisClient.exists(mainKey);
    if (!exists) return;

    // Đổi tên key → atomic, tránh mất play
    await redisClient.rename(mainKey, syncKey);

    // Lấy dữ liệu snapshot
    const allCounts = await redisClient.hGetAll(syncKey);

    for (const [trackId, count] of Object.entries(allCounts)) {
      await Track.findByIdAndUpdate(trackId, {
        $inc: { playCount: parseInt(count, 10) },
      });
    }

    // Xóa snapshot sau khi sync
    await redisClient.del(syncKey);

    console.log("Synced playCount from Redis to MongoDB");
  } catch (err) {
    console.error("Error syncing playCount:", err);
  }
});

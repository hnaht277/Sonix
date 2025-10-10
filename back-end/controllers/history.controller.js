const History = require("../models/history");
const User = require("../models/user.js");

const getFeed = async (req, res) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const user = await User.findById(userId).select("following");
    const followingIds = user.following || [];

    const userIds = [userId, ...followingIds];

    const usersWithCurrent = await User.find({ _id: { $in: userIds } })
      .select("username displayName avatarUrl currentListening")
      .populate("currentListening", "title artist coverUrl duration audioUrl");

    const currentFeed = usersWithCurrent
      .filter(u => u.currentListening) // chỉ lấy user đang nghe
      .map(u => ({
            type: "current",
            user: {
                _id: u._id,
                username: u.username,
                displayName: u.displayName,
                avatar: u.avatarUrl,
            },
            track: u.currentListening,
            playedAt: new Date(), // hiện tại
      }));

    // Lấy lịch sử nghe (loại trừ track đang nghe)
    // const currentTrackIds = usersWithCurrent
    //   .filter(u => u.currentListening)
    //   .map(u => u.currentListening._id);

    const histories = await History.find({
        user: { $in: userIds },
        // track: { $nin: currentTrackIds },
    })
      .sort({ playedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("track", "title artist coverUrl duration audioUrl")
      .populate("user", "username displayName avatarUrl")
      .lean();

    const historyFeed = histories.map(h => ({
      type: "history",
      user: h.user,
      track: h.track,
      playedAt: h.playedAt,
    }));

    const feed = [...currentFeed, ...historyFeed];

    let total = await History.countDocuments({
      user: { $in: userIds },
      // track: { $nin: currentTrackIds },
    });

    // total += currentFeed.length; // thêm số lượng current listening
    total += currentFeed.length;

    res.status(200).json({
      message: "Feed (current + recently played) fetched successfully",
      feed,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.error("Error getting feed:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getFeedByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const user = await User.findById(userId)
      .select("username displayName avatarUrl currentListening")
      .populate("currentListening", "title artist coverUrl duration audioUrl");

    if (!user) return res.status(404).json({ message: "User not found" });

    const currentFeed = user.currentListening
      ? [{
          type: "current",
          user: {
            _id: user._id,
            username: user.username,
            displayName: user.displayName,
            avatar: user.avatarUrl,
          },
          track: user.currentListening,
          playedAt: new Date(),
        }]
      : [];

    const histories = await History.find({ user: userId })
      .sort({ playedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("track", "title artist coverUrl duration audioUrl")
      .populate("user", "username displayName avatarUrl")
      .lean();

    const historyFeed = histories.map(h => ({
      type: "history",
      user: h.user,
      track: h.track,
      playedAt: h.playedAt,
    }));

    const feed = [...currentFeed, ...historyFeed];

    let total = await History.countDocuments({ user: userId });
    total += currentFeed.length;

    res.status(200).json({
      message: "User feed fetched successfully",
      feed,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.error("Error getting user feed:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


const getTopTracks = async (req, res) => {
  try {
    const userId = req.user._id;
    const limit = parseInt(req.query.limit) || 10;

    const topTracks = await History.aggregate([
      { $match: { user: userId } },
      { $group: { _id: "$track", totalPlayed: { $sum: 1 } } },
      { $sort: { totalPlayed: -1 } },
      { $limit: limit },
      { $lookup: {
          from: "tracks",
          localField: "_id",
          foreignField: "_id",
          as: "track"
      }},
      { $unwind: "$track" },
      { $project: {
          _id: 0,
          title: "$track.title",
          artist: "$track.artist",
          coverUrl: "$track.coverUrl",
          duration: "$track.duration",
          audioUrl: "$track.audioUrl",
          totalPlayed: 1
      }}
    ]);

    res.status(200).json({
      message: "Top tracks fetched successfully",
      topTracks
    });
  } catch (error) {
    console.error("Error getting top tracks:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  getFeed,
  getTopTracks,
  getFeedByUserId,
};
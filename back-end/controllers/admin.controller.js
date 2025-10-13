const User = require("../models/user.js");
const Track = require("../models/track.js");
const Playlist = require("../models/playlist.js");


const lockUser = async (req, res) => {
  try {
    const adminId = req.user._id; 
    const targetUserId = req.params.id;
    const { duration, reason } = req.body; 
    // duration = số phút muốn khóa (VD: 60 -> 1h, 1440 -> 1 ngày)
    // reason = lý do khóa (tùy chọn)

    if (adminId.toString() === targetUserId) {
      return res.status(400).json({ message: "You cannot lock your own account." });
    }

    const admin = await User.findById(adminId);
    if (!admin || admin.role !== "Admin") {
      return res.status(403).json({ message: "Only admins can lock accounts." });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ message: "Target user not found." });
    }

    if (targetUser.role === "Admin") {
      return res.status(403).json({ message: "You cannot lock another admin's account." });
    }

    const now = new Date();
    const expiresAt = duration ? new Date(now.getTime() + duration * 60 * 1000) : null;

    targetUser.lockInfo = {
      isLocked: true,
      lockedAt: now,
      expiresAt,
      reason: reason || "No reason provided",
      lockedBy: adminId,
    };

    await targetUser.save();

    return res.status(200).json({
      message: `User locked successfully${expiresAt ? ` until ${expiresAt.toLocaleString()}` : ""}.`,
      lockInfo: targetUser.lockInfo,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error locking user.", error: error.message });
  }
};


const unlockUser = async (req, res) => {
  try {
    const adminId = req.user._id;
    const targetUserId = req.params.id;

    if (adminId.toString() === targetUserId) {
      return res.status(400).json({ message: "You cannot unlock your own account." });
    }

    const admin = await User.findById(adminId);
    if (!admin || admin.role !== "Admin") {
      return res.status(403).json({ message: "Only admins can unlock accounts." });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ message: "Target user not found." });
    }

    // Nếu đã mở rồi thì không cần nữa
    if (!targetUser.lockInfo.isLocked) {
      return res.status(400).json({ message: "User is not locked." });
    }

    // Reset toàn bộ lockInfo
    targetUser.lockInfo = {
      isLocked: false,
      lockedAt: null,
      expiresAt: null,
      reason: "",
      lockedBy: null,
    };

    await targetUser.save();

    return res.status(200).json({ message: "User unlocked successfully." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error unlocking user.", error: error.message });
  }
};

const getAllUsers = async (req, res) => {
  try {

    const userId = req.users._id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.role !== "Admin") {
        return res.status(403).json({ message: "Only admins can view all users." });
    }

    const users = await User.find().select("-hashedPassword -activationToken -activationExpires -passwordResetToken -passwordResetExpires");

    res.status(200).json({ message: "Users fetched successfully", users });
    } catch (error) {
    res.status(500).json({ message: "Error fetching users.", error });
  }
};

const getAllTracks = async (req, res) => {
    try {

        const userId = req.users._id;
        const user = await User.findById(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found." });
        }
        if (user.role !== "Admin") {
            return res.status(403).json({ message: "Only admins can view all tracks." });
        }

        const tracks = await Track.find();
        res.status(200).json({ message: "Tracks fetched successfully.", tracks });
    } catch (error) {
        res.status(500).json({ message: "Error fetching tracks.", error });
    }
};

const getAllPlaylists = async (req, res) => {
    try {

        const userId = req.users._id;
        const user = await User.findById(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found." });
        }
        if (user.role !== "Admin") {
            return res.status(403).json({ message: "Only admins can view all playlists." });
        }
        const playlists = await Playlist.find();
        res.status(200).json({ message: "Playlists fetched successfully.", playlists });
    } catch (error) {
        res.status(500).json({ message: "Error fetching playlists.", error });
    }
};

module.exports = {
    lockUser,
    getAllUsers,
    unlockUser,
    getAllTracks,
    getAllPlaylists,
};
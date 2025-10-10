const User = require('../models/user.js');
const mongoose = require('mongoose');
const Playlist = require('../models/playlist.js');
const Track = require('../models/track.js');
const cloudinary = require('../config/cloudinary.config');
const multer = require('multer');
const streamifier = require('streamifier');
const History = require('../models/history.js');
const Notification = require('../models/notification.js');
const { getIO } = require('../config/socket.config.js');

const { redisClient } = require('../config/redis.config');

const getUserProfile = async (req, res) => {
    try {

        const cachedUser = await redisClient.get(`user:${req.user._id}`);
        if (cachedUser) {
            return res.status(200).json(JSON.parse(cachedUser));
        }

        const userId = req.user._id;
        const user = await User.findById(userId).select('-hashedPassword -isLocked -role -activationToken -activationExpires -activateStatus -resetPasswordToken -resetPasswordExpires');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        await redisClient.setEx(`user:${userId}`, 3600, JSON.stringify(user)); // Cache for 1 hour
        res.status(200).json(user);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const updateAvatar = async (req, res) => {
  try {
    const userId = req.user._id;


    const upload = multer().single("avatar");

    upload(req, res, async (err) => {
        if (err) return res.status(400).json({ message: "Error uploading avatar" });
        if (!req.file) return res.status(400).json({ message: "No avatar file provided" });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        // --- Xóa avatar cũ trên Cloudinary nếu có --- 
        if (user.avatarPublicId) {
            try {
                await cloudinary.uploader.destroy(user.avatarPublicId, { resource_type: "image", invalidate: true });
            } catch (error) {
                console.error("Error deleting old avatar from Cloudinary:", error);
            }
        }

        // --- Hàm helper upload buffer lên Cloudinary ---
        const uploadBuffer = (buffer, options) =>
            new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
            streamifier.createReadStream(buffer).pipe(stream);
            });

        // --- Upload avatar lên Cloudinary ---
        const avatarResult = await uploadBuffer(req.file.buffer, {
            folder: "users/avatars",
            allowed_formats: ["jpg", "png", "jpeg"],
            secure: true,
        });

        // --- Cập nhật avatarUrl trong DB ---
        await User.findByIdAndUpdate(userId, { avatarUrl: avatarResult.secure_url, avatarPublicId: avatarResult.public_id }, { new: true });
        // Invalidate cache
        await redisClient.del(`user:${userId}`);
        // --- Trả về response ---
        res.status(200).json({
            message: "Avatar updated successfully",
            avatarUrl: avatarResult.secure_url,
        });
    });
  } catch (error) {
    console.error("Error updating avatar:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const updateUserProfile = async (req, res) => {
    try {
        const userId = req.user._id;
        const updateData = req.body;

        const allowedUpdates = ['username', 'displayName', 'gender', 'dateOfBirth', 'phone', 'bio', 'location'];
        for (const fields in updateData) {
            if (!allowedUpdates.includes(fields)) {
                return res.status(400).json({ message: `Invalid field: ${fields}` });
            }
        }

        if (updateData.username) {
            const existingUser = await User.findOne({ username: updateData.username });
            if (existingUser && existingUser._id.toString() !== userId.toString()) {
                return res.status(400).json({ message: 'Username already taken' });
            }
        }

        if (updateData.phone) {
            const existingUser = await User.findOne({ phone: updateData.phone });
            if (existingUser && existingUser._id.toString() !== userId.toString()) {
                return res.status(400).json({ message: 'Phone number already in use' });
            }
        }

        const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true, runValidators: true }).select('-hashedPassword -isLocked -role -activationToken -activationExpires -activateStatus -resetPasswordToken -resetPasswordExpires');
        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        await redisClient.setEx(`user:${userId}`, 3600, JSON.stringify(updatedUser)); // Update cache

        res.status(200).json({ message: 'Profile updated successfully', user: updatedUser });
    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getFollowers = async (req, res) => {
    try {
        const cachedFollowers = await redisClient.get(`user:${req.user._id}:followers`);
        if (cachedFollowers) {
            return res.status(200).json(JSON.parse(cachedFollowers));
        }

        const userId = req.user._id;
        const user = await User.findById(userId).populate('followers');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        await redisClient.setEx(`user:${userId}:followers`, 3600, JSON.stringify(user.followers)); // Cache for 1 hour
        
        res.status(200).json({ followers: user.followers });
    } catch (error) {
        console.error('Error fetching followers:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getFollowing = async (req, res) => {
    try {
        const cachedFollowing = await redisClient.get(`user:${req.user._id}:following`);
        if (cachedFollowing) {
            return res.status(200).json(JSON.parse(cachedFollowing));
        }

        const userId = req.user._id;
        const user = await User.findById(userId).populate('following');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        await redisClient.setEx(`user:${userId}:following`, 3600, JSON.stringify(user.following)); // Cache for 1 hour

        res.status(200).json({ following: user.following });
    } catch (error) {
        console.error('Error fetching following:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const followUser = async (req, res) => {
    try {
        const userId = req.user._id;
        const targetUserId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
            return res.status(400).json({ message: 'Invalid user ID' });
        }

        if (userId.toString() === targetUserId) {
            return res.status(400).json({ message: 'You cannot follow yourself' });
        }

        const user = await User.findById(userId);
        const targetUser = await User.findById(targetUserId);

        if (!targetUser) {
            return res.status(404).json({ message: 'Target user not found' });
        }

        if (user.following.includes(targetUserId)) {
            return res.status(400).json({ message: 'You are already following this user' });
        }
        
        user.following.push(targetUserId);
        targetUser.followers.push(userId);
        await user.save();
        await targetUser.save();

        // send notification to targetUser
        const notification = new Notification({
            recipient: targetUserId,
            sender: userId,
            type: "NEW_FOLLOW",
            content: `${user.username} started following you.`,
        });
        await notification.save();

        const io = getIO();
        io.to(targetUserId.toString()).emit("newNotification", notification);

        await redisClient.setEx(`user:${userId}:following`, 3600, JSON.stringify(user.following)); // update following cache
        await redisClient.setEx(`user:${targetUserId}:followers`, 3600, JSON.stringify(targetUser.followers)); // update followers cache

        res.status(200).json({ message: 'Successfully followed user', following: user.following });
    } catch (error) {
        console.error('Error following user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const unfollowUser = async (req, res) => {
    try {
        const userId = req.user._id;
        const targetUserId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
            return res.status(400).json({ message: 'Invalid user ID' });
        }

        if (userId.toString() === targetUserId) {
            return res.status(400).json({ message: 'You cannot unfollow yourself' });
        }

        const user = await User.findById(userId);
        const targetUser = await User.findById(targetUserId);  

        if (!targetUser) {
            return res.status(404).json({ message: 'Target user not found' });
        }

        if (!user.following.includes(targetUserId)) {
            return res.status(400).json({ message: 'You are not following this user' });
        }

        user.following = user.following.filter(followId => followId.toString() !== targetUserId);
        targetUser.followers = targetUser.followers.filter(followerId => followerId.toString() !== userId.toString());
        await user.save();
        await targetUser.save();
        await redisClient.setEx(`user:${userId}:following`, 3600, JSON.stringify(user.following)); // update following cache
        await redisClient.setEx(`user:${targetUserId}:followers`, 3600, JSON.stringify(targetUser.followers)); // update followers cache

        res.status(200).json({ message: 'Successfully unfollowed user', following: user.following });
    } catch (error) {
        console.error('Error unfollowing user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getLikedTracks = async (req, res) => {
    try {
        const likedTracks = await Track.find({ likes: req.user._id });

        if (likedTracks.length === 0) {
            return res.status(200).json({ message: 'No liked tracks found', likedTracks: [] });
        }

        res.status(200).json(likedTracks);
    } catch (error) {
        console.error('Error getting liked tracks:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getLikedPlaylists = async (req, res) => {
    try {
        const likedPlaylists = await Playlist.find({ likes: req.user._id });

        if (likedPlaylists.length === 0) {
            return res.status(200).json({ message: 'No liked playlists found', likedPlaylists: [] });
        }

        res.status(200).json(likedPlaylists);
    } catch (error) {
        console.error('Error getting liked playlists:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const setCurrentListening = async (req, res) => {
    try {
        const io = getIO(); // lấy instance socket
        const userId = req.user._id;
        const { trackId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(trackId)) {
            return res.status(400).json({ message: "Invalid track ID" });
        }

        const track = await Track.findById(trackId);
        if (!track) {
            return res.status(404).json({ message: "Track not found" });
        }

        const user = await User.findById(userId).select("currentListening followers username displayName avatarUrl");

        // Nếu user đang nghe 1 bài khác → lưu bài cũ vào history
        if (user.currentListening && user.currentListening.toString() !== trackId) {
            await History.create({
                user: userId,
                track: user.currentListening,
                playedAt: new Date(),
            });
        }

        // Cập nhật bài mới
        user.currentListening = trackId;
        await user.save();

        // Emit đến tất cả bạn bè (followers)
        user.followers.forEach(friendId => {
            io.to(friendId.toString()).emit("friendListeningUpdate", {
                type: "start",
                user: {
                    _id: user._id,
                    username: user.username,
                    displayName: user.displayName,
                    avatarUrl: user.avatarUrl,
                },
                track: {
                    _id: track._id,
                    title: track.title,
                    artist: track.artist,
                    coverUrl: track.coverUrl,
                    audioUrl: track.audioUrl,
                },
                playedAt: new Date(),
            });
        });

        res.status(200).json({
            message: "Current listening track updated successfully",
            currentListening: trackId,
        });
    } catch (error) {  
        console.error("Error setting current listening track:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const stopListening = async (req, res) => {
  try {
    const io = getIO();
    const userId = req.user._id;
    const user = await User.findById(userId).select("currentListening followers username displayName avatarUrl");

    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    if(!user.currentListening) {
        return res.status(400).json({ message: "User is not currently listening to any track" });
    }

    if (user.currentListening) {
        await History.create({
            user: userId,
            track: user.currentListening,
            playedAt: new Date(),
        });
    }

    // Emit cho bạn bè rằng user đã dừng nghe
    user.followers.forEach(friendId => {
        io.to(friendId.toString()).emit("friendListeningUpdate", {
            type: "stop",
            user: {
                _id: user._id,
                username: user.username,
                displayName: user.displayName,
                avatarUrl: user.avatarUrl,
            },
        });
    });

    user.currentListening = null;
    await user.save();

    res.status(200).json({ message: "Stopped listening" });
  } catch (error) {
        console.error("Error stopping listening:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};





module.exports = {
    getUserProfile,
    updateAvatar,
    updateUserProfile,
    getFollowers,
    getFollowing,
    followUser,
    unfollowUser,
    getLikedTracks,
    getLikedPlaylists,
    setCurrentListening,
    stopListening,
};


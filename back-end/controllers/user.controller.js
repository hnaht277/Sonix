const User = require('../models/user.js');
const mongoose = require('mongoose');
const Playlist = require('../models/playlist.js');
const Track = require('../models/track.js');
const cloudinary = require('../config/cloudinary.config');
const multer = require('multer');
const streamifier = require('streamifier');
const History = require('../models/history.js');

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

// const getUpploadedTracks = async (req, res) => {
//     try {
//         const cachedTracks = await redisClient.get(`user:${req.user._id}:uploadedTracks`);
//         if (cachedTracks) {
//             return res.status(200).json(JSON.parse(cachedTracks));
//         }

//         const userId = req.user._id;
//         const user = await User.findById(userId).populate('uploadedTracks');
//         if (!user) {
//             return res.status(404).json({ message: 'User not found' });
//         }
//         if (!user.uploadedTracks || user.uploadedTracks.length === 0) {
//             return res.status(200).json({ message: 'No uploaded tracks found', uploadedTracks: [] });
//         }

//         await redisClient.setEx(`user:${userId}:uploadedTracks`, 3600, JSON.stringify(user.uploadedTracks)); // Cache for 1 hour

//         res.status(200).json({ message: 'Uploaded tracks retrieved successfully', uploadedTracks: user.uploadedTracks });
//     } catch (error) {
//         console.error('Error retrieving uploaded tracks:', error);
//         res.status(500).json({ message: 'Internal server error' });
//     }
// };

// const getPlaylists = async (req, res) => {
//     try {
//         const cachedPlaylists = await redisClient.get(`user:${req.user._id}:playlists`);
//         if (cachedPlaylists) {
//             return res.status(200).json(JSON.parse(cachedPlaylists));
//         }

//         const userId = req.user._id;
//         const user = await User.findById(userId)
//         .populate({
//             path: 'playlists',
//             populate: {
//                 path: 'tracks.track',   // đi sâu vào field `track` trong mảng `tracks`
//                 model: 'Track'          // tên model của track
//             }
//         });

//         if (!user) {
//             return res.status(404).json({ message: 'User not found' });
//         }
//         if (!user.playlists || user.playlists.length === 0) {
//             return res.status(200).json({ message: 'No playlists found', playlists: [] });
//         }

//         await redisClient.setEx(`user:${userId}:playlists`, 3600, JSON.stringify(user.playlists)); // Cache for 1 hour

//         res.status(200).json({ message: 'Playlists retrieved successfully', playlists: user.playlists });
//     } catch (error) {
//         console.error('Error retrieving playlists:', error);
//         res.status(500).json({ message: 'Internal server error' });
//     }
// };

// const updatePlaylist = async (req, res) => {
//     try {
//         const userId = req.user._id;
//         const playlistId = req.params.id;
//         const updateData = req.body;

//         const allowedUpdates = ['title', 'description', 'coverArtUrl', 'privacy'];
//         for (const fields in updateData) {
//             if (!allowedUpdates.includes(fields)) {
//                 return res.status(400).json({ message: `Invalid field: ${fields}` });
//             }
//         }

//         if (updateData.privacy && !['Public', 'Private', 'Friends'].includes(updateData.privacy)) {
//             return res.status(400).json({ message: 'Invalid privacy setting' });
//         }


//         const playlist = await Playlist.findOneAndUpdate(
//             { _id: playlistId, owner: userId },
//             updateData,
//             { new: true, runValidators: true }
//         );

//         if (!playlist) {
//             return res.status(404).json({ message: 'Playlist not found or you are not the owner' });
//         }

//         await redisClient.del(`user:${userId}:playlists`); // Invalidate playlists cache

//         res.status(200).json({ message: 'Playlist updated successfully', playlist });
//     } catch (error) {
//         console.error('Error updating playlist:', error);
//         res.status(500).json({ message: 'Internal server error' });
//     }
// };

// const addToPlaylist = async (req, res) => {
//     try {
//         const userId = req.user._id;
//         const playlistId = req.params.id;
//         const { trackId } = req.body;

//         const playlist = await Playlist.findOne({ _id: playlistId, owner: userId });
//         if (!playlist) {
//             return res.status(404).json({ message: 'Playlist not found or you are not the owner' });
//         }

//         const track = await Track.findById(trackId);
//         if (!track) {
//             return res.status(404).json({ message: 'Track not found' });
//         }

//         if (playlist.tracks.some(t => t.track.toString() === trackId)) {
//             return res.status(400).json({ message: 'Track already in playlist' });
//         }

//         playlist.tracks.push({ track: trackId });
//         await playlist.save();

//         await redisClient.del(`user:${userId}:playlists`); // Invalidate playlists cache

//         res.status(200).json({ message: 'Track added to playlist successfully', playlist });
//     } catch (error) {
//         console.error('Error adding track to playlist:', error);
//         res.status(500).json({ message: 'Internal server error' });
//     }
// };

// const removeFromPlaylist = async (req, res) => {
//     try {
//         const userId = req.user._id;
//         const playlistId = req.params.id;
//         const { trackId } = req.body;

//         const playlist = await Playlist.findOne({ _id: playlistId, owner: userId });
//         if (!playlist) {
//             return res.status(404).json({ message: 'Playlist not found or you are not the owner' });
//         }

//         const trackIndex = playlist.tracks.findIndex(t => t.track.toString() === trackId);
//         if (trackIndex === -1) {
//             return res.status(404).json({ message: 'Track not found in playlist' });
//         }

//         playlist.tracks.splice(trackIndex, 1);
//         await playlist.save();

//         await redisClient.del(`user:${userId}:playlists`); // Invalidate playlists cache

//         res.status(200).json({ message: 'Track removed from playlist successfully', playlist });
//     } catch (error) {
//         console.error('Error removing track from playlist:', error);
//         res.status(500).json({ message: 'Internal server error' });
//     }
// };

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
    const userId = req.user._id;
    const { trackId } = req.params;

    // Validate trackId
    if (!mongoose.Types.ObjectId.isValid(trackId)) {
      return res.status(400).json({ message: "Invalid track ID" });
    }

    // Kiểm tra track tồn tại
    const track = await Track.findById(trackId);
    if (!track) {
      return res.status(404).json({ message: "Track not found" });
    }

    // Update currentListening trong User
    await User.findByIdAndUpdate(userId, { currentListening: trackId });

    // Thêm vào lịch sử nghe
    await History.create({
      user: userId,
      track: trackId,
      playedAt: new Date(), 
    });

    // Invalidate cache user
    await redisClient.del(`user:${userId}`);

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
    const userId = req.user._id;

    await User.findByIdAndUpdate(userId, { currentListening: null });
    await redisClient.del(`user:${userId}`);

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
    // getUploadedTracks,
    // getPlaylists,
    // updatePlaylist,
    // addToPlaylist,
    // removeFromPlaylist,
    getLikedTracks,
    getLikedPlaylists,
    setCurrentListening,
    stopListening,
};


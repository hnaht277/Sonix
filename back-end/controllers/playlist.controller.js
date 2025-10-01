const User = require("../models/user.js");
const Playlist = require("../models/playlist.js");
const multer = require("multer");
const cloudinary = require("../config/cloudinary.config.js");
const streamifier = require("streamifier");

const {redisClient} = require("../config/redis.config.js");

const getVisiblePlaylistsForUser = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const allPlaylists = await Playlist.find({ 
      $or: [
        { privacy: "Public" },
        { owner: { $in: user.following }, privacy: "Friends" },
        { privacy: "Friends", owner: userId },
        { owner: userId, privacy: "Private" }
      ]
    }).sort({ createdAt: -1 })
      .populate({
        path: "tracks.track",
        populate: { path: "artist", select: "username avatarUrl" }
      });

    const filtered = allPlaylists.map(pl => {
      let hiddenCount = 0;

      const visibleTracks = pl.tracks.filter(t => {
        const track = t.track;

        if (!track) {
          hiddenCount++;
          return false;
        }

        const canView =
          track.privacy === "Public" ||
          (track.privacy === "Friends" &&
            req.user.following.includes(track.artist._id.toString())) ||
          (track.privacy === "Friends" && track.artist._id.toString() === userId) ||
          (track.privacy === "Private" &&
            track.artist._id.toString() === userId);

        if (!canView) {
          hiddenCount++;
          return false;
        }

        return true;
      });

      return {
        ...pl.toObject(),
        tracks: visibleTracks,
        hiddenTrackCount: hiddenCount
      };
    });

    res.status(200).json({
      message: "Playlists fetched successfully",
      playlists: filtered
    });
  } catch (error) {
    console.error("Error fetching playlists:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const likePlaylist = async (req, res) => {
  try {
    const userId = req.user.id;
    const playlistId = req.params.id;

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      return res.status(404).json({ error: "Playlist not found" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (playlist.likes.includes(userId)) {
      return res.status(400).json({ error: "You have already liked this playlist" });
    }

    playlist.likes.push(userId);
    playlist.likedCount = playlist.likes.length;
    await playlist.save();

    res.status(200).json({ message: "Playlist liked successfully" });
  } catch (error) {
    console.error("Error liking playlist:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const unLikePlaylist = async (req, res) => {
  try {
    const userId = req.user.id;
    const playlistId = req.params.id;

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      return res.status(404).json({ error: "Playlist not found" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!playlist.likes.includes(userId)) {
      return res.status(400).json({ error: "You have not liked this playlist" });
    }

    playlist.likes = playlist.likes.filter(id => id.toString() !== userId);
    playlist.likedCount = playlist.likes.length;
    await playlist.save();

    res.status(200).json({ message: "Playlist unliked successfully" });
  } catch (error) {
    console.error("Error unliking playlist:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// update playlist (title, description, privacy)
const updatePlaylist = async (req, res) => {
    try {
        const userId = req.user.id;
        const playlistId = req.params.id;
        const { title, description, privacy } = req.body;

        const playlist = await Playlist.findById(playlistId);
        if (!playlist) {
            return res.status(404).json({ error: "Playlist not found" });
        }

        if (playlist.owner.toString() !== userId) {
            return res.status(403).json({ error: "You are not authorized to update this playlist" });
        }

        playlist.title = title || playlist.title;
        playlist.description = description || playlist.description;
        playlist.privacy = privacy || playlist.privacy;
        await playlist.save();

        // invalidate cache
        const cacheKey = `userPlaylists:${userId}`;
        await redisClient.del(cacheKey);
        await redisClient.del("trendingPlaylists");
        await redisClient.del("allPlaylists");

        res.status(200).json({ message: "Playlist updated successfully", playlist });
    } catch (error) {
        console.error("Error updating playlist:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

const updatePlaylistCoverArt = async (req, res) => {
  try {
    const userId = req.user.id;
    const playlistId = req.params.id;

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      return res.status(404).json({ error: "Playlist not found" });
    }

    // Check owner
    if (playlist.owner.toString() !== userId) {
      return res.status(403).json({ error: "You are not authorized to update this playlist" });
    }

    const upload = multer().single("coverFile");

    upload(req, res, async (err) => {
      if (err) return res.status(400).json({ error: "Error uploading file" });
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      // --- Xóa cover cũ nếu có ---
      if (playlist.coverArtPublicId) {
        try {
          await cloudinary.uploader.destroy(playlist.coverArtPublicId, { resource_type: "image", invalidate: true });
        } catch (error) {
          console.error("Error deleting old playlist cover art from Cloudinary:", error);
        }
      }

      // --- Helper upload buffer ---
      const uploadBuffer = (buffer, options) =>
        new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
            if (err) reject(err);
            else resolve(result);
          });
          streamifier.createReadStream(buffer).pipe(stream);
        });

      // --- Upload cover mới ---
      const coverArtResult = await uploadBuffer(req.file.buffer, {
        folder: "playlists/covers",
        allowed_formats: ["jpg", "png", "jpeg"],
        resource_type: "image",
        secure: true,
      });

      // --- Cập nhật DB ---
      playlist.coverArtUrl = coverArtResult.secure_url;
      playlist.coverArtPublicId = coverArtResult.public_id;
      await playlist.save();

      // --- Invalidate cache ---
      await redisClient.del("trendingPlaylists");
      await redisClient.del(`userPlaylists:${userId}`);
      await redisClient.del("allPlaylists");

      // --- Trả về response ---
      res.json({
        message: "Playlist cover art updated successfully",
        coverArtUrl: coverArtResult.secure_url,
      });
    });
  } catch (error) {
    console.error("Error updating playlist cover art:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const deletePlaylist = async (req, res) => {
    try {
        const userId = req.user.id;
        const playlistId = req.params.id;

        const playlist = await Playlist.findById(playlistId);
        if (!playlist) {
            return res.status(404).json({ error: "Playlist not found" });
        }

        // Check owner
        if (playlist.owner.toString() !== userId) {
            return res.status(403).json({ error: "You are not authorized to delete this playlist" });
        }

        // Delete cover art from cloud if exists
        if (playlist.coverArtPublicId) {
            try {
                await cloudinary.uploader.destroy(playlist.coverArtPublicId, { resource_type: "image", invalidate: true });
            } catch (error) {
                console.error("Error deleting playlist cover art from Cloudinary:", error);
            }
        }

        await playlist.remove();

        // Invalidate cache
        await redisClient.del(`userPlaylists:${userId}`);
        await redisClient.del("trendingPlaylists");
        await redisClient.del("allPlaylists");

        res.status(200).json({ message: "Playlist deleted successfully" });
    } catch (error) {
        console.error("Error deleting playlist:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

const getPlaylistById = async (req, res) => {
    try {
        const playlistId = req.params.id;
        const playlist = await Playlist.findById(playlistId).populate("tracks.track");
        if (!playlist) {
            return res.status(404).json({ error: "Playlist not found" });
        }
        res.status(200).json({ message: "Playlist fetched successfully", playlist });
    } catch (error) {
        console.error("Error fetching playlist:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

const getPlaylistByUser = async (req, res) => {
    try {
        const userId = req.params.userId;

        const cacheKey = `userPlaylists:${userId}`;
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            return res.status(200).json({ message: "Playlists fetched successfully", playlists: JSON.parse(cachedData) });
        }

        const playlists = await Playlist.find({ owner: userId }).populate("tracks.track");
        if (!playlists) {
            return res.status(404).json({ error: "No playlists found for this user" });
        }

        await redisClient.set(cacheKey, JSON.stringify(playlists), { EX: 300 }); // Cache for 5 minutes

        res.status(200).json({ message: "Playlists fetched successfully", playlists });
    } catch (error) {
        console.error("Error fetching user playlists:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

const getTrendingPlaylists = async (req, res) => {
    try {
        const cacheKey = "trendingPlaylists";
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            return res.status(200).json({ message: "Trending playlists fetched successfully", playlists: JSON.parse(cachedData) });
        }

        const playlists = await Playlist.find({ privacy: "Public" })
            .sort({ likedCount: -1 })
            .limit(20)
            .populate("owner", "username avatarUrl");

        await redisClient.set(cacheKey, JSON.stringify(playlists), { EX: 300 }); // Cache for 5 minutes

        res.status(200).json({ message: "Trending playlists fetched successfully", playlists });
    } catch (error) {
        console.error("Error fetching trending playlists:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// only admin can get all playlists
const getAllPlaylists = async (req, res) => {  
    try {
        const cacheKey = "allPlaylists";
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            return res.status(200).json({ message: "All playlists fetched successfully", playlists: JSON.parse(cachedData) });
        }

        const userId = req.user.id;
        const user = await User.findById(userId);
        if (!user || user.role !== "Admin") {
            return res.status(403).json({ error: "You are not authorized to view all playlists" });
        }

        const playlists = await Playlist.find()
            .sort({ createdAt: -1 })
            .populate("owner", "username avatarUrl");
        await redisClient.set(cacheKey, JSON.stringify(playlists), { EX: 300 }); // Cache for 5 minutes

        res.status(200).json({ message: "All playlists fetched successfully", playlists });
    } catch (error) {
        console.error("Error fetching all playlists:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

const addTrackToPlaylist = async (req, res) => {
    try {
        const userId = req.user.id;
        const playlistId = req.params.id;
        const { trackId } = req.body;

        const playlist = await Playlist.findById(playlistId);
        if (!playlist) {
            return res.status(404).json({ error: "Playlist not found" });
        }

        // Check if user is the owner
        if (playlist.owner.toString() !== userId) {
            return res.status(403).json({ error: "You are not authorized to add tracks to this playlist" });
        }

        // Check if track already exists
        const trackExists = playlist.tracks.some(track => track.track.toString() === trackId);
        if (trackExists) {
            return res.status(400).json({ error: "Track already exists in the playlist" });
        }

        playlist.tracks.push({ track: trackId });
        await playlist.save();

        // Invalidate cache
        await redisClient.del(`userPlaylists:${userId}`);
        await redisClient.del("trendingPlaylists");
        await redisClient.del("allPlaylists");

        res.status(200).json({ message: "Track added to playlist successfully", playlist });
    } catch (error) {
        console.error("Error adding track to playlist:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

const removeTrackFromPlaylist = async (req, res) => {
    try {
        const userId = req.user.id;
        const playlistId = req.params.id;
        const { trackId } = req.params;

        const playlist = await Playlist.findById(playlistId);
        if (!playlist) {
            return res.status(404).json({ error: "Playlist not found" });
        }

        // Check if user is the owner
        if (playlist.owner.toString() !== userId && req.user.role !== "Admin") {
            return res.status(403).json({ error: "You are not authorized to remove tracks from this playlist" });
        }

        // Check if track exists
        const trackExists = playlist.tracks.some(track => track.track.toString() === trackId);
        if (!trackExists) {
            return res.status(400).json({ error: "Track does not exist in the playlist" });
        }

        const updatePlaylist = await Playlist.findOneAndUpdate(
            { _id: playlistId},
            { $pull: { tracks: { track: trackId } } },
            { new: true }
        );

        if (!updatePlaylist) {
            return res.status(404).json({ error: "Playlist not found" });
        }


        // Invalidate cache
        await redisClient.del(`userPlaylists:${userId}`);
        await redisClient.del("trendingPlaylists");
        await redisClient.del("allPlaylists");

        res.status(200).json({ message: "Track removed from playlist successfully", playlist: updatePlaylist });
    } catch (error) {
        console.error("Error removing track from playlist:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

const createPlaylist = async (req, res) => {
    try {
        const userId = req.user.id;
        const { title, description, privacy } = req.body;

        const newPlaylist = new Playlist({
            title,
            description,
            privacy,
            owner: userId,
        });

        await newPlaylist.save();

        // Invalidate cache
        await redisClient.del(`userPlaylists:${userId}`);
        await redisClient.del("trendingPlaylists");
        await redisClient.del("allPlaylists");

        res.status(201).json({ message: "Playlist created successfully", playlist: newPlaylist });
    } catch (error) {
        console.error("Error creating playlist:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

const removePlaylistCoverArt = async (req, res) => {
    try {
        const userId = req.user.id;
        const playlistId = req.params.id;
        const playlist = await Playlist.findById(playlistId);
        if (!playlist) {
            return res.status(404).json({ error: "Playlist not found" });
        }

        // Check owner
        if (playlist.owner.toString() !== userId) {
            return res.status(403).json({ error: "You are not authorized to update this playlist" });
        }

        // Remove cover art
        if (playlist.coverArtPublicId) {
            try {
                await cloudinary.uploader.destroy(playlist.coverArtPublicId, { resource_type: "image", invalidate: true });
            } catch (error) {
                console.error("Error deleting cover art from Cloudinary:", error);
            }
        }

        playlist.coverArtUrl = null;
        playlist.coverArtPublicId = null;
        await playlist.save();

        // Invalidate cache
        await redisClient.del(`userPlaylists:${userId}`);
        await redisClient.del("trendingPlaylists");
        await redisClient.del("allPlaylists");

        res.status(200).json({ message: "Cover art removed successfully", playlist });
    } catch (error) {
        console.error("Error removing playlist cover art:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = {
    getVisiblePlaylistsForUser,
    likePlaylist,
    unLikePlaylist,
    getTrendingPlaylists,
    addTrackToPlaylist,
    updatePlaylist,
    getPlaylistById,
    getPlaylistByUser,
    updatePlaylistCoverArt,
    getAllPlaylists,
    deletePlaylist,
    removeTrackFromPlaylist,
    addTrackToPlaylist,
    createPlaylist,
    removePlaylistCoverArt,
};
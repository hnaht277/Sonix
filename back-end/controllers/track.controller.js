const Track = require("../models/track.js");
const User = require("../models/user.js");
const Playlist = require("../models/playlist.js");
const Comment = require("../models/comment.js");
const cloudinary = require("../config/cloudinary.config.js");
const streamifier = require("streamifier");
const multer = require("multer");
const mm = require("music-metadata");
const mongoose = require("mongoose");


const { redisClient } = require("../config/redis.config.js");

// get public tracks, friends' tracks if followed, and own private tracks
const getVisibleTracksForUser = async (req, res) => {
  try {

    const userId = req.user.id;
    
    const user = await User.findById(userId).select("following");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const allTracks = await Track.find({
      $or: [
        { privacy: "Public" },
        { artist: { $in: user.following }, privacy: "Friends" },
        { artist: userId, privacy: "Private" }
      ]
    })
      .sort({ createdAt: -1 }) 
      .populate("artist featuredArtists", "displayName"); 

    res.status(200).json({ message: "Tracks fetched successfully", tracks: allTracks });
  } catch (error) {
    console.error("Error fetching visible tracks:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getAllTracks = async (req, res) => {
  try {

    // Only Admin can access this function (checked in route middleware)
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user || user.role !== "Admin") {
      return res.status(403).json({ error: "You are not authorized to access this resource" });
    }

    const tracks = await Track.find().sort({ createdAt: -1 }).populate("artist featuredArtists likes comments");
    res.status(200).json({ message: "All tracks fetched successfully", tracks });
  } catch (error) {
    console.error("Error fetching all tracks:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const likeTrack = async (req, res) => {
  try {
    const userId = req.user.id;
    const trackId = req.params.id;
    const track = await Track.findById(trackId);
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!track) {
      return res.status(404).json({ error: "Track not found" });
    }

    if (track.likes.includes(userId)) {
      return res.status(400).json({ error: "You have already liked this track" });
    }

    track.likes.push(userId);
    track.likedCount = track.likes.length;
    await track.save();

    res.json({ message: "Track liked successfully", track });
  } catch (error) {
    console.error("Error liking track:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const unlikeTrack = async (req, res) => {
  try {
    const userId = req.user.id;
    const trackId = req.params.id;
    const track = await Track.findById(trackId);
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!track) {
      return res.status(404).json({ error: "Track not found" });
    }

    if (!track.likes.includes(userId)) {
      return res.status(400).json({ error: "You have not liked this track" });
    }

    track.likes.pull(userId);
    track.likedCount = track.likes.length;
    await track.save();

    res.json({ message: "Track unliked successfully", track });
  } catch (error) {
    console.error("Error unliking track:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const updateTrack = async (req, res) => {
  try {
    const userId = req.user.id;
    const trackId = req.params.id;
    const { title, genre, tags, privacy, featuredArtists } = req.body;

    const track = await Track.findById(trackId);
    if (!track) {
      return res.status(404).json({ error: "Track not found" });
    }

    // Check if the user is the owner of the track
    if (track.artist.toString() !== userId) {
      return res.status(403).json({ error: "You are not authorized to update this track" });
    }

    // Update track information
    track.title = title || track.title;
    track.genre = genre || track.genre;
    track.tags = tags || track.tags;
    track.privacy = privacy || track.privacy;
    track.featuredArtists = featuredArtists || track.featuredArtists;

    await track.save();
    // Invalidate cache
    await redisClient.del("trendingTracks");
    await redisClient.del(`userTracks:${userId}`);

    res.json({ message: "Track updated successfully", track });
  } catch (error) {
    console.error("Error updating track:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const updateCoverArt = async (req, res) => {
  try {
    const userId = req.user.id;
    const trackId = req.params.id;

    const track = await Track.findById(trackId);
    if (!track) {
      return res.status(404).json({ error: "Track not found" });
    }

    // Check if the user is the owner of the track
    if (track.artist.toString() !== userId) {
      return res.status(403).json({ error: "You are not authorized to update this track" });
    }

    const upload = multer().single("coverFile");

    upload(req, res, async (err) => {
      if (err) return res.status(400).json({ error: "Error uploading file" });
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      // --- Xóa cover cũ nếu có ---
      if (track.coverArtPublicId) {
        try {
          await cloudinary.uploader.destroy(track.coverArtPublicId, { resource_type: "image", invalidate: true });
        } catch (error) {
          console.error("Error deleting old cover art from Cloudinary:", error);
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

      // --- Upload cover mới ---
      const coverArtResult = await uploadBuffer(req.file.buffer, {
        folder: "tracks/covers",
        allowed_formats: ["jpg", "png", "jpeg"],
        resource_type: "image",
        secure: true,
      });

      // --- Cập nhật DB ---
      track.coverArtUrl = coverArtResult.secure_url;
      track.coverArtPublicId = coverArtResult.public_id;
      await track.save();

      // --- Invalidate cache ---
      await redisClient.del("trendingTracks");
      await redisClient.del(`userTracks:${userId}`);

      // --- Trả về response ---
      res.json({
        message: "Cover art updated successfully",
        coverArtUrl: coverArtResult.secure_url,
      });
    });
  } catch (error) {
    console.error("Error updating cover art:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


const getTrendingTracks = async (req, res) => {
  try {
    const cacheKey = "trendingTracks";
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      return res.status(200).json({ message: "Trending tracks fetched successfully", tracks: JSON.parse(cachedData) });
    }

    const trendingTracks = await Track.find({ privacy: "Public" })
      .sort({ playCount: -1 }) // Sort by playCount in descending order
      .limit(20) // Limit to top 20 tracks
      .populate("artist featuredArtists", "displayName"); // Populate artist and featured artists

    await redisClient.setEx(cacheKey, 300, JSON.stringify(trendingTracks)); // Cache for 5 minutes

    res.status(200).json({ message: "Trending tracks fetched successfully", tracks: trendingTracks });
  } catch (error) {
    console.error("Error fetching trending tracks:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const uploadTrack = async (req, res) => {
  try {
    const userId = req.user.id;

    // --- Multer memoryStorage ---
    const upload = multer().fields([
      { name: "audioFile", maxCount: 1 },
      { name: "coverFile", maxCount: 1 },
    ]);

    upload(req, res, async (err) => {
      if (err) return res.status(400).json({ error: "Error uploading files" });

      const { title, genre, tags, releaseDate, privacy, duration } = req.body;

      if (!title || !req.files?.audioFile)
        return res.status(400).json({ error: "Title and audio file are required" });

      // --- Lấy buffer audio ---
      const audioBuffer = req.files.audioFile[0].buffer;

      // --- Tính duration bằng music-metadata ---
      let durationSeconds = null;
      try {
        const metadata = await mm.parseBuffer(audioBuffer, "audio/mpeg");
        durationSeconds = Math.floor(metadata.format.duration); // làm tròn xuống giây
      } catch (metaErr) {
        console.error("Error reading audio metadata:", metaErr);
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

      // Upload audio
      const audioResult = await uploadBuffer(req.files.audioFile[0].buffer, {
        resource_type: "video",
        folder: "tracks/audio",
        secure: true,
        type: "authenticated", // để private
      });

      // Upload cover (nếu có)
      let coverUrl = null;
      if (req.files.coverFile) {
        const coverResult = await uploadBuffer(req.files.coverFile[0].buffer, {
          resource_type: "image",
          folder: "tracks/covers",
          secure: true,
        });
        coverUrl = coverResult.secure_url;
      }

      // Tạo Track mới
      const track = await Track.create({
        title,
        audioUrl: audioResult.secure_url,
        coverArtUrl: coverUrl,
        audioPublicId: audioResult.public_id,
        genre,
        tags: tags ? tags.split(",") : [],
        duration: durationSeconds || parseInt(duration, 10) || 0,
        releaseDate: releaseDate || Date.now(),
        artist: userId,
        privacy: privacy || "Public",
      });

      // Invalidate cache
      await redisClient.del("trendingTracks");
      await redisClient.del(`userTracks:${userId}`);

      res.status(201).json({
        message: "Track uploaded successfully",
        track,
      });
    });
  } catch (error) {
    console.error("Error uploading track:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// const streamAudio = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const track = await Track.findById(id);
//     if (!track) {
//       return res.status(404).json({ message: "Track not found" });
//     }

//     // Kiểm tra Range header
//     const range = req.headers.range;
//     if (!range) {
//       return res.status(400).send("Requires Range header");
//     }

//     // Lấy metadata từ Cloudinary bằng HEAD request
//     const headResp = await axios.head(track.audioUrl);
//     const fileSize = parseInt(headResp.headers["content-length"], 10);
//     const contentType = headResp.headers["content-type"] || "audio/mpeg";

//     // Parse range
//     const parts = range.replace(/bytes=/, "").split("-");
//     const start = parseInt(parts[0], 10);
//     const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

//     // Validate range
//     if (isNaN(start) || start < 0 || start >= fileSize || isNaN(end) || end >= fileSize || start > end) {
//       return res.status(416).send("Requested Range Not Satisfiable");
//     }

//     const chunksize = end - start + 1;

//     // Gửi headers cho client
//     res.writeHead(206, {
//       "Content-Range": `bytes ${start}-${end}/${fileSize}`,
//       "Accept-Ranges": "bytes",
//       "Content-Length": chunksize,
//       "Content-Type": contentType,
//     });

//     // Stream từ Cloudinary về client
//     const controller = new AbortController(); // cho phép abort nếu client ngắt
//     const audioStream = await axios({
//       method: "get",
//       url: track.audioUrl,
//       responseType: "stream",
//       headers: {
//         Range: `bytes=${start}-${end}`,
//       },
//       signal: controller.signal,
//     });

//     // Nếu client ngắt kết nối → hủy request tới Cloudinary
//     req.on("close", () => {
//       controller.abort();
//       if (audioStream.data.destroy) {
//         audioStream.data.destroy();
//       }
//     });

//     // Pipe dữ liệu từ Cloudinary → client
//     audioStream.data.pipe(res);

//     // Bắt lỗi stream
//     audioStream.data.on("error", (err) => {
//       console.error("Audio stream error:", err.message);
//       if (!res.headersSent) {
//         res.status(500).json({ message: "Error streaming audio" });
//       } else {
//         res.destroy(err);
//       }
//     });

//   } catch (err) {
//     console.error("Stream error:", err.message);
//     if (!res.headersSent) {
//       res.status(500).json({ message: "Server error" });
//     } else {
//       res.destroy(err);
//     }
//   }
// };


// Stream bằng Signed URL
const streamAudio = async (req, res) => {
  try {
    const { id } = req.params;
    const { startOffset } = req.query; // FE gửi offset (giây) nếu user tua

    // Tìm track trong DB
    const track = await Track.findById(id);
    if (!track) {
      return res.status(404).json({ message: "Track not found" });
    }

    // TTL = duration * 2 (phòng user nghe lâu hơn thời lượng thật)
    if (!track.duration) {
      return res.status(400).json({ message: "Track duration not set" });
    }
    const ttl = track.duration * 2;

    // Tạo signed URL từ Cloudinary
    const signedUrl = cloudinary.url(track.audioPublicId, {
      resource_type: "video", // file audio Cloudinary mặc định nằm dưới "video"
      type: "authenticated",
      sign_url: true,
      expires_at: Math.floor(Date.now() / 1000) + ttl,
      transformation: [
        { flags: "no_stream" } // yêu cầu Cloudinary/CDN không cache stream
      ],
      ...(startOffset && { start_offset: startOffset }) // nếu có offset thì stream từ đó
    });

    // Trả URL cho FE
    return res.json({
      success: true,
      streamUrl: signedUrl,
      expiresIn: ttl
    });

  } catch (err) {
    console.error("Stream error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

const confirmPlay = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id; // từ JWT

    const playKey = `play:${userId}:${id}`;

    // kiểm tra user có vừa nghe track này chưa
    const alreadyPlayed = await redisClient.get(playKey);

    if (!alreadyPlayed) {
      // tăng play count vào Redis
      await redisClient.hIncrBy("track:playCount", id, 1);

      // set TTL = 30s hoặc 1 phút tùy bạn
      await redisClient.set(playKey, "1", { EX: 60 });

      return res.json({ success: true, message: "Play counted" });
    }

    // nếu user gọi lại API trong TTL -> bỏ qua
    return res.json({ success: false, message: "Already counted recently" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const getTrackById = async (req, res) => {
  try {
    const track = await Track.findById(req.params.id);
    if (!track) {
      return res.status(404).json({ message: "Track not found" });
    }

    res.status(200).json({ message: "Track fetched successfully", track });
  } catch (error) {
      console.error("Error fetching track:", error);
      res.status(500).json({ error: "Internal server error" });
  }
};

const deleteTrack = async (req, res) => {
  try {
    const userId = req.user.id;
    const trackId = req.params.id;
    const track = await Track.findById(trackId);

    if (!track) {
      return res.status(404).json({ error: "Track not found" });
    }

    // Check if the user is the owner of the track
    if (track.artist.toString() !== userId && req.user.role !== "Admin") {
      return res.status(403).json({ error: "You are not authorized to delete this track" });
    }

    // Remove track references from playlists
    await Playlist.updateMany(
      { tracks: new mongoose.Types.ObjectId(trackId) },
      { $pull: { tracks: new mongoose.Types.ObjectId(trackId) } }
    );

    // Remove associated comments
    await Comment.deleteMany({ track: new mongoose.Types.ObjectId(trackId) });

    // delete from Cloudinary
    await cloudinary.uploader.destroy(track.audioPublicId, { resource_type: "video", invalidate: true });
    if (track.coverArtPublicId) {
      await cloudinary.uploader.destroy(track.coverArtPublicId, { resource_type: "image", invalidate: true });
    }

    // Invalidate cache
    await redisClient.del("trendingTracks");
    await redisClient.del(`userTracks:${userId}`);

    // Delete the track
    await Track.findByIdAndDelete(trackId);
    res.json({ message: "Track deleted successfully" });
  } catch (error) { 
      console.error("Error deleting track:", error);
      res.status(500).json({ error: "Internal server error" });
  }
};

const getTrackByUser = async (req, res) => {
  try {
    const userId = req.params.userId;

    const cacheKey = `userTracks:${userId}`;
    const cachedData = await redisClient.get(cacheKey);

    if (cachedData) {
      return res.status(200).json({ message: "Tracks fetched successfully", tracks: JSON.parse(cachedData) });
    }

    const tracks = await Track.find({ artist: userId }).sort({ createdAt: -1 });

    if (!tracks) {
      return res.status(404).json({ message: "No tracks found for this user" });
    }

    await redisClient.setEx(cacheKey, 300, JSON.stringify(tracks)); // cache 5 phút

    res.status(200).json({ message: "Tracks fetched successfully", tracks });
  } catch (error) {
      console.error("Error fetching user's tracks:", error);
      res.status(500).json({ error: "Internal server error" });
  }
};
    
module.exports = {
    getVisibleTracksForUser,
    likeTrack,
    unlikeTrack,
    getTrackById,
    updateTrack,
    getTrendingTracks,
    uploadTrack,
    streamAudio,
    confirmPlay,
    deleteTrack,
    getTrackByUser,
    updateCoverArt,
    getAllTracks,
};
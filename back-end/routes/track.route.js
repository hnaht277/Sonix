const express = require("express");
const router = express.Router();
const { authMiddleware, roleMiddleware, getUser } = require('../middlewares/auth.middleware.js');

const {
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
} = require("../controllers/track.controller.js");

// Lấy danh sách trending (không cần login)
router.get("/trending", getTrendingTracks);

// Lấy tất cả track (chỉ admin)
router.get("/all", authMiddleware, roleMiddleware('Admin'), getAllTracks);

// Stream audio
router.get("/:id/stream", streamAudio);

// Lấy track theo id
router.get("/:id", getTrackById);


// Lấy danh sách track mà user có thể xem (theo follow, quyền hạn...)
router.get("/", authMiddleware, getVisibleTracksForUser);

// Lấy danh sách track của 1 user
router.get("/user/:userId/tracks", authMiddleware, getTrackByUser);

// Upload track
router.post("/", authMiddleware, uploadTrack);

// Like / Unlike track
router.post("/:id/like", authMiddleware, likeTrack);
router.delete("/:id/unlike", authMiddleware, unlikeTrack);

// Confirm play (tăng lượt nghe)
router.post("/:id/play", authMiddleware, confirmPlay);

// Update cover art (chỉ owner)
router.put("/:id/cover", authMiddleware, updateCoverArt);

// Update track (chỉ owner)
router.put("/:id", authMiddleware, updateTrack);

// Delete track (chỉ owner hoặc admin)
router.delete("/:id", authMiddleware, deleteTrack);

module.exports = router;
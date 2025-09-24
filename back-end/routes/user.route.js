const express = require("express");
const router = express.Router();
const { authMiddleware } = require('../middlewares/auth.middleware.js');

const {
    getUserProfile,
    updateUserProfile,
    getFollowers,
    getFollowing,
    followUser,
    unfollowUser,
    getUpploadedTracks,
    getPlaylists,
    updatePlaylist,
    addToPlaylist,
    removeFromPlaylist,
    getLikedTracks,
    getLikedPlaylists,
} = require("../controllers/user.controller.js");

// Protected routes
router.get("/profile", authMiddleware, getUserProfile);
router.put("/profile", authMiddleware, updateUserProfile);
router.get("/followers", authMiddleware, getFollowers);
router.get("/following", authMiddleware, getFollowing);
router.post("/follow/:id", authMiddleware, followUser);
router.post("/unfollow/:id", authMiddleware, unfollowUser);
router.get("/uploaded-tracks", authMiddleware, getUpploadedTracks);
router.get("/liked-tracks", authMiddleware, getLikedTracks);
router.get("/liked-playlists", authMiddleware, getLikedPlaylists);
router.get("/playlists", authMiddleware, getPlaylists);
router.put("/playlists/:id", authMiddleware, updatePlaylist);
router.post("/playlists/:id/tracks", authMiddleware, addToPlaylist);
router.delete("/playlists/:id/tracks", authMiddleware, removeFromPlaylist);

module.exports = router;
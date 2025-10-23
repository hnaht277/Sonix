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
    getLikedTracks,
    getLikedPlaylists,
    updateAvatar,
    setCurrentListening,
    stopListening,
} = require("../controllers/user.controller.js");

// Protected routes
router.get("/profile", authMiddleware, getUserProfile);
router.put("/profile", authMiddleware, updateUserProfile);
router.put("/profile/avatar", authMiddleware, updateAvatar);
router.get("/followers", authMiddleware, getFollowers);
router.get("/following", authMiddleware, getFollowing);
router.post("/follow/:id", authMiddleware, followUser);
router.delete("/unfollow/:id", authMiddleware, unfollowUser);
router.get("/liked-tracks", authMiddleware, getLikedTracks);
router.get("/liked-playlists", authMiddleware, getLikedPlaylists);
router.put("/current-listening/:trackId", authMiddleware, setCurrentListening);
router.delete("/stop-listening", authMiddleware, stopListening);

module.exports = router;
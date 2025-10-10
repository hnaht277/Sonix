const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middlewares/auth.middleware.js");
const {
    getFeed,
    getFeedByUserId,
    getTopTracks,
} = require("../controllers/history.controller.js");

router.get("/feed", authMiddleware, getFeed);
router.get("/top-tracks", authMiddleware, getTopTracks);
router.get("/user/:userId", getFeedByUserId);

module.exports = router;
const express = require("express");
const router = express.Router();
const { authMiddleware } = require('../middlewares/auth.middleware.js');

const {
    createComment,
    getCommentsOfTrack,
    updateComment,
    toggleLikeComment,
    deleteComment,
} = require("../controllers/comment.controller.js");

// Lấy comment của track
router.get("/track/:trackId", getCommentsOfTrack);

// Comment CRUD
router.post("/", authMiddleware, createComment);
router.put("/:commentId", authMiddleware, updateComment);
router.patch("/:commentId/like", authMiddleware, toggleLikeComment);
router.delete("/:commentId", authMiddleware, deleteComment);


module.exports = router;
const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middlewares/auth.middleware.js");

const {
  createConversation,
  getConversationsForUser,
  deleteConversation,
} = require("../controllers/conversation.controller.js");

router.post("/", authMiddleware, createConversation);
router.get("/", authMiddleware, getConversationsForUser);
router.delete("/:conversationId", authMiddleware, deleteConversation);

module.exports = router;
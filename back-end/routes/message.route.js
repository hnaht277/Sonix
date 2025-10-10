const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/auth.middleware.js');

const {
    createMessage,
    getMessages,
    replyFeed,
} = require('../controllers/message.controller.js');

router.post('/', authMiddleware, createMessage);
router.post('/reply-feed', authMiddleware, replyFeed);
router.get('/:conversationId', authMiddleware, getMessages);

module.exports = router;

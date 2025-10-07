const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/auth.middleware.js');

const {
    createMessage,
    getMessages,
} = require('../controllers/message.controller.js');

router.post('/', authMiddleware, createMessage);
router.get('/:conversationId', authMiddleware, getMessages);

module.exports = router;

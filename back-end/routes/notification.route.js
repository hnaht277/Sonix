const express = require("express");
const router = express.Router();
const { authMiddleware } = require('../middlewares/auth.middleware.js');

const {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    getNotificationById,
} = require("../controllers/notification.controller.js");

router.get("/", authMiddleware, getNotifications);
router.patch("/:notificationId/read", authMiddleware, markAsRead);
router.patch("/read-all", authMiddleware, markAllAsRead);
router.delete("/delete-all", authMiddleware, deleteAllNotifications);
router.delete("/:notificationId", authMiddleware, deleteNotification);
router.get("/:notificationId", authMiddleware, getNotificationById);

module.exports = router;
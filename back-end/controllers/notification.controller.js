const Notification = require("../models/notification.js");

const getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;

        const page = parseInt(req.query.page) || 1;      // trang hiện tại, mặc định 1
        const limit = parseInt(req.query.limit) || 10;   // số comment mỗi page, mặc định 10
        const skip = (page - 1) * limit;                // tính skip

        const notifications = await Notification.find({ recipient: userId })
            .populate("sender", "displayName")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        if (!notifications || notifications.length === 0) {
            return res.status(404).json({ message: "No notifications found" });
        }

        // Lấy tổng số thông báo để FE biết tổng trang
        const totalNotifications = await Notification.countDocuments({ recipient: userId });

        // lấy tổng số thông báo chưa đọc
        const unreadCount = await Notification.countDocuments({ recipient: userId, isRead: false });

        res.status(200).json({ message: "Notifications fetched successfully", notifications, pagination: {
            page,
            limit,
            totalPages: Math.ceil(totalNotifications / limit),
            totalNotifications,
            unreadCount
        } });
    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

const markAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const { notificationId } = req.params;

        // updateOne để chỉ cần 1 query
        const result = await Notification.updateOne(
            { _id: notificationId, recipient: userId },
            { $set: { isRead: true } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: "Notification not found" });
        }

        res.status(200).json({ message: "Notification marked as read", notification: result });
    } catch (error) {
        console.error("Error marking notification as read:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await Notification.updateMany(
            { recipient: userId, isRead: false },
            { $set: { isRead: true } }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({ message: "No unread notifications found" });
        }

        res.status(200).json({
            message: `Marked ${result.modifiedCount} notifications as read`, 
            notification: result
        });
    } catch (error) {
        console.error("Error marking all notifications as read:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

const deleteNotification = async (req, res) => {
    try {
        const userId = req.user.id;
        const { notificationId } = req.params;

        const notification = await Notification.findOneAndDelete({ _id: notificationId, recipient: userId });
        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }

        res.status(200).json({ message: "Notification deleted successfully", notification });
    } catch (error) {
        console.error("Error deleting notification:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

const deleteAllNotifications = async (req, res) => {
    try {
        const userId = req.user.id;

        // Xóa tất cả notifications của user và trả về kết quả
        const result = await Notification.deleteMany({ recipient: userId });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: "No notifications found" });
        }

        res.status(200).json({ 
            message: "All notifications deleted successfully", 
            deletedCount: result.deletedCount 
        });
    } catch (error) {
        console.error("Error deleting all notifications:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

const getNotificationById = async (req, res) => {
    try {
        const userId = req.user.id;
        const { notificationId } = req.params;

        const notification = await Notification.findOne({ _id: notificationId, recipient: userId });
        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }

        res.status(200).json({ message: "Notification fetched successfully", notification });
    } catch (error) {
        console.error("Error fetching notification:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = { 
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    getNotificationById,
 };
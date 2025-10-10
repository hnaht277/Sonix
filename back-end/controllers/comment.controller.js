const Comment = require("../models/comment.js");
const User = require("../models/user.js");
const Track = require("../models/track.js");
const Notification = require("../models/notification.js");
const { getIO } = require("../config/socket.config.js");

const mongoose = require("mongoose");
const createComment = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { text, trackId } = req.body;
        const userId = req.user.id;

        // Tìm user
        const user = await User.findById(userId).session(session);
        if (!user) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: "User not found" });
        }

        // Tìm track
        const track = await Track.findById(trackId).session(session);
        if (!track) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: "Track not found" });
        }

        // Kiểm tra chủ sở hữu
        const isOwner =
            track.artist.toString() === userId ||
            track.featuredArtists.some(artistId => artistId.toString() === userId);

        // Tạo comment
        const comment = new Comment({
            text,
            author: userId,
            track: trackId,
            isOwner
        });
        await comment.save({ session });

        // Cập nhật số lượng bình luận
        track.commentCount += 1;
        await track.save({ session });

        let notification = null;

        // Tạo notification nếu không phải chủ track
        if (!isOwner) {
            notification = new Notification({
                recipient: track.artist,
                sender: userId,
                type: "COMMENT_TRACK",
                comment: comment._id,
                track: trackId,
                content: `${user.username} commented on your track "${track.title}": "${text}"`
            });
            await notification.save({ session });
        }

        // Commit
        await session.commitTransaction();
        session.endSession();

        if (notification) {
            const io = getIO();
            io.to(track.artist.toString()).emit("newNotification", notification);
        }

        res.status(201).json({
            message: "Comment created successfully",
            comment,
            notification: isOwner ? null : notification
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("Error creating comment:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

const getCommentsOfTrack = async (req, res) => {
    try {

        const { trackId } = req.params;
        const page = parseInt(req.query.page) || 1;      // trang hiện tại, mặc định 1
        const limit = parseInt(req.query.limit) || 10;   // số comment mỗi page, mặc định 10
        const skip = (page - 1) * limit;                // tính skip

        const comments = await Comment.find({ track: trackId })
            .populate("author", "username avatarUrl")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        if (!comments || comments.length === 0) {
            return res.status(404).json({ message: "No comments found for this track" });
        }

        // Lấy tổng số comment để FE biết tổng trang
        const totalComments = await Comment.countDocuments({ track: trackId });

        res.status(200).json({
            message: "Comments fetched successfully",
            comments,
            pagination: {
                page,
                limit,
                totalPages: Math.ceil(totalComments / limit),
                totalComments
            }
        });
    } catch (error) {
        console.error("Error fetching comments:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};


const toggleLikeComment = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { commentId } = req.params;
        const userId = req.user.id;

        // Tìm user
        const user = await User.findById(userId).session(session);
        if (!user) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: "User not found" });
        }

        // Tìm comment
        const comment = await Comment.findById(commentId).session(session);
        if (!comment) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: "Comment not found" });
        }

        let message = "";
        if (comment.likes.includes(userId)) {
            // Nếu đã like → unlike
            comment.likes.pull(userId);
            comment.likedCount = comment.likes.length;
            await comment.save({ session });

            message = "Comment unliked successfully";
        } else {
            // Nếu chưa like → like
            comment.likes.push(userId);
            comment.likedCount = comment.likes.length;
            await comment.save({ session });

            // Tạo notification nếu người like khác với tác giả comment
            if (comment.author.toString() !== userId) {
                const notification = new Notification({
                    recipient: comment.author,
                    sender: userId,
                    type: "LIKE_COMMENT",
                    comment: comment._id,
                    track: comment.track,
                    content: `${user.displayName} liked your comment "${comment.text}"`
                });
                await notification.save({ session });
            }

            message = "Comment liked successfully";
        }

        // Commit transaction
        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message, comment });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("Error toggling like on comment:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

const updateComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const { text } = req.body;
        const userId = req.user.id;

        // Tìm comment
        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({ message: "Comment not found" });
        }

        // Kiểm tra quyền sở hữu
        if (comment.author.toString() !== userId) {
            return res.status(403).json({ message: "You are not authorized to update this comment" });
        }

        // Cập nhật nội dung comment
        comment.text = text;
        await comment.save();

        res.status(200).json({ message: "Comment updated successfully", comment });
    } catch (error) {
        console.error("Error updating comment:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

const deleteComment = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { commentId } = req.params;
        const userId = req.user.id;

        // Tìm comment
        const comment = await Comment.findById(commentId).session(session);
        if (!comment) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: "Comment not found" });
        }

        // Kiểm tra quyền sở hữu
        if (comment.author.toString() !== userId && req.user.role !== "Admin") {
            await session.abortTransaction();
            session.endSession();
            return res.status(403).json({ message: "You are not authorized to delete this comment" });
        }

        // Cập nhật số lượng bình luận trên track
        if (comment.track) {
            const track = await Track.findById(comment.track).session(session);
            if (track) {
                track.commentCount = track.commentCount > 0 ? track.commentCount - 1 : 0;
                await track.save({ session });
            }
        }

        // Xóa comment
        await Comment.findByIdAndDelete(commentId, { session });

        await session.commitTransaction();
        session.endSession();
        res.status(200).json({ message: "Comment deleted successfully" });
    } catch (error) {
        console.error("Error deleting comment:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = {
    createComment,
    getCommentsOfTrack,
    updateComment,
    toggleLikeComment,
    deleteComment,
};
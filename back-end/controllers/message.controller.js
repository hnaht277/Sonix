// controllers/message.controller.js
const Message = require("../models/message.js");
const Conversation = require("../models/conversation.js");
const Notification = require("../models/notification.js");
const { getIO } = require("../config/socket.config.js"); // to emit socket
const UserConversation = require("../models/userConversation.js");
const User = require("../models/user.js");
const mongoose = require("mongoose");
const History = require("../models/history.js");

const createMessage = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try { 
    const userId = req.user.id;
    let { conversationId, text, participantIds } = req.body;

    let conversation;

    if (!conversationId) {
      // Nếu không có conversationId, thì tạo conversation mới
      if (!participantIds || participantIds.length === 0) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: "participantIds is required when no conversationId provided" });
      }

      // Ensure the user is included
      if (!participantIds.includes(userId)) {
        participantIds.push(userId);
      }
      const uniqueParticipantIds = [...new Set(participantIds)];

      // Check conversation đã tồn tại với đúng participants chưa
      conversation = await Conversation.findOne({
        participants: { $all: uniqueParticipantIds, $size: uniqueParticipantIds.length }
      }).session(session);

      if (!conversation) {
        // Tạo mới conversation
        conversation = new Conversation({
          participants: uniqueParticipantIds,
          unreadCount: uniqueParticipantIds.reduce((acc, id) => {
            acc.set(id, 0);
            return acc;
          }, new Map()),
        });
        await conversation.save({ session });

        // Tạo UserConversation entries
        const userConversations = uniqueParticipantIds.map((pId) => ({
          user: pId,
          conversation: conversation._id,
        }));
        await UserConversation.insertMany(userConversations, { session });
      }

      conversationId = conversation._id; // gán lại
    } else {
      // Nếu có conversationId thì check tồn tại
      conversation = await Conversation.findById(conversationId).session(session);
      if (!conversation) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ message: "Conversation not found" });
      }
    }

    // Tạo message mới
    const newMessage = new Message({
      conversationId,
      sender: userId,
      text,
      readBy: [userId]
    });

    // Lấy recipients
    const recipients = conversation.participants.filter(
      (pId) => pId.toString() !== userId
    );

    const recipientUsers = await User.find({ _id: { $in: recipients } }).session(session);

    recipients.forEach((rUser) => {
      const rId = rUser.toString();
      const userObj = recipientUsers.find(u => u._id.toString() === rId);
      if (userObj?.activeConversations.includes(conversationId)) {
        newMessage.readBy.push(rId);
        conversation.unreadCount.set(rId, 0);
      } else {
        const currentUnread = conversation.unreadCount.get(rId) || 0;
        conversation.unreadCount.set(rId, currentUnread + 1);
      }
    });

    await newMessage.save({ session });

    conversation.lastMessage = newMessage._id;
    await conversation.save({ session });

    // Notification
    const notifyRecipients = recipientUsers.filter(
      (rUser) => !rUser.activeConversations.includes(conversationId)
    );

    await Promise.all(
      notifyRecipients.map((rUser) =>
        Notification.create(
          [
            {
              recipient: rUser._id,
              sender: userId,
              type: "NEW_MESSAGE",
              conversation: conversationId,
              message: newMessage._id,
              content: text || "Sent an attachment",
            },
          ],
          { session }
        )
      )
    );

    await session.commitTransaction();
    session.endSession();

    // Emit socket
    const io = getIO();
    io.to(conversationId.toString()).emit("newMessage", {
      conversationId,
      message: newMessage,
    });

    const populatedConv = await Conversation.findById(conversationId)
      .populate("participants", "displayName avatar")
      .populate({
        path: "lastMessage",
        select: "text sender createdAt",
        populate: { path: "sender", select: "displayName avatar" }
      });

    recipients.forEach((rId) => {
      io.to(rId.toString()).emit("conversationUpdated", populatedConv);
    });

    io.to(userId.toString()).emit("conversationUpdated", populatedConv);

    res.status(201).json(newMessage);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error in createMessage:", err);
    res.status(500).json({ message: "Server error" });
  }
};



const replyFeed = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user.id;
    let { conversationId, text, participantIds, historyId } = req.body;

    if (!historyId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "historyId (repliedFeed) is required" });
    }

    const history = await History.findById(historyId).session(session);
    if (!history) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "History (repliedFeed) not found" });
    }

    if (history.user.toString() === userId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "You cannot reply to your own feed" });
    }

    let conversation;

    if (!conversationId) {
      // Nếu chưa có conversation → tạo mới
      if (!participantIds || participantIds.length === 0) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: "participantIds is required when no conversationId provided" });
      }

      if (!participantIds.includes(userId)) participantIds.push(userId);
      const uniqueParticipantIds = [...new Set(participantIds)];

      conversation = await Conversation.findOne({
        participants: { $all: uniqueParticipantIds, $size: uniqueParticipantIds.length },
      }).session(session);

      if (!conversation) {
        conversation = new Conversation({
          participants: uniqueParticipantIds,
          unreadCount: uniqueParticipantIds.reduce((acc, id) => {
            acc.set(id, 0);
            return acc;
          }, new Map()),
        });
        await conversation.save({ session });

        const userConversations = uniqueParticipantIds.map((pId) => ({
          user: pId,
          conversation: conversation._id,
        }));
        await UserConversation.insertMany(userConversations, { session });
      }

      conversationId = conversation._id;
    } else {
      conversation = await Conversation.findById(conversationId).session(session);
      if (!conversation) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ message: "Conversation not found" });
      }

      // check user of history is in participants
      if (!conversation.participants.some((pId) => pId.toString() === history.user.toString())) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: "The user of the replied feed is not a participant of this conversation" });
      }
    }

    // Tạo message có repliedFeed
    const newMessage = new Message({
      conversationId,
      sender: userId,
      text,
      repliedFeed: historyId, // ref tới model History
      readBy: [userId],
    });

    // Cập nhật unreadCount
    const recipients = conversation.participants.filter(
      (pId) => pId.toString() !== userId
    );
    const recipientUsers = await User.find({ _id: { $in: recipients } }).session(session);

    recipients.forEach((rId) => {
      const rIdStr = rId.toString();
      const userObj = recipientUsers.find((u) => u._id.toString() === rIdStr);
      if (userObj?.activeConversations.includes(conversationId)) {
        newMessage.readBy.push(rIdStr);
        conversation.unreadCount.set(rIdStr, 0);
      } else {
        const currentUnread = conversation.unreadCount.get(rIdStr) || 0;
        conversation.unreadCount.set(rIdStr, currentUnread + 1);
      }
    });

    await newMessage.save({ session });

    conversation.lastMessage = newMessage._id;
    await conversation.save({ session });

    // Gửi thông báo
    const notifyRecipients = recipientUsers.filter(
      (rUser) => !rUser.activeConversations.includes(conversationId)
    );

    await Promise.all(
      notifyRecipients.map((rUser) =>
        Notification.create(
          [
            {
              recipient: rUser._id,
              sender: userId,
              type: "REPLY_FEED",
              conversation: conversationId,
              message: newMessage._id,
              content: text || "Replied to a feed",
            },
          ],
          { session }
        )
      )
    );

    await session.commitTransaction();
    session.endSession();

    // Emit socket
    const io = getIO();
    const populatedMessage = await Message.findById(newMessage._id)
      .populate("sender", "displayName avatarUrl")
      .populate({
        path: "repliedFeed",
        populate: { path: "user track", select: "displayName title coverArtUrl" },
      });

    io.to(conversationId.toString()).emit("newMessage", {
      conversationId,
      message: populatedMessage,
    });

    const populatedConv = await Conversation.findById(conversationId)
      .populate("participants", "displayName avatarUrl")
      .populate({
        path: "lastMessage",
        select: "text sender createdAt repliedFeed",
        populate: [
          { path: "sender", select: "displayName avatarUrl" },
          {
            path: "repliedFeed",
            populate: { path: "user track", select: "displayName title coverArtUrl" },
          },
        ],
      });

    recipients.forEach((rId) => {
      io.to(rId.toString()).emit("conversationUpdated", populatedConv);
    });
    io.to(userId.toString()).emit("conversationUpdated", populatedConv);

    res.status(201).json(populatedMessage);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error in replyFeed:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const getMessages = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const conversation = await Conversation.findById(conversationId).session(session);

    if (!conversation) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (!conversation.participants.some((pId) => pId.toString() === userId)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ message: "Access denied" });
    }

    // Lấy trạng thái của user trong conversation
    const userConversation = await UserConversation.findOne({
      user: userId,
      conversation: conversationId
    }).session(session);

    if (!userConversation) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "UserConversation not found" });
    }

    // Build query cho messages
    let messageQuery = { conversationId };
    if (userConversation.deletedAt) {
      messageQuery.createdAt = { $gt: userConversation.deletedAt };
    }

    // mark all messages as read by this user (chỉ với messages hiển thị)
    await Message.updateMany(
      { ...messageQuery, readBy: { $ne: userId } },
      { $addToSet: { readBy: userId } },
      { session }
    );

    // Reset unreadCount cho user này
    conversation.unreadCount.set(userId, 0);
    await conversation.save({ session });
    
    // Get messages (sau khi update)
    const messages = await Message.find(messageQuery)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("sender", "displayName avatarUrl") // populate người gửi
      .populate({
        path: "repliedFeed", // populate History
        populate: [
          {
            path: "user", // populate user trong History
            select: "username displayName avatarUrl"
          },
          {
            path: "track", // populate track trong History
            select: "title audioUrl coverArtUrl artist",
            populate: {
              path: "artist", // populate artist của track
              select: "username displayName avatarUrl"
            }
          }
        ]
      })
      .sort({ createdAt: -1 })
      .session(session);


    const totalMessages = await Message.countDocuments(messageQuery).session(session);

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      message: "Messages fetched successfully",
      messages,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalMessages / limit),
        totalMessages,
      },
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error in getMessages:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { createMessage, getMessages, replyFeed };

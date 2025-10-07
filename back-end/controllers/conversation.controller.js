const Conversation = require("../models/conversation.js");
const UserConversation = require("../models/userConversation.js");
const { getIO } = require("../config/socket.config.js");

const mongoose = require("mongoose");

const createConversation = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const userId = req.user.id;
        const { participantIds } = req.body;

        // check existing conversation with same participants
        const existingConversation = await Conversation.findOne({
            participants: { $all: participantIds, $size: participantIds.length }
        }).session(session);

        if (existingConversation) {
            await session.abortTransaction();
            session.endSession();
            return res.status(200).json(existingConversation);
        }

        // Ensure the user is included in the participants
        if (!participantIds.includes(userId)) {
            participantIds.push(userId);
        }
        // Remove duplicates
        const uniqueParticipantIds = [...new Set(participantIds)];
        if (uniqueParticipantIds.length < 2) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: "At least two unique participants are required to create a conversation" });
        }

        // Create conversation
        const newConversation = new Conversation({
            participants: uniqueParticipantIds,
            unreadCount: uniqueParticipantIds.reduce((acc, id) => {
                acc.set(id, 0);
                return acc;
            }, new Map()),
        });
        await newConversation.save({ session });

        // Create UserConversation entries
        const userConversations = uniqueParticipantIds.map((pId) => ({
            user: pId,
            conversation: newConversation._id,
        }));
        await UserConversation.insertMany(userConversations, { session });

        await session.commitTransaction();
        session.endSession();

        res.status(201).json(newConversation);
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("Error creating conversation:", error);
        res.status(500).json({ message: "Server error" });
    }
};

const getConversationsForUser = async (req, res) => {
  try {
    const userId = req.user.id;

    const userConversations = await UserConversation.find({ user: userId })
      .populate({
        path: "conversation",
        populate: [
          { path: "participants", select: "_id displayName avatar" },
          { 
            path: "lastMessage",
            select: "text sender createdAt",
            populate: { path: "sender", select: "_id displayName avatar" }
          }
        ]
      })
      .sort({ updatedAt: -1 });

    const conversations = userConversations
      .filter((uc) => {
        const conv = uc.conversation;
        if (!conv) return false;

        // Chưa xóa → show
        if (!uc.deletedAt) return true;

        // Đã xóa → chỉ show nếu có lastMessage mới hơn deletedAt
        return conv.lastMessage && conv.lastMessage.createdAt > uc.deletedAt;
      })
      .map((uc) => uc.conversation);

    if (!conversations.length) {
      return res.status(404).json({ message: "No conversations found" });
    }

    res.status(200).json(conversations);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const deleteConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    await UserConversation.findOneAndUpdate(
      { user: userId, conversation: conversationId },
      { deletedAt: new Date() }
    );

    // Emit qua socket cho chính user
    const io = getIO();
    io.to(userId).emit("conversationDeleted", { conversationId });

    res.status(200).json({ message: "Conversation deleted" });
  } catch (err) {
    console.error("Error deleting conversation:", err);
    res.status(500).json({ message: "Server error" });
  }
};


module.exports = {
    createConversation,
    getConversationsForUser,
    deleteConversation,
};
const { Server } = require("socket.io");
const User = require("../models/user.js"); // nhớ import đúng path

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: "*", // TODO: thay bằng domain FE khi deploy
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    // B1: authenticate để lưu userId vào socket
    socket.on("authenticate", (userId) => {
      socket.userId = userId;
      console.log(`Socket ${socket.id} authenticated as user ${userId}`);
    });

    // B2: User join vào 1 conversation (FE emit khi mở khung chat)
    socket.on("joinConversation", async (conversationId) => {
      if (!socket.userId) return;
      await User.findByIdAndUpdate(socket.userId, {
        $addToSet: { activeConversations: conversationId },
      });
      socket.join(conversationId);
      console.log(`User ${socket.userId} joined conversation ${conversationId}`);
    });

    // B3: User rời khỏi conversation (FE emit khi đóng khung chat)
    socket.on("leaveConversation", async (conversationId) => {
      if (!socket.userId) return;
      await User.findByIdAndUpdate(socket.userId, {
        $pull: { activeConversations: conversationId },
      });
      socket.leave(conversationId);
      console.log(`User ${socket.userId} left conversation ${conversationId}`);
    });

    // B4: Gửi tín hiệu "đang gõ"
    socket.on("typing", (conversationId) => {
      socket.to(conversationId).emit("typing", socket.userId || socket.id);
    });

    // B5: Disconnect → clear activeConversations + cập nhật lastSeen
    socket.on("disconnect", async () => {
      if (socket.userId) {
        await User.findByIdAndUpdate(socket.userId, {
          $set: { activeConversations: [] },
          $currentDate: { lastSeen: true },
        });
        console.log(`User ${socket.userId} disconnected`);
      } else {
        console.log("Client disconnected:", socket.id);
      }
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error("Socket.io not initialized! Call initSocket(server) first.");
  }
  return io;
}

module.exports = { initSocket, getIO };

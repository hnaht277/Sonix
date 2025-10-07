const express = require("express");
const dotenv = require("dotenv");
const http = require("http");

const { connectDB } = require("./config/db.config.js");
const { connectRedis } = require("./config/redis.config.js");
const { initSocket } = require("./config/socket.config.js");

dotenv.config();

const authRoutes = require("./routes/auth.route.js");
const userRoutes = require("./routes/user.route.js");
const trackRoutes = require("./routes/track.route.js");
const playlistRoutes = require("./routes/playlist.route.js");
const commentRoutes = require("./routes/comment.route.js");
const notificationRoutes = require("./routes/notification.route.js");
const searchRoutes = require("./routes/search.route.js");
const messageRoutes = require("./routes/message.route.js");
const conversationRoutes = require("./routes/conversation.route.js");
require("./jobs/playCountSync.js");


// Connect to MongoDB
connectDB();

// Connect to Redis
connectRedis();

const app = express();
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/tracks", trackRoutes);
app.use("/api/playlists", playlistRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/conversations", conversationRoutes);
// Route test
app.get("/", (req, res) => {
  res.send("Sonix backend is running!");
});

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
initSocket(server);

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

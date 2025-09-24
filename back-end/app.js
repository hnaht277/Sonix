const express = require("express");
const dotenv = require("dotenv");

const { connectDB } = require("./config/db.config.js");
const { connectRedis } = require("./config/redis.config.js");

dotenv.config();

const authRoutes = require("./routes/auth.route.js");
const userRoutes = require("./routes/user.route.js");


// Connect to MongoDB
connectDB();

// Connect to Redis
connectRedis();

const app = express();
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

// Route test
app.get("/", (req, res) => {
  res.send("Sonix backend is running!");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

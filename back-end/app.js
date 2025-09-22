const express = require("express");
const dotenv = require("dotenv");

const { connectDB } = require("./config/db.config.js");
const { connectRedis } = require("./config/redis.config.js");

dotenv.config();

// Connect to MongoDB
connectDB();

// Connect to Redis
connectRedis();

const app = express();
app.use(express.json());



// Route test
app.get("/", (req, res) => {
  res.send("Sonix backend is running!");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

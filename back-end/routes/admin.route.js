const express = require("express");
const router = express.Router();
const { authMiddleware, roleMiddleware } = require("../middlewares/auth.middleware.js");

const { lockUser, unlockUser, getAllUsers, getAllTracks, getAllPlaylists } = require("../controllers/admin.controller.js");

router.post("/users/:id/lock", authMiddleware, roleMiddleware("Admin"), lockUser);
router.post("/users/:id/unlock", authMiddleware, roleMiddleware("Admin"), unlockUser);
router.get("/users", authMiddleware, roleMiddleware("Admin"), getAllUsers);
router.get("/tracks", authMiddleware, roleMiddleware("Admin"), getAllTracks);
router.get("/playlists", authMiddleware, roleMiddleware("Admin"), getAllPlaylists);

module.exports = router;
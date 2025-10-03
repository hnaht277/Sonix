const express = require("express");
const router = express.Router();
const { authMiddleware, getUser } = require('../middlewares/auth.middleware.js');

const { searchTrack, searchPlaylist, searchUser, searchAll } = require("../controllers/search.controller.js");

router.get("/tracks", getUser, searchTrack);
router.get("/playlists", getUser, searchPlaylist);
router.get("/users", getUser, searchUser);
router.get("/all", getUser, searchAll);

module.exports = router;
const Track = require('../models/track.js');
const Playlist = require('../models/playlist.js');
const User = require('../models/user.js');

const { searchTracks, searchPlaylists, searchUsers } = require('../services/search.service.js');

const searchTrack = async (req, res) => {
  try {
    const { keyword, autocomplete, page = 1, limit = 20 } = req.query;

    let userId = null;
    if (req.user) {
      userId = req.user.id;
    }

    const { tracks, total } = await searchTracks({ keyword, autocomplete, page, limit, userId });

    if (autocomplete === "true") {
      return res.json({ tracks });
    }

    return res.json({
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
      tracks
    });
  } catch (error) {
    console.error("Error searching tracks:", error);
    return res.status(500).json({ message: error.message || "Server error" });
  }
};


const searchPlaylist = async (req, res) => {
  try {
    const { keyword, autocomplete, page = 1, limit = 20 } = req.query;
    let userId = null;
    if (req.user) {
      userId = req.user.id;
    }

    const { playlists, total } = await searchPlaylists({
      keyword,
      autocomplete,
      page,
      limit,
      userId
    });

    if (autocomplete === "true") {
      return res.json({ playlists });
    }

    return res.json({
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
      playlists
    });
  } catch (error) {
    console.error("Error searching playlists:", error);
    return res.status(500).json({ message: error.message || "Server error" });
  }
};

const searchUser = async (req, res) => {
  try {
    const { keyword, autocomplete, page = 1, limit = 20 } = req.query;

    const { users, total } = await searchUsers({
      keyword,
      autocomplete,
      page,
      limit
    });

    if (autocomplete === "true") {
      return res.json({ users });
    }

    return res.json({
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
      users
    });
  } catch (error) {
    console.error("Error searching users:", error);
    return res.status(500).json({ message: error.message || "Server error" });
  }
};

const searchAll = async (req, res) => {
  try {
    const { keyword, autocomplete } = req.query;
    let userId = null;
    if (req.user) userId = req.user.id;
    
    if (!keyword || keyword.trim() === "") {
      return res.status(400).json({ message: "Keyword is required" });
    }

    // Limit cố định cho autocomplete hoặc top N khi searchAll
    const effectiveLimit = autocomplete === "true" ? 15 : 5;

    // Gọi 3 service song song
    const [trackResults, playlistResults, userResults] = await Promise.all([
      searchTracks({ keyword, autocomplete, page: 1, limit: effectiveLimit, userId }),
      searchPlaylists({ keyword, autocomplete, page: 1, limit: effectiveLimit, userId }),
      searchUsers({ keyword, autocomplete, page: 1, limit: effectiveLimit })
    ]);

    return res.json({
      tracks: trackResults.tracks,
      playlists: playlistResults.playlists,
      users: userResults.users,
      totals: {
        tracks: trackResults.total,
        playlists: playlistResults.total,
        users: userResults.total
      }
    });
  } catch (error) {
    console.error("Error searching all:", error);
    return res.status(500).json({ message: error.message || "Server error" });
  }
};

module.exports = { searchTrack, searchPlaylist, searchUser, searchAll };
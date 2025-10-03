const Track = require("../models/track.js");
const User = require("../models/user.js");
const Playlist = require("../models/playlist.js");

async function searchTracks({ keyword, autocomplete, page = 1, limit = 20, userId }) {
    if (!keyword || keyword.trim() === "") {
        throw new Error("Keyword is required");
    }

    let privacyFilter = {};

    if (userId ) {

        // Lấy danh sách bạn bè
        const user = await User.findById(userId).select("following");

        // Filter privacy
        privacyFilter = {
            $or: [
            { privacy: "Public" },
            { artist: { $in: user.following }, privacy: "Friends" },
            { artist: userId, privacy: "Friends" },
            { artist: userId, privacy: "Private" }
            ]
        };
    } else {
        // Nếu không có userId (khách), chỉ thấy được public
        privacyFilter = { privacy: "Public" };
    }

    let tracks, total = 0;

    if (autocomplete === "true") {
        // Regex search
        tracks = await Track.find({
          ...privacyFilter,
          $or: [
              { title: { $regex: keyword, $options: "i" } },
              { genre: { $regex: keyword, $options: "i" } },
              { tags: { $regex: keyword, $options: "i" } }
          ]
        });
    } else {
        const skip = (parseInt(page) - 1) * parseInt(limit);

        [tracks, total] = await Promise.all([
        Track.find(
            { ...privacyFilter, $text: { $search: keyword } },
            { score: { $meta: "textScore" } }
        )
            .sort({ score: { $meta: "textScore" } })
            .skip(skip)
            .limit(parseInt(limit)),
        Track.countDocuments({ ...privacyFilter, $text: { $search: keyword } })
        ]);
      }

  return { tracks, total };
}

async function searchPlaylists({ keyword, autocomplete, page = 1, limit = 20, userId }) {
    if (!keyword || keyword.trim() === "") {
        throw new Error("Keyword is required");
    }

    let privacyFilter = {};

    if (!userId) {
        // Nếu không có userId (khách), chỉ thấy được public
        privacyFilter = { privacy: "Public" };
    } else {
            // Lấy danh sách following của user
            const user = await User.findById(userId).select("following");

            // Filter theo privacy
            privacyFilter = {
                $or: [
                { privacy: "Public" },
                { owner: { $in: user.following }, privacy: "Friends" },
                { owner: userId, privacy: "Friends" },
                { owner: userId, privacy: "Private" }
                ]
            };
        }

    let playlists, total = 0;

    if (autocomplete === "true") {
        // Autocomplete: regex search + privacy
        playlists = await Playlist.find({
        ...privacyFilter,
        $or: [
            { title: { $regex: keyword, $options: "i" } },
            { description: { $regex: keyword, $options: "i" } }
        ]
        }).limit(15);
    } else {
        // Search thường: text index + privacy + phân trang
        const skip = (parseInt(page) - 1) * parseInt(limit);

        [playlists, total] = await Promise.all([
        Playlist.find(
            { ...privacyFilter, $text: { $search: keyword } },
            { score: { $meta: "textScore" } }
        )
            .sort({ score: { $meta: "textScore" } })
            .skip(skip)
            .limit(parseInt(limit)),
        Playlist.countDocuments({ ...privacyFilter, $text: { $search: keyword } })
        ]);
    }

    return { playlists, total };
}

async function searchUsers({ keyword, autocomplete, page = 1, limit = 20 }) {
  if (!keyword || keyword.trim() === "") {
    throw new Error("Keyword is required");
  }

  let users, total = 0;

  if (autocomplete === "true") {
    // Autocomplete: regex search username/displayName
    users = await User.find({
      isLocked: false,
      $or: [
        { username: { $regex: keyword, $options: "i" } },
        { displayName: { $regex: keyword, $options: "i" } }
      ]
    }).limit(15);
  } else {
    // Search thường: text index + phân trang
    const skip = (parseInt(page) - 1) * parseInt(limit);

    [users, total] = await Promise.all([
      User.find(
        { isLocked: false, $text: { $search: keyword } },
        { score: { $meta: "textScore" } }
      )
        .sort({ score: { $meta: "textScore" } })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments({ isLocked: false, $text: { $search: keyword } })
    ]);
  }

  return { users, total };
}

module.exports = { searchTracks, searchPlaylists, searchUsers };
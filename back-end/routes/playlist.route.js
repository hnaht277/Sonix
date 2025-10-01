const express = require('express');
const router = express.Router();
const { authMiddleware, roleMiddleware } = require('../middlewares/auth.middleware.js');

const {
    getVisiblePlaylistsForUser,
    likePlaylist,
    unLikePlaylist,
    getTrendingPlaylists,
    addTrackToPlaylist,
    updatePlaylist,
    getPlaylistById,
    getPlaylistByUser,
    updatePlaylistCoverArt,
    getAllPlaylists,
    deletePlaylist,
    removeTrackFromPlaylist,
    createPlaylist,
    removePlaylistCoverArt,
} = require('../controllers/playlist.controller.js');

router.get('/trending', getTrendingPlaylists);

router.get('/all', authMiddleware, roleMiddleware('Admin'), getAllPlaylists); 

router.get('/', authMiddleware, getVisiblePlaylistsForUser);

router.get('/user/:userId/playlists', getPlaylistByUser);

router.post('/', authMiddleware, createPlaylist); 

router.post('/:id/like', authMiddleware, likePlaylist); 
router.delete('/:id/unlike', authMiddleware, unLikePlaylist); 

router.post('/:id/tracks', authMiddleware, addTrackToPlaylist);
router.delete('/:id/tracks/:trackId', authMiddleware, removeTrackFromPlaylist);

router.put('/:id/cover', authMiddleware, updatePlaylistCoverArt); 

router.put('/:id', authMiddleware, updatePlaylist); 

router.get('/:id', getPlaylistById); 

router.delete('/:id/cover', authMiddleware, removePlaylistCoverArt);

router.delete('/:id', authMiddleware, deletePlaylist);

module.exports = router;
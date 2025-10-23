const express = require('express');
const router = express.Router();
const {getUser, authMiddleware, roleMiddleware } = require('../middlewares/auth.middleware.js');

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
    toggleLikePlaylist,
} = require('../controllers/playlist.controller.js');

router.get('/trending', getTrendingPlaylists);

router.get('/all', authMiddleware, roleMiddleware('Admin'), getAllPlaylists); 

router.get('/', getUser, getVisiblePlaylistsForUser);

router.get('/user/:userId/playlists', getUser, getPlaylistByUser);

router.post('/', authMiddleware, createPlaylist); 

router.patch('/:id/toggle-like', authMiddleware, toggleLikePlaylist);
router.post('/:id/like', authMiddleware, likePlaylist); 
router.delete('/:id/unlike', authMiddleware, unLikePlaylist); 

router.post('/:id/tracks/:trackId', authMiddleware, addTrackToPlaylist);
router.delete('/:id/tracks/:trackId', authMiddleware, removeTrackFromPlaylist);

router.put('/:id/cover', authMiddleware, updatePlaylistCoverArt); 

router.put('/:id', authMiddleware, updatePlaylist); 

router.get('/:id', getPlaylistById); 

router.delete('/:id/cover', authMiddleware, removePlaylistCoverArt);

router.delete('/:id', authMiddleware, deletePlaylist);

module.exports = router;
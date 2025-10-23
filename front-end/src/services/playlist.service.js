import axios from 'axios';
import { getApiURL } from 'config/api.config';

export const playlistService = {
    getTrendingPlaylists: async () => {
        try {
            const response = await axios.get(getApiURL('getTrendingPlaylists'));
            return response.data;
        } catch (error) {
            console.error('Get trending playlists failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    getAllPlaylists: async (authToken) => {
        try {
            const response = await axios.get(getApiURL('getAllPlaylists'), {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Get all playlists failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    getVisiblePlaylistsForUser: async (authToken) => {
        try {
            const response = await axios.get(getApiURL('getVisiblePlaylistsForUser'), {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Get visible playlists for user failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    getPlaylistByUser: async (userId) => {
        try {
            const response = await axios.get(getApiURL('getPlaylistByUser', { userId }));
            return response.data;
        } catch (error) {
            console.error('Get playlist by user failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    createPlaylist: async (authToken, playlistData) => {
        try {
            const response = await axios.post(getApiURL('createPlaylist'), playlistData, {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Create playlist failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    toggleLikePlaylist: async (authToken, playlistId) => {
        try {
            const response = await axios.post(getApiURL('toggleLikePlaylist', { playlistId }), {}, {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Toggle like playlist failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    addTrackToPlaylist: async (authToken, playlistId, trackId) => {
        try {
            const response = await axios.post(getApiURL('addTrackToPlaylist', { id: playlistId, trackId: trackId }), {}, {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Add track to playlist failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    removeTrackFromPlaylist: async (authToken, playlistId, trackId) => {
        try {
            const response = await axios.delete(getApiURL('removeTrackFromPlaylist', { id: playlistId, trackId: trackId }), {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Remove track from playlist failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    updatePlaylistCoverArt: async (authToken, playlistId, coverFile) => {
        try {
            const formData = new FormData();
            formData.append("coverFile", coverFile); // tên key phải khớp với multer().single("coverFile")

            const response = await axios.put(
                getApiURL('updatePlaylistCoverArt', { id: playlistId }),
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${authToken}`,
                        "Content-Type": "multipart/form-data", // bắt buộc để axios gửi FormData đúng chuẩn
                    },
                }
            );

            return response.data;
        } catch (error) {
            console.error('Update playlist cover art failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    updatePlaylist: async (authToken, playlistId, updatedData) => {
        try {
            const response = await axios.put(getApiURL('updatePlaylist', { id: playlistId }), updatedData, {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });

            return response.data;
        } catch (error) {
            console.error('Update playlist failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    getPlaylistById: async (playlistId) => {
        try {
            const response = await axios.get(getApiURL('getPlaylistById', { id: playlistId }));
            return response.data;
        } catch (error) {
            console.error('Get playlist by ID failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    removePlaylistCoverArt: async (authToken, playlistId) => {
        try {
            const response = await axios.delete(getApiURL('removePlaylistCoverArt', { id: playlistId }), {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Remove playlist cover art failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    deletePlaylist: async (authToken, playlistId) => {
        try {
            const response = await axios.delete(getApiURL('deletePlaylist', { id: playlistId }), {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Delete playlist failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    
};
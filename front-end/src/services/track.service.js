import axios from 'axios';
import { getApiURL } from 'config/api.config';

export const trackService = {
    getTrendingTracks: async () => {
        try {
            const response = await axios.get(getApiURL('getTrendingTracks'));
            return response.data;
        } catch (error) {
            console.error('Get trending tracks failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    getAllTracks: async (authToken) => {
        try {
            const response = await axios.get(getApiURL('getAllTracks'), {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Get all tracks failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    streamAudio: async (authToken, trackId, startOffset = 0) => {
        try {
        // Gọi GET /tracks/:id/stream?startOffset=xx
        const response = await axios.get(
            getApiURL("streamAudio", { id: trackId }), // :id trong URL
            {
                params: startOffset ? { startOffset } : {}, // query string
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            }
        );

        return response.data;
        } catch (error) {
            console.error("Stream audio failed:", error.response?.data || error.message);
            throw error.response?.data || { message: "Unexpected error" };
        }
    },

    getTrackById: async (trackId) => {
        try {
            const response = await axios.get(getApiURL('getTrackById', { id: trackId }));
            return response.data;
        } catch (error) {
            console.error('Get track by ID failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    getVisibleTracksForUser: async (authToken) => {
        try {
            const response = await axios.get(getApiURL('getVisibleTracksForUser'), {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Get visible tracks for user failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    getTrackByUser: async (authToken, userId) => {
        try {
            const response = await axios.get(getApiURL('getTrackByUser', { userId }), {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Get track by user failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    uploadTrack: async (authToken, trackData, audioFile, coverFile) => {
        try {
            const formData = new FormData();

            Object.entries(trackData).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    formData.append(key, value);
                }
            });

            formData.append('audioFile', audioFile);
            if (coverFile) {
                formData.append('coverFile', coverFile);
            }
            const response = await axios.post(getApiURL('uploadTrack'), formData, {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data;
        } catch (error) {
            console.error('Upload track failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    toggleLikeTrack: async (authToken, trackId) => {
        try {
            const response = await axios.patch(getApiURL('toggleLikeTrack', { id: trackId }), {}, {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Toggle like track failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    confirmPlay: async (authToken, trackId) => {
        try {
            const response = await axios.post(getApiURL('confirmPlay', { id: trackId }), {}, {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Confirm play failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    updateCoverArt: async (authToken, trackId, coverFile) => {
        try {
            const formData = new FormData();
            formData.append('coverFile', coverFile);
            const response = await axios.put(getApiURL('updateCoverArt', { id: trackId }), formData, {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data;
        } catch (error) {
            console.error('Update cover art failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    updateTrack: async (authToken, trackId, trackData) => {
        try {
            const response = await axios.put(getApiURL('updateTrack', { id: trackId }), trackData, {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Update track failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    removeTrackCoverArt: async (authToken, trackId) => {
        try {
            const response = await axios.delete(getApiURL('removeTrackCoverArt', { id: trackId }), {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Remove track cover art failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    deleteTrack: async (authToken, trackId) => {
        try {
            const response = await axios.delete(getApiURL('deleteTrack', { id: trackId }), {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Delete track failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },
};
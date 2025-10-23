import axios from 'axios';
import { getApiURL } from 'config/api.config';

export const userService = {
    getUserProfile: async (authToken) => {
        try {
            const response = await axios.get(getApiURL('getUserProfile'), {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Get user profile failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    updateUserProfile: async (authToken, userData) => {
        try {
            const response = await axios.put(getApiURL('updateUserProfile'), userData, {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Update user profile failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    updateAvatar: async (authToken, avatar) => {
        try {
            const formData = new FormData();
            formData.append('avatar', avatar);

            const response = await axios.put(getApiURL('updateAvatar'), formData, {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data;
        } catch (error) {
            console.error('Update avatar failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    getFollowers: async (authToken) => {
        try {
            const response = await axios.get(getApiURL('getFollowers'), {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Get followers failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    getFollowing: async (authToken) => {
        try {
            const response = await axios.get(getApiURL('getFollowing'), {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Get following failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    followUser: async (authToken, userId) => {
        try {
            const response = await axios.post(getApiURL('followUser', { id: userId }), {}, {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Follow user failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    unfollowUser: async (authToken, userId) => {
        try {
            const response = await axios.delete(getApiURL('unfollowUser', { id: userId }), {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Unfollow user failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    getLikedTracks: async (authToken) => {
        try {
            const response = await axios.get(getApiURL('getLikedTracks'), {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Get liked tracks failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    getLikedPlaylists: async (authToken) => {
        try {
            const response = await axios.get(getApiURL('getLikedPlaylists'), {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Get liked playlists failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    setCurrentListening: async (authToken, trackId) => {
        try {
            const response = await axios.put(getApiURL('setCurrentListening', { trackId }), {}, {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Set current listening failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    stopListening: async (authToken) => {
        try {
            const response = await axios.delete(getApiURL('stopListening'), {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Stop listening failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },
};

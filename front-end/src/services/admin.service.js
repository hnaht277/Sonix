import axios from 'axios';
import { getApiURL } from 'config/api.config';

export const adminService = {
    getAllUsers: async (authToken) => {
        try {
            const response = await axios.get(getApiURL('getAllUsers'), {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Get all users failed:', error.response?.data || error.message);
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

    lockUser: async (authToken, userId, duration, reason) => {
        try {
            const response = await axios.post(
                getApiURL('lockUser', { id: userId }),
                { duration, reason },
                { headers: { Authorization: `Bearer ${authToken}` } }
            );
            return response.data;
        } catch (error) {
            console.error('Lock user failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    unlockUser: async (authToken, userId) => {
        try {
            const response = await axios.post(
                getApiURL('unlockUser', { id: userId }),
                {},
                { headers: { Authorization: `Bearer ${authToken}` } }
            );
            return response.data;
        } catch (error) {
            console.error('Unlock user failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },
};
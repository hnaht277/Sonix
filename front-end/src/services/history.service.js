import axios from 'axios';
import { getApiURL } from 'config/api.config';

export const historyService = {
    getFeed: async (authToken, page = 1, limit = 10) => {
        try {
            const response = await axios.get(getApiURL('getFeed'), {
                params: { page, limit },
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Get feed failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    getTopTracks: async (authToken, limit = 10) => {
        try {
            const response = await axios.get(getApiURL('getTopTracks'), {
                params: { limit },
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Get top tracks failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    getFeedByUserId: async (userId, page = 1, limit = 10) => {
        try {
            const response = await axios.get(getApiURL('getFeedByUserId', { userId }), {
                params: { page, limit },
            });
            return response.data;
        } catch (error) {
            console.error('Get feed by user ID failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

};
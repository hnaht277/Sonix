import axios from 'axios';
import { getApiURL } from 'config/api.config';

export const searchService = {
    searchTrack: async (authToken, { keyword, autocomplete = false, page = 1, limit = 20 }) => {
        try {
            const response = await axios.get(getApiURL('searchTrack'), {
            headers: {
                Authorization: `Bearer ${authToken}`,
            },
            params: {
                keyword,
                autocomplete,
                page,
                limit,
            },
            });
            return response.data;
        } catch (error) {
            console.error('Search track failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    searchPlaylist: async (authToken, { keyword, autocomplete = false, page = 1, limit = 20 }) => {
        try {
            const response = await axios.get(getApiURL('searchPlaylist'), {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
                params: {
                    keyword,
                    autocomplete,
                    page,
                    limit,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Search playlist failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    searchUser: async (authToken, { keyword, autocomplete = false, page = 1, limit = 20 }) => {
        try {
            const response = await axios.get(getApiURL('searchUser'), {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
                params: {
                    keyword,
                    autocomplete,
                    page,
                    limit,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Search user failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    searchAll: async (authToken, { keyword, autocomplete = false }) => {
        try {
            const response = await axios.get(getApiURL('searchAll'), {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
                params: {
                    keyword,
                    autocomplete,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Search all failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },
};

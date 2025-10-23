import axios from 'axios';
import { get } from 'config';
import { getApiURL } from 'config/api.config';

export const commentService = {
    getCommentsOfTrack: async (trackId, page = 1, limit = 10) => {
        try {
            const response = await axios.get(getApiURL('getCommentsOfTrack', { trackId }), {
                params: { page, limit },
            });
            return response.data;
        } catch (error) {
            console.error('Get comments of track failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    createComment: async (authToken, commentData) => {
        try {
            const response = await axios.post(getApiURL('createComment'), commentData, {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Create comment failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    toggleLikeComment: async (authToken, commentId) => {
        try {
            const response = await axios.patch(getApiURL('toggleLikeComment', { commentId }), {}, {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Toggle like comment failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    updateComment: async (authToken, commentId, updatedData) => {
        try {
            const response = await axios.put(getApiURL('updateComment', { commentId }), updatedData, {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Update comment failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    deleteComment: async (authToken, commentId) => {
        try {
            const response = await axios.delete(getApiURL('deleteComment', { commentId }), {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Delete comment failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },
};
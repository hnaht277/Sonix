import axios from 'axios';
import { getApiURL } from 'config/api.config';

export const messageService = {
    createMessage: async (authToken, messageData) => {
        try {
            const response = await axios.post(getApiURL('createMessage'), messageData, {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Create message failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    replyFeed: async (authToken, historyId, replyData) => {
        try {
            const response = await axios.post(getApiURL('replyFeed', { historyId }), replyData, {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Reply feed failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    getMessages: async (authToken, conversationId, page = 1, limit = 20) => {
        try {
            const response = await axios.get(getApiURL('getMessages', { conversationId }), {
                params: { page, limit },
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Get messages failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },
};
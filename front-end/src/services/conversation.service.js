import axios from 'axios';
import { getApiURL } from 'config/api.config';

export const conversationService = {
    createConversation: async (authToken, participantIds) => {
        try {
            const response = await axios.post(
                getApiURL('createConversation'),
                { participantIds },
                {
                    headers: {
                        Authorization: `Bearer ${authToken}`,
                    },
                }
            );
            return response.data;
        } catch (error) {
            console.error('Create conversation failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    getConversationsForUser: async (authToken) => {
        try {
            const response = await axios.get(getApiURL('getConversationsForUser'), {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Get conversations for user failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    deleteConversation: async (authToken, conversationId) => {
        try {
            const response = await axios.delete(getApiURL('deleteConversation', { conversationId }), {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Delete conversation failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },
};

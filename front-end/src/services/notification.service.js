import axios from 'axios';
import { getApiURL } from 'config/api.config';

export const notificationService = {
    getNotifications: async (authToken, page = 1, limit = 10) => {
        try {
            const response = await axios.get(getApiURL('getNotifications'), {
                params: { page, limit },
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Get notifications failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    markAsRead: async (authToken, notificationId) => {
        try {
            const response = await axios.patch(getApiURL('markNotificationAsRead', { notificationId }), {}, {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Mark notification as read failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    markAllAsRead: async (authToken) => {
        try {
            const response = await axios.patch(getApiURL('markAllNotificationsAsRead'), {}, {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Mark all notifications as read failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    deleteNotification: async (authToken, notificationId) => {
        try {
            const response = await axios.delete(getApiURL('deleteNotification', { notificationId }), {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Delete notification failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    deleteAllNotifications: async (authToken) => {
        try {
            const response = await axios.delete(getApiURL('deleteAllNotifications'), {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Delete all notifications failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    getNotificationById: async (authToken, notificationId) => {
        try {
            const response = await axios.get(getApiURL('getNotificationById', { notificationId }), {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Get notification by ID failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },
};

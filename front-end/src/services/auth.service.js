import axios from 'axios';
import { getApiURL } from 'config/api.config';

export const authService = {
    register: async (userData) => {
        try {
            const response = await axios.post(getApiURL('register'), userData);
            return response.data;
        } catch (error) {
            console.error('Registration failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    login: async (credentials) => {
        try {
            const response = await axios.post(getApiURL('login'), credentials);
            return response.data;
        } catch (error) {
            console.error('Login failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    activateAccount: async (token) => {
        try {
            const response = await axios.post(getApiURL('activateAccount', { token: token }));
            return response.data;
        } catch (error) {
            console.error('Account activation failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    changePassword: async (authToken, passwordData) => {
        try {
            const response = await axios.post(getApiURL('changePassword'), passwordData, {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Change password failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    forgotPassword: async (email) => {
        try {
            const response = await axios.post(getApiURL('forgotPassword'), { email });
            return response.data;
        } catch (error) {
            console.error('Forgot password request failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },

    resetPassword: async (resetData) => {
        try {
            const response = await axios.post(getApiURL('resetPassword'), resetData);
            return response.data;
        } catch (error) {
            console.error('Reset password failed:', error.response?.data || error.message);
            throw error.response?.data || { message: 'Unexpected error' };
        }
    },
};
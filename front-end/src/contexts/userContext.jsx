import React, { createContext, useContext, useState, useEffect } from 'react';

// Create User Context
const UserContext = createContext();

// Custom hook to use user context
export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};

// User Provider Component
export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [token, setToken] = useState(null);

    // Initialize auth state from localStorage
    useEffect(() => {
        const savedToken = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');

        if (savedToken && savedUser) {
            try {
                const parsedUser = JSON.parse(savedUser);
                setToken(savedToken);
                setUser(parsedUser);
                setIsAuthenticated(true);
            } catch (error) {
                console.error('Error parsing saved user data:', error);
                logout();
            }
        }
        setIsLoading(false);
    }, []);

    const login = (userData, userToken) => {
        setUser(userData);
        setToken(userToken);
        setIsAuthenticated(true);

        // Save to localStorage
        localStorage.setItem('token', userToken);
        localStorage.setItem('user', JSON.stringify(userData));
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        setIsAuthenticated(false);

        // Clear localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };

    const updateUser = (userData) => {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
    };


    return (
        <UserContext.Provider
            value={{
                // New auth state
                user,
                isAuthenticated,
                isLoading,
                token,
                login,
                logout,
                updateUser,
            }}
        >
            {children}
        </UserContext.Provider>
    );
};

export default UserContext;
import React, { createContext, useContext, useState } from 'react';

const ErrorContext = createContext();

export const useError = () => {
    const context = useContext(ErrorContext);
    if (!context) {
        throw new Error('useError must be used within an ErrorProvider');
    }
    return context;
};

export const ErrorProvider = ({ children }) => {
    const [error, setError] = useState(null);

    const showError = (errorCode, errorMsg) => {
        setError({ errorCode, errorMsg });
    };

    const clearError = () => {
        setError(null);
    };

    return <ErrorContext.Provider value={{ error, showError, clearError }}>{children}</ErrorContext.Provider>;
};

export default ErrorContext;
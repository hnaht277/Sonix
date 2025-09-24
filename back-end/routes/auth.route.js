const express = require('express');
const router = express.Router();

const { authMiddleware } = require('../middlewares/auth.middleware.js');
const { register,
        login,
        staffLogin, 
        activateAccount,
        changePassword,
        forgotPassword,
        logout,
        resetPassword, } = require('../controllers/auth.controller.js');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/staff-login', staffLogin); 
router.post('/reset-password', resetPassword);
router.post('/activate/:token', activateAccount);

// Protected routes
router.post('/change-password', authMiddleware, changePassword);
router.post('/logout', authMiddleware, logout);

module.exports = router;


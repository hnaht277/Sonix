const User = require('../models/user.js');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const passwordValidator = require('password-validator');
const nodemailer = require('nodemailer');

// Tạo schema cho password
const passwordSchema = new passwordValidator();
passwordSchema
    .is()
    .min(8) // Must have at least 8 characters
    .has()
    .uppercase() // Must have uppercase letters
    .has()
    .lowercase() // Must have lowercase letters
    .has()
    .digits() // Must have digits
    .has()
    .symbols(); // Must have special characters

const register = async (req, res) => {
    try {
        const { username, displayName, email, password, retypePassword, phone, dateOfBirth, gender } = req.body;

        if (!username || !displayName || !email || !password || !retypePassword || !phone || !dateOfBirth || !gender) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        if (!passwordSchema.validate(password)) {
            return res.status(400).json({
                message: 'Password is not strong enough.',
                details:
                    'Password must have at least 8 characters, including uppercase, lowercase, numbers and special characters.',
            });
        }

        if (password !== retypePassword) {
            return res.status(400).json({ message: 'Passwords do not match.' });
        }

        const existingUser = await User.findOne({$or: [{ email }, { phone }]});
        if (existingUser) {
            return res.status(400).json({ message: 'Email or phone number is already in use.' });
        }

        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            return res.status(400).json({ message: 'Username is already taken.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await User.create({
            username,
            displayName,
            email,
            hashedPassword,
            phone,
            dateOfBirth,
            gender,
        });

        const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
        
        // Activation token generation
        const activationToken = crypto.randomBytes(32).toString('hex');
        const activationExpires = Date.now() + 3600000; // 1 hour
        newUser.activationToken = activationToken;
        newUser.activationExpires = activationExpires;

        await newUser.save();

        const activationLink = `${process.env.FRONTEND_URL}/activate/${activationToken}`;
        console.log(`Activation link (send this via email): ${activationLink}`);

        // Send activation email
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: newUser.email,
            subject: 'Activate your Sonix account',
            html: `<p>Hi ${newUser.displayName},</p>
                   <p>Thank you for registering on Sonix. Please click the link below to activate your account:</p>
                   <a href="${activationLink}">Activate Account</a>
                   <p>This link will expire in 1 hour.</p>`,
        };

        await transporter.sendMail(mailOptions);

        console.log(`Activation email sent to: ${newUser.email}`);

        res.status(201).json({ 
            message: 'User registered successfully. Please check your email to activate the account.',
            user: {
                id: newUser._id,
                username: newUser.username,
                email: newUser.email,
                displayName: newUser.displayName,
            },
            token: token,
        });
    } catch (error) {
        console.error('Register Error:', error);
        res.status(500).json({ message: 'A server error occurred.' });
    }

};

const activateAccount = async (req, res) => {
    try {
        const { token } = req.params;
        if (!token) {
            return res.status(400).json({ message: 'Activation token is required.' });
        }

        const user = await User.findOne({ activationToken: token });

        if (!user) {
            return res
                .status(400)
                .json({ message: 'Invalid or expired activation token.\nConsider re-creating your account.' });
        } else if (user.activateStatus) {
            return res.status(200).json({ message: 'Your account is already activated.' });
        } else if (user.activationExpires < Date.now()) {
            // Delete account if activation token is expired
            try {
                await User.deleteOne({ _id: user._id });
            } catch (error) {
                user.email = undefined; // Clear email to avoid revealing it
                user.activationToken = undefined;
                user.activationExpires = undefined;
                user.isLocked = true; // Lock the account
                await user.save();
                console.error('Error deleting expired user account:', error);
            }
            return res
                .status(400)
                .json({ message: 'Invalid or expired activation token.\nConsider re-creating your account.' });
        }

        user.activateStatus = true;
        await user.save();

        res.status(200).json({ message: 'Account activated successfully.' });
    } catch (error) {
        console.error('Activate Account Error:', error);
        res.status(500).json({ message: 'A server error occurred.' });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Please enter email and password.' });
        }

        const user = await User.findOne({ email });

        if (!user || !(await bcrypt.compare(password, user.hashedPassword))) {
            return res.status(401).json({ message: 'Email or password is incorrect.' });
        }

        // Check if user is a customer (only customers can login through /login)
        // if (user.role !== 'User') {
        //     return res.status(401).json({ message: 'Email or password is incorrect.' });
        // }

        if (user.lockInfo?.isLocked) {
            // Nếu có ngày hết hạn, kiểm tra xem đã quá hạn chưa
            if (user.lockInfo.expiresAt && user.lockInfo.expiresAt < new Date()) {
                // -> Hết hạn => tự mở khóa
                user.lockInfo = {
                isLocked: false,
                lockedAt: null,
                expiresAt: null,
                reason: "",
                lockedBy: null,
                };
                await user.save();
            } else {
                // -> Chưa hết hạn => chặn đăng nhập
                return res.status(403).json({
                message: user.lockInfo.expiresAt
                    ? `Your account is locked until ${user.lockInfo.expiresAt.toLocaleString()}. Reason: ${user.lockInfo.reason}`
                    : "Your account has been permanently locked. Please contact support.",
                });
            }
        }

        if (!user.activateStatus) {
            if (user.activationExpires < Date.now()) {
                // Delete account if activation token is expired
                try {
                    await User.deleteOne({ _id: user._id });
                } catch (error) {
                    user.email = undefined; // Clear email to avoid revealing it
                    user.activationToken = undefined;
                    user.activationExpires = undefined;
                    user.lockInfo = {
                        isLocked: true,
                        lockedAt: new Date(),
                        expiresAt: null,
                        reason: "Activation expired",
                        lockedBy: null,
                    };
                    await user.save();
                    console.error('Error deleting expired user account:', error);
                }
                return res.status(401).json({ message: 'Email or password is incorrect.' });
            }
            return res
                .status(403).json({ message: 'Your account is not activated. Please check your email for the activation link.' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: '1d',
        });

        res.status(200).json({
            message: 'Login successful!',
            token: token,
            user: {
                id: user._id,
                name: user.displayName,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'A server error occurred.' });
    }
};

const staffLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Please enter email and password.' });
        }

        const user = await User.findOne({ email });

        if (!user || !(await bcrypt.compare(password, user.hashedPassword))) {
            return res.status(401).json({ message: 'Email or password is incorrect.' });
        }

        // Check if user has any staff role
        const staffRoles = ['Admin', 'Moderator'];
        const hasStaffRole = user.role.some(role => staffRoles.includes(role));

        if (!hasStaffRole) {
            return res.status(401).json({ message: 'Email or password is incorrect.' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: '1d',
        });

        res.status(200).json({
            message: 'Login successful!',
            token: token,
            user: {
                id: user._id,
                name: user.displayName,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        console.error('Staff Login Error:', error);
        res.status(500).json({ message: 'A server error occurred.' });
    }
};

const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, retypeNewPassword } = req.body;
        const userId = req.user.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.hashedPassword);
        if (!isMatch) {
            return res.status(401).json({ message: 'Current password is incorrect.' });
        }

        
        if (!passwordSchema.validate(newPassword)) {
            return res.status(400).json({
                message: 'New password is not strong enough.',
                details:
                    'Password must have at least 8 characters, including uppercase, lowercase, numbers and special characters.',
            });
        }

        if (newPassword !== retypeNewPassword) {
            return res.status(400).json({ message: 'New password confirmation does not match.' });
        }

        const salt = await bcrypt.genSalt(10);
        user.hashedPassword = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.status(200).json({ message: 'Password changed successfully.' });
    } catch (error) {
        console.error('Change Password Error:', error);
        res.status(500).json({ message: 'A server error occurred.' });
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email is required.' });
        }
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'No account with that email found.' });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetExpires = Date.now() + 3600000; // 1 hour
        user.passwordResetToken = resetToken;
        user.passwordResetExpires = resetExpires;
        await user.save();

        const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
        console.log(`Password reset link (send this via email): ${resetLink}`);

        // Send reset email
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Sonix Password Reset',
            html: `<p>Hi ${user.displayName},</p>
                   <p>You requested a password reset. Please click the link below to reset your password:</p>
                   <a href="${resetLink}">Reset Password</a>
                   <p>This link will expire in 1 hour. If you did not request this, please ignore this email.</p>`,
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending reset email:', error);
                return res.status(500).json({ message: 'Failed to send reset email.' });
            }
            console.log('Reset email sent:', info.response);
            res.status(200).json({ message: 'Password reset email sent successfully.' });
        });

    } catch (error) {
        console.error('Forgot Password Error:', error);
        res.status(500).json({ message: 'A server error occurred.' });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { token, newPassword, retypeNewPassword } = req.body;
        if (!token || !newPassword || !retypeNewPassword) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        if (newPassword !== retypeNewPassword) {
            return res.status(400).json({ message: 'New password confirmation does not match.' });
        }

        if (!passwordSchema.validate(newPassword)) {
            return res.status(400).json({
                message: 'New password is not strong enough.',
                details:
                    'Password must have at least 8 characters, including uppercase, lowercase, numbers and special characters.',
            });
        }

        // Find user by reset token
        const user = await User.findOne({ passwordResetToken: token, passwordResetExpires: { $gt: Date.now() } });
        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired password reset token.' });
        }

        // Hash new password and save
        const salt = await bcrypt.genSalt(10);
        user.hashedPassword = await bcrypt.hash(newPassword, salt);
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        res.status(200).json({ message: 'Password reset successful.' });
    } catch (error) {
        console.error('Reset Password Error:', error);
        res.status(500).json({ message: 'A server error occurred.' });
    }
};

const logout = async (req, res) => {
    try {
        // Since JWT is stateless, logout can be handled on the client side by deleting the token.
        res.status(200).json({ message: 'Logout successful.' });
    } catch (error) {
        console.error('Logout Error:', error);
        res.status(500).json({ message: 'A server error occurred.' });
    }
};

module.exports = {
    register,
    login,
    staffLogin,
    activateAccount,
    changePassword,
    forgotPassword,
    logout,
    resetPassword,
};
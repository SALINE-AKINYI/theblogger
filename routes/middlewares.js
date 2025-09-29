import { getTotalUnreadMessages } from '../database.js';

// Middleware to ensure the user is logged in
const mustBeLoggedIn = (req, res, next) => {
  if (req.user.userId) { 
    return next();
  }
  return res.redirect('/');
};

//
const countUnreadMessages = (req, res, next) => {
    // Check if the user is logged in using the reliable session variable
    if (req.user.userId) {
        try {
            const userId = req.user.userId;
            res.locals.unreadCount = getTotalUnreadMessages(userId);
        } catch (error) {
            console.error('Error fetching total unread count:', error);
            res.locals.unreadCount = 0; // Default to 0 on error
        }
    } else {
        res.locals.unreadCount = 0;
    }
    next();
};

export {mustBeLoggedIn, countUnreadMessages};



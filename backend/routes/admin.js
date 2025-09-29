// routes/admin.js

import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { db } from '../database.js';

const router = express.Router();

// JWT middleware for authentication
const authenticateJWT = (req, res, next) => {
  const token = req.cookies.appCookie;
  if (!token) {
    return res.redirect('/admin/login');
  }
  try {
    const user = jwt.verify(token, process.env.JWTSECRET);
    req.user = user;
    next();
  } catch (error) {
    res.clearCookie('appCookie');
    return res.redirect('/admin/login');
  }
};

// Authorization middleware for admins
const authorizeAdmin = (req, res, next) => {
  if (req.user && req.user.isAdmin === 1) {
    next();
  } else {
    // Correctly handle the error and redirect
    res.status(403).send('Access denied. Admins only.');
  }
};

// Helper function to render login errors
const renderLoginError = (res, errorMessage) => {
  const errors = [errorMessage];
  const windowTitle = 'Viktor | Admin Login';
  const pageTitle = 'Admin Login Page';
  res.render('admin-login', { errors, windowTitle, pageTitle });
};

// GET admin-login page
router.get('/login', (req, res) => {
  const windowTitle = 'Viktor | Admin Login';
  const pageTitle = 'Admin Login Page';
  res.render('admin-login', { windowTitle, pageTitle, errors: [] });
});
/*
// POST admin-login form
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (typeof username !== 'string' || typeof password !== 'string' || username.trim() === '' || password.trim() === '') {
    return renderLoginError(res, 'Invalid username / password.');
  }

  // Check details of the person logging in from the db
  const userInQuestionStatement = db.prepare('SELECT * FROM users WHERE USERNAME = ?');
  const userInQuestion = userInQuestionStatement.get(username.trim());

  if (!userInQuestion) {
    return renderLoginError(res, 'Invalid username / password.');
  }

  // Check if admin
  if (userInQuestion.isAdmin !== 1) {
    return renderLoginError(res, 'Access denied... Admins only.');
  }

  // Compare the password
  const matchOrNot = bcrypt.compareSync(password, userInQuestion.password); // Using sync for simplicity
  if (!matchOrNot) {
    return renderLoginError(res, 'Invalid username / password.');
  }

  // If admin, assign cookie
  const tokenPayload = {
    userId: userInQuestion.id,
    username: userInQuestion.username,
    isAdmin: userInQuestion.isAdmin,
  };
  const tokenValue = jwt.sign(tokenPayload, process.env.JWTSECRET, { expiresIn: '1h' });

  res.cookie('appCookie', tokenValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 1000 * 60 * 60,
  });

  res.redirect('/admin');
});
*/

// POST admin-login form
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const isAjax = req.xhr || req.headers.accept.includes('json');

  const sendResponse = (status, errors, redirectUrl = null) => {
    if (isAjax) {
      res.status(status).json({ errors, redirectUrl });
    } else {
      // Fallback for non-AJAX requests
      res.redirect(redirectUrl || '/');
    }
  };

  if (typeof username !== 'string' || typeof password !== 'string' || username.trim() === '' || password.trim() === '') {
    return sendResponse(400, ['Invalid username / password.']);
  }

  const userInQuestionStatement = db.prepare('SELECT * FROM users WHERE USERNAME = ?');
  const userInQuestion = userInQuestionStatement.get(username.trim());

  if (!userInQuestion) {
    return sendResponse(400, ['Invalid username / password.']);
  }

  if (userInQuestion.isAdmin !== 1) {
    return sendResponse(403, ['Access denied... Admins only.']);
  }

  const matchOrNot = bcrypt.compareSync(password, userInQuestion.password);
  if (!matchOrNot) {
    return sendResponse(400, ['Invalid username / password.']);
  }

  const tokenPayload = {
    userId: userInQuestion.id,
    username: userInQuestion.username,
    isAdmin: userInQuestion.isAdmin,
  };
  const tokenValue = jwt.sign(tokenPayload, process.env.JWTSECRET, { expiresIn: '1h' });

  res.cookie('appCookie', tokenValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 1000 * 60 * 60,
  });

  return sendResponse(200, null, '/admin');
});


// GET admin dashboard (protected)
router.get('/', authenticateJWT, authorizeAdmin, (req, res) => {
  try {
    // Fetch all admins
    const allAdmins = db.prepare('SELECT id, username, email FROM users WHERE isAdmin = 1').all();
    
    // Fetch all regular users
    const allUsers = db.prepare('SELECT id, username, email FROM users WHERE isAdmin = 0').all();
    
    // Fetch all posts with user information
    const allPosts = db.prepare(`
      SELECT 
        posts.id AS postId,
        posts.title,
        posts.body,
        posts.createdDate,
        users.id AS authorId,
        users.username AS authorName
      FROM posts JOIN users ON posts.authorId = users.id ORDER BY posts.createdDate DESC
    `).all();

    const windowTitle = 'Viktor | Admin Dashboard';
    const pageTitle = 'Administrator Dashboard';

    // Render the admin dashboard with all data
    res.render('admin', { allAdmins, allUsers, allPosts, loggedInAdmin: req.user.username, windowTitle, pageTitle });
  } catch (error) {
    res.status(500).send('Error fetching data.');
  }
});


// Admin action: Delete a user (protected)
router.post('/delete/user/:id', authenticateJWT, authorizeAdmin, (req, res) => {
  try {
    const userId = req.params.id;
    // Delete comments and likes first to avoid foreign key constraints
    db.prepare('DELETE FROM comments WHERE authorId = ?').run(userId);
    db.prepare('DELETE FROM likes WHERE authorId = ?').run(userId);
    // Delete posts by the user
    db.prepare('DELETE FROM posts WHERE authorId = ?').run(userId);
    // Finally, delete the user
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    res.redirect('/admin');
  } catch (error) {
    res.status(500).send('Error deleting user.');
  }
});

// Admin action: Delete a post (protected)
router.post('/delete/post/:id', authenticateJWT, authorizeAdmin, (req, res) => {
  try {
    const postId = req.params.id;
    // The database is set up with ON DELETE CASCADE, so deleting the post will automatically delete associated comments and likes.
    db.prepare('DELETE FROM posts WHERE id = ?').run(postId);
    res.redirect('/admin');
  } catch (error) {
    res.status(500).send('Error deleting post.');
  }
});

export default router;

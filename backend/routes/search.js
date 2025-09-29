import express from 'express';
import { searchPosts, searchUsersByUsername,  getUserProfileWithPosts} from '../database.js';

const router = express.Router();

router.get('/results', (req, res) => {
    const query = req.query.q;

    if (!query) {
        return res.render('search-results', {
            posts: [],
            users: [],
            query: '',
            message: 'Please enter a search term.'
        });
    }

    const foundPosts = searchPosts(query);
    const foundUsers = searchUsersByUsername(query);

    const message = (foundPosts.length === 0 && foundUsers.length === 0)
        ? 'No posts or users found matching your search.'
        : '';

    res.render('search-results', {
        posts: foundPosts,
        users: foundUsers,
        query: query,
        message: message,
        currentUser: req.user // Pass current user for conditional rendering if needed
    });
});

/*
// Route to view a user's profile and their posts using a user ID
router.get('/profile/:id', (req, res) => {
    const userId = req.params.id;

    const userProfile = getUserProfileWithPosts(userId);

    if (!userProfile) {
        return res.status(404).render('404', { message: 'User not found' });
    }

    res.render('profile', { userProfile });
});
*/

/*
// Route to view a user's profile and their posts using a username
router.get('/profile/:username', (req, res) => {
    const username = req.params.username;

    // Call the updated database function with the username
    const userProfile = getUserProfileWithPosts(username);

    if (!userProfile) {
        return res.status(404).render('404', { message: 'User not found' });
    }

    res.render('profile', { userProfile });
});
*/

/*
// GET route for the user profile, accessible to everyone
router.get('/profile/:username', (req, res) => {
    try {
        const userProfile = getUserProfileWithPosts(req.params.username, req.user.id);

        // Get the logged-in user's ID from the req.user object, if it exists
        // This will be 'undefined' or a similar falsy value if the user is not logged in
        const loggedInUserId = req.user ? req.user.id : null; 

        if (userProfile) {
            res.render('profile', { 
                userProfile,
                loggedInUserId, // Pass the logged-in user's ID (or null/undefined)
                user: req.user // Pass the full user object if needed for the header
            });
        } else {
            res.status(404).render('profile', { 
                userProfile: null,
                loggedInUserId,
                user: req.user
            });
        }
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).send('Error fetching user profile.');
    }
});
*/

// GET route for the user profile, accessible to everyone
router.get('/profile/:username', (req, res) => {
    try {
        // Correctly and safely get the logged-in user's ID using a ternary operator.
        // This ensures the code does not break if a guest user is viewing the page.
        const loggedInUsername = req.user ? req.user.username : null; 

        // Pass the correctly retrieved loggedInUserId to the function.
        const userProfile = getUserProfileWithPosts(req.params.username);

        if (userProfile) {
            /*
            if(loggedInUsername && loggedInUsername == userProfile.username ){
                const windowTitle = 'Viktor | Dashboard';
                const pageTitle = `User Dashboard`;
                return res.redirect('/dashboard', {windowTitle, pageTitle})
            } */ 
            res.render('profile', { 
                userProfile,
                loggedInUsername,
                user: req.user// Pass the full user object if needed for the header
            });
        } else {
            res.status(404).render('profile', { 
                userProfile: null,
                loggedInUserId,
                user: req.user
            });
        }
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).send('Error fetching user profile.');
    }
});


export default router;

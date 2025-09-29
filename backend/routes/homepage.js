// router.js
import express from 'express';
// Import getAllPostsWithDetails from your database.js file
import { db, getAllPostsWithDetails } from '../database.js';
import { mustBeLoggedIn } from './middlewares.js';

const router = express.Router();

//homepage 
router.get('/', (req,res)=>{
  const windowTitle = 'Viktor | Homepage';
  const pageTitle = `Welcome to the Blogger`;

  const userId = req.user ? req.user.userId : null; // Get user ID from the `req.user` object


  // Fetch all posts with their details (including comments and likes counts)
  const allPosts = getAllPostsWithDetails(userId);

  res.render('homepage', { allPosts, windowTitle, pageTitle, user: req.user });
});

//user dashboard
router.get('/dashboard', mustBeLoggedIn, (req, res) => {
   if(req.user)  {
    // Fetch posts created by the logged-in user
    const statement = db.prepare('SELECT * FROM posts WHERE authorId = ? ORDER BY createdDate DESC');
    const posts = statement.all(req.user.userId);

    const windowTitle = 'Viktor | Dashboard';
    const pageTitle = `User Dashboard`;
    return res.render("dashboard", {posts, windowTitle, pageTitle, user: req.user.username} );
  }
});

export default router;

import express from 'express';
import { db, getPostWithDetails } from '../database.js'; // Import getPostWithDetails
import sanitizeHTML from 'sanitize-html';
import { mustBeLoggedIn } from "./middlewares.js";

const router = express.Router();

// Shared validation logic for creating and editing posts
const sharedPostValidation = (req)=>{
  const errors = [];

  if(typeof req.body.title !== "string") req.body.title = "";
  if(typeof req.body.body !== "string") req.body.body = "";

  //trim - sanitize / strip out html from entering database
  req.body.title = sanitizeHTML(req.body.title.trim(), {allowedTags: [], allowedAttributes: {}});
  req.body.body = sanitizeHTML(req.body.body.trim(), {allowedTags: [], allowedAttributes  : {}});  
  
  if(!req.body.title) errors.push("You must provide a title for your post.");
  if(!req.body.body) errors.push("You must provide a body for your post.");
  
  return errors;
};

                  //ROUTES

// GET creating a new post
router.get('/create-post', mustBeLoggedIn, (req,res)=>{
  const windowTitle = 'Viktor | CreatePost';
  const pageTitle = `Create Post Page `;
  res.render('create-post', {windowTitle, pageTitle});
});

// GET View a single post
router.get('/post/:id', (req, res) => {
  const postId = req.params.id;
  const userId = req.user ? req.user.userId : null; // Get user ID from the `req.user` object

  //const postDetails = getPostWithDetails(postId); // Use the new function
  const postDetails = getPostWithDetails(postId, userId);

  if (!postDetails) {
    return res.redirect('/');
  }

  // Check if the logged-in user is the author of the post
  const isAuthor = req.user && postDetails.authorId === req.user.userId;

  // Render the single post template with the post data
  const windowTitle = 'Viktor | SinglePost';
  const pageTitle = `Post Page`;
  res.render('single-post', { post: postDetails, comments: postDetails.comments, isAuthor, windowTitle, pageTitle });
});

// GET Edit a post
router.get('/edit-post/:id', mustBeLoggedIn, (req, res) => {
  const postId = req.params.id;
  const postDetails = getPostWithDetails(postId); // Use the new function

  // //if not the author of the post, redirect
  // if(!postDetails || (req.user && postDetails.authorId !== req.user.userId)) {
  //  return res.redirect('/');
  // }

  //otherwise, show the editing template
  const windowTitle = 'Viktor | Edit';
  const pageTitle = `Editing Page`;
  res.render('edit-post', { post: postDetails, windowTitle, pageTitle });  
});

// POST Create a new post
router.post('/create-post', mustBeLoggedIn, (req,res)=>{
  const errors = sharedPostValidation(req);

  if(errors.length) {
    const windowTitle = 'Viktor | Create Post';
    const pageTitle = `Create post page `;
    return res.render('create-post', {errors, windowTitle, pageTitle});
  } 

  //save post to database
  const statement = db.prepare('INSERT INTO posts (title, body, authorId, createdDate) VALUES (?, ?, ?, ?)');
  statement.run(req.body.title, req.body.body, req.user.userId, new Date().toISOString());

  res.redirect(`/dashboard`);
});

// POST Edit a post
router.post('/edit-post/:id', mustBeLoggedIn, (req, res) => {
  const postId = req.params.id;
  const postDetails = getPostWithDetails(postId);

  // // Check if the post exists and if the user is the author
  // if(!postDetails || (req.user && postDetails.authorId != req.user.userId)) {
  //   return res.redirect('/dashboard');
  // }

  const errors = sharedPostValidation(req);
  if(errors.length) {
    const windowTitle = 'Viktor | Edit';
    const pageTitle = `Edit post page `;
    return res.render('edit-post', {post: postDetails, errors, windowTitle, pageTitle});
  }

  // Update the post in the database
  const updateStatement = db.prepare('UPDATE posts SET title = ?, body = ? WHERE id = ?');
  updateStatement.run(req.body.title, req.body.body, postId);

  // Redirect to the dashboard after successful update
  res.redirect('/dashboard');
});

// POST Delete a post
router.post('/delete-post/:id', mustBeLoggedIn, (req, res) => {
  const postId = req.params.id;
  const postStatement = db.prepare('SELECT * FROM posts WHERE id = ?');
  const post = postStatement.get(postId);
  
  // Check if the post exists and if the user is the author
  if(!post || (req.user && post.authorId !== req.user.userId)) {
    return res.redirect('/');
  }
  
  // Delete the post from the database
  const deleteStatement = db.prepare('DELETE FROM posts WHERE id = ?');
  deleteStatement.run(postId);  
  
  // Redirect to the homepage after deletion
  res.redirect('/dashboard');
});

//POST for comments
router.post('/post/:postId/comment', mustBeLoggedIn, (req, res) => {
  const postId = req.params.postId;
  const comment = sanitizeHTML(req.body.comment.trim(), {allowedTags: [], allowedAttributes: {}});
  
  if (!comment) {
    return res.status(400).send("Comment cannot be empty.");
  }

  const runTransaction = db.transaction(() => {
    // 1. Insert the new comment
    db.prepare('INSERT INTO comments (comment, createdDate, postId, authorId) VALUES (?, ?, ?, ?)').run(comment, new Date().toISOString(), postId, req.user.userId);

    // 2. Update the commentsCount in the posts table
    db.prepare('UPDATE posts SET commentsCount = commentsCount + 1 WHERE id = ?').run(postId);
  });
  
  try {
    runTransaction();
    res.redirect(`/post/post/${postId}`);
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).send("An error occurred while adding the comment.");
  }
});


// POST for likes with immediate UI updates
router.post('/post/:postId/like', mustBeLoggedIn, (req, res) => {
  const postId = req.params.postId;
  const userId = req.user.userId;

  try {
    const { newLikesCount } = db.transaction(() => {
      const existingLike = db.prepare('SELECT id FROM likes WHERE postId = ? AND authorId = ?').get(postId, userId);

      if (existingLike) {
        db.prepare('DELETE FROM likes WHERE id = ?').run(existingLike.id);
        db.prepare('UPDATE posts SET likesCount = likesCount - 1 WHERE id = ?').run(postId);
      } else {
        db.prepare('INSERT INTO likes (postId, authorId) VALUES (?, ?)').run(postId, userId);
        db.prepare('UPDATE posts SET likesCount = likesCount + 1 WHERE id = ?').run(postId);
      }
      
      // Fetch the authoritative count within the same transaction
      const updatedPost = db.prepare('SELECT likesCount FROM posts WHERE id = ?').get(postId);
      return { newLikesCount: updatedPost.likesCount };
    })(); // Immediately invoke the transaction

    res.json({ success: true, likesCount: newLikesCount });
  } catch (error) {
    console.error("Error liking/unliking post:", error);
    res.status(500).json({ error: "An error occurred." });
  }
});

export default router;


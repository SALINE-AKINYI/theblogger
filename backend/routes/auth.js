import 'dotenv/config'; //accessing environment variables
import express from 'express';
import jwt from 'jsonwebtoken';
import bycrypt from 'bcrypt';
import { db } from '../database.js';

const router = express.Router();

//GET: logout
router.get("/logout", (req,res)=>{
  res.clearCookie("appCookie");
  res.redirect("/")
});

//GET: sign in  page
router.get('/register', (req,res)=>{
  const windowTitle= 'Viktor | Register';
  const pageTitle = "Registration page";
  res.render('register',{pageTitle, windowTitle});
});

//GET: login page
router.get('/login', (req,res)=>{
  const windowTitle= 'Viktor | Login';
  const pageTitle = "Login Page";
  res.render('login', {pageTitle, windowTitle});
});

/*
//POST login; handle login  form
router.post("/login", (req,res)=>{
  const errors = [];

  if(typeof req.body.username !== "string") req.body.username = "";
  if(typeof req.body.password !== "string") req.body.password = "";

  // Corrected typo from req.body.usename to req.body.username
  if(req.body.username.trim() === "") errors.push("Invalid username / password");
  if(req.body.password.trim() === "") errors.push("Invalid username / password");  

  if(errors.length) { 
    const windowTitle= 'Viktor | Login';
    const pageTitle = "Login Page";
    return res.render('login', {errors, pageTitle, windowTitle});
  }

  req.body.username = req.body.username.trim();

  //check details fo the person logging in from the db
  const userInQuestionStatement = db.prepare('SELECT * FROM users WHERE USERNAME = ?');
  const userInQuestion = userInQuestionStatement.get(req.body.username);

  if(!userInQuestion) { 
    errors.push('Invalid username / password.');
    const windowTitle= 'Viktor | Login';
    const pageTitle = "Login Page";
    return res.render('login', {errors, windowTitle, pageTitle});
  }

  //compare the password
  const matchOrNot = bycrypt.compareSync(req.body.password, userInQuestion.password);
  if(!matchOrNot){
    errors.push('Invalid username / password.');
    const windowTitle= 'Viktor | Login';
    const pageTitle = "Login Page";
    return res.render('login', {errors, windowTitle,pageTitle});
  }
  
  //if all the details are correct; a sign user a cookie and redirect to homepage
  const tokenValue = jwt.sign({exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), userId: userInQuestion.id, username: userInQuestion.username}, process.env.JWTSECRET);
  res.cookie(
    "appCookie", 
    tokenValue, 
    {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60 // 1hr
    }
  );

  //redirect to homepage
  res.redirect("/");
});
*/

// POST login; AJAX: handle login form; maintain where u are before
router.post("/login", (req, res) => {
  const errors = [];
  
  if (typeof req.body.username !== "string") req.body.username = "";
  if (typeof req.body.password !== "string") req.body.password = "";

  if (req.body.username.trim() === "" || req.body.password.trim() === "") {
    errors.push("Invalid username / password");
  }

  const isAjax = req.xhr || req.headers.accept.includes('json');
  const redirectTo = req.body.redirectUrl || '/'; // Get redirect URL or default to home

  if (errors.length) {
    if (isAjax) {
      return res.status(401).json({ errors });
    } else {
      // For standard browser navigation, render the full login page with errors
      const windowTitle = 'Viktor | Login';
      const pageTitle = "Login Page";
      return res.render('login', { errors, pageTitle, windowTitle });
    }
  }

  req.body.username = req.body.username.trim();

  // ... (database and password comparison logic) ...
  const userInQuestionStatement = db.prepare('SELECT * FROM users WHERE USERNAME = ?');
  const userInQuestion = userInQuestionStatement.get(req.body.username);

  if (!userInQuestion) {
    const errorMsg = 'Invalid username / password.';
    if (isAjax) {
      return res.status(401).json({ errors: [errorMsg] });
    } else {
      return res.render('login', { errors: [errorMsg], windowTitle: 'Viktor | Login', pageTitle: 'Login Page' });
    }
  }

  const matchOrNot = bycrypt.compareSync(req.body.password, userInQuestion.password);
  if (!matchOrNot) {
    const errorMsg = 'Invalid username / password.';
    if (isAjax) {
      return res.status(401).json({ errors: [errorMsg] });
    } else {
      return res.render('login', { errors: [errorMsg], windowTitle: 'Viktor | Login', pageTitle: 'Login Page' });
    }
  }
  
  // Successful login
  const tokenValue = jwt.sign({exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), userId: userInQuestion.id, username: userInQuestion.username}, process.env.JWTSECRET);
  res.cookie(
    "appCookie", 
    tokenValue, 
    {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60 // 1hr
    }
  );

  // If AJAX, respond with the captured redirect URL
  if (isAjax) {
    return res.status(200).json({ success: true, redirectUrl: redirectTo });
  }

  // Standard redirect
  res.redirect(redirectTo);
});

/*
//POST: register
router.post('/register', (req, res) => {
  const errors = [];

  if(typeof req.body.username !== "string") req.body.username = "";
  if(typeof req.body.email !== "string") req.body.email = "";
  if(typeof req.body.password !== "string") req.body.password = "";

  req.body.username = req.body.username.trim();

  //username validations
  if(!req.body.username) errors.push('You must provide a username.');
  if(req.body.username && req.body.username.length < 3) errors.push('Username must be at least 4 characters long.');
  if(req.body.username && req.body.username.length > 20) errors.push('Username must not exceed 20 characters.');
  //if(req.body.username && !req.body.username.match(/^[a-zA-Z0-9]+$/)) errors.push('Username can only contain letters and numbers.');


  //check if username exists already
  const usernameStatement = db.prepare("SELECT * FROM users WHERE username = ?");
  const usernameCheck = usernameStatement.get(req.body.username);
  if(usernameCheck) errors.push('This username is already taken! Try another.');
  

  //password validations
  if(!req.body.password) errors.push('You must provide a password.');
  if(req.body.password && req.body.password.length < 3) errors.push('Password must be at least 4 characters long.');
  
  //email validations
  if(!req.body.email) errors.push("You must provide an email.");

  //display error if captured
  if(errors.length){
    const windowTitle= 'Viktor | Register';
    const pageTitle = "Registration page";
    return res.render('register', {errors, windowTitle, pageTitle});
  } 

  //save user to database
  //hashing password
  const salt = bycrypt.genSaltSync(10);
  req.body.password = bycrypt.hashSync(req.body.password, salt);

  const statement = db.prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)');
  statement.run(req.body.username, req.body.email, req.body.password);

  res.redirect("/auth/login");
});
*/

// POST: register
router.post('/register', async (req, res) => {
  const errors = [];
  
  // Sanitize input
  if(typeof req.body.username !== "string") req.body.username = "";
  if(typeof req.body.email !== "string") req.body.email = "";
  if(typeof req.body.password !== "string") req.body.password = "";
  if(typeof req.body.confirmPassword !== "string") req.body.confirmPassword = "";

  req.body.username = req.body.username.trim();
  req.body.email = req.body.email.trim();
  
  const isAjax = req.xhr || req.headers.accept.includes('json');

  // Basic validations
  if(!req.body.username) errors.push('You must provide a username.');
  if(req.body.username && req.body.username.length < 3) errors.push('Username must be at least 4 characters long.');
  if(req.body.username && req.body.username.length > 20) errors.push('Username must not exceed 20 characters.');

  if(!req.body.password) errors.push('You must provide a password.');
  if(req.body.password && req.body.password.length < 3) errors.push('Password must be at least 4 characters long.');
  if (req.body.password !== req.body.confirmPassword) {
    errors.push('Passwords do not match.');
  }
  
  if(!req.body.email) errors.push("You must provide an email.");
  // Simple email format check
  if(req.body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.body.email)) {
    errors.push("Please provide a valid email address.");
  }
  
  // Database checks (use async/await if your db supports it)
  try {
    const usernameStatement = db.prepare("SELECT * FROM users WHERE username = ?");
    const usernameCheck = usernameStatement.get(req.body.username);
    if(usernameCheck) errors.push('This username is already taken! Try another.');
  
    const emailStatement = db.prepare("SELECT * FROM users WHERE email = ?");
    const emailCheck = emailStatement.get(req.body.email);
    if(emailCheck) errors.push('This email is already registered! Use another email or log in.');
  } catch (dbError) {
    console.error('Database query error:', dbError);
    errors.push('Database error during registration. Please try again later.');
  }
  
  // Handle validation errors
  if(errors.length){
    if (isAjax) {
      return res.status(400).json({ errors });
    } else {
      const windowTitle = 'Viktor | Register';
      const pageTitle = "Registration page";
      return res.render('register', { errors, windowTitle, pageTitle });
    }
  } 

  // Hash password
  const salt = bycrypt.genSaltSync(10);
  const hashedPassword = bycrypt.hashSync(req.body.password, salt);

  // Save user to database
  try {
    const statement = db.prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)');
    statement.run(req.body.username, req.body.email, hashedPassword);
  } catch (dbError) {
    console.error('Database insertion error:', dbError);
    errors.push('Failed to create account. Please try again.');
    if (isAjax) {
      return res.status(500).json({ errors });
    } else {
      return res.render('register', { errors, windowTitle: 'Viktor | Register', pageTitle: 'Registration page' });
    }
  }

  // Handle successful registration
  if (isAjax) {
    return res.status(200).json({ success: true, showLogin: true });
  }
  
  // Standard redirect for non-AJAX requests
  res.redirect('/auth/login?showLoginModal=true');
});







export default router;

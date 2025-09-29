//importing required modules
import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import sanitizeHTML from 'sanitize-html';
import { marked } from 'marked';
import csrf from 'csurf';
import dotenv from 'dotenv';

//importing middlewares
import { countUnreadMessages } from './routes/middlewares.js';

//configure environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//instantiate the app
const app = express();

//importing routes
import homepageRouter from './routes/homepage.js';
import authRouter from './routes/auth.js';
import postRouter from './routes/post.js';
import adminRouter from './routes/admin.js';
import searchRouter from './routes/search.js';
import chatRouter from './routes/chat.js';
import usRouter from './routes/us.js';


//configure express app
app.set('port', process.env.PORT || 3000 )
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs'); 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));  
app.use(cookieParser());

//set up csrf protection

//middleware for storing local variables
app.use((req,res,next)=>{
  res.locals.errors = [];
  res.locals.pageTitle = '';
  res.locals.windowTitle = '';
  res.locals.allPosts = []; 
  // res.locals.user= [];
  next();
})

//middleware to make marked and sanitizeHTML available in templates
app.use((req,res,next)=>{
  res.locals.filterUserHTML = (content)=> {
    return sanitizeHTML(marked.parse(content), {
      allowedTags: ['p', 'b', 'i', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre' ],
      allowedAttributes: {}
    })
  }
  next();   
})

//middleware that try to decode incoming cookie
app.use((req,res,next)=>{
  try{
    const decoded = jwt.verify(req.cookies.appCookie, process.env.JWTSECRET);
    req.user = decoded;
  }catch(err){
    req.user = false;
  }
  res.locals.user = req.user;
  console.log(req.user);

  next();
})

//middleware for counting unread messages
app.use(countUnreadMessages);

//using the routes
app.use('/', homepageRouter);
app.use('/auth', authRouter);
app.use('/post', postRouter);
app.use('/admin', adminRouter);
app.use('/search', searchRouter);
app.use('/chat', chatRouter);
app.use('/us', usRouter);

//export the module
export default app;

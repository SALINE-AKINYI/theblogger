import express from 'express';
import {
    db, 
    getUserConversations, 
    getOrCreateConversation, 
    getMessagesByConversation, 
    getAuthorUsername, 
    markMessagesAsRead, 
    sendMessage} from '../database.js';
import { mustBeLoggedIn }from "./middlewares.js";

const router = express.Router();

// GET route for the chat inbox (list of conversations)
router.get('/inbox', mustBeLoggedIn, (req, res) => {
    try {
        const userId = req.user.userId;
        const conversations = getUserConversations(userId);
        res.render('chat-inbox', { conversations, userId });
    } catch (error) {
        console.error('Error fetching user conversations:', error);
        res.status(500).send('Error fetching conversations.');
    }
});

// GET route for a specific chat conversation
router.get('/conversation/:otherUserId', mustBeLoggedIn, (req, res) => {
    try {
        const userId = req.user.userId;
        const otherUserId = req.params.otherUserId;

        // Get the conversation ID, creating if it doesn't exist
        const conversationId = getOrCreateConversation(userId, otherUserId);

        // Fetch the messages for that conversation
        const messages = getMessagesByConversation(conversationId);
        markMessagesAsRead(conversationId, userId);

        const windowTitle = 'Viktor | ChatPage';
        const pageTitle = 'Chat Page'

        res.render('chat-conversation', { 
            messages, 
            userId, 
            otherUserId,
            // You may need to fetch the other user's username for the view
            otherUsername: getAuthorUsername(otherUserId),
            // Pass the logged-in user's username
            loggedInUsername : getAuthorUsername(userId),
            //pass the logged-in user's id
            loggedInUserId: userId,
            windowTitle,
            pageTitle
            
        });
    } catch (error) {
        console.error('Error fetching conversation:', error);
        res.status(500).send('Error fetching messages.');
    }
});

// POST route to send a new message
router.post('/send-message/:otherUserId', mustBeLoggedIn, (req, res) => {
    try {
        const userId = req.user.userId;
        const otherUserId = req.params.otherUserId;
        const { messageText } = req.body;

        if (!messageText) {
            return res.status(400).send('Message cannot be empty.');
        }

        const conversationId = getOrCreateConversation(userId, otherUserId);
        sendMessage(conversationId, userId, messageText);
        
        const windowTitle = 'Viktor | Conversation';
        const pageTitle = 'Chat Page'
        // Redirect back to the same conversation page
        res.redirect(`/chat/conversation/${otherUserId}`,{windowTitle, pageTitle});
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).send('Error sending message.');
    }
});


export default router;

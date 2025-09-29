// database.js
import Database from 'better-sqlite3';
const db = new Database('myApp.db');

db.pragma("journal_mode = WAL");
const createTables = db.transaction(()=>{
  db.prepare(`
    CREATE TABLE IF NOT EXISTS users(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username STRING NOT NULL UNIQUE,
      email STRING NOT NULL,
      password STRING NOT NULL,
      isAdmin INTEGER DEFAULT 0 -- 0 for regular user, 1 for admin
    )`
  ).run();
  
  db.prepare(`
    CREATE TABLE IF NOT EXISTS posts(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      createdDate TEXT,
      title STRING NOT NULL,
      body TEXT NOT NULL,
      authorId INTEGER NOT NULL,
      commentsCount INTEGER DEFAULT 0, -- Count of comments
      likesCount INTEGER DEFAULT 0,    -- Count of likes
      FOREIGN KEY (authorId) REFERENCES users(id)
    )`
  ).run();
  
  db.prepare(`
    CREATE TABLE IF NOT EXISTS comments(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      comment TEXT NOT NULL,
      createdDate TEXT NOT NULL,
      postId INTEGER NOT NULL,
      authorId INTEGER NOT NULL,
      FOREIGN KEY (postId) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (authorId) REFERENCES users(id)
    )`
  ).run();
  
  db.prepare(`
    CREATE TABLE IF NOT EXISTS likes(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      postId INTEGER NOT NULL,
      authorId INTEGER NOT NULL,
      UNIQUE (postId, authorId), -- Ensures a user can only like a post once
      FOREIGN KEY (postId) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (authorId) REFERENCES users(id)
    )`
  ).run();

  // database.js (additions to the existing createTables transaction)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS conversations(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      -- Store the two user IDs involved in the conversation
      user1Id INTEGER NOT NULL,
      user2Id INTEGER NOT NULL,
      createdDate TEXT NOT NULL,
      -- Ensure a conversation can only exist once between two users, regardless of order
      UNIQUE(user1Id, user2Id),
      FOREIGN KEY(user1Id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(user2Id) REFERENCES users(id) ON DELETE CASCADE
    )`
  ).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS messages(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversationId INTEGER NOT NULL,
      senderId INTEGER NOT NULL,
      message TEXT NOT NULL,
      sentDate TEXT NOT NULL,
      isRead INTEGER DEFAULT 0, -- 0 for unread, 1 for read
      FOREIGN KEY(conversationId) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY(senderId) REFERENCES users(id) ON DELETE CASCADE
    )`
  ).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS static_pages (
        name TEXT PRIMARY KEY NOT NULL UNIQUE,
        content TEXT NOT NULL
    )
  `).run();

});

// Initialize the database and create tables if they don't exist
try {
  createTables();
  console.log('Database tables created or already exist.');
} catch (error) {
  console.error('Error setting up database tables:', error);
  process.exit(1); // Exit if critical DB setup fails
}

// Helper function to get author username
function getAuthorUsername(authorId) {
  try {
    const user = db.prepare('SELECT username FROM users WHERE id = ?').get(authorId);
    return user ? user.username : 'Unknown';
  } catch (error) {
    console.error('Error fetching author username:', error);
    return 'Unknown';
  }
}


//Get all posts with their details, including comments, like counts, and user's like status.
function getAllPostsWithDetails(userId) {
  const postsQuery = db.prepare(`
    SELECT
      p.id,
      p.title,
      p.body,
      p.createdDate,
      u.username AS author,
      p.likesCount,
      p.commentsCount,
      (SELECT 1 FROM likes WHERE likes.postId = p.id AND likes.authorId = @userId) AS hasLiked
    FROM posts p
    LEFT JOIN users u ON p.authorId = u.id
    ORDER BY p.createdDate DESC
  `);
  
  const allPosts = postsQuery.all({ userId });

  if (allPosts.length > 0) {
    const postIds = allPosts.map(post => post.id);
    const placeholders = postIds.map(() => '?').join(',');

    const commentsQuery = db.prepare(`
      SELECT
        c.id,
        c.comment,
        c.createdDate,
        c.postId,
        u.username AS author
      FROM comments c
      JOIN users u ON c.authorId = u.id
      WHERE c.postId IN (${placeholders})
      ORDER BY c.createdDate ASC
    `);
    const allComments = commentsQuery.all(...postIds);
    
    const likedUsersQuery = db.prepare(`
      SELECT users.username, likes.postId
      FROM likes
      JOIN users ON likes.authorId = users.id
      WHERE likes.postId IN (${placeholders})
      ORDER BY users.username ASC
    `);
    const allLikedUsers = likedUsersQuery.all(...postIds);

    const postMap = new Map(allPosts.map(post => [post.id, post]));

    allComments.forEach(comment => {
      if (!postMap.get(comment.postId).comments) {
        postMap.get(comment.postId).comments = [];
      }
      postMap.get(comment.postId).comments.push(comment);
    });

    allLikedUsers.forEach(likedUser => {
      if (!postMap.get(likedUser.postId).likedUsers) {
        postMap.get(likedUser.postId).likedUsers = [];
      }
      postMap.get(likedUser.postId).likedUsers.push(likedUser.username);
    });
  }

  return allPosts;
}


// Get a single post by ID with comments, counts, and user like status.
function getPostWithDetails(postId, userId) {
  const postDetailsQuery = db.prepare(`
    SELECT
      p.id,
      p.title,
      p.body,
      p.createdDate,
      u.username AS author,
      p.likesCount,
      p.commentsCount,
      (SELECT 1 FROM likes WHERE likes.postId = p.id AND likes.authorId = @userId) AS hasLiked
    FROM posts p
    LEFT JOIN users u ON p.authorId = u.id
    WHERE p.id = ?
  `);

  const commentsQuery = db.prepare(`
    SELECT
      c.id,
      c.comment,
      c.createdDate,
      u.username AS author
    FROM comments c
    JOIN users u ON c.authorId = u.id
    WHERE c.postId = ?
    ORDER BY c.createdDate DESC
  `);

  const likedUsersQuery = db.prepare(`
    SELECT users.username
    FROM likes
    JOIN users ON likes.authorId = users.id
    WHERE likes.postId = ?
    ORDER BY users.username ASC
  `);

  const post = postDetailsQuery.get(postId, { userId });

  if (post) {
    post.comments = commentsQuery.all(postId);
    post.likedUsers = likedUsersQuery.all(postId).map(user => user.username);
  }

  return post;
}


// Search for posts by title or body
function searchPosts(query) {
  try {
    const searchQuery = db.prepare(`
      SELECT
        p.id,
        p.title,
        p.body,
        p.createdDate,
        p.likesCount,
        p.commentsCount,
        u.username AS author
      FROM posts p
      JOIN users u ON p.authorId = u.id
      WHERE p.title LIKE ? OR p.body LIKE ?
      ORDER BY p.createdDate DESC
    `);
    const searchTerm = `%${query}%`;
    return searchQuery.all(searchTerm, searchTerm);
  } catch (error) {
    console.error('Error searching for posts:', error);
    return [];
  }
}


// Search for users by username
function searchUsersByUsername(query) {
  try {
    const searchQuery = db.prepare(`
      SELECT id, username
      FROM users
      WHERE username LIKE ? COLLATE NOCASE
      ORDER BY username ASC
    `);
    const searchTerm = `%${query}%`;
    return searchQuery.all(searchTerm);
  } catch (error) {
    console.error('Error searching for users:', error);
    return [];
  }
}

/*
// Get user profile details and all their posts
function getUserProfileWithPosts(userId) {
  // Query to get user details
  const userQuery = db.prepare('SELECT id, username, email FROM users WHERE id = ?');
  const user = userQuery.get(userId);

  if (!user) {
    return null;
  }

  // Query to get all posts by that user
  const postsQuery = db.prepare(`
    SELECT
      p.id,
      p.title,
      p.body,
      p.createdDate,
      p.likesCount,
      p.commentsCount
    FROM posts p
    WHERE p.authorId = ?
    ORDER BY p.createdDate DESC
  `);
  const userPosts = postsQuery.all(userId);

  // Add the posts to the user object
  user.posts = userPosts;


  return user, userPosts;
}
*/


// Alternative version: Get user profile details and all their posts by username
function getUserProfileWithPosts(username) {
  // 1. Query to get user details by username
  // The COLLATE NOCASE clause makes the username search case-insensitive.
  const userQuery = db.prepare('SELECT id, username, email FROM users WHERE username = ? COLLATE NOCASE');
  const user = userQuery.get(username);

  // If the user is not found, return null
  if (!user) {
    return null;
  }

  const userId = user.id; // Get the user's ID from the first query result

  // 2. Query to get all posts by that user's ID
  const postsQuery = db.prepare(`
    SELECT
      p.id,
      p.title,
      p.body,
      p.createdDate,
      p.likesCount,
      p.commentsCount
    FROM posts p
    WHERE p.authorId = ?
    ORDER BY p.createdDate DESC
  `);
  const userPosts = postsQuery.all(userId);

  // 3. Add the posts to the user object
  user.posts = userPosts;

  return user;
}


// Function to find or create a conversation
function getOrCreateConversation(user1Id, user2Id) {
  // Normalize user IDs to ensure the UNIQUE constraint works
  const [lowerId, higherId] = user1Id < user2Id ? [user1Id, user2Id] : [user2Id, user1Id];

  // Try to find an existing conversation
  const findQuery = db.prepare(`
    SELECT id FROM conversations WHERE user1Id = ? AND user2Id = ?
  `);
  const existingConversation = findQuery.get(lowerId, higherId);

  if (existingConversation) {
    return existingConversation.id;
  }

  // If no conversation exists, create one
  const insertQuery = db.prepare(`
    INSERT INTO conversations (user1Id, user2Id, createdDate)
    VALUES (?, ?, ?)
  `);
  const result = insertQuery.run(lowerId, higherId, new Date().toISOString());
  return result.lastInsertRowid;
}


// Function to send a message
function sendMessage(conversationId, senderId, messageText) {
  const insertQuery = db.prepare(`
    INSERT INTO messages (conversationId, senderId, message, sentDate)
    VALUES (?, ?, ?, ?)
  `);
  const result = insertQuery.run(conversationId, senderId, messageText, new Date().toISOString());
  return result.lastInsertRowid;
}

// Function to get messages for a conversation
function getMessagesByConversation(conversationId) {
  const query = db.prepare(`
    SELECT
      m.id,
      m.message,
      m.sentDate,
      m.isRead,
      u.username AS senderUsername
    FROM messages m
    JOIN users u ON m.senderId = u.id
    WHERE m.conversationId = ?
    ORDER BY m.sentDate ASC
  `);
  return query.all(conversationId);
}

// Function to get a user's conversations
function getUserConversations(userId) {
  const query = db.prepare(`
    SELECT
      c.id AS conversationId,
      CASE
        WHEN c.user1Id = @userId THEN u2.username
        ELSE u1.username
      END AS otherUserUsername,
      CASE
        WHEN c.user1Id = @userId THEN c.user2Id
        ELSE c.user1Id
      END AS otherUserId,
      (SELECT message FROM messages WHERE conversationId = c.id ORDER BY sentDate DESC LIMIT 1) AS lastMessage,
      (SELECT sentDate FROM messages WHERE conversationId = c.id ORDER BY sentDate DESC LIMIT 1) AS lastMessageDate,
      (SELECT COUNT(*) FROM messages WHERE conversationId = c.id AND isRead = 0 AND senderId != @userId) AS unreadCount
    FROM conversations c
    JOIN users u1 ON c.user1Id = u1.id
    JOIN users u2 ON c.user2Id = u2.id
    WHERE c.user1Id = @userId OR c.user2Id = @userId
    ORDER BY lastMessageDate DESC
  `);
  return query.all({ userId });
}

// Function to mark messages as read
function markMessagesAsRead(conversationId, userId) {
  const updateQuery = db.prepare(`
    UPDATE messages
    SET isRead = 1
    WHERE conversationId = ? AND senderId != ?
  `);
  updateQuery.run(conversationId, userId);
}

// Add this to your database.js file
function getTotalUnreadMessages(userId) {
  const query = db.prepare(`
    SELECT COUNT(*) AS total
    FROM messages m
    JOIN conversations c ON m.conversationId = c.id
    WHERE m.isRead = 0
    AND m.senderId != ?
    AND (c.user1Id = ? OR c.user2Id = ?)
  `);
  const result = query.get(userId, userId, userId);
  return result.total || 0;
}


// Update the export list to include the new function
export { db, 
  getAuthorUsername, 
  getAllPostsWithDetails, 
  getPostWithDetails, 
  searchPosts, 
  searchUsersByUsername, 
  getUserProfileWithPosts,
  getOrCreateConversation,
  sendMessage,
  getMessagesByConversation,
  getUserConversations,
  markMessagesAsRead,
  getTotalUnreadMessages,
};












import bcrypt from 'bcrypt';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {db} from './database.js';

// Load environment variables from a .env file
dotenv.config();

// Fix for ES Module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure the database is opened correctly

//function to seed an admin user
async function seedAdmin() {
  const username = 'Viktor'; // Choose a secure username
  const email = 'admin@gmail.com';
  const plainTextPassword = process.env.ADMIN_PASSWORD;

  if (!plainTextPassword) {
    console.error('Error: ADMIN_PASSWORD environment variable is not set. Please create a .env file.');
    return;
  }
  
  try {
    // Check if the admin user already exists
    const existingAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existingAdmin) {
      console.log('Admin user already exists. Skipping insertion.');
      return;
    }

    // Hash the password securely
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(plainTextPassword, saltRounds);

    // Prepare and run the insert statement for the new admin
    const insertAdmin = db.prepare(`
      INSERT INTO users (username, email, password, isAdmin) 
      VALUES (?, ?, ?, 1)
    `);
    const info = insertAdmin.run(username, email, hashedPassword);
    
    console.log(`Admin user '${username}' inserted with ID ${info.lastInsertRowid}`);
    
  } catch (error) {
    console.error('Error seeding admin user:', error);
  } finally {
    db.close();
  }
}

seedAdmin();

/**
 * DATABASE CONFIGURATION — Modular setup for easy database switching
 *
 * Currently configured for: MongoDB (via Mongoose)
 *
 * To switch databases in the future:
 * 1. Update DATABASE_TYPE in .env (e.g., "mongodb", "postgres", etc.)
 * 2. Add new connection logic in this file
 * 3. Export the same interface: connect(), getConnection()
 *
 * See DATABASE.md in project root for full documentation.
 */
require('dotenv').config();

const mongoose = require('mongoose');

const DATABASE_TYPE = process.env.DATABASE_TYPE || 'mongodb';

/**
 * Get connection URI from environment.
 * Supports: MONGO_URI, MONGODB_URI (both work for MongoDB)
 */
function getConnectionUri() {
  if (DATABASE_TYPE.toLowerCase() === 'mongodb') {
    return (
      process.env.MONGO_URI ||
      process.env.MONGODB_URI ||
      'mongodb://localhost:27017/skillbrzee'
    );
  }
  // Add other database types here in the future
  throw new Error(`Unsupported DATABASE_TYPE: ${DATABASE_TYPE}`);
}

const connectionOptions = {
  serverSelectionTimeoutMS: 10000,
};

/**
 * Connect to the database
 */
async function connect() {
  const uri = getConnectionUri();
  return mongoose.connect(uri, connectionOptions);
}

/**
 * Get current connection (for health checks, etc.)
 */
function getConnection() {
  return mongoose.connection;
}

module.exports = {
  connect,
  getConnection,
  getConnectionUri,
  DATABASE_TYPE,
};

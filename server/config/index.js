require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  openai: {
    apiKey: process.env.OPENAI_API_KEY
  },
  blobToken: process.env.BLOB_READ_WRITE_TOKEN
};

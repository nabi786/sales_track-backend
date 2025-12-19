const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Ensure the database name is in the URI
    let mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      console.error('ERROR: MONGODB_URI is not set in .env file');
      process.exit(1);
    }
    
    // If URI doesn't end with /salestrack, add it
    if (!mongoUri.endsWith('/salestrack') && !mongoUri.endsWith('/salestrack?')) {
      // Remove trailing slash if exists
      mongoUri = mongoUri.replace(/\/$/, '');
      // Add database name
      if (!mongoUri.includes('/salestrack')) {
        mongoUri = mongoUri + '/salestrack';
      }
    }
    
    // Connection options for better timeout handling
    const options = {
      serverSelectionTimeoutMS: 30000, // 30 seconds
      socketTimeoutMS: 45000, // 45 seconds
      connectTimeoutMS: 30000, // 30 seconds
      maxPoolSize: 10,
      retryWrites: true,
      w: 'majority'
    };
    
    console.log('Attempting to connect to MongoDB...');
    const conn = await mongoose.connect(mongoUri, options);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`✅ Database Name: ${conn.connection.name}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.error('\n🔍 Troubleshooting Steps:');
    console.error('1. Check if your IP address is whitelisted in MongoDB Atlas');
    console.error('   - Go to: https://cloud.mongodb.com/');
    console.error('   - Navigate to: Network Access → Add IP Address');
    console.error('   - Add your current IP or use 0.0.0.0/0 for all IPs (less secure)');
    console.error('\n2. Verify your MONGODB_URI in .env file is correct');
    console.error('3. Check if your MongoDB Atlas cluster is running (not paused)');
    console.error('4. Verify your database username and password are correct');
    console.error('\n💡 For more help: https://www.mongodb.com/docs/atlas/security-whitelist/');
    process.exit(1);
  }
};

module.exports = connectDB;


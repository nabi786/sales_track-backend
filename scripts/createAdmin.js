require('dotenv').config();
const mongoose = require('mongoose');
const Customer = require('../models/Customer');

const createAdmin = async () => {
  try {
    // Ensure the database name is in the URI
    let mongoUri = process.env.MONGODB_URI;
    
    // If URI doesn't end with /salestrack, add it
    if (!mongoUri.endsWith('/salestrack') && !mongoUri.endsWith('/salestrack?')) {
      // Remove trailing slash if exists
      mongoUri = mongoUri.replace(/\/$/, '');
      // Add database name
      if (!mongoUri.includes('/salestrack')) {
        mongoUri = mongoUri + '/salestrack';
      }
    }
    
    // Connect to MongoDB
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
    console.log(`Database Name: ${mongoose.connection.name}`);

    // Check if admin already exists
    const existingAdmin = await Customer.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('Admin already exists');
      await mongoose.connection.close();
      return;
    }

    // Check if email already exists
    const existingUser = await Customer.findOne({ email: 'admin@salestrack.com' });
    if (existingUser) {
      console.log('User with this email already exists');
      await mongoose.connection.close();
      return;
    }

    // Create default admin
    const admin = new Customer({
      first_name: 'Admin',
      last_name: 'User',
      email: 'admin@salestrack.com',
      phone: '1234567890',
      role: 'admin',
      password: 'admin123', // Change this password after first login
      status: 'active'
    });

    await admin.save();
    console.log('Admin created successfully!');
    console.log('Email: admin@salestrack.com');
    console.log('Password: admin123');
    console.log('Please change the password after first login!');

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error creating admin:', error.message);
    process.exit(1);
  }
};

createAdmin();


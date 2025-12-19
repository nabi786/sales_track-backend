const Customer = require('../models/Customer');

// Register admin (public endpoint for first admin creation - only one admin allowed)
const registerAdmin = async (req, res) => {
  try {
    const { first_name, last_name, email, phone, password } = req.body;

    if (!first_name || !last_name || !email || !phone || !password) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Check if admin already exists
    const existingAdmin = await Customer.findOne({ role: 'admin' });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin already exists. Only one admin is allowed.' });
    }

    // Check if email already exists
    const existingEmail = await Customer.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Check if phone already exists
    const existingPhone = await Customer.findOne({ phone });
    if (existingPhone) {
      return res.status(400).json({ message: 'User with this phone number already exists' });
    }

    const admin = new Customer({
      first_name,
      last_name,
      email,
      phone,
      password,
      role: 'admin',
      status: 'active'
    });

    await admin.save();
    admin.password = undefined;

    res.status(201).json({
      message: 'Admin registered successfully',
      admin
    });
  } catch (error) {
    if (error.message.includes('Only one admin')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

// Create customer (only admin can do this)
const createCustomer = async (req, res) => {
  try {
    const { first_name, last_name, email, phone, password, status } = req.body;

    if (!first_name || !last_name || !email || !phone || !password) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Check if email already exists
    const existingEmail = await Customer.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Check if phone already exists
    const existingPhone = await Customer.findOne({ phone });
    if (existingPhone) {
      return res.status(400).json({ message: 'User with this phone number already exists' });
    }

    const customer = new Customer({
      first_name,
      last_name,
      email,
      phone,
      password,
      role: 'customer',
      status: status || 'active'
    });

    await customer.save();
    customer.password = undefined;

    res.status(201).json({
      message: 'Customer created successfully',
      customer
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all customers
const getAllCustomers = async (req, res) => {
  try {
    const customers = await Customer.find({ role: 'customer' }).select('-password');
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get customer by ID
const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, role: 'customer' }).select('-password');
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update customer status
const updateCustomerStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !['active', 'disabled'].includes(status)) {
      return res.status(400).json({ message: 'Please provide valid status (active or disabled)' });
    }

    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, role: 'customer' },
      { status },
      { new: true }
    ).select('-password');

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.json({
      message: 'Customer status updated successfully',
      customer
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete customer
const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOneAndDelete({ _id: req.params.id, role: 'customer' });
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerAdmin,
  createCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomerStatus,
  deleteCustomer
};


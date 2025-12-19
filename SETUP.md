# Setup Instructions

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Create .env file**
   Create a `.env` file in the root directory with the following content:
   ```
   MONGODB_URI=mongodb+srv://rehanpardesi2018_db_user:kug9HoXT7NqyPZY3@cluster0.1n2yfzg.mongodb.net/salestrack
   JWT_SECRET=your-secret-key-change-this-in-production
   PORT=8000
   ```

3. **Create Initial Admin**
   ```bash
   node scripts/createAdmin.js
   ```
   This will create an admin user with:
   - Email: admin@salestrack.com
   - Password: admin123

4. **Start the Server**
   ```bash
   npm start
   ```
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

## Testing the API

### 1. Login as Admin
```bash
POST http://localhost:8000/api/auth/login
Content-Type: application/json

{
  "email": "admin@salestrack.com",
  "password": "admin123",
  "role": "admin"
}
```

### 2. Create a Customer (as Admin)
```bash
POST http://localhost:8000/api/admin/customers
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "phone": "1234567890",
  "password": "password123",
  "status": "active"
}
```

### 3. Login as Customer
```bash
POST http://localhost:8000/api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123",
  "role": "customer"
}
```

### 4. Create a Shop (as Customer)
```bash
POST http://localhost:8000/api/customer/shops
Authorization: Bearer <customer_token>
Content-Type: application/json

{
  "shop_name": "My Shop",
  "logo": "https://example.com/logo.png",
  "phone": "9876543210",
  "address": "123 Main St"
}
```

### 5. Create a Product (as Customer)
```bash
POST http://localhost:8000/api/customer/products
Authorization: Bearer <customer_token>
Content-Type: application/json

{
  "name": "Product Name",
  "image": "https://example.com/product.jpg",
  "sale_price": 100,
  "buy_price": 70,
  "quantity": 50,
  "shop_id": "<shop_id_from_previous_step>"
}
```

## Project Structure

```
salestrack/
├── config/
│   └── database.js          # MongoDB connection
├── controllers/
│   ├── adminController.js   # Admin operations
│   ├── authController.js    # Authentication
│   └── customerController.js # Customer operations
├── middleware/
│   └── auth.js              # Authentication & authorization
├── models/
│   ├── Admin.js             # Admin model
│   ├── Customer.js          # Customer model
│   ├── Shop.js              # Shop model
│   └── Product.js           # Product model
├── routes/
│   ├── admin.js             # Admin routes
│   ├── auth.js              # Auth routes
│   └── customer.js          # Customer routes
├── scripts/
│   └── createAdmin.js       # Script to create initial admin
├── utils/
│   └── generateToken.js     # JWT token generation
├── server.js                # Main server file
└── package.json
```


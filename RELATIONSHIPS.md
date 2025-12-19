# Database Relationships

This document explains the relationships between collections in the SalesTrack application.

## Relationship Diagram

```
Customer (1) ────< (Many) Shop
                         │
                         │ (1)
                         │
                         ▼
                    (Many) Product
                         │
                         │ (Many)
                         │
                         ▼
                    Customer (1)
```

## Detailed Relationships

### 1. Customer → Shop (One-to-Many)
- **Connection**: `Shop.customer_id` → `Customer._id`
- **Type**: One Customer can have many Shops
- **Implementation**:
  - In `Shop` model: `customer_id` field with `ref: 'Customer'`
  - When creating a shop, `customer_id` is automatically set to the logged-in customer's ID
  - Customers can only see/manage their own shops

### 2. Shop → Product (One-to-Many)
- **Connection**: `Product.shop_id` → `Shop._id`
- **Type**: One Shop can have many Products
- **Implementation**:
  - In `Product` model: `shop_id` field with `ref: 'Shop'`
  - When creating a product, you must provide a `shop_id`
  - The system verifies that the shop belongs to the customer before creating the product

### 3. Customer → Product (One-to-Many)
- **Connection**: `Product.customer_id` → `Customer._id`
- **Type**: One Customer can have many Products (across all their shops)
- **Implementation**:
  - In `Product` model: `customer_id` field with `ref: 'Customer'`
  - This ensures customers can only manage their own products
  - When creating a product, `customer_id` is automatically set to the logged-in customer's ID

## Query Examples

### Get all shops for a customer
```javascript
const shops = await Shop.find({ customer_id: customerId });
```

### Get all products for a shop
```javascript
const products = await Product.find({ shop_id: shopId });
```

### Get all products for a customer
```javascript
const products = await Product.find({ customer_id: customerId });
```

### Get products for a specific shop of a customer
```javascript
const products = await Product.find({ 
  shop_id: shopId, 
  customer_id: customerId 
});
```

## Indexes

For better query performance, indexes have been added on:
- `Shop.customer_id` - for fast customer shop queries
- `Product.shop_id` - for fast shop product queries
- `Product.customer_id` - for fast customer product queries
- `Product.shop_id + customer_id` - for combined queries

## Data Integrity

1. **Shop Creation**: Automatically linked to the creating customer
2. **Product Creation**: 
   - Must provide a valid `shop_id`
   - System verifies the shop belongs to the customer
   - Automatically links to the customer
3. **Shop Deletion**: Automatically deletes all associated products (cascade delete)
4. **Product Access**: Customers can only access products from their own shops











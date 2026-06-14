const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Item = require('../models/Item');
const Table = require('../models/Table');
const Bill = require('../models/Bill');

// Load environment variables for credentials
const JWT_SECRET = process.env.JWT_SECRET || 'darshan_hotel_secret_key_123';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Middleware for Admin Authentication
const authenticateAdmin = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

// ==========================================
// 1. ADMIN AUTHENTICATION
// ==========================================
router.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });
    return res.json({ token, username });
  } else {
    return res.status(401).json({ error: 'Invalid admin credentials.' });
  }
});

// Endpoint to verify token validity
router.get('/auth/verify', authenticateAdmin, (req, res) => {
  res.json({ valid: true, username: req.admin.username });
});

// ==========================================
// 2. MENU ITEMS CRUD
// ==========================================

// Get all menu items (Public - needed by staff for billing)
router.get('/items', async (req, res) => {
  try {
    const items = await Item.find().sort({ name: 1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Server error retrieving items.' });
  }
});

// Add new menu item (Admin only)
router.post('/items', authenticateAdmin, async (req, res) => {
  try {
    const { name, price, category } = req.body;
    if (!name || price === undefined || !category) {
      return res.status(400).json({ error: 'Name, price, and category are required.' });
    }

    const itemExists = await Item.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (itemExists) {
      return res.status(400).json({ error: 'An item with this name already exists.' });
    }

    const newItem = new Item({ name, price: Number(price), category });
    await newItem.save();
    res.status(201).json(newItem);
  } catch (error) {
    res.status(500).json({ error: 'Server error creating item.' });
  }
});

// Update menu item (Admin only)
router.put('/items/:id', authenticateAdmin, async (req, res) => {
  try {
    const { name, price, category } = req.body;
    if (!name || price === undefined || !category) {
      return res.status(400).json({ error: 'Name, price, and category are required.' });
    }

    // Check name duplication (excluding self)
    const itemExists = await Item.findOne({ 
      _id: { $ne: req.params.id }, 
      name: { $regex: new RegExp(`^${name}$`, 'i') } 
    });
    if (itemExists) {
      return res.status(400).json({ error: 'An item with this name already exists.' });
    }

    const updatedItem = await Item.findByIdAndUpdate(
      req.params.id,
      { name, price: Number(price), category },
      { new: true }
    );

    if (!updatedItem) {
      return res.status(404).json({ error: 'Item not found.' });
    }

    res.json(updatedItem);
  } catch (error) {
    res.status(500).json({ error: 'Server error updating item.' });
  }
});

// Delete menu item (Admin only)
router.delete('/items/:id', authenticateAdmin, async (req, res) => {
  try {
    const deletedItem = await Item.findByIdAndDelete(req.params.id);
    if (!deletedItem) {
      return res.status(404).json({ error: 'Item not found.' });
    }
    res.json({ message: 'Item deleted successfully.', deletedItem });
  } catch (error) {
    res.status(500).json({ error: 'Server error deleting item.' });
  }
});

// ==========================================
// 3. ACTIVE TABLES & BILLING
// ==========================================

// Get all active tables
router.get('/tables', async (req, res) => {
  try {
    const tables = await Table.find({ status: 'Active' }).sort({ createdAt: -1 });
    res.json(tables);
  } catch (error) {
    res.status(500).json({ error: 'Server error retrieving tables.' });
  }
});

// Get a single active table
router.get('/tables/:id', async (req, res) => {
  try {
    const table = await Table.findById(req.params.id);
    if (!table) {
      return res.status(404).json({ error: 'Table not found.' });
    }
    res.json(table);
  } catch (error) {
    res.status(500).json({ error: 'Server error retrieving table details.' });
  }
});

// Add a new active table
router.post('/tables', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Table name is required.' });
    }

    // Check if table name is already active
    const activeTableExists = await Table.findOne({ 
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }, 
      status: 'Active' 
    });
    if (activeTableExists) {
      return res.status(400).json({ error: 'A table with this name is already active.' });
    }

    const newTable = new Table({
      name: name.trim(),
      items: [],
      status: 'Active'
    });

    await newTable.save();
    res.status(201).json(newTable);
  } catch (error) {
    res.status(500).json({ error: 'Server error creating table.' });
  }
});

// Update item quantity on a table (Live billing modification)
router.put('/tables/:id/item', async (req, res) => {
  try {
    const { itemId, quantity } = req.body;
    if (!itemId || quantity === undefined) {
      return res.status(400).json({ error: 'itemId and quantity are required.' });
    }

    const targetQuantity = Math.max(0, Number(quantity));

    // Fetch the table
    const table = await Table.findById(req.params.id);
    if (!table) {
      return res.status(404).json({ error: 'Table not found.' });
    }

    // Check if item exists in table's items array
    const itemIndex = table.items.findIndex(ti => ti.itemId.toString() === itemId);

    if (itemIndex > -1) {
      if (targetQuantity === 0) {
        // Remove item if quantity goes to 0
        table.items.splice(itemIndex, 1);
      } else {
        // Update quantity
        table.items[itemIndex].quantity = targetQuantity;
      }
    } else if (targetQuantity > 0) {
      // Add item to table (fetch menu details first)
      const menuItem = await Item.findById(itemId);
      if (!menuItem) {
        return res.status(404).json({ error: 'Menu item not found.' });
      }

      table.items.push({
        itemId: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: targetQuantity
      });
    }

    await table.save();
    res.json(table);
  } catch (error) {
    res.status(500).json({ error: 'Server error updating table items.' });
  }
});

// Delete active table (Cancel/Clear order)
router.delete('/tables/:id', async (req, res) => {
  try {
    const deletedTable = await Table.findByIdAndDelete(req.params.id);
    if (!deletedTable) {
      return res.status(404).json({ error: 'Table not found.' });
    }
    res.json({ message: 'Table cleared/deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Server error clearing table.' });
  }
});

// ==========================================
// 4. BILLING PAYMENT & ARCHIVING
// ==========================================

// Mark table as paid and generate permanent bill in history
router.post('/tables/:id/pay', async (req, res) => {
  try {
    const table = await Table.findById(req.params.id);
    if (!table) {
      return res.status(404).json({ error: 'Table not found.' });
    }

    const activeItems = table.items.filter(item => item.quantity > 0);
    if (activeItems.length === 0) {
      return res.status(400).json({ error: 'Cannot mark an empty bill as paid.' });
    }

    // Calculate total amount
    let totalAmount = 0;
    const itemsToArchive = [];

    for (const item of activeItems) {
      // Fetch the category from Item model to ensure the history has category info for reporting
      const menuItem = await Item.findById(item.itemId);
      const category = menuItem ? menuItem.category : 'Extra Items';

      totalAmount += item.price * item.quantity;
      itemsToArchive.push({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        category: category
      });
    }

    // Create a new Bill
    const newBill = new Bill({
      tableName: table.name,
      items: itemsToArchive,
      totalAmount,
      status: 'Paid',
      createdAt: new Date()
    });

    await newBill.save();

    // Delete the active table document so that table becomes available
    await Table.findByIdAndDelete(req.params.id);

    res.status(201).json({
      message: 'Bill paid successfully and recorded in history.',
      bill: newBill
    });
  } catch (error) {
    console.error('Payment processing error:', error);
    res.status(500).json({ error: 'Server error processing payment.' });
  }
});

// ==========================================
// 5. BILL HISTORY
// ==========================================

// Get all bills
router.get('/bills', async (req, res) => {
  try {
    const { search, startDate, endDate } = req.query;
    let query = {};

    // Search by table name
    if (search && search.trim() !== '') {
      query.tableName = { $regex: search.trim(), $options: 'i' };
    }

    // Filter by date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const bills = await Bill.find(query).sort({ createdAt: -1 });
    res.json(bills);
  } catch (error) {
    res.status(500).json({ error: 'Server error retrieving bill history.' });
  }
});

// Delete a bill from history (Admin only)
router.delete('/bills/:id', authenticateAdmin, async (req, res) => {
  try {
    const deletedBill = await Bill.findByIdAndDelete(req.params.id);
    if (!deletedBill) {
      return res.status(404).json({ error: 'Bill not found.' });
    }
    res.json({ message: 'Bill deleted successfully.', deletedBill });
  } catch (error) {
    res.status(500).json({ error: 'Server error deleting bill.' });
  }
});


// ==========================================
// 6. REPORTS & SALES SUMMARY
// ==========================================

// Get sales report metrics for today
router.get('/reports/today', async (req, res) => {
  try {
    // Start and end of "Today" in local time
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // Query bills generated today
    const billsToday = await Bill.find({
      createdAt: {
        $gte: startOfToday,
        $lte: endOfToday
      }
    });

    let totalRevenue = 0;
    const itemSales = {};

    billsToday.forEach(bill => {
      totalRevenue += bill.totalAmount;
      bill.items.forEach(item => {
        if (!itemSales[item.name]) {
          itemSales[item.name] = {
            name: item.name,
            quantity: 0,
            category: item.category,
            revenue: 0
          };
        }
        itemSales[item.name].quantity += item.quantity;
        itemSales[item.name].revenue += item.price * item.quantity;
      });
    });

    // Find most sold Thali and most sold Extra Item
    let mostSoldThali = { name: 'None', quantity: 0 };
    let mostSoldExtra = { name: 'None', quantity: 0 };

    Object.values(itemSales).forEach(item => {
      if (item.category === 'Thali') {
        if (item.quantity > mostSoldThali.quantity) {
          mostSoldThali = { name: item.name, quantity: item.quantity };
        }
      } else if (item.category === 'Extra Items') {
        if (item.quantity > mostSoldExtra.quantity) {
          mostSoldExtra = { name: item.name, quantity: item.quantity };
        }
      }
    });

    // Sort item sales by quantity for standard items counts report
    const sortedItemSales = Object.values(itemSales).sort((a, b) => b.quantity - a.quantity);

    res.json({
      totalBills: billsToday.length,
      totalRevenue: totalRevenue,
      mostSoldThali: mostSoldThali.name !== 'None' ? `${mostSoldThali.name} (${mostSoldThali.quantity} Sold)` : 'N/A',
      mostSoldExtra: mostSoldExtra.name !== 'None' ? `${mostSoldExtra.name} (${mostSoldExtra.quantity} Sold)` : 'N/A',
      itemSalesDetails: sortedItemSales
    });
  } catch (error) {
    console.error('Reports calculation error:', error);
    res.status(500).json({ error: 'Server error calculating reports.' });
  }
});

module.exports = router;

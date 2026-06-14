require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const Item = require('./models/Item');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/darshan_hotel';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Static Files
app.use(express.static(path.join(__dirname, 'public')));

// Mount API routes
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

// Catch-all route to serve the single page frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Database Auto-Seeding function
const seedDefaultItems = async () => {
  try {
    const count = await Item.countDocuments();
    if (count === 0) {
      console.log('Database menu empty. Seeding default items...');
      const defaultItems = [
        // Thali Section
        { name: 'Mutton Thali', price: 250, category: 'Thali' },
        { name: 'Chicken Thali', price: 220, category: 'Thali' },
        { name: 'Veg Thali', price: 150, category: 'Thali' },
        { name: 'Special Thali', price: 300, category: 'Thali' },
        
        // Extra Items Section
        { name: 'Egg Curry', price: 120, category: 'Extra Items' },
        { name: 'Chicken Fry', price: 180, category: 'Extra Items' },
        { name: 'Rice', price: 60, category: 'Extra Items' },
        { name: 'Chapati', price: 15, category: 'Extra Items' },
        { name: 'Cold Drink', price: 30, category: 'Extra Items' },
        { name: 'Water Bottle', price: 20, category: 'Extra Items' }
      ];

      await Item.insertMany(defaultItems);
      console.log('Successfully seeded default items!');
    } else {
      console.log(`Database already has ${count} menu items. Skipping seeding.`);
    }
  } catch (error) {
    console.error('Error seeding items:', error);
  }
};

// Connect to MongoDB and start Server
mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB database successfully.');
    // Run DB seeding
    await seedDefaultItems();
    
    app.listen(PORT, () => {
      console.log(`Darshan Hotel Billing System server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB database connection error:', err);
    console.log('\n--- IMPORTANT DATABASE TROUBLESHOOTING ---');
    console.log('Please ensure your local MongoDB service is running (mongod) or update your MONGO_URI in .env');
    console.log('--------------------------------------------\n');
    process.exit(1);
  });

const mongoose = require('mongoose');

const BillItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  category: {
    type: String,
    required: true,
    enum: ['Thali', 'Extra Items']
  }
});

const BillSchema = new mongoose.Schema({
  tableName: {
    type: String,
    required: true,
    trim: true
  },
  items: [BillItemSchema],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    default: 'Paid'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Bill', BillSchema);

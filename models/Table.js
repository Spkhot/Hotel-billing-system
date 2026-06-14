const mongoose = require('mongoose');

const TableItemSchema = new mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
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
    min: 0,
    default: 0
  }
});

const TableSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true, // Only one active table with this name at a time
    trim: true
  },
  items: [TableItemSchema],
  status: {
    type: String,
    enum: ['Active', 'Paid'],
    default: 'Active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Table', TableSchema);

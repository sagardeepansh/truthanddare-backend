const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['truth', 'dare'],
    required: true
  },
  category: {
    type: String,
    enum: ['normal', 'adult'],
    default: 'normal'
  },
  text: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('Question', questionSchema);

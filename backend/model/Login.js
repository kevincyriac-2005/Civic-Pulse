const mongoose = require("mongoose");

const loginSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  usertype: { type: String, required: true },
  status: { type: String },
  firstName: { type: String, default: 'Admin' },
  lastName: { type: String, default: 'User' },
  phone: { type: String, default: '' },
  lastLogin: {
    type: Date,
    default: null
  },
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpires: {
    type: Date,
    default: null
  }
});

module.exports = mongoose.model("Login", loginSchema);

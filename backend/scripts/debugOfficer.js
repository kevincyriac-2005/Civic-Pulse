require('dotenv').config();
const mongoose = require('mongoose');
const Login = require('../model/Login');
const Officer = require('../model/Officer');

const mongoURI = process.env.MONGO_URI;
if (!mongoURI) {
  console.error('MONGO_URI not set in .env');
  process.exit(1);
}

async function run() {
  await mongoose.connect(mongoURI);

  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: node backend/scripts/debugOfficer.js <email|name>');
    process.exit(1);
  }

  const isEmail = arg.includes('@');

  try {
    if (isEmail) {
      const login = await Login.findOne({ username: arg });
      console.log('Login:', login ? login.toObject() : null);
      if (login) {
        const officer = await Officer.findOne({ login_id: login._id });
        console.log('Officer profile:', officer ? officer.toObject() : null);
      }
    } else {
      const officer = await Officer.findOne({ name: new RegExp(arg, 'i') }).populate('login_id');
      console.log('Officer (with login):', officer ? officer.toObject() : null);
      if (!officer) {
        const officers = await Officer.find({ name: new RegExp(arg, 'i') }).populate('login_id');
        console.log('Matching officers:', officers.map(o => o.toObject()));
      }
    }
  } catch (err) {
    console.error('Error querying DB:', err);
  } finally {
    mongoose.connection.close();
  }
}

run();

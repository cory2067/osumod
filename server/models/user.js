const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: String,
  userid: String,
  country: String,
  avatar: String,
  discord: String,
  admin: Boolean,
});

// compile model from schema
module.exports = mongoose.model("User", UserSchema);

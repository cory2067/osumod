const mongoose = require("mongoose");

// players[0] is the captain
const TeamSchema = new mongoose.Schema({
  name: String,
  country: String,
  players: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  seedName: String,
  seedNum: Number,
  group: String,
  tourney: String,
});

module.exports = mongoose.model("Team", TeamSchema);

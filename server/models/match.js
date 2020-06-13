const mongoose = require("mongoose");

// -1 for forfeit, -2 for no results yet
const MatchSchema = new mongoose.Schema({
  // can be player names or team names
  player1: String,
  player2: String,
  code: String,
  time: Date,
  score1: { type: Number, default: -2 },
  score2: { type: Number, default: -2 },
  link: String,
  referee: String,
  streamer: String,
  commentators: [String],
  tourney: String,
  stage: String,
});

module.exports = mongoose.model("Match", MatchSchema);

const mongoose = require("mongoose");

const RequestSchema = new mongoose.Schema({
  user: Number,
  requestDate: Date,
  mapId: Number,
  title: String,
  artist: String,
  creator: String,
  feedback: String,
  bpm: Number,
  length: String,
  comment: String,
  m4m: Boolean,
  diffs: [{ name: String, mode: String, sr: Number }],
  status: String,
  image: String,
  archived: Boolean,
});

module.exports = mongoose.model("Request", RequestSchema);

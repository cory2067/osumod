const mongoose = require("mongoose");

const RequestSchema = new mongoose.Schema({
  user: Number,
  requestDate: Date,
  mapId: Number,
  mapsetId: Number,
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
  target: String, // Deprecated
  targetId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

module.exports = mongoose.model("Request", RequestSchema);

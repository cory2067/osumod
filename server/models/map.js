const mongoose = require("mongoose");

const MapSchema = new mongoose.Schema({
  mapId: Number,
  mod: { type: String, enum: ["NM", "HD", "HR", "DT", "FM", "TB"] },
  index: Number,
  title: String,
  artist: String,
  creator: String,
  pooler: String,
  diff: String,
  bpm: Number,
  sr: Number,
  od: Number,
  hp: Number,
  length: String,
  image: String,
  tourney: String,
  stage: String,
});

module.exports = mongoose.model("Map", MapSchema);

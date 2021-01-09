const mongoose = require("mongoose");

const SettingsSchema = new mongoose.Schema({
  open: Boolean,
  maxPending: Number,
  cooldown: Number,
  m4m: Boolean,
  owner: String,
  modes: [{ type: String, enum: ["Standard", "Taiko", "Catch the Beat", "Mania"] }],
  modderType: { type: String, enum: ["full", "probation", "modder"] },
});

module.exports = mongoose.model("Settings", SettingsSchema);

const mongoose = require("mongoose");

// eventually there can be multiple settings docs for multiple modders using the site
const SettingsSchema = new mongoose.Schema({
  open: Boolean,
  maxPending: Number,
  cooldown: Number,
  m4m: Boolean,
  owner: String,
  modderType: { type: String, enum: ["full", "probation", "modder"] },
});

module.exports = mongoose.model("Settings", SettingsSchema);

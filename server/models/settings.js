const mongoose = require("mongoose");

// Represents settings for a user's queue
// This model should probably be renamed to "Queue"

const SettingsSchema = new mongoose.Schema({
  open: Boolean,
  maxPending: Number,
  cooldown: Number,
  m4m: Boolean,
  owner: String, // Deprecated
  title: String,
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  modes: [{ type: String, enum: ["Standard", "Taiko", "Catch the Beat", "Mania"] }],
  modderType: { type: String, enum: ["full", "probation", "modder"] },
  archived: Boolean,
  notes: { type: String, max: 5000 },
  lastActionedDate: Date, // when owner last performed any action on the queue
});

module.exports = mongoose.model("Settings", SettingsSchema);

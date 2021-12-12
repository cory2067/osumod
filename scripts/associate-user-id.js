require("dotenv").config();
const mongoose = require("mongoose");
const db = require("../server/db");
const Request = require("../server/models/request");
const Settings = require("../server/models/settings");
const User = require("../server/models/user");

async function main() {
  await db.init();

  const queues = await Settings.find();
  for (const queue of queues) {
    const username = queue.owner;
    const owner = await User.findOne({ username });
    if (!owner) {
      console.log(`WARNING: couldn't user with name ${username}`);
      return;
    }
    console.log(`${username} has id ${owner._id}`);

    queue.ownerId = owner._id;
    await queue.save();
    await Request.updateMany({ target: username }, { targetId: owner._id });
    console.log(`Updated refs for ${username}`);
  }

  mongoose.disconnect();
}

main().then(() => console.log("Done"));

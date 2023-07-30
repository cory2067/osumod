require("dotenv").config();
const mongoose = require("mongoose");
const db = require("../server/db");
const Request = require("../server/models/request");
const Settings = require("../server/models/settings");
const User = require("../server/models/user");

async function main() {
  await db.init();

  const queues = await Settings.find().populate("ownerId");
  for (const queue of queues) {
    if (queue.owner !== queue.ownerId.username) {
      console.log(`Queue has ${queue.owner}, real username is ${queue.ownerId.username}`);
    } else {
      console.log(`Queue username matches, ${queue.owner}`);
      continue;
    }

    await Settings.findByIdAndUpdate(queue._id, {
      $set: { owner: queue.ownerId.username },
    });
    console.log("updated in db");
  }

  mongoose.disconnect();
}

main().then(() => console.log("Done"));

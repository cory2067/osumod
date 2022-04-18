require("dotenv").config();
const mongoose = require("mongoose");
const db = require("../server/db");
const Request = require("../server/models/request");
const Settings = require("../server/models/settings");
const User = require("../server/models/user");
const fs = require("fs");

// This script fetches *all* requests and caches them in this json file
// Delete this file to force the script to re-fetch
const JSON_PATH = "./scripts/user-to-reqs.json";

async function main() {
  await db.init();
  const queues = await Settings.find({ archived: { $ne: true } });
  const userToQueue = queues
    .map((queue) => queue.toObject())
    .reduce((acc, cur) => ({ ...acc, [cur.ownerId]: cur }), {});

  const users = await User.find({});
  const idToUsername = Object.fromEntries(users.map((u) => [u._id, u.username]));

  let userToReqs = {};
  if (fs.existsSync(JSON_PATH)) {
    userToReqs = JSON.parse(fs.readFileSync(JSON_PATH));
  } else {
    for (const queue of queues) {
      const owner = queue.ownerId;
      const requests = await Request.find({
        targetId: owner,
      });
      console.log(`Fetching requests for ${idToUsername[owner]}`);
      userToReqs[owner] = requests;
    }

    const json = JSON.stringify(userToReqs);
    fs.writeFileSync(JSON_PATH, json);
  }

  const usersWithQueue = Object.keys(userToReqs);
  console.log(`There are a total of ${usersWithQueue.length} queues`);

  usersWithQueue
    .sort((a, b) => userToReqs[b].length - userToReqs[a].length)
    .forEach((user) => {
      console.log(`${idToUsername[user]} has ${userToReqs[user].length} requests`);
    });

  const emptyQueues = usersWithQueue.filter((user) => userToReqs[user].length === 0);
  console.log(`There are ${emptyQueues.length} queues with no requests`);
  const emptyAndClosedQueues = emptyQueues.filter((user) => !userToQueue[user].open);
  console.log(`Out of those, ${emptyAndClosedQueues.length} are closed`);

  const usedQueues = usersWithQueue.filter((user) => !emptyQueues.includes(user));

  const reqTimes = usedQueues.map((userId) => {
    const username = idToUsername[userId];
    const reqs = userToReqs[userId];
    const reqDates = reqs.map((req) => new Date(req.requestDate));
    const latest = reqDates.sort((a, b) => b.getTime() - a.getTime())[0];
    const oldest = reqDates.sort((a, b) => a.getTime() - b.getTime())[0];
    return { userId, username, latest, oldest };
  });

  console.log(reqTimes);

  const userToLatest = reqTimes.reduce((acc, cur) => ({ ...acc, [cur.userId]: cur.latest }), {});
  const userToOldest = reqTimes.reduce((acc, cur) => ({ ...acc, [cur.userId]: cur.oldest }), {});

  const ABANDONED_TIME = 60 * 24 * 60 * 60 * 1000; // 60 days
  const abandonedQueues = usedQueues.filter(
    (user) =>
      new Date() - userToOldest[user] > ABANDONED_TIME &&
      userToReqs[user].every((req) => !req.archived && !req.feedback && req.status === "Pending")
  );
  console.log(`There are ${abandonedQueues.length} abandoned queues`);

  const DEATH_TIME = 150 * 24 * 60 * 60 * 1000;
  const deadQueues = usedQueues.filter(
    (user) => !abandonedQueues.includes(user) && new Date() - userToLatest[user] > DEATH_TIME
  );
  console.log(`There are ${deadQueues.length} dead queues`);

  console.log("Queues to archive:");

  console.log(
    "Archiving these users' queues because they've never received a single request and are closed"
  );
  const emptyAndClosedToArchive = emptyAndClosedQueues.slice(0, emptyAndClosedQueues.length - 20);
  console.log(emptyAndClosedToArchive.map((u) => idToUsername[u]));

  console.log(
    "Archiving these users' queues because they've never responded to a single request, and it's been at least 60 days since they received their first request"
  );
  console.log(abandonedQueues.map((u) => idToUsername[u]));

  console.log(
    "Archiving these users' queues because they haven't received any new requests in 150 days"
  );
  console.log(deadQueues.map((u) => idToUsername[u]));

  //const toArchive = emptyAndClosedToArhive.concat(abandonedQueues).concat(deadQueues);
  const toArchive = emptyAndClosedToArchive;
  console.log(`Archiving ${toArchive.length} queues`);
  for (const user of toArchive) {
    console.log(`Now archiving queue of ${user}`);
    await Settings.findOneAndUpdate({ ownerId: user }, { archived: true });
  }

  mongoose.disconnect();
}

main().then(() => console.log("Done"));

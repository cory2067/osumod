const cron = require("node-cron");
const mongoose = require("mongoose");
const db = require("../db");
const Request = require("../models/request");
const Settings = require("../models/settings");
const User = require("../models/user");
const logger = require("pino")();

const WEEK = 7 * 24 * 60 * 60 * 1000;
const NEW_QUEUE_LENIENCY = 2 * WEEK; // Time to exempt queues that were just created
const LAST_REQ_DEATH_TIME = 8 * WEEK; // Auto-archive time if queue has no new reqs
const NO_RES_DEATH_TIME = 4 * WEEK; // Auto-archive time if owner never responded to a request

const SCRIPT_CREATE_DATE = "2022-04-17";

const cleanQueues = async () => {
  logger.info("Running clean-queues");

  // ignore queues that are open and ones that are already archived
  const queues = await Settings.find({ archived: { $ne: true } }).select(
    "ownerId open createdDate"
  );

  const userToQueue = queues
    .map((queue) => queue.toObject())
    .reduce((acc, cur) => ({ ...acc, [cur.ownerId]: cur }), {});

  const userToReqs = {};
  for (const queue of queues) {
    const owner = queue.ownerId;
    const requests = await Request.find({ targetId: owner })
      .select("requestDate archived feedback status")
      .sort("requestDate");

    userToReqs[owner] = requests;
  }

  const usersWithQueue = Object.keys(userToReqs);
  logger.info(`Fetched a total of ${usersWithQueue.length} queues`);

  const now = new Date();
  const emptyQueues = usersWithQueue.filter((user) => !userToReqs[user].length);
  logger.info(`There are ${emptyQueues.length} empty queues`);

  const usedQueues = usersWithQueue.filter((user) => userToReqs[user].length);

  const reqTimes = Object.fromEntries(
    usedQueues.map((userId) => {
      const reqs = userToReqs[userId];
      const oldest = new Date(reqs[0].requestDate);
      const newest = new Date(reqs[reqs.length - 1].requestDate);
      return [userId, { newest, oldest }];
    })
  );

  const newestActionedReqTime = Object.fromEntries(
    usedQueues.map((u) => {
      const reqs = userToReqs[u].reverse();
      const actioned = reqs.find((r) => r.archived || r.feedback || r.status !== "Pending");
      return [u, actioned && new Date(actioned.requestDate)];
    })
  );

  const users = await User.find({});
  const idToUsername = Object.fromEntries(users.map((u) => [u._id, u.username]));

  // Queue is opened, and either:
  // - Owner has never responded to a request
  // - Last time owner responded to a request was over NO_RES_DEATH_TIME ago
  //    - Unless that request is the latest request the user got
  const abandonedQueues = usedQueues.filter(
    (user) =>
      userToQueue[user].open &&
      (!newestActionedReqTime[user] ||
        (now - newestActionedReqTime[user] > NO_RES_DEATH_TIME &&
          reqTimes[user].newest !== newestActionedReqTime[user]))
  );
  logger.info(`There are ${abandonedQueues.length} abandoned queues that exceed the death time`);

  const deadQueues = usedQueues.filter((user) => now - reqTimes[user].newest > LAST_REQ_DEATH_TIME);
  logger.info(`There are ${deadQueues.length} dead queues that exceed the death time`);

  // date of create (or unarchive) queue
  const getCreateDate = (u) => {
    if (userToQueue[u].createdDate) {
      return new Date(userToQueue[u].createdDate);
    }

    return reqTimes[u] ? reqTimes[u].oldest : SCRIPT_CREATE_DATE;
  };

  const toArchive = Array.from(
    new Set(abandonedQueues.concat(deadQueues) /*.concat(emptyQueues)*/)
  ).filter((u) => now - getCreateDate(u) > NEW_QUEUE_LENIENCY);

  for (const user of toArchive) {
    logger.info(`Now archiving queue ${idToUsername[user]}`);
    await Settings.findOneAndUpdate({ ownerId: user }, { archived: true, open: false });
  }

  logger.info(`Archived ${toArchive.length} queues`);
};

cron.schedule("0 0 * * *", () => {
  cleanQueues().catch((e) => logger.error(e));
});

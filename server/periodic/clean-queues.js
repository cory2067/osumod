const cron = require("node-cron");
const mongoose = require("mongoose");
const db = require("../db");
const Request = require("../models/request");
const Settings = require("../models/settings");
const User = require("../models/user");
const logger = require("pino")();

const WEEK = 7 * 24 * 60 * 60 * 1000;
const AUTO_ARCHIVE_TIME = 8 * WEEK;
const AUTO_CLOSE_TIME = 3 * WEEK;

const SCRIPT_CREATE_DATE = "2022-04-17";

const cleanQueues = async () => {
  logger.info("Running clean-queues");

  // ignore queues that are open and ones that are already archived
  const queues = await Settings.find({ archived: { $ne: true } }).select(
    "ownerId owner open lastActionedDate"
  );

  const getLastActiveDate = (queue) => {
    if (queue.lastActionedDate) {
      return new Date(queue.lastActionedDate);
    }

    return new Date(SCRIPT_CREATE_DATE);
  };

  const now = new Date();
  const queuesToClose = queues.filter(
    (queue) => queue.open && now - getLastActiveDate(queue) > AUTO_CLOSE_TIME
  );

  const queuesToArchive = queues.filter(
    (queue) => now - getLastActiveDate(queue) > AUTO_ARCHIVE_TIME
  );

  for (const queue of queuesToClose) {
    logger.info(`Now closing queue ${queue.owner}`);
    await Settings.findOneAndUpdate({ ownerId: queue.ownerId }, { open: false });
  }

  for (const queue of queuesToArchive) {
    logger.info(`Now archiving queue ${queue.owner}`);
    await Settings.findOneAndUpdate({ ownerId: queue.ownerId }, { archived: true, open: false });
  }

  logger.info(`Closed ${queuesToClose.length} queues`);
  logger.info(`Archived ${queuesToArchive.length} queues`);
};

cron.schedule("0 0 * * *", () => {
  cleanQueues().catch((e) => logger.error(e));
});

const express = require("express");
const logger = require("pino")();
const osu = require("node-osu");
const osuApi = new osu.Api(process.env.OSU_API_KEY);

const ensure = require("./ensure");
const User = require("./models/user");
const Request = require("./models/request");
const Settings = require("./models/settings");

const { addAsync } = require("@awaitjs/express");
const router = addAsync(express.Router());

const BANNED_USERS = ["28993615"];

const ModderType = {
  FULL: "full", // Full BN
  PROBATION: "probation", // Probation BN
  MODDER: "modder", // Non-BN modder
};

const isBN = (settings) =>
  settings.modderType == ModderType.FULL || settings.modderType == ModderType.PROBATION;

const round = (num) => Math.round(num * 100) / 100;
const formatTime = (time) =>
  Math.floor(time / 60) + ":" + (time % 60 < 10 ? "0" : "") + Math.floor(time % 60);

const getDiffName = (beatmap) => {
  const name = beatmap.version;

  // put key count in front of osu!mania diff names if not indicated
  // (should be removed if switching to osu!api v2)
  if (beatmap.mode === "Mania") {
    const keys = beatmap.difficulty.size;

    if (!name.includes(keys + "k") && !name.includes(keys + "K")) {
      return `[${keys}K] ${name}`;
    }
  }

  return name;
};

const modes = { Standard: 0, Taiko: 1, "Catch the Beat": 2, Mania: 3 };
const sortDiffs = (a, b) => {
  const modeComparison = modes[a.mode] - modes[b.mode];
  if (modeComparison) return modeComparison;

  if (a.mode === "Mania" && b.mode === "Mania") {
    const keyComparison = a.keys - b.keys;
    if (keyComparison) return keyComparison;
  }

  return a.sr - b.sr;
};

const getMapData = async (id) => {
  const mapData = await osuApi.getBeatmaps({ s: id });

  return {
    mapsetId: parseInt(mapData[0].beatmapSetId),
    title: mapData[0].title,
    artist: mapData[0].artist,
    creator: mapData[0].creator,
    bpm: parseFloat(mapData[0].bpm),
    length: formatTime(parseInt(mapData[0].length.total)),
    diffs: mapData
      .map((diff) => ({
        name: getDiffName(diff),
        mode: diff.mode,
        keys: diff.difficulty.size ? parseInt(diff.difficulty.size) : 0, // for mania
        sr: round(parseFloat(diff.difficulty.rating)),
      }))
      .sort(sortDiffs),
    status: mapData[0].approvalStatus,
    image: `https://assets.ppy.sh/beatmaps/${mapData[0].beatmapSetId}/covers/cover.jpg`,
  };
};

const getMapsetIdFromRequest = async (req) => {
  if (req.mapsetId) {
    return req.mapsetId;
  }

  // requests before 2/28/21 didn't have the mapset id stored (only one diff's map id)
  // but we can try to parse the mapset id from the map bg link
  const regex = /.*beatmaps\/([0-9]+)\/covers.*/g;
  const match = regex.exec(req.image);
  if (match && match[1]) {
    return match[1];
  }

  // worst case scenario, we fetch it from the osu api
  return (await osuApi.getBeatmaps({ b: req.mapId }))[0].beatmapSetId;
};

function escapeRegExp(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

// Get user, given the username (case insensitive, spaces can be underscore) or osu! user id
const getUserObj = async (identifier) => {
  let regex = `^${escapeRegExp(identifier)}$`;
  if (identifier.includes("_")) {
    const withSpaces = identifier.replace(/_/g, " ");
    regex += `|^${escapeRegExp(withSpaces)}$`;
  }

  // Get owner, falling back to userid
  const user =
    (await User.findOne({
      username: { $regex: new RegExp(regex, "i") },
    })) ||
    (await User.findOne({
      userid: identifier,
    }));

  return user;
};

const bumpActionedDate = (user) =>
  Settings.findOneAndUpdate({ ownerId: user._id }, { $set: { lastActionedDate: new Date() } });

/**
 * POST /api/request
 * Submit a new request
 * Params:
 *   - id: ID of the mapset
 *   - comment: comments by the requester
 *   - m4m: is this a m4m request
 *   - targetId: whose user to request (user _id)
 * Returns the newly-created Map document
 */
router.postAsync("/request", ensure.loggedIn, async (req, res) => {
  logger.info(`${req.user.username} submitted ${req.body.id}`);

  let map;
  try {
    map = await getMapData(req.body.id);
  } catch (e) {
    logger.info(`${req.user.username} submitted an invalid beatmaps`);
    return res.send({ mapset: {}, errors: ["Invalid beatmap ID"] });
  }

  const now = new Date();
  const [settings, lastReq] = await Promise.all([
    Settings.findOne({ ownerId: req.body.targetId }),
    Request.findOne({ user: req.user.userid, targetId: req.body.targetId }).sort({
      requestDate: -1,
    }),
  ]);

  let errors = [];
  const acceptableDiffs = map.diffs.filter((diff) => settings.modes.includes(diff.mode));

  if (acceptableDiffs.length === 0) {
    if (settings.modes.length === 1) {
      errors.push(`Only ${settings.modes[0]} maps are accepted`);
    } else {
      errors.push(`Must be one of the following gamemodes: ${settings.modes.join(", ")}`);
    }
  }

  // TODO: Make this configurable setting
  if (isBN(settings) && !["Pending", "Graveyard"].includes(map.status)) {
    errors.push(`Expected a Pending/Graveyard map (this is ${map.status})`);
  }

  // disable this until osumod can handle username changes properly
  /*if (map.creator !== req.user.username) {
    errors.push("This map isn't yours");
  }*/

  if (req.body.comment && req.body.comment.length > 500) {
    errors.push("Comment is excessively long");
  }

  // outdated check
  /*if (
    settings.modderType === ModderType.PROBATION &&
    taikos.length > 0 &&
    taikos.length < map.diffs.length
  ) {
    errors.push("I can't nominate hybrid sets");
  }*/

  if (!settings.open) {
    errors.push("Requests are closed");
  }

  if (lastReq) {
    const diff = now.getTime() - lastReq.requestDate.getTime();
    const minWait = settings.cooldown * 24 * 3600 * 1000;
    if (diff < minWait) {
      errors.push(
        `You need to wait ${round(
          (minWait - diff) / (24 * 3600 * 1000)
        )} days before you can request again`
      );
    }
  }

  // owner can bypass all restrictions
  if (req.user._id == req.body.targetId) errors = [];

  if (errors.length) {
    logger.info(`${req.user.username} caused these errors: ${errors.join(", ")}`);
    res.send({ map, errors });
  } else {
    const request = new Request({
      ...map,
      status: "Pending",
      user: req.user.userid,
      requestDate: now,
      targetId: req.body.targetId,
      m4m: req.body.m4m || false,
      comment: req.body.comment || "",
      archived: false,
    });
    await request.save();

    const numPending = await Request.countDocuments({
      status: "Pending",
      targetId: req.body.targetId,
      archived: false,
    });
    if (numPending >= settings.maxPending) {
      logger.info(`Now closing requests`);
      await Settings.updateOne({ ownerId: req.body.targetId }, { $set: { open: false } });
    }

    logger.info(`${req.user.username} succesfully requested ${map.title} to ${req.body.targetId}`);
    res.send({ map: request, errors });
  }
});

/**
 * GET /api/requests
 * Get all requests for a given queue owner
 * params:
 *   - archived: get archived requests
 *   - targetId: whose queue to retrieve
 *   - cursor: timestamp of the last request in the page
 */
router.getAsync("/requests", async (req, res) => {
  const user = await getUserObj(req.query.target);
  if (!user) {
    return res.status(404).send({ err: "No such user" });
  }

  const query = {
    targetId: user._id,
    archived: req.query.archived,
  };
  if (req.query.cursor) {
    query["requestDate"] = { $lt: req.query.cursor };
  }
  const requests = await Request.find(query).sort({ requestDate: -1 }).limit(50);
  res.send(requests);
});

/**
 * GET /api/my-requests
 * Get all requests for the currently logged-in user
 * params:
 *   - cursor: timestamp of the last request in the page
 */
router.getAsync("/my-requests", ensure.loggedIn, async (req, res) => {
  const query = {
    user: req.user.userid,
    targetId: { $ne: req.user._id },
  };
  if (req.query.cursor) {
    query["requestDate"] = { $lt: req.query.cursor };
  }
  const requests = await Request.find(query)
    .populate("targetId")
    .sort({ requestDate: -1 })
    .limit(50);
  res.send(
    requests.map((r) => ({ ...r.toObject(), targetId: r.targetId._id, target: r.targetId }))
  );
});

/**
 * DELETE /api/request
 * Delete a request
 * Params:
 *   - id: ID of the request
 */
router.deleteAsync("/request", ensure.loggedIn, async (req, res) => {
  logger.info(`${req.user.username} deleted request ${req.body.id}`);
  // ensure it can only be deleted by the requester or the queue owner
  await Request.deleteOne({
    _id: req.body.id,
    $or: [{ user: req.user.userid }, { targetId: req.user._id }],
  });
  await bumpActionedDate(req.user);
  res.send({});
});

/**
 * POST /api/request-edit
 * Edit an existing request
 * Params:
 *   - id: id of the request
 *   - feedback: Some feedback by the queue owner
 *   - status: request status (e.g. accepted, rejected, nominated)
 *   - archived: whether the request is archived
 */
router.postAsync("/request-edit", ensure.loggedIn, async (req, res) => {
  logger.info(`${req.user.username} edited request ${req.body.id}`);
  // query for "target" ensures that the user can't modify requests on someone else's queue
  const [updated, _] = await Promise.all([
    Request.findOneAndUpdate(
      { _id: req.body.id, targetId: req.user._id },
      {
        $set: { feedback: req.body.feedback, status: req.body.status, archived: req.body.archived },
      },
      { new: true }
    ),
    bumpActionedDate(req.user),
  ]);
  res.send(updated);
});

/**
 * POST /api/request-refresh
 * Refresh a request's metadata and difficulty settings
 * Params:
 *   - id: _id of the request
 */
router.postAsync("/request-refresh", ensure.loggedIn, async (req, res) => {
  logger.info(`${req.user.username} refreshed request ${req.body.id}`);
  const request = await Request.findById(req.body.id);
  if (!request) {
    return res.status(400).send({ msg: "request doesn't exist" });
  }

  let map;
  try {
    const mapsetId = await getMapsetIdFromRequest(request);
    map = await getMapData(mapsetId);
  } catch (e) {
    console.log(e);
    return res.status(400).send({ msg: "map doesn't exist" });
  }

  delete map.status; // don't override what the modder put as map status
  const updated = await Request.findOneAndUpdate(
    { _id: req.body.id, targetId: req.user._id },
    { $set: map },
    { new: true }
  );
  await bumpActionedDate(req.user);
  res.send(updated);
});

/**
 * GET /api/settings
 * Get request settings/status
 * params:
 *   - owner: owner of the queue (username, osu userid)
 */
router.getAsync("/settings", async (req, res) => {
  const owner = await getUserObj(req.query.owner);
  if (!owner) {
    return res.status(404).send({ err: "No such user" });
  }

  const queue = await Settings.findOne({ ownerId: owner._id, archived: { $ne: true } });
  if (!queue) {
    return res.status(404).send({ err: "User has no queue" });
  }
  res.send({ queue, owner });
});

/**
 * POST /api/settings
 * Set request settings/status
 * params:
 *   - settings: settings object (following the Settings schema)
 */
router.postAsync("/settings", ensure.loggedIn, async (req, res) => {
  logger.info(`${req.user.username} updated their settings`);
  await Settings.findOneAndUpdate(
    { ownerId: req.user._id },
    { $set: { ...req.body.settings, lastActionedDate: new Date() } }
  );
  res.send({});
});

/**
 * POST /api/open
 * Set requests open/closed
 * Params:
 *   - open: true for requests open, false for requests closed
 */
router.postAsync("/open", ensure.loggedIn, async (req, res) => {
  logger.info(`${req.user.username} toggled open to ${req.body.open}`);
  await Settings.findOneAndUpdate(
    { ownerId: req.user._id },
    { $set: { open: req.body.open, lastActionedDate: new Date() } }
  );
  res.send({});
});

/**
 * GET /api/queues
 * Get a list of all modding queues
 */
router.getAsync("/queues", async (req, res) => {
  const queues = await Settings.find({ archived: { $ne: true } })
    .sort("-lastActionedDate")
    .select("open owner ownerId modes modderType lastActionedDate");

  // map ownerId -> owner now that it's populated (i should have named this field differently)
  res.send(
    queues.map(({ open, owner, ownerId, modes, modderType, lastActionedDate }) => ({
      open,
      owner: { _id: ownerId, username: owner },
      modes,
      modderType,
      lastActionedDate,
    }))
  );
});

/**
 * POST /api/create-queue
 * Create a queue for oneself
 */
router.postAsync("/create-queue", ensure.loggedIn, async (req, res) => {
  if (BANNED_USERS.includes(req.user.userid)) {
    logger.info(`Banned user ${req.user.username} attempted to create a queue`);
    return res.status(403).send({
      error: "You've been banned due to user reports.",
    });
  }

  const existing = await Settings.findOne({ ownerId: req.user._id });
  const now = new Date();
  if (existing) {
    if (existing.archived) {
      logger.info(`${req.user.username} unarchived their queue`);
      existing.archived = false;
      existing.lastActionedDate = now;
      await existing.save();
    } else {
      logger.info(`${req.user.username} tried to create a queue, but they already have one`);
    }

    return res.send(existing);
  }

  const newSettings = new Settings({
    open: false,
    maxPending: 9999,
    cooldown: 0,
    m4m: false,
    ownerId: req.user._id,
    owner: req.user.username,
    modes: ["Taiko"],
    modderType: "modder",
    lastActionedDate: now,
  });

  await newSettings.save();
  logger.info(`${req.user.username} created a queue`);
  res.send(newSettings);
});

/**
 * POST /api/archive-queue
 * Marks the user's queue as archived, making it invisible from the home page
 */
router.postAsync("/archive-queue", ensure.loggedIn, async (req, res) => {
  const settings = await Settings.findOne({ ownerId: req.user._id });
  if (!settings) {
    return res.status(404).send({ msg: "Queue not found" });
  }
  logger.info(`${req.user.username} archived their queue`);
  settings.archived = true;
  await settings.save();
  res.send(settings);
});

/**
 * POST /api/notes
 * Adds notes to the user's queue (to appear on the requests page)
 * Params:
 *   - content: the notes
 */
router.postAsync("/notes", ensure.loggedIn, async (req, res) => {
  logger.info(`${req.user.username} set their queue notes`);
  await Settings.findOneAndUpdate({ ownerId: req.user._id }, { $set: { notes: req.body.content } });
  await bumpActionedDate(req.user);
  res.send({});
});

/**
 * POST /api/archive-batch
 * Archive many requests
 * Params:
 *   - status: if set, archive all maps with this status
 *   - age: if set, archive all request this many days old
 */
router.postAsync("/archive-batch", ensure.loggedIn, async (req, res) => {
  const query = { targetId: req.user._id, archived: false };
  if (req.body.status && req.body.status !== "any") {
    query.status = req.body.status;
  }
  if (req.body.age && !isNaN(req.body.age)) {
    const date = new Date();
    date.setDate(date.getDate() - req.body.age);
    query.requestDate = { $lt: date };
  }

  const result = await Request.updateMany(query, { $set: { archived: true } });
  await bumpActionedDate(req.user);
  res.send({ modified: result.nModified });
});

router.postAsync("/update-username", ensure.loggedIn, async (req, res) => {
  const osuUser = await osuApi.getUser({ u: req.user.userid });
  if (!osuUser) {
    return res.status(404).send({ err: "User no longer exists" });
  }

  const user = await User.findOneAndUpdate(
    { _id: req.user._id },
    { username: osuUser.name },
    { new: true }
  );
  await Settings.findOneAndUpdate({ ownerId: req.user._id }, { $set: { owner: osuUser.name } });
  res.send(user);
});

/**
 * GET /api/whoami
 * Returns the identity of the currently logged in user
 */
router.getAsync("/whoami", async (req, res) => {
  res.send(req.user || { loggedOut: true });
});

router.all("*", (req, res) => {
  logger.warn(`API route not found: ${req.method} ${req.url}`);
  res.status(404).send({ msg: "API route not found" });
});

module.exports = router;

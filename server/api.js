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
    console.log(a, b);
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

/**
 * POST /api/request
 * Submit a new request
 * Params:
 *   - id: ID of the mapset
 *   - comment: comments by the requester
 *   - m4m: is this a m4m request
 *   - target: whose queue to request
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
    Settings.findOne({ owner: req.body.target }),
    Request.findOne({ user: req.user.userid, target: req.body.target }).sort({ requestDate: -1 }),
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

  if (isBN(settings) && map.status !== "Pending") {
    errors.push(`Expected a Pending map (this is ${map.status})`);
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
  if (req.user.username === req.body.target) errors = [];

  if (errors.length) {
    logger.info(`${req.user.username} caused these errors: ${errors.join(", ")}`);
    res.send({ map, errors });
  } else {
    const request = new Request({
      ...map,
      status: "Pending",
      user: req.user.userid,
      requestDate: now,
      target: req.body.target,
      m4m: req.body.m4m || false,
      comment: req.body.comment || "",
      archived: false,
    });
    await request.save();

    const numPending = await Request.countDocuments({ status: "Pending", target: req.body.target });
    if (numPending >= settings.maxPending) {
      logger.info(`Now closing requests`);
      await Settings.updateOne({ owner: req.body.target }, { $set: { open: false } });
    }

    logger.info(`${req.user.username} succesfully requested ${map.title} to ${req.body.target}`);
    res.send({ map: request, errors });
  }
});

/**
 * GET /api/requests
 * Get all requests
 * params:
 *   - archived: get archived requests
 *   - target: whose queue to retrieve
 */
router.getAsync("/requests", async (req, res) => {
  const requests = await Request.find({
    target: req.query.target,
    archived: req.query.archived,
  }).sort({ requestDate: -1 });
  res.send(requests);
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
    $or: [{ user: req.user.userid }, { target: req.user.username }],
  });
  res.send({});
});

/**
 * POST /api/request-edit
 * Edit an existing request
 * Params:
 *   - feedback: Some feedback by the queue owner
 *   - status: request status (e.g. accepted, rejected, nominated)
 *   - archived: whether the request is archived
 */
router.postAsync("/request-edit", ensure.loggedIn, async (req, res) => {
  logger.info(`${req.user.username} edited request ${req.body.id}`);
  // query for "target" ensures that the user can't modify requests on someone else's queue
  const updated = await Request.findOneAndUpdate(
    { _id: req.body.id, target: req.user.username },
    { $set: { feedback: req.body.feedback, status: req.body.status, archived: req.body.archived } },
    { new: true }
  );
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
  // query for "target" ensures that the user can't modify requests on someone else's queue
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
    { _id: req.body.id, target: req.user.username },
    { $set: map },
    { new: true }
  );
  res.send(updated);
});

/**
 * GET /api/settings
 * Get request settings/status
 * params:
 *   - owner: owner of the queue
 */
router.getAsync("/settings", async (req, res) => {
  res.send(await Settings.findOne({ owner: req.query.owner, archived: { $ne: true } }));
});

/**
 * POST /api/settings
 * Set request settings/status
 * params:
 *   - settings: settings object (following the Settings schema)
 */
router.postAsync("/settings", ensure.loggedIn, async (req, res) => {
  logger.info(`${req.user.username} updated their settings`);
  await Settings.findOneAndUpdate({ owner: req.user.username }, { $set: req.body.settings });
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
  await Settings.findOneAndUpdate({ owner: req.user.username }, { $set: { open: req.body.open } });
  res.send({});
});

/**
 * GET /api/queues
 * Get a list of all modding queues
 */
router.getAsync("/queues", async (req, res) => {
  const queues = await Settings.find({ archived: { $ne: true } }).select(
    "open owner modes modderType"
  );
  res.send(queues);
});

/**
 * POST /api/create-queue
 * Create a queue for oneself
 */
router.postAsync("/create-queue", ensure.loggedIn, async (req, res) => {
  const existing = await Settings.findOne({ owner: req.user.username });
  if (existing) {
    if (existing.archived) {
      logger.info(`${req.user.username} unarchived their queue`);
      existing.archived = false;
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
    owner: req.user.username,
    modes: ["Taiko"],
    modderType: "modder",
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
  const settings = await Settings.findOne({ owner: req.user.username });
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
  await Settings.findOneAndUpdate(
    { owner: req.user.username },
    { $set: { notes: req.body.content } }
  );
  res.send({});
});

/**
 * GET /api/whoami
 * Returns the identity of the currently logged in user
 */
router.getAsync("/whoami", async (req, res) => {
  res.send(req.user || {});
});

router.all("*", (req, res) => {
  logger.warn(`API route not found: ${req.method} ${req.url}`);
  res.status(404).send({ msg: "API route not found" });
});

module.exports = router;

const express = require("express");
const logger = require("pino")();
const osu = require("node-osu");
const osuApi = new osu.Api(process.env.OSU_API_KEY);

const ensure = require("./ensure");
const User = require("./models/user");
const Request = require("./models/request");

const { addAsync } = require("@awaitjs/express");
const router = addAsync(express.Router());

const round = (num) => Math.round(num * 100) / 100;
const formatTime = (time) =>
  Math.floor(time / 60) + ":" + (time % 60 < 10 ? "0" : "") + Math.floor(time % 60);

const checkPermissions = (req, roles) => {
  const tourney = req.query.tourney || req.body.tourney;

  return (
    req.user &&
    req.user.username &&
    (req.user.admin ||
      req.user.roles.some(
        (r) => ["Host", "Developer", ...roles].includes(r.role) && r.tourney == tourney
      ))
  );
};

/**
 * POST /api/request
 * Submit a new request
 * Params:
 *   - id: ID of the mapset
 *   - comment: comments by the requester
 *   - m4m: is this a m4m request
 * Returns the newly-created Map document
 */
router.postAsync("/request", ensure.loggedIn, async (req, res) => {
  logger.info(`${req.user.username} submitted ${req.body.id}`);

  let mapData;
  try {
    mapData = await osuApi.getBeatmaps({ s: req.body.id });
  } catch (e) {
    logger.info(`${req.user.username} submitted an invalid beatmaps`);
    return res.send({ mapset: {}, errors: ["Invalid beatmap ID"] });
  }

  const map = {
    mapId: parseInt(mapData[0].id),
    title: mapData[0].title,
    artist: mapData[0].artist,
    creator: mapData[0].creator,
    bpm: parseFloat(mapData[0].bpm),
    length: formatTime(parseInt(mapData[0].length.total)),
    comment: req.body.comment || "",
    m4m: req.body.m4m || false,
    diffs: mapData
      .map((diff) => ({
        name: diff.version,
        mode: diff.mode,
        sr: round(parseFloat(diff.difficulty.rating)),
      }))
      .sort((a, b) => a.sr - b.sr),
    status: mapData[0].approvalStatus,
    image: `https://assets.ppy.sh/beatmaps/${mapData[0].beatmapSetId}/covers/cover.jpg`,
  };

  const errors = [];
  const taikos = map.diffs.filter((diff) => diff.mode === "Taiko");
  if (taikos.length === 0) {
    errors.push("I'm a taiko BN");
  }

  if (taikos.length < map.diffs.length) {
    errors.push("I can't nominate hybrid sets");
  }

  if (map.status !== "Pending") {
    errors.push(`Expected a Pending map (this is ${map.status})`);
  }

  if (map.creator !== req.user.username) {
    errors.push("This map isn't yours");
  }

  if (map.comment.length > 500) {
    errors.push("Comment is excessively long");
  }

  const now = new Date();
  const lastReq = await Request.findOne({ user: req.user.userid }).sort({ requestDate: -1 });
  if (lastReq) {
    const diff = now.getTime() - lastReq.requestDate.getTime();
    const minWait = 14 * 24 * 3600 * 1000;
    // todo put minWait into some config file/interface
    if (diff < minWait) {
      errors.push(
        `You need to wait ${round(
          (minWait - diff) / (24 * 3600 * 1000)
        )} days before you can request again`
      );
    }
  }

  if (errors.length) {
    logger.info(`${req.user.username} caused these errors: ${errors.join(", ")}`);
  } else {
    const request = new Request({
      ...map,
      user: req.user.userid,
      requestDate: now,
    });
    await request.save();
    logger.info(`${req.user.username} succesfully requested ${map.title}`);
  }
  res.send({ map, errors });
});

/**
 * GET /api/requests
 * Get all requests
 */
router.getAsync("/requests", async (req, res) => {
  const requests = await Request.find();
  res.send(requests);
});

/**
 * DELETE /api/request
 * Delete a request
 * Params:
 *   - id: ID of the request
 */
router.deleteAsync("/map", ensure.loggedIn, async (req, res) => {
  logger.info(`${req.user.username} deleted their request`);
  await Map.deleteOne({ _id: req.body.id, user: req.user.userid });
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

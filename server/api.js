const express = require("express");
const logger = require("pino")();
const osu = require("node-osu");
const osuApi = new osu.Api(process.env.OSU_API_KEY);

const ensure = require("./ensure");
const User = require("./models/user");
const Team = require("./models/team");
const Map = require("./models/map");
const Tournament = require("./models/tournament");
const Match = require("./models/match");
const QualifiersLobby = require("./models/qualifiers-lobby");

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
 * POST /api/map
 * Registers a new map into a mappool
 * Params:
 *   - id: ID of the map
 *   - mod: mod of the map
 *   - index: e.g. 3 for NM3, HD3, HR3
 *   - tourney: identifier for the tourney
 *   - stage: which pool, e.g. qf, sf, f, gf
 * Returns the newly-created Map document
 */
router.postAsync("/map", ensure.loggedIn, async (req, res) => {
  logger.info(`${req.user.username} requestsed ${req.body.id}`);

  let mapData;
  try {
    mapData = await osuApi.getBeatmaps({ s: req.body.id });
  } catch (e) {
    return res.status(400).send({ msg: "Invalid beatmap ID" });
  }

  const mapset = {
    mapId: parseInt(mapData[0].id),
    title: mapData[0].title,
    artist: mapData[0].artist,
    creator: mapData[0].creator,
    bpm: parseFloat(mapData[0].bpm),
    length: formatTime(parseInt(mapData[0].length.total)),
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

  res.send(mapset);
});

/**
 * GET /api/maps
 * Get all the maps for a given mappool (if the user has access)
 * Params:
 *   - tourney: identifier for the tourney
 *   - stage: which pool, e.g. qf, sf, f, gf
 */
router.getAsync("/maps", async (req, res) => {
  const [tourney, maps] = await Promise.all([
    Tournament.findOne({ code: req.query.tourney }),
    Map.find({ tourney: req.query.tourney, stage: req.query.stage }),
  ]);

  // if super hacker kiddo tries to view a pool before it's released
  const stageData = tourney.stages.filter((s) => s.name === req.query.stage)[0];
  if (!stageData.poolVisible && !canViewHiddenPools(req)) {
    return res.status(403).send({ error: "This pool hasn't been released yet!" });
  }

  const mods = { NM: 0, HD: 1, HR: 2, DT: 3, FM: 4, TB: 5 };
  maps.sort((a, b) => {
    if (mods[a.mod] - mods[b.mod] != 0) {
      return mods[a.mod] - mods[b.mod];
    }
    return a.index - b.index;
  });
  res.send(maps);
});

/**
 * DELETE /api/maps
 * Delete a map from the pool
 * Params:
 *   - id: ID of the map to delete
 *   - tourney: identifier for the tourney
 *   - stage: which pool, e.g. qf, sf, f, gf
 */
router.deleteAsync("/map", ensure.isPooler, async (req, res) => {
  logger.info(`${req.user.username} deleted ${req.body.id} from ${req.body.stage} pool`);
  await Map.deleteOne({ tourney: req.body.tourney, stage: req.body.stage, mapId: req.body.id });
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

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
const scaleTime = (time, mod) => (mod === "DT" ? (time * 2) / 3 : time);
const scaleBPM = (bpm, mod) => (mod === "DT" ? bpm * 1.5 : bpm);
const scaleDiff = (diff, mod) => (mod === "HR" ? Math.min(10, round(diff * 1.4)) : diff);

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

const isAdmin = (req) => checkPermissions(req, []);
const canViewHiddenPools = (req) => checkPermissions(req, ["Mapsetter", "Showcase"]);
const cantPlay = (req) => checkPermissions(req, ["Mapsetter", "Referee"]);

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
router.postAsync("/map", ensure.isPooler, async (req, res) => {
  logger.info(`${req.user.username} added ${req.body.id} to ${req.body.stage} mappool`);

  const mod = req.body.mod;
  const modId = { HR: 16, DT: 64 }[mod] || 0; // mod enum used by osu api
  const mapData = (await osuApi.getBeatmaps({ b: req.body.id, mods: modId }))[0];

  // all map metadata cached in our db, so we don't need to spam calls to the osu api
  const newMap = new Map({
    ...req.body,
    mapId: parseInt(mapData.id),
    title: mapData.title,
    artist: mapData.artist,
    creator: mapData.creator,
    diff: mapData.version,
    bpm: scaleBPM(parseFloat(mapData.bpm), mod),
    sr: round(parseFloat(mapData.difficulty.rating)),
    od: scaleDiff(parseFloat(mapData.difficulty.overall), mod),
    hp: scaleDiff(parseFloat(mapData.difficulty.drain), mod),
    length: formatTime(scaleTime(parseInt(mapData.length.total), mod)),
    image: `https://assets.ppy.sh/beatmaps/${mapData.beatmapSetId}/covers/cover.jpg`,
    pooler: req.user.username,
  });
  await newMap.save();
  res.send(newMap);
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

/**
 * POST /api/register
 * Register for a given tournament. Also fetches the player's current rank
 * Params:
 *   - tourney: identifier for the tourney to register for
 */
router.postAsync("/register", ensure.loggedIn, async (req, res) => {
  if (cantPlay(req)) {
    logger.info(`${req.user.username} failed to register for ${req.body.tourney} (staff)`);
    return res.status(400).send({ error: "You're a staff member." });
  }

  const [userData, tourney] = await Promise.all([
    osuApi.getUser({ u: req.user.userid, m: 1, type: "id" }),
    Tournament.findOne({ code: req.body.tourney }),
  ]);

  const rank = userData.pp.rank;
  if (tourney.rankMin !== -1 && rank < tourney.rankMin) {
    logger.info(`${req.user.username} failed to register for ${req.body.tourney} (overrank)`);
    return res
      .status(400)
      .send({ error: `You are overranked for this tourney (your rank: ${rank})` });
  }

  if (tourney.rankMax !== -1 && rank > tourney.rankMax) {
    logger.info(`${req.user.username} failed to register for ${req.body.tourney} (underrank)`);
    return res
      .status(400)
      .send({ error: `You are underranked for this tourney (your rank: ${rank})` });
  }

  logger.info(`${req.user.username} registered for ${req.body.tourney}`);

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $push: {
        tournies: req.body.tourney,
        stats: { regTime: new Date(), tourney: req.body.tourney },
      },
      $set: { rank },
    },
    { new: true }
  );
  res.send(user);
});

/**
 * POST /api/settings
 * Submit settings for a user
 * Params:
 *   - discord: discord username
 *   - timezone: player's timezone
 */
router.postAsync("/settings", ensure.loggedIn, async (req, res) => {
  logger.info(`${req.user.username} updated user settings`);
  await User.findByIdAndUpdate(req.user._id, {
    $set: { discord: req.body.discord, timezone: req.body.timezone },
  });
  res.send({});
});

/**
 * GET /api/players
 * Get player list for a tourney
 * Params:
 *   - tourney: identifier for the tournament
 */
router.getAsync("/players", async (req, res) => {
  const players = await User.find({ tournies: req.query.tourney }).sort({ rank: 1 });
  res.send(players);
});

/**
 * GET /api/staff
 * Get staff list for a tourney
 * Params:
 *   - tourney: identifier for the tournament
 */
router.getAsync("/staff", async (req, res) => {
  const staff = await User.find({ "roles.tourney": req.query.tourney });
  res.send(staff);
});

/**
 * POST /api/staff
 * Add player as staff for a tourney
 * Params:
 *   - username: username of the new staff member
 *   - tourney: identifier for the tournament
 *   - role: role in the tournament
 */
router.postAsync("/staff", ensure.isAdmin, async (req, res) => {
  logger.info(`${req.user.username} added ${req.body.username} as ${req.body.tourney} staff`);
  const user = await User.findOneAndUpdate(
    { username: req.body.username },
    { $push: { roles: { tourney: req.body.tourney, role: req.body.role } } },
    { new: true }
  );

  if (!user) {
    // if this staff member has not created a GTS account yet, generate one right now
    const userData = await osuApi.getUser({ u: req.body.username, m: 1 });
    const newUser = new User({
      username: userData.name,
      userid: userData.id,
      country: userData.country,
      avatar: `https://a.ppy.sh/${userData.id}`,
      roles: [{ tourney: req.body.tourney, role: req.body.role }],
    });
    await newUser.save();
    logger.info(`Generated new staff account for ${req.body.username}`);
    return res.send(newUser);
  }

  res.send(user);
});

/**
 * DELETE /api/staff
 * Removes player from the staff list of a tourney
 * Params:
 *   - username: username of the staff member to delete
 *   - tourney: identifier for the tournament
 */
router.deleteAsync("/staff", ensure.isAdmin, async (req, res) => {
  logger.info(`${req.user.username} removed ${req.body.username} from ${req.body.tourney} staff`);
  await User.findOneAndUpdate(
    { username: req.body.username },
    { $pull: { roles: { tourney: req.body.tourney } } }
  );
  res.send({});
});

/**
 * DELETE /api/player
 * Removes player from the player list of a tourney
 * Params:
 *   - username: username of the player to delete
 *   - tourney: identifier for the tournament
 */
router.deleteAsync("/player", ensure.isAdmin, async (req, res) => {
  logger.info(`${req.user.username} unregistered ${req.body.username} for ${req.body.tourney}`);
  await User.findOneAndUpdate(
    { username: req.body.username },
    { $pull: { tournies: req.body.tourney, stats: { tourney: req.body.tourney } } }
  );
  res.send({});
});

/**
 * GET /api/tournament
 * Get basic info for a tourney
 * Params:
 *   - tourney: identifier for the tournament
 */
router.getAsync("/tournament", async (req, res) => {
  const tourney = await Tournament.findOne({ code: req.query.tourney });
  if (!tourney) return res.send({});

  const stages = tourney.stages;
  if (stages && !canViewHiddenPools(req)) {
    tourney.stages = stages.filter((s) => s.poolVisible);
  }

  if (tourney.stages.length === 0) {
    // always show at least one stage, but don't reveal the mappack
    tourney.stages = [{ ...stages[0].toObject(), mappack: "" }];
  }

  res.send(tourney);
});

/**
 * POST /api/tournament
 * Set basic info for a tourney
 * Params:
 *   - tourney: identifier for the tournament
 *   - registrationOpen: are players allowed to register
 *   - teams: true if this tourney has teams
 *   - stages: what stages this tourney consists of
 */
router.postAsync("/tournament", ensure.isAdmin, async (req, res) => {
  logger.info(`${req.user.username} updated settings for ${req.body.tourney}`);
  const tourney = await Tournament.findOne({ code: req.body.tourney });

  if (!tourney) {
    const newTourney = new Tournament({
      code: req.body.tourney,
      stages: req.body.stages.map((s) => ({ name: s, poolVisible: false, mappack: "" })),
      teams: req.body.teams,
      registrationOpen: req.body.registrationOpen,
    });
    await newTourney.save();
    return res.send(newTourney);
  }

  tourney.registrationOpen = req.body.registrationOpen;
  tourney.teams = req.body.teams;
  tourney.rankMin = req.body.rankMin;
  tourney.rankMax = req.body.rankMax;
  tourney.stages = req.body.stages.map((stage) => {
    // careful not to overwrite existing stage data
    const existing = tourney.stages.filter((s) => s.name === stage)[0];
    return existing || { name: stage, poolVisible: false, mappack: "" };
  });

  await tourney.save();

  res.send(tourney);
});

/**
 * POST /api/stage
 * Change info for a tourney stage
 * Params:
 *   - tourney: identifier for the tournament
 *   - index: index of the stage to modify
 *   - stage: the new info for this stage
 */
router.postAsync("/stage", ensure.isPooler, async (req, res) => {
  logger.info(`${req.user.username} updated stage ${req.body.index} of ${req.body.tourney}`);
  const tourney = await Tournament.findOne({ code: req.body.tourney });
  tourney.stages[req.body.index].mappack = req.body.stage.mappack;
  tourney.stages[req.body.index].poolVisible = req.body.stage.poolVisible;
  await tourney.save();
  res.send(tourney);
});

/**
 * POST /api/match
 * Create a tourney match
 * Params:
 *   - tourney: identifier for the tournament
 *   - stage: the new info for this stage
 *   - player1, player2: the player usernames
 *   - code: the match ID
 *   - time: date and time in string format (in UTC)
 */
router.postAsync("/match", ensure.isAdmin, async (req, res) => {
  logger.info(`${req.user.username} added match ${req.body.code} to ${req.body.tourney}`);
  const match = new Match({
    player1: req.body.player1,
    player2: req.body.player2,
    tourney: req.body.tourney,
    stage: req.body.stage,
    code: req.body.code,
    time: new Date(req.body.time),
  });

  await match.save();
  res.send(match);
});

/**
 * DELETE /api/match
 * Delete a tourney match
 * Params:
 *  - match: the _id of the match
 *  - tourney: identifier for the tournament
 */
router.deleteAsync("/match", ensure.isAdmin, async (req, res) => {
  logger.info(`${req.user.username} deleted match ${req.body.match} from ${req.body.tourney}`);
  await Match.deleteOne({ _id: req.body.match });
  res.send({});
});

/**
 * POST /api/reschedule
 * Reschedule a tourney match
 * Params:
 *   - match: the _id of the match
 *   - tourney: identifier for the tournament
 *   - time: the new match time (in UTC)
 */
router.postAsync("/reschedule", ensure.isAdmin, async (req, res) => {
  const newMatch = await Match.findOneAndUpdate(
    { _id: req.body.match },
    { $set: { time: new Date(req.body.time) } },
    { new: true }
  );

  logger.info(
    `${req.user.username} rescheduled ${req.body.tourney} match ${newMatch.code} to ${req.body.time}`
  );
  res.send(newMatch);
});

/**
 * GET /api/matches
 * Get all matches for a stage
 * Params:
 *   - tourney: identifier for the tournament
 *   - stage: the new info for this stage
 */
router.getAsync("/matches", async (req, res) => {
  const matches = await Match.find({ tourney: req.query.tourney, stage: req.query.stage }).sort({
    time: 1,
  });
  res.send(matches);
});

/**
 * POST /api/results
 * Submit the outcome of a match
 * Params:
 *   - tourney: identifier for the tournament
 *   - match: the _id of the match
 *   - score1, score2: scores of player1 and player2
 *   - link: mp link
 */
router.postAsync("/results", ensure.isRef, async (req, res) => {
  const newMatch = await Match.findOneAndUpdate(
    { _id: req.body.match, tourney: req.body.tourney },
    {
      $set: { score1: req.body.score1, score2: req.body.score2, link: req.body.link },
    },
    { new: true }
  );

  logger.info(`${req.user.username} submitted results for match ${newMatch.code}`);
  res.send(newMatch);
});

/**
 * POST /api/referee
 * Add self as a referee to a match
 * Params:
 *  - match: the _id of the match
 *  - tourney: identifier for the tournament
 */
router.postAsync("/referee", ensure.isRef, async (req, res) => {
  const match = await Match.findOne({ _id: req.body.match, tourney: req.body.tourney });
  if (match.referee) return res.status(400).send({ error: "already exists" });
  match.referee = req.user.username;
  await match.save();

  logger.info(`${req.user.username} signed up to ref ${match.code}`);
  res.send(match);
});

/**
 * DELETE /api/referee
 * Removes the current referee
 * Params:
 *  - match: the _id of the match
 *  - tourney: identifier for the tournament
 */
router.deleteAsync("/referee", ensure.isRef, async (req, res) => {
  const match = await Match.findOneAndUpdate(
    { _id: req.body.match, tourney: req.body.tourney },
    { $unset: { referee: 1 } },
    { new: true }
  );

  logger.info(`${req.user.username} deleted the ref of ${match.code}`);
  res.send(match);
});

/**
 * POST /api/streamer
 * Add self as a streamer to a match
 * Params:
 *  - match: the _id of the match
 *  - tourney: identifier for the tournament
 */
router.postAsync("/streamer", ensure.isStreamer, async (req, res) => {
  const match = await Match.findOne({ _id: req.body.match, tourney: req.body.tourney });
  if (match.streamer) return res.status(400).send({ error: "already exists" });
  match.streamer = req.user.username;
  await match.save();

  logger.info(`${req.user.username} signed up to stream ${match.code}`);
  res.send(match);
});

/**
 * DELETE /api/streamer
 * Removes the current streamer
 * Params:
 *  - match: the _id of the match
 *  - tourney: identifier for the tournament
 */
router.deleteAsync("/streamer", ensure.isStreamer, async (req, res) => {
  const match = await Match.findOneAndUpdate(
    { _id: req.body.match, tourney: req.body.tourney },
    { $unset: { streamer: 1 } },
    { new: true }
  );

  logger.info(`${req.user.username} deleted the streamer of ${match.code}`);
  res.send(match);
});

/**
 * POST /api/commentator
 * Add self as a commentator to a match
 * Params:
 *  - match: the _id of the match
 *  - tourney: identifier for the tournament
 */
router.postAsync("/commentator", ensure.isCommentator, async (req, res) => {
  const match = await Match.findOneAndUpdate(
    { _id: req.body.match, tourney: req.body.tourney },
    { $push: { commentators: req.user.username } },
    { new: true }
  );

  logger.info(`${req.user.username} signed up to commentate ${match.code}`);
  res.send(match);
});

/**
 * DELETE /api/commentator
 * Remove someone as a commentator to a match
 * Params:
 *  - match: the _id of the match
 *  - user: name of the person to remove
 *  - tourney: identifier for the tournament
 */
router.deleteAsync("/commentator", ensure.isCommentator, async (req, res) => {
  const match = await Match.findOneAndUpdate(
    { _id: req.body.match, tourney: req.body.tourney },
    { $pull: { commentators: req.body.user } },
    { new: true }
  );

  logger.info(`${req.user.username} removed ${req.body.user} from commentating ${match.code}`);
  res.send(match);
});

/**
 * GET /api/lobbies
 * Get all qual lobbies for this tournament
 * Params:
 *   - tourney: the code of the tournament
 */
router.getAsync("/lobbies", async (req, res) => {
  const lobbies = await QualifiersLobby.find({ tourney: req.query.tourney }).sort({ time: 1 });
  res.send(lobbies);
});

/**
 * POST /api/lobby
 * Create a new qualifiers lobby
 * Params:
 *   - time: the time for this lobby
 *   - tourney: the code of the tournament
 */
router.postAsync("/lobby", ensure.isAdmin, async (req, res) => {
  logger.info(`${req.user.username} added a quals lobby to ${req.body.tourney}`);
  const lobby = new QualifiersLobby({
    time: req.body.time,
    tourney: req.body.tourney,
  });
  await lobby.save();
  res.send(lobby);
});

/**
 * DELETE /api/lobby
 * Delete a quals lobby
 * Params:
 *  - lobby: the _id of the lobby
 *  - tourney: identifier for the tournament
 */
router.deleteAsync("/lobby", ensure.isAdmin, async (req, res) => {
  logger.info(`${req.user.username} deleted lobby ${req.body.lobby} from ${req.body.tourney}`);
  await QualifiersLobby.deleteOne({ _id: req.body.lobby });
  res.send({});
});

/**
 * POST /api/lobby-referee
 * Add self as a referee to a quals lobby
 * Params:
 *  - lobby: the _id of the lobby
 *  - tourney: identifier for the tournament
 */
router.postAsync("/lobby-referee", ensure.isRef, async (req, res) => {
  const lobby = await QualifiersLobby.findOne({ _id: req.body.lobby, tourney: req.body.tourney });
  if (lobby.referee) return res.status(400).send({ error: "already exists" });
  lobby.referee = req.user.username;
  await lobby.save();

  logger.info(`${req.user.username} signed up to ref a quals lobby for ${req.body.tourney}`);
  res.send(lobby);
});

/**
 * DELETE /api/lobby-referee
 * Removes the current referee from a quals lobby
 * Params:
 *  - lobby: the _id of the lobby
 *  - tourney: identifier for the tournament
 */
router.deleteAsync("/lobby-referee", ensure.isRef, async (req, res) => {
  logger.info(`${req.user.username} removed a quals lobby ref for ${req.body.tourney}`);
  const lobby = await QualifiersLobby.findOneAndUpdate(
    { _id: req.body.lobby, tourney: req.body.tourney },
    { $unset: { referee: 1 } },
    { new: true }
  );
  res.send(lobby);
});

/**
 * POST /api/lobby-player
 * Add self as a player/team to a quals lobby
 * Params:
 *  - lobby: the _id of the lobby
 *  - teams: true to add team, false to add player
 *  - tourney: identifier of the tournament
 */
router.postAsync("/lobby-player", ensure.loggedIn, async (req, res) => {
  if (!req.user.tournies.includes(req.body.tourney)) return res.status(403).send({});
  logger.info(`${req.user.username} signed up for a quals lobby in ${req.body.tourney}`);

  const toAdd = req.body.teams
    ? (await Team.findOne({ players: req.user._id, tourney: req.body.tourney })).name
    : req.user.username;

  const lobby = await QualifiersLobby.findOneAndUpdate(
    {
      _id: req.body.lobby,
      tourney: req.body.tourney,
    },
    { $addToSet: { players: toAdd } },
    { new: true }
  );
  res.send(lobby);
});

/**
 * DELETE /api/lobby-player
 * Removes a player/team from a quals lobby
 * Params:
 *  - lobby: the _id of the lobby
 *  - target: the name of the player/team to remove
 *  - teams: true iff name is a team
 *  - tourney: code for this tourney
 */
router.deleteAsync("/lobby-player", ensure.loggedIn, async (req, res) => {
  if (!isAdmin(req)) {
    // makes sure the player has permission to do this

    if (req.body.teams) {
      const team = await Team.findOne({
        name: req.body.target,
        players: req.user._id,
        tourney: req.body.tourney,
      });

      // is the player actually on this team?
      if (!team) {
        logger.warn(`${req.user.username} attempted to tamper with the quals lobby!`);
        return res.status(403).send({ error: "Cannot remove other teams" });
      }
    } else if (req.body.target !== req.user.username) {
      logger.warn(`${req.user.username} attempted to tamper with the quals lobby!`);
      return res.status(403).send({ error: "Cannot remove other players" });
    }
  }

  logger.info(
    `${req.user.username} removed ${req.body.target} from a quals lobby in ${req.body.tourney}`
  );
  const lobby = await QualifiersLobby.findOneAndUpdate(
    {
      _id: req.body.lobby,
      tourney: req.body.tourney,
    },
    { $pull: { players: req.body.target } },
    { new: true }
  );
  res.send(lobby);
});

/**
 * POST /api/team
 * Create a new team
 * Params:
 *   - name: team name
 *   - players: a list of players, where the first item is the captain
 *   - tourney: the code of the tournament
 */
router.postAsync("/team", ensure.isAdmin, async (req, res) => {
  logger.info(`${req.user.username} created team ${req.body.name} in ${req.body.tourney}`);
  const players = await Promise.all(req.body.players.map((username) => User.findOne({ username })));

  const team = new Team({
    name: req.body.name,
    players: players.map((p) => p._id),
    tourney: req.body.tourney,
    country: players[0].country,
  });

  await team.save();
  res.send({ ...team.toObject(), players });
});

/**
 * GET /api/teams
 * Get all teams in a tourney
 * Params:
 *   - tourney: the code of the tournament
 */
router.getAsync("/teams", async (req, res) => {
  const teams = await Team.find({ tourney: req.query.tourney })
    .populate("players")
    .sort({ name: 1 });
  res.send(teams);
});

/**
 * DELETE /api/team
 * Delete a specific team
 * Params:
 *   - _id: the _id of the team
 *   - tourney: identifier of the tourney
 */
router.deleteAsync("/team", ensure.isAdmin, async (req, res) => {
  logger.info(`${req.user.username} deleted team ${req.body._id} from ${req.body.tourney}`);
  await Team.deleteOne({ _id: req.body._id });
  res.send({});
});

/**
 * POST /api/team-stats
 * Set stats/details about an existing team
 * Params:
 *   - _id: the _id of the team
 *   - seedName: i.e. Top, High, Mid, or Low
 *   - seedNum: the team's rank in the seeding
 *   - group: one character capitalized group name
 *   - tourney: identifier of the tourney
 */
router.postAsync("/team-stats", ensure.isAdmin, async (req, res) => {
  const team = await Team.findOneAndUpdate(
    { _id: req.body._id },
    {
      $set: {
        seedName: req.body.seedName,
        seedNum: req.body.seedNum,
        group: req.body.group,
      },
    },
    { new: true }
  ).populate("players");

  logger.info(`${req.user.username} set stats for ${team.name} in ${req.body.tourney}`);
  res.send(team);
});

/**
 * POST /api/player-stats
 * Set stats/details about an existing player
 * Params:
 *   - _id: the _id of the player
 *   - seedName: i.e. Top, High, Mid, or Low
 *   - seedNum: the player's rank in the seeding
 *   - group: one character capitalized group name
 *   - regTime: the date/time the player registered
 *   - tourney: the code of the tourney
 */
router.postAsync("/player-stats", ensure.isAdmin, async (req, res) => {
  await User.findOneAndUpdate(
    { _id: req.body._id },
    { $pull: { stats: { tourney: req.body.tourney } } }
  );

  const user = await User.findOneAndUpdate(
    { _id: req.body._id },
    {
      $push: {
        stats: {
          tourney: req.body.tourney,
          seedName: req.body.seedName,
          seedNum: req.body.seedNum,
          group: req.body.group,
          regTime: req.body.regTime,
        },
      },
    },
    { new: true }
  );

  logger.info(`${req.user.username} set stats for ${user.username} in ${req.body.tourney}`);
  res.send(user);
});

/**
 * POST /api/refresh
 * Refreshes the rank/username of a batch of players in this tourney
 * Params:
 *   - tourney: identifier for the tourney to refresh
 *   - offset: which index player to start on
 * Returns:
 *   - offset: the offset to send the next request
 *   - players: the updated player info
 */
router.postAsync("/refresh", ensure.isAdmin, async (req, res) => {
  const BATCH_SIZE = 8;
  if (req.body.offset === 0) {
    logger.info(`${req.user.username} initiated a refresh of ${req.body.tourney} player list`);
  }

  const players = await User.find({ tournies: req.body.tourney })
    .skip(req.body.offset)
    .limit(BATCH_SIZE);

  await Promise.all(
    players.map(async (p) => {
      const userData = await osuApi.getUser({ u: p.userid, m: 1, type: "id" });
      p.rank = userData.pp.rank;
      p.username = userData.name;
      await p.save();
    })
  );

  res.send({
    offset: req.body.offset + BATCH_SIZE,
    players: players,
  });
});

router.all("*", (req, res) => {
  logger.warn(`API route not found: ${req.method} ${req.url}`);
  res.status(404).send({ msg: "API route not found" });
});

module.exports = router;

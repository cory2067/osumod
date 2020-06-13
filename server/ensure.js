// Ensure a user has a certain permission before allowing access
const logger = require("pino")();

function loggedIn(req, res, next) {
  if (!req.user || !req.user.username) {
    return res.status(401).send({ error: "Not logged in, refusing access." });
  }

  next();
}

// ensure the user is an admin, or otherwise has one of the roles specified in userRoles
function ensure(userRoles, title) {
  const roles = ["Host", "Developer", ...userRoles];
  return (req, res, next) => {
    if (!req.user || !req.user.username) {
      return res.status(401).send({ error: "Not logged in, refusing access." });
    }

    const tourney = req.body.tourney || req.query.tourney;

    if (
      req.user.admin ||
      req.user.roles.some((r) => roles.includes(r.role) && r.tourney === tourney)
    ) {
      return next();
    }

    logger.warn(`${req.user.username} attempted to gain ${title} access!`);
    return res.status(403).send({ error: "You do not have permission to access this." });
  };
}

module.exports = {
  isAdmin: ensure([], "admin"),
  isPooler: ensure(["Mapsetter"], "pooler"),
  isRef: ensure(["Referee"], "ref"),
  isStreamer: ensure(["Streamer"], "streamer"),
  isCommentator: ensure(["Commentator"], "commentator"),
  loggedIn,
};

// Ensure a user has a certain permission before allowing access
const logger = require("pino")();

function loggedIn(req, res, next) {
  if (!req.user || !req.user.username) {
    return res.status(401).send({ error: "Not logged in, refusing access." });
  }

  next();
}

// DEPRECATED: "admin" property serves no purpose anymore
// ensure the user is an admin, or otherwise has one of the roles specified in userRoles
function isAdmin(req, res, next) {
  if (!req.user || !req.user.username) {
    return res.status(401).send({ error: "Not logged in, refusing access." });
  }

  if (req.user.admin) {
    return next();
  }

  logger.warn(`${req.user.username} attempted to gain admin access!`);
  return res.status(403).send({ error: "You do not have permission to access this." });
}

module.exports = {
  isAdmin,
  loggedIn,
};

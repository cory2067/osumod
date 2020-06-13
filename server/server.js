require("dotenv").config();

const express = require("express");
const path = require("path");
const logger = require("pino")();
const passport = require("passport");
const sslRedirect = require("heroku-ssl-redirect");

const api = require("./api");
const auth = require("./auth");

const db = require("./db");
db.init();

const app = express();

app.set("trust proxy", true);
app.use(sslRedirect());
app.use(express.json());

const session = require("express-session");
const MongoStore = require("connect-mongo")(session);
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    store: new MongoStore({ mongooseConnection: db.getConnection() }),
    resave: false,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Redirect to non-www url
app.get("*", (req, res, next) => {
  if (req.headers.host.slice(0, 4) === "www.") {
    const newHost = req.headers.host.slice(4);
    return res.redirect(301, req.protocol + "://" + newHost + req.originalUrl);
  }
  next();
});

app.use("/api", api);
app.use("/auth", auth);

// load the compiled react files, which will serve /index.html and /bundle.js
const reactPath = path.resolve(__dirname, "..", "client", "dist");
app.use(express.static(reactPath));

// for all other routes, render index.html and let react router handle it
app.get("*", (req, res) => {
  res.sendFile(path.join(reactPath, "index.html"));
});

// any server errors cause this function to run
app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status === 500) {
    logger.error("The server errored when processing a request!");
    logger.error(err);
  }

  res.status(status);
  res.send({
    status: status,
    message: err.message,
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  logger.info(`Server running on port: ${port}`);
});

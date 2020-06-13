const mongoose = require("mongoose"); // library to connect to MongoDB
const logger = require("pino")(); // import pino logger

module.exports = {
  init: () => {
    // connect to mongodb
    mongoose
      .connect(process.env.MONGO_SRV, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
      })
      .then(() => logger.info("Server connected to MongoDB"))
      .catch((err) => logger.error("Error connecting to MongoDB", err));
  },
  getConnection: () => mongoose.connection,
};

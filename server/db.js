const mongoose = require("mongoose"); // library to connect to MongoDB
const logger = require("pino")(); // import pino logger

module.exports = {
  init: async () => {
    while (true) {
      try {
        mongoose.set("strictQuery", true);
        await mongoose.connect(process.env.MONGO_SRV, {});
        logger.info("Server connected to MongoDB");
        return mongoose.connection.getClient();
      } catch (err) {
        logger.error("Error connecting to MongoDB");
        logger.error(err);
        logger.info("Retrying connection in 10 seconds");
        await new Promise((resolve) => setTimeout(resolve, 10000));
      }
    }
  },
  getConnection: () => mongoose.connection,
};

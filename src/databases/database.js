const config = require('config');
const mongoose = require('mongoose');
const Logger = require('../utils/logger');
const dbConfig = config.get('dbConfig');

const dbConnection = {
    uri: dbConfig.dbAcess == 'local'?dbConfig.connectionString:dbConfig.cludConnectionString,
    options: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    },
};

const connectDatabase = async () => {
    new Promise((resolve) => {
        Logger.info(`connecting database: ${dbConnection.uri}`);
        try {
            mongoose
            .connect(dbConnection.uri, dbConnection.options)
            .then(x => {
              Logger.info(
                `Connected to Mongo! Database name: "${x.connections[0].name}"`
              );
              resolve({ error: false });


            })
            .catch(err => {
              Logger.error("Error connecting to mongo", err);
              resolve({ error: true });

            });
        }
        catch (err) {
            Logger.error(err.message);
            resolve({ error: true });
        }
    })
}

const dbErrorHandler = (error) => {
    Logger.error("Db connection error");
    Logger.error(error.message);
    process.exit(1);
}

module.exports = { connectDatabase };


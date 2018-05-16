const Sequelize = require('sequelize');
const logger = require('tracer').colorConsole();
const express = require("express");
const dbName = 'database3'
const sequelize = new Sequelize(dbName, 'postgres', 'example', {
    host: 'db',
    dialect: 'postgres',

    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    },

    // http://docs.sequelizejs.com/manual/tutorial/querying.html#operators
    operatorsAliases: false
});

const u = {
    username: Sequelize.STRING,
    birthday: Sequelize.DATE
}

const User = sequelize.define('user', u);


sequelize.sync()
    .catch(e => logger.error(e))
    .then(() => User.create({
        username: 'janedoe',
        birthday: new Date(1980, 6, 20)
    }))
    .catch(e => logger.error(e))
    .then(jane => {
        console.log(jane.toJSON());
    })
    .catch(e => logger.error(e));

const app = express()

const port=8080;
logger.info("Listening...", port)
app.listen(port)
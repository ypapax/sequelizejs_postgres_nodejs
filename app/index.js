const Sequelize = require('sequelize');
const logger = require('tracer').colorConsole();
const express = require("express");
const sequelize = new Sequelize('database3', 'postgres', 'example', {
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

const User = sequelize.define('user', {
    username: Sequelize.STRING,
    birthday: Sequelize.DATE
});

sequelize.sync()
    .then(() => User.create({
        username: 'janedoe',
        birthday: new Date(1980, 6, 20)
    }))
    .then(jane => {
        console.log(jane.toJSON());
    });

const app = express()

const port=8080;
logger.info("Listening...", port)
app.listen(port)
const Sequelize = require('sequelize');
const logger = require('tracer').colorConsole();
const express = require("express");
const pg = require('pg');
const dbName = 'database3',
    username = 'postgres',
    password = 'example',
    host = 'db'
const config = {
    user: username,
    password: password,
    host: host
};
// pool takes the object above -config- as parameter
const pool = new pg.Pool(config); // https://stackoverflow.com/a/47308439/1024794

logger.info("connecting to postgres db", dbName)
pool.connect(function (err, client, done) {
    // create the db and ignore any errors, for example if it already exists.
    // https://stackoverflow.com/a/32212001/1024794
    if (err) {
        logger.error(err)
        return
    }
    logger.info("creating db ", dbName)
    client.query('CREATE DATABASE ' + dbName, function (err) {
        if (err) {
            logger.info("err type", typeof err, JSON.stringify(err, null, "\t"));
            if (err.toString().indexOf("already exists") > -1) {
                logger.warn(err);
            } else {
                logger.error(err)
                return;
            }
        }

        //db should exist now, initialize Sequelize
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

        User.findAll().then(users => {
            logger.info("users", users);
            logger.info("users.length ", users.length)
        })
            .catch(e => logger.error(e))
        logger.info("closing pg connection")
        pool.end(); // close the connection
    });
});


const app = express()

const port = 8080;
logger.info("Listening...", port)
app.listen(port)
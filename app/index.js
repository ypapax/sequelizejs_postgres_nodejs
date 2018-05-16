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

function connect() {
    return new Promise((resolve, reject) => {
        logger.info("connecting to postgres db", dbName)
        pool.connect(function (err, client, done) {
            if (err) {
                logger.error(err)
                return reject(new Error(err));
            }
            return resolve(client)
        })
    })
}

function pgQuery(client, query) {
    return new Promise((resolve, reject) => {
        logger.trace("query to pg", query)
        client.query(query, function (err) {
            if (err) {
                reject(err)
                return
            }
            resolve("ok")
        });

    })
}

connect().then((client) => {
    logger.info("creating db ", dbName)
    return pgQuery(client, 'CREATE DATABASE ' + dbName)
}).catch(err => {
    logger.error(err)
}).then(() => {
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
        logger.info("users.length ", users.length)
    })
        .catch(e => logger.error(e))
    logger.info("closing pg connection")
    pool.end(); // close the connection
});


const app = express()

const port = 8080;
logger.info("Listening...", port)
app.listen(port)
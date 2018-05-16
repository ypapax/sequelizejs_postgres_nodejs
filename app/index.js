const Sequelize = require('sequelize');
const logger = require('tracer').colorConsole();
const express = require("express");
const to = require("await-to-js").to
const pg = require('pg');
const util = require('util')
const dbName = 'database4',
    username = 'postgres',
    password = 'example2',
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
                logger.trace(err)
                return reject(new Error(err));
            }
            return resolve(client)
        })
    })
}

function pgQuery(client, query) {
    return new Promise((resolve, reject) => {
        logger.log("query to pg", query)
        client.query(query, function (err, result) {
            if (err) {
                reject(err, client)
                return
            }
            logger.log("result", result)
            resolve(result, client)
        });

    })
}

async function createDbInsertSelect() {
    let client, err;
    [err, client] = await to(connect()) // https://blog.grossman.io/how-to-write-async-await-without-try-catch-blocks-in-javascript/
    if (err) {
        throw new Error(err)
    }
    const result = await pgQuery(client, util.format(`select exists(
 SELECT datname FROM pg_catalog.pg_database WHERE lower(datname) = lower('%s')
);`, dbName))
    if (result.rows[0].exists === true) {
        logger.trace("db already exists")
    } else {
        await pgQuery(client, 'CREATE DATABASE ' + dbName)
    }
    //db should exist now, initialize Sequelize
    const sequelize = new Sequelize(dbName, username, password, {
        host: host,
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

    logger.info("syncing db tables and models")
    await sequelize.sync()
    logger.info("inserting a new row")
    await User.create({
        username: 'janedoe',
        birthday: new Date(1980, 6, 20)
    })

    const users = await User.findAll()
    logger.info("users.length ", users.length)
    logger.info("closing pg connection")
    pool.end(); // close the connection
    logger.info("connection is closed")
    return "ok"
}

createDbInsertSelect()
    .then((result) => logger.info(result))
    .catch((err) => logger.error(err))


const app = express()

const port = 8080;
logger.info("Listening...", port)
app.listen(port)
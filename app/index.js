const Sequelize = require('sequelize');
const logger = require('tracer').colorConsole();
const express = require("express");
const to = require("await-to-js").to
const pg = require('pg');
const util = require('util')
const dbName = 'database4',
    username = 'postgres',
    password = 'example',
    host = 'db'
const config = {
    user: username,
    password: password,
    host: host
};

function connect() {
    return new Promise((resolve, reject) => {
        // pool takes the object above -config- as parameter
        const pool = new pg.Pool(config); // https://stackoverflow.com/a/47308439/1024794
        logger.info("connecting to postgres db", dbName)
        pool.connect(function (err, client, done) {
            if (err) {
                logger.trace(err)
                reject(err);
                return;
            }
            logger.log("pool", pool)
            return resolve([client, pool])
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

async function prepareDB() {
    let client, err, pool;
    [err, [client, pool]] = await to(connect()) // https://blog.grossman.io/how-to-write-async-await-without-try-catch-blocks-in-javascript/
    if (err) {
        throw new Error(err)
    }
    logger.info("client", client)
    logger.trace("pool 2", pool)
    const result = await pgQuery(client, util.format(`select exists(
 SELECT datname FROM pg_catalog.pg_database WHERE lower(datname) = lower('%s')
);`, dbName))
    if (result.rows[0].exists === true) {
        logger.trace("db already exists")
    } else {
        [err] = await to(pgQuery(client, 'CREATE DATABASE ' + dbName))
        if (err) {
            logger.error(err)
            pool.end();
            throw new Error(err)

        }
    }
    pool.end(); // close the connection
}

async function insertSelectUsers(sequelize) {
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
    logger.info("connection is closed")
    return users
}

async function doAll() {
    let err;
    [err] = await to(prepareDB())
    if (err) {
        logger.error(err)
        throw new Error(err)
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
    [err] = await to(insertSelectUsers(sequelize))
    if (err) {
        logger.error(err)
        throw new Error(err)
    }
    // http://www.redotheweb.com/2013/02/20/sequelize-the-javascript-orm-in-practice.html

}

doAll()
    .then((result) => logger.info(result))
    .catch(err => {
        logger.error(err);
    })


const app = express()

const port = 8080;
logger.info("Listening...", port)
app.listen(port)
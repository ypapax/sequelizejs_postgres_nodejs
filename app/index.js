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

const uuidv1 = require('uuid/v1');


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
    [err] = await to(projectsTasks(sequelize))
    if (err) {
        logger.error(err)
        throw new Error(err)
    }

    [err] = await to(relations(sequelize))
    if (err) {
        logger.error(err)
        throw new Error(err)
    }
    return "ok"
}

async function belongsTo(sequelize) {
    const Player = sequelize.define('player', {
        name: Sequelize.STRING
    })
    const Team = sequelize.define('team', {
        teamName: {
            type: Sequelize.STRING,
            primaryKey: true
        },
        uuid: {
            type: Sequelize.UUID,
            primaryKey: true
        }
    })
    Player.belongsTo(Team, {foreignKey: "block", targetKey: "teamName"})
    let err;
    [err] = await to(sequelize.sync({force: true}));
    if (err) {
        logger.error(err)
        throw new Error(err)
    }
    let team;
    [err, team] = await to(Team.create({
        teamName: "giants",
        uuid: uuidv1()
    }));
    if (err) {
        logger.error(err)
        throw new Error(err)
    }
    let player
    logger.trace("team created", team.dataValues);
    [err, player] = await to(Player.create({
        name: "Maxim",
        block: team.teamName
    }));
    if (err) {
        logger.error(err)
        throw new Error(err)
    }
    logger.trace("player is created", player.dataValues);
    [err, players] = await to(Player.findAll())
    if (err) {
        logger.error(err)
        throw new Error(err)
    }
    players = players.map(p => p.dataValues)
    logger.info("players", players)
    return players
}

async function oneToOne(sequelize) {
    let err;
    [err] = await to(belongsTo(sequelize))
    if (err) {
        logger.error(err)
        throw new Error(err)
    }
}

async function relations(sequelize) {
    // http://docs.sequelizejs.com/manual/tutorial/associations.html
    let err;
    [err] = await to(oneToOne(sequelize))
    if (err) {
        logger.error(err)
        throw new Error(err)
    }
}

async function projectsTasks(sequelize) {
    let err;
    const Project = sequelize.define('Project', {
        title: Sequelize.STRING,
        description: Sequelize.TEXT,
    });
    const Task = sequelize.define('Task', {
        title: Sequelize.STRING,
        description: Sequelize.TEXT,
        deadline: Sequelize.DATE
    });

    Project.hasMany(Task);
    [err] = await to(sequelize.sync({force: true})) // force drops tables if exist
    if (err) {
        logger.error(err)
        throw new Error(err)
    }
    for (let i = 1; i <= 2; i++) {
        const project = Project.build({title: "project " + i});
        [err] = await to(project.save())
        if (err) {
            logger.error("project", i, "error", err)
            throw new Error(err)
        }
    }


    let projects;
    [err, projects] = await to(Project.all());
    if (err) {
        logger.error(err)
        throw new Error(err)
    }
    projects = projects.map(p => p.dataValues)
    logger.trace("projects", projects)
    const task = Task.build({title: "very important task", ProjectId: projects[0].id})
    logger.info("task.title", task.title);
    [err] = await to(task.save())
    if (err) {
        logger.trace(err)
        throw new Error(err)
    }
    let tasks
    [err, tasks] = await to(Task.all())
    if (err) {
        logger.error(err)
        throw new Error(err)
    }
    logger.trace("tasks.length", tasks.length)
    tasks = tasks.map(t => t.dataValues)
    logger.info("tasks", tasks)
    return tasks
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
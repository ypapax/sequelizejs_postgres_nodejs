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

async function hasOneFather(sequelize) {
    let err;
    const Person = sequelize.define('person', {
        name: Sequelize.STRING
    })
    Person.hasOne(Person, {as: 'Child', foreignKey: 'dadID'});
    [err] = await to(sequelize.sync({force: true}));
    if (err) {
        logger.error(err)
        throw new Error(err)
    }
    let andrey;
    [err, andrey] = await to(Person.create({
        name: 'Andrey'
    }))
    if (err) {
        logger.error(err)
        throw new Error(err)
    }
    logger.trace("andrey created", andrey.dataValues)
    let maxim;
    [err, maxim] = await to(Person.create({
        name: 'Maxim',
        dadID: andrey.id
    }))
    if (err) {
        logger.error(err)
        throw new Error(err)
    }
    logger.trace("person created", maxim.dataValues);
    let people;
    [err, people] = await to(Person.findAll())
    if (err) {
        logger.error(err)
        throw new Error(err)
    }
    people = people.map(p => p.dataValues)
    logger.trace("people", people)
    let son;
    [err, son] = await to(andrey.getChild())
    if (err) {
        logger.error(err)
        throw new Error(err)
    }
    logger.trace("andrey's son", son.dataValues)
    let marina;
    [err, marina] = await to(Person.create({
        name: "Marina"
    }))
    if (err) {
        logger.error(err)
        throw new Error(err)
    }
    [err] = await to(andrey.setChild(marina))
    if (err) {
        logger.error(err);
        throw new Error(err)
    }
    [err, people] = await to(Person.findAll())
    if (err) {
        logger.error(err)
        throw new Error(err)
    }
    people = people.map(p => p.dataValues)
    logger.trace("people", people)
    logger.trace("dadID of maxim is dropped automatically because I suppose it's hasOne relation")
}

async function hasOne(sequelize) {
    let err;
    const Project = sequelize.define('prj', {
        name: Sequelize.STRING
    })
    const User = sequelize.define('usr', {
        length: Sequelize.INTEGER
    })
    Project.hasOne(User, {foreignKey: "project_id"});
    [err] = await to(sequelize.sync({force: true}))
    if (err) {
        logger.error(err)
        throw new Error(err)
    }

    let project;
    [err, project] = await to(Project.create({
        name: "project 1"
    }))
    if (err) {
        logger.error(err)
        throw new Error(err)
    }
    logger.trace("project", project.dataValues)
    // 2018-05-18T03:58:07+0000 <trace> index.js:216 (hasOne) project { id: 1,
    //   name: 'project 1',
    //   updatedAt: 2018-05-18T03:58:07.870Z,
    //   createdAt: 2018-05-18T03:58:07.870Z }
    let usr;
    [err, usr] = await to(User.create({
        username: "Maxim",
        project_id: project.dataValues.id
    }))
    if (err) {
        logger.error(err)
        throw new Error(err)
    }
    logger.trace("usr created", usr.dataValues);
    // 2018-05-18T03:58:07+0000 <trace> index.js:227 (hasOne) usr created { id: 1,
    //   project_id: 1,
    //   updatedAt: 2018-05-18T03:58:07.875Z,
    //   createdAt: 2018-05-18T03:58:07.875Z,
    //   length: null }
}

async function hasOneTeamGame(sequelize) {
    // http://docs.sequelizejs.com/manual/tutorial/associations.html
    // If you need to join a table twice you can double join the same table
    // Team.hasOne(Game, {as: 'HomeTeam', foreignKey : 'homeTeamId'});
    // Team.hasOne(Game, {as: 'AwayTeam', foreignKey : 'awayTeamId'});
    //
    // Game.belongsTo(Team);
    const Team = sequelize.define('team', {
        name: Sequelize.STRING
    })
    const Game = sequelize.define('game', {
        name: Sequelize.STRING,
        score: Sequelize.STRING
    })
    Team.hasOne(Game, {as: "HomeTeam", foreignKey: "homeTeamID"})
    Team.hasOne(Game, {as: "AwayTeam", foreignKey: "awayTeamID"})
    Game.belongsTo(Team) // why do we need this?
    // it just gives teamId field for the game?
    // but why do we need this field
    // when we already got fields homeTeamID and awayTeamID?

    // 2018-05-18T06:20:39+0000 <info> index.js:356 (hasOneTeamGame) game { id: 1,
    //   score: '5:5',
    //   updatedAt: 2018-05-18T06:20:39.942Z,
    //   createdAt: 2018-05-18T06:20:39.942Z,
    //   name: null,
    //   homeTeamID: null,
    //   awayTeamID: null,
    //   teamId: null }
    let err;
    [err] = await to(sequelize.sync({force: true}))
    if (err) {
        logger.error(err)
        throw new Error(err)
    }
    let team1;
    [err, team1] = await to(Team.create({
        name: "Dream"
    }))
    if (err) {
        logger.error(err)
        throw new Error(err)
    }
    let team2;
    [err, team2] = await to(Team.create({
        name: "Socks"
    }))
    if (err) {
        logger.error(err)
        throw new Error(err)
    }
    logger.info("team1", team1.dataValues)
    logger.info("team2", team2.dataValues)
    let game;
    [err, game] = await to(Game.create({
        score: "5:5"
    }))
    if (err) {
        logger.error(err)
        throw new Error(err)
    }
    // weird that it's not "game.setHomeTeam(team1)"
    // isn't it, yes it is
    [err] = await to(team1.setHomeTeam(game))
    if (err) {
        logger.error(err)
        throw new Error(err)
    }
    [err] = await to(team2.setAwayTeam(game))
    if (err) {
        logger.error(err)
        throw new Error(err)
    }
    logger.info("game", game.dataValues)
}

async function oneToOne(sequelize) {
    let err;
    [err] = await to(belongsTo(sequelize))
    if (err) {
        logger.error(err)
        throw new Error(err)
    }
    [err] = await to(hasOne(sequelize))
    if (err) {
        logger.error(err)
        throw new Error(err)
    }
    [err] = await to(hasOneFather(sequelize))
    if (err) {
        logger.error(err)
        throw new Error(err)
    }
    [err] = await to(hasOneTeamGame(sequelize))
    if (err) {
        logger.error(err)
        throw new Error(err)
    }
    [err] = await to(hasOneVsBelongsTo(sequelize))
    if (err) {
        logger.error(err)
        throw new Error(err)
    }
}

async function hasOneVsBelongsTo(sequelize) {
    // http://docs.sequelizejs.com/manual/tutorial/associations.html

    // Difference between HasOne and BelongsTo
    // In Sequelize 1:1 relationship can be set using HasOne and BelongsTo. They are suitable for different scenarios. Lets study this difference using an example.
    //
    //     Suppose we have two tables to link Player and Team. Lets define their models.
    function definePlayerTeam() {
        const Player = sequelize.define('plr', {
            name: Sequelize.STRING
        })
        const Team = sequelize.define('tm', {
            name: Sequelize.STRING
        })
        return [Player, Team]
    }

    let Player, Team;
    [Player, Team] = definePlayerTeam()
    Player.belongsTo(Team, {as: "belongsToTeam"})
    Team.hasOne(Player, {as: "hasOneTeam"})
    // 2018-05-18T06:43:15+0000 <info> index.js:449 (hasOneVsBelongsTo) player { id: 1,
    //   name: 'Maxim',
    //   updatedAt: 2018-05-18T06:43:15.738Z,
    //   createdAt: 2018-05-18T06:43:15.738Z,
    //   belongsToTeamId: null,
    //   hasOneTeamId: null }
    // Executing (default): INSERT INTO "tms" ("id","name","createdAt","updatedAt") VALUES (DEFAULT,'Dream','2018-05-18 06:43:15.741 +00:00','2018-05-18 06:43:15.741 +00:00') RETURNING *;
    // 2018-05-18T06:43:15+0000 <info> index.js:458 (hasOneVsBelongsTo) team created { id: 1,
    //   name: 'Dream',
    //   updatedAt: 2018-05-18T06:43:15.741Z,
    //   createdAt: 2018-05-18T06:43:15.741Z }
    let err;
    [err] = await to(sequelize.sync({force: true}))
    if (err) {
        logger.error(err)
        throw new Error(err)
    }

    async function addPlayerAndTeam() {
        let player;
        [err, player] = await to(Player.create({
            name: "Maxim"
        }))
        if (err) {
            logger.error(err)
            throw new Error(err)
        }
        logger.info("player", player.dataValues)
        let team;
        [err, team] = await to(Team.create({
            name: "Dream"
        }))
        if (err) {
            logger.error(err)
            throw new Error(err)
        }
        logger.info("team created", team.dataValues)
    }

    [err] = await to(addPlayerAndTeam())
    if (err) {
        logger.error(err)
        throw new Error(err)
    }
    // Here is an example demonstrating use cases of BelongsTo and HasOne.
    //
    //     const Player = this.sequelize.define('player', {/* attributes */})
    // const Coach  = this.sequelize.define('coach', {/* attributes */})
    // const Team  = this.sequelize.define('team', {/* attributes */});
    // Suppose our Player model has information about its team as teamId column. Information about each Team's Coach is stored in the Team model as coachId column. These both scenarios requires different kind of 1:1 relation because foreign key relation is present on different models each time.
    const Coach = sequelize.define('coach', {
        name: Sequelize.STRING,
        age: Sequelize.INTEGER
    });
    [Player, Team] = definePlayerTeam()

    Player.belongsTo(Team)  // `teamId` will be added on Player / Source model
    Coach.hasOne(Team);  // `coachId` will be added on Team / Target model
    [err] = await to(sequelize.sync({force: true}))
    if (err) {
        logger.error(err)
        throw new Error(err)
    }

    let coach;
    [err, coach] = await to(Coach.create({
        name: "coach 1",
        age: 77
    }))
    if (err) {
        logger.error(err)
        throw new Error(err)
    }
    logger.info("coach", coach.dataValues);
    [err] = await to(addPlayerAndTeam())
    if (err) {
        logger.error(err)
        throw new Error(err)
    }
    let teams;
    [err, teams] = await to(Team.findAll())
    if (err) {
        logger.error(err)
        throw new Error(err)
    }
    teams = teams.map(t => t.dataValues)
    logger.info("teams", teams)
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
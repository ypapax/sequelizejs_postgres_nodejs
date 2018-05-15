#!/usr/bin/env bash
set -ex

build(){
	pushd app
	docker build -t sequelizejs_postgres_nodejs:1.0 .
	popd
}

up(){
    docker-compose up
}

background(){
    docker-compose up -d
}

ps(){
    docker ps
}

stop(){
    docker-compose stop
}

postgres_run(){
	docker run --name some-postgres -e POSTGRES_PASSWORD=mysecretpassword -d postgres
}
$@
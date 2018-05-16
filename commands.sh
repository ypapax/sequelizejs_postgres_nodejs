#!/usr/bin/env bash
set -ex

build(){
	# rebuild images if docker files changed
	# https://github.com/docker/compose/issues/1487#issuecomment-107048571
	docker-compose build
}

up(){
    docker-compose up
}

upnode(){
    docker-compose up nodejs_app
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

ssh_to_node_container() {
	local containerID=$(docker ps | grep nodejs_app | awk '{print $1}')
	docker exec -ti $containerID /bin/bash
}
$@
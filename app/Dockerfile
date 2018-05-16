#https://buddy.works/guides/how-dockerize-node-application
FROM node:10
# Create app directory
WORKDIR /usr/src/app
# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install
# use nodemon for development
RUN echo "before installing nodemon"
RUN npm install --global nodemon

# If you are building your code for production
# RUN npm install --only=production

# Bundle app source
COPY . .

EXPOSE 8080
# http://fostertheweb.com/2016/02/nodemon-inside-docker-container/
CMD ["npm", "start"]
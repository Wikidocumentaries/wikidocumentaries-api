FROM node:8

WORKDIR /srv/wikidocumentaries-api

COPY package*.json ./

RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD [ "npm", "start" ]

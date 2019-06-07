FROM node:8.16-alpine

WORKDIR /srv/wikidocumentaries-api

COPY package*.json ./

RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD [ "npm", "start" ]

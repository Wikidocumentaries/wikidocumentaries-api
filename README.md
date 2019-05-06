# wikidocumentaries-api

Provide APIs for the UI for the following purposes:

* Mediawiki APIs require a custom User-Agent header.

* Wikidata Query Service (WDQS) does not provide an Access-Control-Allow-Origin header.

* etc.

## Docker

You can run this service as a container with

    docker run -p 3000:3000 -e WIKIDOCUMENTARIES_API_USER_AGENT -e BING_MAPS_KEY -e FLICKR_KEY wikidocumentaries/wikidocumentaries-api

You can build a new version of the container image with

    docker build -t wikidocumentaries/wikidocumentaries-api .

## Install

npm install

## Run

npm run dev

## Remarks

Some environment variables must be set.

* WIKIDOCUMENTARIES_API_USER_AGENT: Please see https://en.wikipedia.org/api/rest_v1/

* BING_MAPS_KEY (optional)

* FLICKR_KEY (optional)

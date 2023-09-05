# wikidocumentaries-api

Provides REST APIs and a backend service for the Wikidocumentaries UI for the following purposes:

* Fetch data from both Wikipedia and Wikidata when given an id from either.

* Search for images from various sources with one request.

* Find related data from Wikidata and other wikibases using SPARQL queries.

* Set a custom User-Agent header as required by Mediawiki APIs.

* Work around Wikidata Query Service (WDQS) not providing an Access-Control-Allow-Origin header.

* etc.

Also see the section [Provided endpoints](#provided-endpoints) below.

## Docker

You can run this service as a container with

    docker run -p 3000:3000 -e WIKIDOCUMENTARIES_API_USER_AGENT -e BING_MAPS_KEY -e FLICKR_KEY wikidocumentaries/wikidocumentaries-api

You can build a new version of the container image with

    docker build -t wikidocumentaries/wikidocumentaries-api .

## Install

```
npm install
```

## Run in development mode

```
npm run dev
```

## Run in production mode

```
npm start
```

## Environment variables

Some API keys should be set as environment variables:

* WIKIDOCUMENTARIES_API_USER_AGENT (required): Please see https://en.wikipedia.org/api/rest_v1/

* BING_MAPS_KEY (optional)

* FLICKR_KEY (optional)

## Provided endpoints

The main API endpoints:

* /wiki
  * Parameters (provide either wikidata or topic):
    * language: language code
    * wikidata: id of the Wikidata item
    * topic: title of the Wikipedia article
  * Response:
    * wikidata
      * id
      * title
      * description
      * aliases
      * instance_of
      * statements
      * geo
      * dates
      * sitelinks
    * wikipedia
      * type
      * title
      * displaytitle
      * namespace
      * wikibase_item
      * titles
      * pageid
      * thumbnail
      * originalimage
      * lang
      * dir
      * revision
      * tid
      * timestamp
      * description
      * description_source
      * coordinates
      * content_urls
      * extract
      * extract_html
    * wikipediaExcerptHTML
    * wikipediaRemainingHTML

* /images
  * Parameters:
    * language: language code
    * topic: search string
    * commons_category: if provided, return everything from this category in Wikimedia Commons; without the prefix "Category:"
    * lat, lon: coordinates to search around
    * maxradius: radius around the coordinates
  * Response:
    * a list of images:
      * source
      * id
      * title
      * imageURL
      * thumbURL
      * infoURL
      * license
      * license_link
      * inventoryNumber
      * geoLocations
      * location
      * measurements
      * materials
      * formats
      * year
      * publisher
      * creators
      * institutions
      * actors
      * details
      * subjects
      * places
      * collection
      * imageRights
      * description
      * inscriptions
      * datecreated
      * uploader
      * collection
      * language

* /sparql
  * Parameters (following the standard for SPARQL queries):
    * query
    * format
  * Response depending on format

* /download
  * Parameters:
    * finnaId
  * Response:
    * download finished

* /upload
  * Parameters:
    * access_token
    * csrf_token
    * finnaId
    * text (wikitext includes image info)
  * Response:
    * upload response from wikicommons

* /delete
  * Parameters:
    * finnaId
  * Response:
    * file deleted

* /csrfToken
  * Parameters:
    * access_token
  * Response:
    * csrf_token from wikicommons

* /depict
  * Parameters:
    * access_token
    * title
    * depictId
  * Response:
    * depict response from wikicommons
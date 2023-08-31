const express = require('express');
const app = express();
const axios = require('axios');
// Log all HTTP responses
axios.interceptors.response.use(
    response => {
        console.log(response.status.toString(), response.request.res.responseUrl);
        return response;
    },
    error => {
        if (error.response) {
            console.log(error.response.status.toString(), error.response.request.res.responseUrl);
            console.log(error.response.headers);
            console.log(error.response.data);
        } else {
            console.log(error);
        }
        return Promise.reject(error);
    },
);

const bodyParser = require('body-parser');
const querystring = require('querystring');

const { getHistoricalMaps } = require('./historical-maps');
const { getImagesFromFinnaWithTitle } = require('./finna');
const { getImagesFromCommonsWithTitle } = require('./wikimedia-commons');
//const { getImagesFlickr } = require('./flickr');
//const { getImagesTroveTextsearch } = require('./trove');
//const { getImagesSmithsonianTextsearch } = require('./smithsonian');
//const { getImagesCC } = require('./cc');
const { getImagesEuropeana } = require('./europeana');
const { getWikidata } = require('./wikidata');
const { getWikidataByLatLon } = require('./wikidata-latlon');
const { findWikidataItemFromWikipedia, getWikipediaData } = require('./wikipedia');
const { uploadWithFinnaId, getCsrfToken, downloadWithFinnaId, deleteFileWithFinnaId } = require('./upload');
const { getPageID, depict } = require('./sdc');

//does deprecating bodyParser make something dysfunctional?
const urlencodedParser = bodyParser.urlencoded({ extended: false });

// Needed for error handling in ExpressJS before version 5.0.0
// From https://odino.org/async-slash-await-in-expressjs/
const asyncMiddleware = fn =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next))
      .catch(next);
  };

if (process.env.WIKIDOCUMENTARIES_API_USER_AGENT == undefined) {
    console.log("Set environment variable WIKIDOCUMENTARIES_API_USER_AGENT to e.g. your email. Please, see: https://en.wikipedia.org/api/rest_v1/");
    process.exit();
}
if (process.env.BING_MAPS_KEY == undefined) {
    console.log("Set environment variable BING_MAPS_KEY to your Bing Maps key. Please, see: https://www.microsoft.com/en-us/maps/create-a-bing-maps-key");
}

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

axios.defaults.timeout = 5000;

// proxy sparql requests from UI to Wikidata Query Service
app.get('/sparql', asyncMiddleware(async function(req, res) {
    const response = await axios.request({
        // TODO switch from dev to production when supported
        baseURL: "https://wikidocumentaries-query.wmcloud.org/proxy/wdqs/bigdata/namespace/wdq/sparql",
        params: {
            query: req.query.query,
            format: req.query.format,
        },
        timeout: 60*1000, // 1 minute
    });
    res.send(response.data);
}));
// add comment for functions and update on readme
app.get('/download', asyncMiddleware(async function(req, res, body) {
    console.log(req.originalUrl);
    const finnaId = req.query.finnaId;

    const downloadResponse = await downloadWithFinnaId(finnaId);
    console.log(downloadResponse);

    res.send({
        downloadResponse
    });
}));

app.get('/upload', asyncMiddleware(async function(req, res, body) {
    console.log(req.originalUrl);
    const access_token = req.query.token;
    const csrf_token = req.query.csrf_token;
    const text = req.query.text;
    const finnaId = req.query.finnaId;

    const uploadResponse = await uploadWithFinnaId(csrf_token, access_token, finnaId, text);
    console.log(uploadResponse);
    const deleteUploadedFile = deleteFileWithFinnaId(finnaId);

    res.send({
        uploadResponse
    });
}));

app.get('/deleteFile', asyncMiddleware(async function(req, res, body) {
    console.log(req.originalUrl);
    const finnaId = req.query.finnaId;
    const deleteUploadedFile = deleteFileWithFinnaId(finnaId);

    res.send({
        deleteUploadedFile
    });
}));

app.get('/csrfToken', asyncMiddleware(async function(req, res) {

    console.log(req.query);
    const access_token = req.query.token;
    const text = req.query.text;
    const filename = req.query.filename;
    const downloadURL = req.query.downloadURL;

    // const titles = req.query.titles;

    const csrf_token = await getCsrfToken(access_token);
    // const uploadResponse = await upload(csrf_token, access_token,filename, text, downloadURL);

    res.send({
        csrf_token
    });
}));

app.get('/depict', asyncMiddleware(async function(req, res, body) {
    console.log(req.originalUrl);
    const access_token = req.query.token;
    const title = req.query.title;
    const depictId = req.query.depictId;

    console.log("get pageid")
    const pageId = await getPageID(title);
    console.log(pageId);

    const MID = `M${pageId}`
    console.log(MID);
    const csrf_token = await getCsrfToken(access_token);
    console.log(csrf_token);
    const depictResponse = await depict(csrf_token, access_token, MID, depictId);

    res.send({
        depictResponse
    });
}));

app.post('/sparql', urlencodedParser, asyncMiddleware(async function(req, res) {
    const response = await axios.request({
        method: "post",
        // TODO switch from dev to production when supported
        baseURL: "https://wikidocumentaries-query.wmcloud.org/proxy/wdqs/bigdata/namespace/wdq/sparql",
        data: querystring.stringify({
            query: req.body.query,
            format: req.body.format,
        }),
        timeout: 60*1000, // 1 minute
    });
    res.send(response.data);
}));


app.get('/wiki', asyncMiddleware(async function(req, res) {
    console.log(req.originalUrl);

    const language = req.query.language;
    const wikidataItemID = req.query.wikidata || await findWikidataItemFromWikipedia(language, req.query.topic);

    const { wikidata, topic } = await getWikidata(wikidataItemID, language);

    const wikipediaData = await getWikipediaData(language, topic);

    res.send({
        wikidata,
        wikipedia: wikipediaData.wikipedia,
        wikipediaExcerptHTML: wikipediaData.excerptHTML,
        wikipediaRemainingHTML: wikipediaData.remainingHTML,
    });
}));


app.get('/wiki/items/by/latlon', asyncMiddleware(async function(req, res) {

    console.log(req.originalUrl);

    const language = req.query.language;
    const topic = req.query.topic;

    const items = await getWikidataByLatLon(req.query.lat, req.query.lon, req.query.radius, language, topic);

    res.send(items);
}));

app.get('/images', asyncMiddleware(async function(req, res) {

    console.log(req.originalUrl);

    const language = req.query.language;
    const topic = req.query.topic;
    const encodedTopic = encodeURIComponent(topic);


    const requests = [
        getImagesFromFinnaWithTitle(topic, req.query.lat, req.query.lon, req.query.maxradius),
        getImagesFromCommonsWithTitle(topic, req.query.commons_category),
        //getImagesFlickr(topic, req.query.lat, req.query.lon, req.query.maxradius),
        //getImagesCC(topic),
        getImagesEuropeana(topic, language),
        //getImagesTroveTextsearch(topic, language),
        //getImagesSmithsonianTextsearch(topic, language)
    ];
    const safeRequests = requests.map(promise => promise.catch(err => {
        console.error(err.stack);
        return [];
    }));

    // an array of arrays of images
    const imageResponses
        = await axios.all(safeRequests);

    // an array of images
    const images = [].concat(...imageResponses);

    res.send(images);
}));


app.get('/basemaps', asyncMiddleware(async function(req, res) {
    console.log(req.originalUrl);

    const leftLon = req.query.leftLon;
    const bottomLat = req.query.bottomLat;
    const rightLon = req.query.rightLon;
    const topLat = req.query.topLat;

    const basemaps = await getHistoricalMaps(leftLon, bottomLat, rightLon, topLat);

    res.send(basemaps);

    // var data = {
    //     mapsWarperData: warpedMaps,
    //     commonsData: pages
    // }
    // res.send(data);
}));


app.get('/geocode', asyncMiddleware(async function(req, res) {

    console.log(req.originalUrl);

    const place = req.query.place;

    const requestConfig = {
        baseURL: "http://dev.virtualearth.net/",
        url: "/REST/v1/Locations",
        method: "get",
        responseType: "json",
        params: {
            query: place,
            maxResults: 1,
            userIp: "127.0.0.1",
            key: process.env.BING_MAPS_KEY,
        }
    };

    const response = await axios.request(requestConfig);

    if (response.data.resourceSets != undefined && response.data.resourceSets[0].resources != undefined && response.data.resourceSets[0].resources.length > 0) {

        res.send({result:
            response.data.resourceSets[0].resources[0]
        });
    }
    else {
        res.send(null);
    }
}));


app.listen(3000, () => console.log('Listening on port 3000'));


// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    if (res.headersSent) {
        return next(err);
    }
    res.status(500).send({ error: "Internal Server Error" });
});

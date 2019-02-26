const express = require('express')
const app = express()
const axios = require('axios')
const cheerio = require('cheerio')
const turf = require('@turf/turf');
//console.log(turf);


if (process.env.WIKIDOCUMENTARIES_API_USER_AGENT == undefined) {
    console.log("Set environment variable WIKIDOCUMENTARIES_API_USER_AGENT to e.g. your email. Please, see: https://en.wikipedia.org/api/rest_v1/");
    process.exit();
}
if (process.env.FLICKR_KEY == undefined) {
    console.log("Set environment variable FLICKR_KEY to your FLICKR key. Please, see: https://www.flickr.com/services/apps/create/apply/");
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
app.get('/sparql', async function(req, res) {
    const response = await axios.request({
        // TODO switch from dev to production when supported
        baseURL: "https://wikidocumentaries-dev-query.wmflabs.org/proxy/wdqs/bigdata/namespace/wdq/sparql",
        params: {
            query: req.query.query,
            format: req.query.format,
        },
        timeout: 60*1000, // 1 minute
    });
    res.send(response.data);
});

app.get('/wiki', function(req, res) {

    console.log(req.originalUrl);

    var language = req.query.language;
    var topic = req.query.topic;
    var wikidata = req.query.wikidata;

    var wikidataByItemIdPromise = function(wikidata) { 
        var requestConfig = {
            baseURL: "https://www.wikidata.org/w/api.php",
            method: "get",
            responseType: 'json',
            headers: {
                'Api-User-Agent': process.env.WIKIDOCUMENTARIES_API_USER_AGENT
            },
            params: {
                action: "wbgetentities",
                ids: wikidata,
                format: "json"
            }
        };
        return axios.request(requestConfig).then((response) => {
            var item=response.data.entities[wikidata];
            combineResults(res, language, wikidata, item);
        });
    };
    if (wikidata != undefined) {
        wikidataByItemIdPromise(wikidata);
    }
    else
    {
        var getWikidataItemIDPromise = function () {
            var requestConfig = {
                baseURL: "https://" + language + ".wikipedia.org/w/api.php",
                method: "get",
                responseType: 'json',
                headers: {
                    'Api-User-Agent': process.env.WIKIDOCUMENTARIES_API_USER_AGENT
                },
                params: {
                    action: "query",
                    prop: "pageprops",
                    ppprop: "wikibase_item",
                    redirects: "resolve",
                    titles: topic,
                    format: "json"
                }
            };

            return axios.request(requestConfig).then((response) => {
                if (response.data.query != undefined)
                {
                    var key=Object.keys(response.data.query.pages)[0];
                    var page=response.data.query.pages[key];
                    if (page["pageprops"] != undefined && page["pageprops"]["wikibase_item"]!=undefined)
                    {
                        wikidata=page["pageprops"]["wikibase_item"];
                        wikidataByItemIdPromise(wikidata);
                    }
                }
            });
        }
        getWikidataItemIDPromise();
    }
});

// language fallback list XXX hardcoded for now
var languageFallback = ["en", "fi", "sv", "es"];

// get a suitable localised value from languageMap based on locale and fallbacks
function getI18n(locale, languageMap) {
    if (languageMap[locale]) {
        return languageMap[locale];
    }
    for (var i = 0; i < languageFallback.length; i++) {
        if (languageMap[languageFallback[i]]) {
            return languageMap[languageFallback[i]];
        }
    }
    if (languageMap["en"]) {
        return languageMap["en"];
    }
    return Object.values(languageMap)[0];
}

// get a suitable localised key from languageMap based on locale and fallbacks
// postfix - appended to locale codes to get a key, e.g. "en" -> "enwiki"
function getI18nKeys(locale, languageMap, postfix) {
    var result = [];
    if (languageMap[locale+postfix]) {
        result.push(locale+postfix);
    }
    for (var i = 0; i < languageFallback.length; i++) {
        if (languageMap[languageFallback[i]+postfix]) {
            result.push(languageFallback[i]+postfix);
        }
    }
    if (languageMap["en"+postfix]) {
        result.push("en"+postfix);
    }
    if (!result) {
        result.push(Object.keys(languageMap)[0]);
    }
    return result;
}

function combineResults(res, language, wikidataItemID, wikidataItemResponse) {
    var topic="";
    var wikidatatitle="";
    var wikidatadescription="";
    function getOrNull(object, field) {
        return object && object[field];
    }
    if (wikidataItemResponse) {
        topic = getOrNull(wikidataItemResponse.sitelinks[language + "wiki"], "title");
        wikidatatitle = getOrNull(getI18n(language, wikidataItemResponse.labels), "value");
        wikidatadescription = getOrNull(getI18n(language, wikidataItemResponse.descriptions), "value");
    }


    console.log(topic);
    var encodedLanguage = language && encodeURIComponent(language);
    var encodedTopic = topic && encodeURIComponent(topic);

    var wikipediaSummaryPromise = function() {
        var requestConfig = {
            baseURL: "https://" + language + ".wikipedia.org/api/rest_v1/",
            url: "/page/summary/" + encodedTopic,
            method: "get",
            responseType: 'json',
            headers: {
                'Api-User-Agent': process.env.WIKIDOCUMENTARIES_API_USER_AGENT
            },
        };
        if (!encodedTopic || !language) return "";
        else return axios.request(requestConfig);
    };

    var wikipediaHTMLPromise = function() { 

        var requestConfig = {
            baseURL: "https://" + language + ".wikipedia.org/api/rest_v1/",
            url: "/page/mobile-sections/" + encodedTopic,
            method: "get",
            responseType: 'json',
            headers: {
                'Api-User-Agent': process.env.WIKIDOCUMENTARIES_API_USER_AGENT
            },
        };
        if (!encodedTopic || !language) return "";
        else return axios.request(requestConfig);
    };


    axios.all([wikipediaSummaryPromise(), wikipediaHTMLPromise(), wikidataItemResponse ])
        .then(axios.spread(function (wikipediaSummaryResponse, wikipediaHTMLResponse, wikidataItemResponse ) {

            if (wikipediaHTMLResponse.data == undefined ) {
                // No wikipedia article
                excerptHTML="";
                remainingHTML=null;
            }
            else {
                var origHTML = wikipediaHTMLResponse.data.lead.sections[0].text;
                var remainingHTML = null;

                if (wikipediaHTMLResponse.data.lead.disambiguation != undefined && wikipediaHTMLResponse.data.lead.disambiguation == true) {
                    wikipediaHTMLResponse.data.remaining.sections.forEach(section => {
                        origHTML += section.text;
                    });
                }
                else {
                    var remainingOrigHTML = "";

                    wikipediaHTMLResponse.data.remaining.sections.forEach(section => {
                        if (section.isReferenceSection == undefined) {
                            var sectionHeaderStartTag = "";
                            var sectionHeaderEndTag = "";
                            switch(section.toclevel) {
                            case 1:
                                sectionHeaderStartTag = "<h2 class='h2'>";
                                sectionHeaderEndTag = "</h2>";
                                break;
                            case 2:
                                sectionHeaderStartTag = "<h3 class='h3'>";
                                sectionHeaderEndTag = "</h3>";
                                break;
                            case 3:
                                sectionHeaderStartTag = "<h4 class='h4'>";
                                sectionHeaderEndTag = "</h4>";
                                break;
                            case 4:
                                sectionHeaderStartTag = "<h5 class='h5'>";
                                sectionHeaderEndTag = "</h5>";
                                break;
                            }
                            remainingOrigHTML += sectionHeaderStartTag + section.line + sectionHeaderEndTag;
                            remainingOrigHTML += section.text;
                        }
                    });

                //console.log(remainingOrigHTML.length);

                    if (remainingOrigHTML.length > 3000) { // Small count of HTML should be with the leading section
                        remainingHTML = convertToWikidocumentariesHTML(remainingOrigHTML, topic, language);
                    }
                    else {
                        origHTML += remainingOrigHTML;
                    }
                }
                var excerptHTML = convertToWikidocumentariesHTML(origHTML, topic, language);
            }

            var responseData = {
                wikipedia: wikipediaSummaryResponse.data,
                //wikipediaDevData: wikipediaHTMLResponse.data,
                wikipediaExcerptHTML: excerptHTML,
                wikipediaRemainingHTML: remainingHTML,
                wikidataRaw: wikidataItemResponse
            }

            return responseData;

    })).then((responseData) => {
        //console.dir(responseData);
        if (responseData.wikidataRaw != null && responseData.wikidataRaw.claims != null &&
            Object.keys(responseData.wikidataRaw.claims).length > 0) {

            var sitelinks = responseData.wikidataRaw.sitelinks;

            var claims = Object.keys(responseData.wikidataRaw.claims).map(function(e) {
                return responseData.wikidataRaw.claims[e];
            });

            responseData.wikidataRaw = claims; // needed below
            
            //console.dir(claims);

            var ids = [];

            //console.log(ids);

            claims.forEach((claim) => {
                //console.dir(claim[0]);
                claim.forEach(statement => {
                    if (statement.mainsnak.snaktype == "value") {
                        if (ids.indexOf(statement.mainsnak.property) == -1) {
                            ids.push(statement.mainsnak.property);
                        }
                        if (statement.mainsnak.datavalue.type == "wikibase-entityid") {
                            if (ids.indexOf(statement.mainsnak.datavalue.value.id) == -1) {
                                ids.push(statement.mainsnak.datavalue.value.id);
                            }
                        }
                        else if (statement.mainsnak.datavalue.type == "quantity" && statement.mainsnak.datavalue.value.unit.indexOf("/entity/Q") != -1) {
                            var index = statement.mainsnak.datavalue.value.unit.lastIndexOf('/') + 1;
                            var id = statement.mainsnak.datavalue.value.unit.substring(index);
                            //console.log(id);
                            if (ids.indexOf(id) == -1) {
                                ids.push(id);
                            }
                        }
                    }
                    if (statement.qualifiers != undefined) {
                        //console.log(statement.qualifiers);
                        var qualifiers = Object.keys(statement.qualifiers).map(function(e) {
                            return statement.qualifiers[e];
                        });
                        //console.log(qualifiers);
                        qualifiers.forEach(qualifier => {
                            //console.log(qualifier);
                            if (ids.indexOf(qualifier[0].property) == -1) {
                                ids.push(qualifier[0].property);
                            }
                            if (qualifier[0].snaktype == "value" && qualifier[0].datavalue.type == "wikibase-entityid") {
                                if (ids.indexOf(qualifier[0].datavalue.value.id) == -1) {
                                    ids.push(qualifier[0].datavalue.value.id);
                                }
                            }
                        });
                    } 
                });
            });

            //console.log(ids);
            //console.log(ids.length);

            // TODO get 50 ids at a time

            collectWikidataInfo(ids, language).then(entities => {

                //console.log("entities returned from collectWikidataInfo", entities);

                var wikidata = {
                    id: wikidataItemID,
                    title: wikidatatitle,
                    description: wikidatadescription,
                    instance_of: {
                        id: null,
                        value: null,
                        url: 'https://www.wikidata.org/wiki/'
                    },
                    statements: [],
                    geo: {
                        lat: null,
                        lon: null,
                    },
                    dates : [],
                    sitelinks: getI18nKeys(language, sitelinks, "wiki").map(key => sitelinks[key]),
                }

                //console.log(responseData.wikidataRaw);
                //console.log(entities);

                for (var i = 0; i < responseData.wikidataRaw.length; i++) {
                    //console.log(responseData.wikidataRaw[i][0]);
                    var statement = {
                        id: null,
                        label: null,
                        values: []
                    }
                    

                    for (var j = 0; j < responseData.wikidataRaw[i].length; j++) {
                        var mainsnak = responseData.wikidataRaw[i][j].mainsnak;

                        if (statement.id == null) {
                            statement.id = mainsnak.property;
                        }
                        if (statement.label == null) {
                            statement.label = findLabel(entities, mainsnak.property, language);
                        }

                        var valueWasAdded = true;

                        if (mainsnak.snaktype == "value") {
                            if (mainsnak.property == 'P31') { // instance_of
                                if (mainsnak.datavalue.type == "wikibase-entityid") {
                                    for (var k = 0; k < entities.length; k++) {
                                        if (entities[k].id == mainsnak.datavalue.value.id) {
                                            //console.log(entities[k]);
                                            label = entities[k].labels[language] != undefined ? entities[k].labels[language].value : "";
                                            if (label == "") {
                                                label = entities[k].labels.en != undefined ? entities[k].labels.en.value : "";
                                            }
                                            if (wikidata.instance_of.id == null) { // The first instance of definition
                                                wikidata.instance_of.value = label;
                                                wikidata.instance_of.id = entities[k].id;
                                                wikidata.instance_of.url += entities[k].id;
                                            }
                                            var value = {
                                                value: label,
                                                url: 'https://www.wikidata.org/wiki/' + entities[k].id
                                            }
                                            statement.values.push(value);
                                            break;
                                        }
                                    }
                                }
                                else {
                                    // TODO ?
                                }
                            }
                            else if (mainsnak.property == 'P625') { // coordinates
                                var value = {
                                    value: mainsnak.datavalue.value.latitude + ", " + mainsnak.datavalue.value.longitude,
                                    url: 'https://tools.wmflabs.org/geohack/geohack.php?params=' + mainsnak.datavalue.value.latitude + '_N_' + mainsnak.datavalue.value.longitude + '_E_globe:earth&language=' + language
                                }
                                
                                statement.values.push(value);

                                wikidata.geo.lat = mainsnak.datavalue.value.latitude;
                                wikidata.geo.lon = mainsnak.datavalue.value.longitude;
                            }
                            else if (mainsnak.property == 'P373') { // commons class
                                var value = {
                                    value: mainsnak.datavalue.value,
                                    url: 'https://commons.wikimedia.org/wiki/Category:' + mainsnak.datavalue.value.split(' ').join('_')
                                }

                                statement.values.push(value);
                            }
                            else if (mainsnak.property == 'P18') { // commons media
                                var value = {
                                    value: mainsnak.datavalue.value,
                                    url: 'https://commons.wikimedia.org/wiki/File:' + mainsnak.datavalue.value.split(' ').join('_')
                                }

                                statement.values.push(value);
                            }
                            else if (mainsnak.datavalue.type == "string") {
                                var value = {
                                    value: mainsnak.datavalue.value,
                                    url: null
                                }

                                if (mainsnak.property == 'P856' && mainsnak.datavalue.value.indexOf('http') == 0) { // official website
                                    value.url = mainsnak.datavalue.value;
                                    value.value = value.value.substring(value.value.indexOf('/') + 2);
                                }

                                statement.values.push(value);
                            }
                            else if (mainsnak.datavalue.type == "wikibase-entityid") {
                                //console.log(responseData.wikidataRaw[i]);
                                //console.log(mainsnak);
                                var value = {
                                    value: null,
                                    url: 'https://www.wikidata.org/wiki/' + mainsnak.datavalue.value.id,
                                    id: mainsnak.datavalue.value.id,
                                    sitelinks: {}
                                }

                                for (var k = 0; k < entities.length; k++) {
                                    if (entities[k].id == mainsnak.datavalue.value.id) {
                                        var entity = entities[k];
                                        //console.log(statement.url);
                                        //console.log(entity.sitelinks);

                                        if (entity.sitelinks != undefined) {
                                            if (entity.sitelinks[language + 'wiki'] != undefined) {
                                                value.sitelinks[language + 'wiki'] = 
                                                    entity.sitelinks[language + 'wiki'].title;
                                            }
                                            if (language != 'en' && entity.sitelinks.enwiki != undefined) {
                                                value.sitelinks.enwiki = 
                                                    entity.sitelinks.enwiki.title;
                                            }
                                        }

                                        break;
                                    }
                                }

                                //console.log(mainsnak.datavalue.value);
                                value.value = findLabel(entities, mainsnak.datavalue.value.id, language);
                                
                                statement.values.push(value);
                            }
                            else if (mainsnak.datavalue.type == "time") {

                                // See also: https://www.wikidata.org/wiki/Help:Dates

                                //console.log(mainsnak);

                                dateString = getFormattedDateString(mainsnak.datavalue.value, language);
                                //var date = new Date(timeString);
                                //console.log("isNaN(date)", isNaN(date));

                                var value = {
                                    value: dateString,
                                    url: null
                                }

                                statement.values.push(value);

                                var dateItem = {
                                    wikidata_property: mainsnak.property,
                                    value: mainsnak.datavalue.value,
                                    label: statement.label
                                }
                                wikidata.dates.push(dateItem);
                            }
                            else if (mainsnak.datavalue.type == "quantity") {

                                //console.log(mainsnak);

                                var value = {
                                    value: Number(mainsnak.datavalue.value.amount),
                                    url: null
                                }

                                if (mainsnak.datavalue.value.unit.indexOf("/entity/Q") != -1) {
                                    //console.log("found");
                                    var index = mainsnak.datavalue.value.unit.lastIndexOf('/') + 1;
                                    var id = mainsnak.datavalue.value.unit.substring(index);
                                    //console.log(id);
                                    var label = findLabel(entities, id, language);
                                    //console.log(label);
                                    value.unit = label;
                                }

                                statement.values.push(value);
                            }
                            else if (mainsnak.datavalue.type == "monolingualtext") {
                                var value = {
                                    value: mainsnak.datavalue.value.text,
                                    url: null
                                }

                                statement.values.push(value);
                            }
                            else {
                                // TODO
                                console.log("unhandled entity:", mainsnak);
                                valueWasAdded = false;
                            }

                            if (valueWasAdded && responseData.wikidataRaw[i][j].qualifiers != undefined) {
                                statement.values[statement.values.length -1].qualifiers = [];

                                var qualifiers = Object.keys(responseData.wikidataRaw[i][j].qualifiers).map(function(e) {
                                    return responseData.wikidataRaw[i][j].qualifiers[e];
                                });
    
                                qualifiers.forEach(qualifier => {
                                    //console.log(qualifier);
                                    if (qualifier[0].snaktype == "value") {

                                        var q = {
                                            value: null,
                                            label: null,
                                            url: null 
                                        }

                                        q.label = findLabel(entities, qualifier[0].property, language);

                                        if (qualifier[0].datavalue.type == "string") {
                                            q.value = qualifier[0].datavalue.value;
                                        }
                                        else if(qualifier[0].datavalue.type == "time") {
                                            dateString = getFormattedDateString(qualifier[0].datavalue.value, language);
                                            q.value = dateString;
                                        }
                                        else if (qualifier[0].datavalue.type == "wikibase-entityid") {
                                            //console.log(responseData.wikidataRaw[i]);
                                            //console.log(mainsnak);
                                            q.url = 'https://www.wikidata.org/wiki/' + qualifier[0].datavalue.value.id;
            
                                            //console.log(qualifier[0].datavalue.value);
                                            q.value = findLabel(entities, qualifier[0].datavalue.value.id, language);
                                        }
                                        else if (qualifier[0].datavalue.type == "quantity") {
                                            q.value = Number(qualifier[0].datavalue.value.amount);
                                        }
                                        else if (qualifier[0].datavalue.type == "monolingualtext") {
                                            q.value = qualifier[0].datavalue.value.text;
                                        }
                                        else {
                                            // TODO
                                            console.log("unhandled qualifier:", qualifier);
                                        }

                                        if (q.value != null) {
                                            statement.values[statement.values.length -1].qualifiers.push(q);
                                        }
                                    }
                                });
                            }
                        }
                    }

                    if (statement.id != null && statement.label != null && statement.values.length > 0) {
                        wikidata.statements.push(statement);
                    }
                }
                //console.log(wikidata.statements);
                // DEV
                // responseData.wikipedia = undefined;
                // responseData.wikipediaExcerptHTML = undefined;
                // responseData.wikipediaRemainingHTML = undefined;
                // END DEV

                responseData.wikidataRaw = undefined;
                responseData.wikidata = wikidata;
                res.send(responseData);
            });
        }
        else {
            // no Wikidata item associated with the Wikipedia item
            res.send(responseData);
        }
    }).catch(function (error) {
        console.log(error);
        res.send({
            wikipedia: null,
            wikidata: null
        });
    });
}//);



app.get('/wiki/items/by/latlon', function(req, res) {

    console.log(req.originalUrl);

    var language = req.query.language;
    var topic = req.query.topic;
    //console.log(topic);

    var requestConfig = {
        baseURL: 'https://query.wikidata.org/',
        url: '/bigdata/namespace/wdq/sparql?query=SELECT%3Fitem(SAMPLE(%3Fitem_label)as%3Flabel)(SAMPLE(%3Flocation)as%3Flocation)WHERE%7BSERVICE%20wikibase%3Aaround%7B%3Fitem%20wdt%3AP625%3Flocation.bd%3AserviceParam%20wikibase%3Acenter"Point(' + req.query.lon + '%20' + req.query.lat + ')"%5E%5Egeo%3AwktLiteral.%20bd%3AserviceParam%20wikibase%3Aradius"' + req.query.radius / 1000 + '".%7DOPTIONAL%7B%3Fitem%20rdfs%3Alabel%3Fitem_label.%7D%7DGROUP%20BY%20%3Fitem',
        timeout: 20000,
        method: "get",
        params: {
            format: 'json'
        }
    };

    axios.request(requestConfig).then(response => {
        //console.log(response.data);

        // res.send(response.data);
        // return;

        var wikiItems = [];

        for(var i = 0; i < response.data.results.bindings.length; i++) {
            var index = response.data.results.bindings[i].item.value.lastIndexOf('/') + 1;
            id = response.data.results.bindings[i].item.value.substring(index);
            var startIndex = response.data.results.bindings[i].location.value.indexOf('(') + 1;
            var endIndex = response.data.results.bindings[i].location.value.indexOf(')');
            var parts = response.data.results.bindings[i].location.value.substring(startIndex, endIndex).split(' ');
            var lat = parts[1];
            var lon = parts[0];

            wikiItems.push({
                id: id,
                title: response.data.results.bindings[i].label.value,
                lat: Number(lat),
                lon: Number(lon)
            });
        }

        //console.log(wikiItems);

        var ids = [];

        for (var i = 0; i < wikiItems.length; i++) {
            ids.push(wikiItems[i].id);
        }

        if (ids.length == 0) {
            res.send([]);
        }
        else {
            if (ids.length > 50) { // "Maximum number of values is 50" https://www.wikidata.org/w/api.php?action=help&modules=wbgetentities
                ids = ids.slice(0, 50);
            }

            //console.log(ids);
            ids = ids.join('|');
            //console.dir(ids);

            var requestConfig = {
                baseURL: "https://www.wikidata.org/w/api.php",
                method: "get",
                responseType: 'json',
                headers: {
                    'Api-User-Agent': process.env.WIKIDOCUMENTARIES_API_USER_AGENT
                },
                params: {
                    action: "wbgetentities",
                    ids: ids,
                    props: "labels|sitelinks",
                    languages: (language != "en" ? language + "|en" : "en"),
                    format: "json"
                }
            }

            var items = [];

            axios.request(requestConfig).then((wikidataEntitiesResponse) => {
                //console.log(wikidataEntitiesResponse.data);
                var entities = Object.keys(wikidataEntitiesResponse.data.entities).map(function(e) {
                    return wikidataEntitiesResponse.data.entities[e];
                });
                //console.dir(entities);
                for (var i = 0; i < wikiItems.length; i++) {
                    for (var j = 0; j < entities.length; j++) {
                        if (wikiItems[i].id == entities[j].id) {
                            if (entities[j].sitelinks[language + 'wiki'] != undefined &&
                            entities[j].sitelinks[language + 'wiki'].title == topic) {
                                // Do not include the topic item itself
                                //console.log(entities[j].sitelinks[language + 'wiki'].title);
                            }
                            else {
                                var item = {
                                    title: wikiItems[i].title,
                                    position: [wikiItems[i].lon, wikiItems[i].lat],
                                    wikidata: entities[j]
                                }
                                items.push(item);
                            }
                            break;
                        }
                    }
                }

                res.send(items);
            });
        }
    }).catch(error => {
        console.log("error in /wiki/articles/by/latlon");
        console.log(error);
        res.send([]);
        //return Promise.reject(error);
    });
});

app.get('/images', function(req, res) {

    console.log(req.originalUrl);

    var language = req.query.language;
    var topic = req.query.topic;
    //console.log(topic);
    var encodedTopic = encodeURIComponent(topic);

    var getImagesFromCommonsWithTitle = function() {

        if (req.query.commons_category != undefined) {
            //console.log("commons_category", req.query.commons_category);
            var requestConfig = {
                baseURL: "https://commons.wikimedia.org/",
                url: "/w/api.php",
                method: "get",
                timeout: 10000,
                params: {
                    action: "query",
                    generator: "categorymembers",
                    gcmtype: "file",
                    gcmtitle: "Category:" + req.query.commons_category,
                    gcmlimit: 30,
                    prop: "imageinfo",
                    iiurlwidth: 400,
                    iiurlheight: 400,
                    redirects: "resolve",
                    iiprop: "user|url|extmetadata",
                    format: "json"
                }
            };
        }
        else {
            var requestConfig = {
                baseURL: "https://commons.wikimedia.org/",
                url: "/w/api.php",
                method: "get",
                params: {
                    action: "query",
                    generator: "search",
                    prop: "imageinfo",
                    iiurlwidth: 400,
                    iiurlheight: 400,
                    redirects: "resolve",
                    gsrsearch: topic,
                    gsrnamespace: 6,
                    iiprop: "user|url|extmetadata",
                    format: "json"
                }
            };
        }

        return axios.request(requestConfig).then(response => {

            var images = [];

            //console.log(response.data);

            if (response.data.query != undefined && response.data.query.pages != undefined) {

                var pages = Object.keys(response.data.query.pages).map(function(e) {
                    return response.data.query.pages[e];
                });

                //console.log(pages.length);

                //res.send(pages);

                pages.forEach((page, index) => {
                    //console.log(index);
                    var image = {
                        id: page.title,
                        source: 'Wikimedia Commons',
                        imageURL: page.imageinfo[0].url,
                        thumbURL: page.imageinfo[0].thumburl,
                        title: "",
                        authors: page.imageinfo[0].user,
                        institutions: "",
                        infoURL: page.imageinfo[0].descriptionurl,
                        location: "",
                        geoLocations: [],
                        year: null,
                        license: null
                    };

                    if (page.imageinfo[0].extmetadata.ImageDescription != undefined) {
                        var origHTML = page.imageinfo[0].extmetadata.ImageDescription.value;
                        const $ = cheerio.load(origHTML);
                        var title = $.text();
                        image.title = title;
                    }

                    if (page.imageinfo[0].extmetadata.GPSLatitude != undefined && page.imageinfo[0].extmetadata.GPSLongitude != undefined) {

                        // if (req.query.lat != undefined && 
                        //     req.query.lon != undefined &&
                        //     req.query.maxradius != undefined) {

                        //         var distance =
                        //             turf.distance([req.query.lon, req.query.lat], [page.imageinfo[0].extmetadata.GPSLongitude.value, page.imageinfo[0].extmetadata.GPSLatitude.value]);
                        //         if (distance > req.query.maxradius / 1000) {
                        //             return;
                        //         }
                        // }

                        image.geoLocations.push("POINT(" + page.imageinfo[0].extmetadata.GPSLongitude.value + " " + page.imageinfo[0].extmetadata.GPSLatitude.value + ")")
                    }

                    if (page.imageinfo[0].extmetadata.DateTimeOriginal != undefined) {
                        var dateString = page.imageinfo[0].extmetadata.DateTimeOriginal.value;
                        var year = parseInt(dateString.substr(0, 4), 10);
                        if (year != NaN) {
                            image.year = year;
                        }
                    }

                    if (page.imageinfo[0].extmetadata.LicenseShortName != undefined) {
                        image.license = page.imageinfo[0].extmetadata.LicenseShortName.value;
                    }

                    //console.log(index);
                    images.push(image);
                });
            }
            else {
                // nothing to do
            }    

            //console.log(images.length);

            if (images.length > 30) { // Good practice
                images = images.slice(0, 30);
            }

            return images;


        }).catch(error => {
            console.log("error in getImagesFromCommonsWithTitle");
            console.log(error);
            return [];
            //return Promise.reject(error);
        });
    }

    // var getImagesFromCommonsWithRadius = null;
    // var coords = null;

    // if (req.query.lat != undefined && req.query.lon != undefined) {
    //     coords = {
    //         lat: req.query.lat,
    //         lon: req.query.lon
    //     }

    //     getImagesFromCommonsWithRadius = function() { 
    //         var requestConfig = {
    //             baseURL: "https://commons.wikimedia.org/",
    //             url: "/w/api.php",
    //             method: "get",
    //             params: {
    //                 action: "query",
    //                 generator: "geosearch",
    //                 ggsprimary: "all",
    //                 ggsnamespace: 6,
    //                 ggsradius: 500,
    //                 ggscoord: coords.lat + '|' + coords.lon,
    //                 ggslimit: 10,
    //                 prop: "imageinfo",
    //                 iilimit: 10,
    //                 iiprop: "url",
    //                 iiurlwidth: 400,
    //                 iiurlheight: 400,
    //                 format: "json"
    //             }
    //         };

    //         return axios.request(requestConfig);
    //     }
    // }


    var getImagesFromFinnaWithTitle = function() {
        var requestConfig = {
            baseURL: "https://api.finna.fi/",
            url: "/v1/search",
            method: "get",
            params: {
                lookfor: topic.split('_').join('+'),
                type: 'AllFields',
                limit: 15,
                "filter[0]": '~format:"0/Image/"',
                "filter[1]": 'online_boolean:"1"',
                "field[0]": 'id',
                "field[1]": 'title',
                "field[2]": 'geoLocations',
                "field[3]": 'images',
                "field[4]": 'year',
                "field[5]": 'publisher',
                "field[6]": 'authors',
                "field[7]": 'institutions',
                "field[8]": 'events',
                "field[9]": 'imageRights',
                "field[10]": 'summary',
                "field[11]": 'onlineUrls',
                "field[12]": 'nonPresenterAuthors',
            //    field[]=collections&
            //    field[]=buildings&
            //    field[]=thumbnail&
            }
        }

        // Remove images too faraway from the provided coordinates if they and maxdistance given 
        // if (req.query.lat != undefined && 
        //     req.query.lon != undefined &&
        //     req.query.maxradius != undefined) {

        //         var filter = 
        //             '{!geofilt sfield=location_geo pt=' +
        //             req.query.lat +
        //             ',' +
        //             req.query.lon +
        //             ' d=' +
        //             req.query.maxradius / 1000 +
        //             '}';

        //         requestConfig.params['filter[2]'] = filter;
        // }

        //console.log(requestConfig);

        return axios.request(requestConfig).then(response => {

            var images = [];

            if (response.data.records != undefined) {
                for (var i = 0; i < response.data.records.length; i++) {
                    var record = response.data.records[i];
                    if (record.images != undefined && record.images.length > 0) {

                        // Remove images too faraway from the provided coordinates if they and maxdistance given
                        if (req.query.lat != undefined && 
                            req.query.lon != undefined &&
                            req.query.maxradius != undefined &&
                            record.geoLocations != undefined) {
                                //console.log(record.geoLocations);
                                var location = getFirstGeoLocationAsPoint(record);
                                //console.log(location);
                                if (location != null) {                                
                                    var distance =
                                        turf.distance([req.query.lon, req.query.lat], [location[0], location[1]]);
                                    if (distance > req.query.maxradius / 1000) {
                                        continue;
                                    }
                                }
                        }
                        
                        var authors = "";
                        if (record.authors != undefined) {
                            for (var author in record.authors) {
                                if (record.authors.hasOwnProperty(author)) {
                                    //console.log(author);
                                    for (var key in record.authors[author]) {
                                        //console.log(key);
                                        if (record.authors[author].hasOwnProperty(key)) {
                                            authors += key + ", ";
                                        }
                                    }
                                }
                            }
                            authors = authors.slice(0, -2);
                        }

                        var institutions = "";
                        if (record.institutions != undefined) {
                            for (var j = 0; j < record.institutions.length; j++) {
                                institutions += record.institutions[j].translated + ', ';
                            }

                            institutions = institutions.slice(0, -2);
                        }

                        var image = {
                            id: record.id,
                            source: "Finna",
                            title: record.title,
                            geoLocations: (record.geoLocations != undefined ? record.geoLocations : []),
                            imageURL: "https://api.finna.fi" + record.images[0],
                            thumbURL: "https://api.finna.fi" + record.images[0],
                            year: (record.year != undefined ? parseInt(record.year, 10) : null),
                            publisher: (record.publisher != undefined ? record.publisher : null),
                            authors: authors,
                            institutions: institutions,
                            //events: record.events,
                            imageRights: record.imageRights,
                            license: (record.imageRights != undefined ? record.imageRights.copyright : "Luvanvarainen käyttö / ei tiedossa"),
                            //summary: record.summary,
                            infoURL: "https://www.finna.fi/Record/" + encodeURIComponent(record.id)
                        }

                        //console.log(image);

                        images.push(image);
                    }
                }
            }  

            if (images.length > 30) { // Good practice
                images = images.slice(0, 30);
            }

            return images;

        }).catch(error => {
            console.log("error in getImagesFromFinnaWithTitle");
            console.log(error);
            return [];
            //return Promise.reject(error);
        });
    }

    var getImagesFromFlickrWithTitle = function() {

        var requestConfig = {
            baseURL: "https://api.flickr.com/",
            url: "/services/rest/",
            method: "get",
            params: {
                method: "flickr.photos.search",
                api_key: process.env.FLICKR_KEY,
                text: topic.split('_').join('+'),
                license: "1,2,3,4,5,6,7,8,9,10",
                extras: "license,owner_name,geo,url_o,url_m,path_alias,date_taken",
                per_page: 100,
                format: "json",
                nojsoncallback: 1
            }
        }

        return axios.request(requestConfig).then((response) => {
            var photos = response.data.photos.photo;
            
            //console.log(photos);

            var images = [];

            photos.forEach((photoInfo) => {

                //console.log(photoInfo);

                var image = null;

                if (photoInfo.license != 0) { // 0 = All rights reserved
                    //console.log(photoInfo.urls);

                    var infoURL = "https://www.flickr.com/photos/" + photoInfo.owner + "/" + photoInfo.id;

                    image = {
                        id: photoInfo.id,
                        source: 'Flickr',
                        imageURL: photoInfo.url_o,
                        thumbURL: photoInfo.url_m,
                        title: photoInfo.title,
                        authors: photoInfo.ownername,
                        institutions: "",
                        infoURL: infoURL,
                        location: null,
                        geoLocations: [],
                        year: null,
                        license: "?"
                    };

                    if (photoInfo.latitude != 0 && photoInfo.longitude != 0 && photoInfo.geo_is_public == 1) {
                        // Remove images too faraway from the provided coordinates if they and maxdistance given 
                        if (req.query.lat != undefined && 
                            req.query.lon != undefined &&
                            req.query.maxradius != undefined) {

                                var distance =
                                    turf.distance([req.query.lon, req.query.lat], [photoInfo.longitude, photoInfo.latitude]);
                                if (distance > req.query.maxradius / 1000) {
                                    //console.log("distance too big", distance);
                                    return null;
                                }
                        }

                        var geoLocation =
                            "POINT(" + 
                            photoInfo.longitude +
                            " " +
                            photoInfo.latitude +
                            ")";

                        image.geoLocations.push(geoLocation);
                    }

                    if (photoInfo.datetakenunknown == 0) {
                        var dateString = photoInfo.datetaken;
                        var year = parseInt(dateString.substr(0, 4), 10);
                        if (year != NaN) {
                            image.year = year;
                        }
                    }

                    for (var i = 0; i < flickrLicenses.length; i++) {
                        if (flickrLicenses[i].id == photoInfo.license) {
                            image.license = flickrLicenses[i].name;
                            break;
                        }
                    }

                    images.push(image);
                }
            });

            if (images.length > 30) { // https://www.flickr.com/services/api/tos/
                images = images.slice(0, 30);
            }

            return images;

        }).catch(error => {
            console.log("error in getImagesFromFlickrWithTitle");
            //console.log(error.response);
            //console.log(error.response.status);
            return images;
            //return Promise.reject(error);
        });

    }

    var images = [];

    axios.all([getImagesFromCommonsWithTitle(), getImagesFromFinnaWithTitle(), getImagesFromFlickrWithTitle()])
        .then(axios.spread(function (imagesFromCommonsWithTitleResponse, imagesFromFinnaWithTitleResponse, imagesFromFlickrWithTitle) {
            //console.log(imagesFromFlickrWithTitle);
            //console.log(imagesFromFlickrWithTitleResponse.data);
            //console.log(imagesFromFinnaWithTitleResponse.data);
            //console.log(imagesFromCommonsWithTitleResponse.data);
            //res.send(imagesFromCommonsWithTitleResponse.data);
            
            images = images.concat(imagesFromCommonsWithTitleResponse);
            images = images.concat(imagesFromFinnaWithTitleResponse);
            images = images.concat(imagesFromFlickrWithTitle);

            // var data = {
            //     orig: imagesFromFlickrWithTitle,
            //     images: images
            // }
            // res.send(data);            

            res.send(images);
        })).catch(error => {
            console.log("error in getImagesFromCommonsWithTitle(), getImagesFromFinnaWithTitle(), getImagesFromFlickrWithTitle()");
            //console.log(error.response);
            //console.log(error.response.status);
            res.send(images);
            //return Promise.reject(error.response);
        });

    // axios.all([getImagesFromCommonsWithRadius(),])
    //     .then(axios.spread(function (imagesFromCommonsWithRadiusResponse) {
    //         console.log(imagesFromCommonsWithRadiusResponse.data);
    //         res.send(imagesFromCommonsWithRadiusResponse.data);
    //     }));
});

app.get('/basemaps', function(req, res) {

    console.log(req.originalUrl);

    var leftLon = req.query.leftLon;
    var bottomLat = req.query.bottomLat;
    var rightLon = req.query.rightLon;
    var topLat = req.query.topLat;

    var requestConfig = {
        baseURL: "http://warper.wmflabs.org/",
        url: "/api/v1/maps.json",
        method: "get",
        params: {
            show_warped: 1,
            bbox: leftLon + "," + bottomLat + "," + rightLon + "," + topLat,
            per_page: 50
        }
    };

    axios.request(requestConfig).then(response => {
        //console.log(response.data);
        var warpedMaps = response.data.data;

        var commonsTitles = [];

        for (var i = 0; i < warpedMaps.length; i++) {
            commonsTitles.push(warpedMaps[i].attributes.title);
        }

        var titles = commonsTitles.join('|');

        var requestConfig = {
            baseURL: "https://commons.wikimedia.org/",
            url: "/w/api.php",
            method: "get",
            timeout: 10000,
            params: {
                action: "query",
                titles: titles,
                iiurlwidth: 400,
                iiurlheight: 400,
                prop: "imageinfo",
                iiprop: "user|url|extmetadata",
                redirects: "resolve",
                format: "json"
            }
        };

        axios.request(requestConfig).then(response => {
            //console.log(response.data);
         
            var pages = Object.keys(response.data.query.pages).map(function(e) {
                return response.data.query.pages[e];
            });

            var basemaps = [];

            for (var i = 0; i < warpedMaps.length; i++) {
                for (var j = 0; j < pages.length; j++) {
                    if (warpedMaps[i].attributes.title == pages[j].title &&
                        pages[j].imageinfo != undefined) {
                        var page = pages[j];
                        //console.log(page);
                        //console.log(page.imageinfo);
                        var basemap = {
                            id: page.title,
                            title: "",
                            imageURL: page.imageinfo[0].url,
                            thumbURL: page.imageinfo[0].thumburl,
                            commonsInfoURL: page.imageinfo[0].descriptionurl,
                            year: null,
                            license: null,
                            server: "http://warper.wmflabs.org/",
                            warperID: parseInt(warpedMaps[i].id, 10),
                            bbox: warpedMaps[i].attributes.bbox
                        }
    
                        if (page.imageinfo[0].extmetadata.ImageDescription != undefined) {
                            var origHTML = page.imageinfo[0].extmetadata.ImageDescription.value;
                            const $ = cheerio.load(origHTML);
                            var title = $.text();
                            basemap.title = title;
                        }
    
                        if (page.imageinfo[0].extmetadata.DateTimeOriginal != undefined) {
                            var dateString = page.imageinfo[0].extmetadata.DateTimeOriginal.value;
                            var year = parseInt(dateString.substr(0, 4), 10);
                            if (year != NaN) {
                                basemap.year = year;
                            }
                        }
    
                        if (page.imageinfo[0].extmetadata.LicenseShortName != undefined) {
                            basemap.license = page.imageinfo[0].extmetadata.LicenseShortName.value;
                        }
    
                        if (basemap.year != null && basemap.year < 2000) {
                            basemaps.push(basemap);
                        }
                    }
                } 
            }

            res.send(basemaps);

            // var data = {
            //     mapsWarperData: warpedMaps,
            //     commonsData: pages
            // }
            // res.send(data);

        });
    }).catch(error => {
        console.log("error in /basemaps");
        console.log(error);
        res.send([]);
        //return Promise.reject(error);
    });
});


app.get('/geocode', function(req, res) {

    console.log(req.originalUrl);

    var place = req.query.place;

    var requestConfig = {
        baseURL: "http://dev.virtualearth.net/",
        url: "/REST/v1/Locations",
        method: "get",
        responseType: 'json',
        params: {
            query: place,
            maxResults: 1,
            userIp: "127.0.0.1",
            key: process.env.BING_MAPS_KEY,
        }
    }

    return axios.request(requestConfig).then((response) => {
        //console.log(response.data);

        if (response.data.resourceSets != undefined && response.data.resourceSets[0].resources != undefined && response.data.resourceSets[0].resources.length > 0) {
            //console.log(response.data.resourceSets[0].resources[0]);

            res.send({result: 
                response.data.resourceSets[0].resources[0]
            });
        }
        else {
            res.send(null);
        }

    }).catch(error => {
        console.log("error in geocode");
        console.log(error.response.status);
        res.send(null);
        //return Promise.reject(error);
    });
});


app.listen(3000, () => console.log('Listening on port 3000'));


const convertToWikidocumentariesHTML = function(origHTML, topic, language) {
    const $ = cheerio.load(origHTML);

    $("a").each(function(index) {
        href = $(this).attr('href');
        //console.log(href);
        if (href.indexOf('/wiki') == 0 && href.indexOf('/wiki/Special:') == -1) {
            //$(this).attr('href', '#' + href + "?language=" + language);
            var noHashPart = href.split('#')[0];
            $(this).attr('href', noHashPart.replace("/wiki/", "/wikipedia/" + language + "/") + "?language=" + language);
        }
        else if (href.indexOf('/wiki') == 0 && href.indexOf('/wiki/Special:') != -1) {
            $(this).attr('href', 'https://' + language + '.wikipedia.org' + href);
            $(this).attr('target', '_blank');
            $(this).attr('style', 'color: #52758b;');
        }
        else if (href.indexOf('#cite_') == 0) {
            $(this).attr('href', 'https://' + language + '.wikipedia.org/wiki/' + topic + href);
            $(this).attr('target', '_blank');
            $(this).attr('style', 'color: #52758b;');
        }
        else {
            //https://fi.wikipedia.org/wiki/Vapaamuurarin_hauta#cite_note-1
            $(this).attr('target', '_blank');
            $(this).attr('style', 'color: #52758b;');
            //$(this).replaceWith($(this).html());
        }
    });
    $("table").each(function(index) {
        $(this).remove();
    });
    $("figure").each(function(index) {
        $(this).remove();
    });
    $("figure-inline").each(function(index) {
        $(this).remove();
    });
    $("sup").each(function(index) {
        $(this).remove();
    });
    $("ul").each(function(index) {
        var div_class = $(this).attr('class');
        //console.log(div_class);
        if (div_class != undefined && div_class.indexOf('gallery') != -1) {
            $(this).remove();
        }
    });
    $("div").each(function(index) {
        var div_class = $(this).attr('class');
        //console.log(div_class);
        if (div_class == undefined || div_class != 'noprint') {
            $(this).remove();
        }
    });

    return $.html();
}

const findLabel = function (entities, id, language) {
    var label = "";
    for (var j = 0; j < entities.length; j++) {
        if (entities[j].id == id) {
            //console.log(entities[j]);
            label = entities[j].labels[language] != undefined ? entities[j].labels[language].value : "";
            if (label == "") {
                label = entities[j].labels.en != undefined ? entities[j].labels.en.value : "";
            }
            if (label == "") {
                label = id;
            }
            break;
        }
    }

    return label;
}

const flickrLicenses = [ // TODO update once per day or so
      { "id": 0, "name": "All Rights Reserved", "url": "" },
      { "id": 4, "name": "CC BY 2.0", "url": "https:\/\/creativecommons.org\/licenses\/by\/2.0\/" },
      { "id": 6, "name": "CC BY-ND 2.0", "url": "https:\/\/creativecommons.org\/licenses\/by-nd\/2.0\/" },
      { "id": 3, "name": "CC BY-NC-ND 2.0", "url": "https:\/\/creativecommons.org\/licenses\/by-nc-nd\/2.0\/" },
      { "id": 2, "name": "CC BY-NC 2.0", "url": "https:\/\/creativecommons.org\/licenses\/by-nc\/2.0\/" },
      { "id": 1, "name": "CC BY-NC-SA 2.0", "url": "https:\/\/creativecommons.org\/licenses\/by-nc-sa\/2.0\/" },
      { "id": 5, "name": "CC BY-SA 2.0", "url": "https:\/\/creativecommons.org\/licenses\/by-sa\/2.0\/" },
      { "id": 7, "name": "No known copyright restrictions", "url": "https:\/\/www.flickr.com\/commons\/usage\/" },
      { "id": 8, "name": "United States Government Work", "url": "http:\/\/www.usa.gov\/copyright.shtml" },
      { "id": 9, "name": "CC0", "url": "https:\/\/creativecommons.org\/publicdomain\/zero\/1.0\/" },
      { "id": 10, "name": "Public Domain", "url": "https:\/\/creativecommons.org\/publicdomain\/mark\/1.0\/" }
];

const collectWikidataInfo = async function(allIDs, language) {
    var index = 0;
    var parts = [];
    //console.log(part.length);
    while (index < allIDs.length) {
        //console.log(index);
        var part = allIDs.slice(index, index + 50);
        //console.log(part.length);
        //console.log(part);
        parts.push(part);
        index += 50;
    }

    //console.log(parts);

    var allEntities = [];

    for (var i = 0; i < parts.length; i++) {
        //console.log(ids);
        ids = parts[i].join('|');
        //console.dir(ids);

        var requestConfig = {
            baseURL: "https://www.wikidata.org/w/api.php",
            method: "get",
            responseType: 'json',
            headers: {
                'Api-User-Agent': process.env.WIKIDOCUMENTARIES_API_USER_AGENT
            },
            params: {
                action: "wbgetentities",
                ids: ids,
                props: "labels|sitelinks",
                languages: (language != "en" ? language + "|en" : "en"),
                format: "json"
            }
        }

        var wikidataEntitiesResponse = await axios.request(requestConfig);

        //console.log(wikidataEntitiesResponse.data);
        var entities = Object.keys(wikidataEntitiesResponse.data.entities).map(function(e) {
            return wikidataEntitiesResponse.data.entities[e];
        });
        //console.log(entities);
        allEntities = allEntities.concat(entities);
    }
    //console.log("collectWikidataInfo, allEntities", allEntities);

    return allEntities;
}


function getFormattedDateString(dateWikidataValue, language) {
    var timeString = dateWikidataValue.time;

    //timeString = "-0050-00-00T00:00:00Z";

    //console.log(dateWikidataValue);

    var year = parseInt((timeString.indexOf('-') != 0 ? timeString.substring(1, timeString.indexOf('-')) : timeString.substring(0, timeString.indexOf('-', 1))), 10);
    var month = parseInt(timeString.substr(6, 2));
    var day = parseInt(timeString.substr(9, 2));
    // var hour = parseInt(timeString.substr(12, 2));
    // var mintutes = parseInt(timeString.substr(15, 2));
    // var seconds = parseInt(timeString.substr(18, 2));

    var formattedDateString = "";

    switch (dateWikidataValue.precision) {
    case 11:         
        var date = new Date();
        date.setFullYear(year, month - 1, day);
        // date.setHours(hour);
        // date.setMinutes(mintutes);
        // date.setSeconds(seconds);
        // console.log(date.getFullYear());
        // console.log(date.getMonth());
        // console.log(date.getDate());
        // console.log("month", month);
        // console.log("day", day);
        // console.log("hour", hour);
        // console.log("mintutes", mintutes);
        // console.log("seconds", seconds);

        //var dateFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        formattedDateString = (year < 0 ? year + "-" + month + "-" + day : date.toLocaleDateString(language + "-" + language.toUpperCase()/*, dateFormatOptions*/));
        //console.log(formattedDateString);
        break;
    case 10:
        formattedDateString = year + "-" + month;
        break;
    case 9:
        formattedDateString = year.toString();
        break;
    case 8:
        formattedDateString = year + " - " + (year + 9);
        break;
    case 7:
        if (year % 100 == 0) {
            formattedDateString = (year - 99) + " - " + year;
        }
        else {
            formattedDateString = year + " - " + (year + 98);
        }
        break;
    case 6:
        formattedDateString = "~" + year;
        break;
    case 4:
    case 3:
    case 2:
    case 1:
    case 0:
        formattedDateString = year;
        break;
    default:
        formattedDateString = timeString;
    }

    return formattedDateString;
}

function getFirstGeoLocation(image) {
    var geoLocation = null;
    if (image.geoLocations.length > 0) {
        var wkt = image.geoLocations[0];
        if (wkt.indexOf("POINT") != -1) { 
            // "POINT(24.9600002 60.1796223)"
            var coordPart = wkt.split('(')[1].split(')')[0];
            //console.log(coordPart);
            geoLocation = coordPart.split(' ').map(Number);
        }
        else if (wkt.indexOf("LINESTRING") != -1) {
            // "LINESTRING(24.9697848 60.1877939,24.9695072 60.1876021)"
            var coordPart = wkt.split('(')[1].split(')')[0];
            var pointParts = coordPart.split(',');
            geoLocation = [];
            for (var i = 0; i < pointParts.length; i++) {
                geoLocation.push(pointParts[i].split(' ').map(Number));
            }
        }
        else if (wkt.indexOf("POLYGON") != -1) {
            // "POLYGON((24.7828131 60.0999549, 24.8356577 60.130414, 24.8513844 60.2249765, 24.8419098 60.2212043, 24.8347825 60.2585099, 24.8677628 60.2523073, 24.9473908 60.2784652, 24.9731653 60.2643801, 25.0209862 60.2893227, 25.0882105 60.2713417, 25.0823359 60.2496391, 25.1358461 60.2372286, 25.1598757 60.2488133, 25.1425242 60.2697779, 25.2545116 60.2952274, 25.2509121 60.2734979, 25.2273451 60.2611057, 25.240926 60.246305, 25.2014099 60.2181613, 25.2204176 60.1997262, 25.1800446 60.0987408, 25.1693516 59.9434386, 24.9423061 59.922486, 24.7828131 60.0999549))"
            //console.log(wkt);
            geoLocation = [];
            var parenthesisPart = wkt.substring(wkt.indexOf('('));
            //console.log(parenthesisPart);
            var parenthesisPartInner = parenthesisPart.substr(1, parenthesisPart.length - 2);
            //console.log(parenthesisPartInner);
            var polygonPartCount = parenthesisPartInner.match(/\(/g).length;
            //console.log(polygonPartCount);
            var parts = parenthesisPartInner.split('(').slice(1);
            //console.log(parts);
            var partsWithoutParenthesis = [];
            for (var i = 0; i < parts.length; i++) {
                var part = null;
                var trimmed = parts[i].trim();
                if (trimmed.substr(trimmed.length - 1, 1) == ',') {
                    part = trimmed.substr(0, trimmed.length - 1);
                }
                else {
                    part = parts[i];
                }
                partsWithoutParenthesis.push(part.slice(0, -1));
            }
            //console.log(partsWithoutParenthesis);

            for (var i = 0; i < partsWithoutParenthesis.length; i++) {
                var pointParts = partsWithoutParenthesis[i].split(',');
                var polygonPart = [];
                for (var j = 0; j < pointParts.length; j++) {
                    polygonPart.push(pointParts[j].trim().split(' ').map(Number));
                }
                geoLocation.push(polygonPart);
            }
            //console.log(geoLocation);
        }
        else if (wkt.indexOf("ENVELOPE") != -1) {
            // "ENVELOPE(24.9320989, 24.9512479, 60.1799755, 60.1677043)"
            var coordPart = wkt.split('(')[1].split(')')[0];
            var pointParts = coordPart.split(',').map(Number);
            //console.log(pointParts);
            var envelopePolygon = [[pointParts[0], pointParts[3]], [pointParts[0], pointParts[2]], [pointParts[1], pointParts[2]], [pointParts[1], pointParts[3]], [pointParts[0], pointParts[3]]];
            //console.log(envelopePolygon);
            geoLocation = [envelopePolygon];
        }
    }
    return geoLocation;
}

function getFirstGeoLocationAsPoint(image) {
    var geoLocation = getFirstGeoLocation(image)
    if (image.geoLocations.length > 0) {
        var wkt = image.geoLocations[0];
        if (wkt.indexOf("POINT") != -1) { 
            // "POINT(24.9600002 60.1796223)"
            var coordPart = wkt.split('(')[1].split(')')[0];
            //console.log(coordPart);
            geoLocation = coordPart.split(' ').map(Number);
        }
        else if (wkt.indexOf("LINESTRING") != -1) {
            geoLocation = getCentroid(geoLocation);
        }
        else if (wkt.indexOf("POLYGON") != -1) {
            geoLocation = getCentroid(geoLocation[0]); // We do not care of the possible holes in the polygon
        }
        else if (wkt.indexOf("ENVELOPE") != -1) {
            // "ENVELOPE(24.9320989, 24.9512479, 60.1799755, 60.1677043)"
            var coordPart = wkt.split('(')[1].split(')')[0];
            var pointParts = coordPart.split(',').map(Number);
            //console.log(pointParts);
            var lng = (pointParts[0] + pointParts[1]) / 2;
            var lat = (pointParts[2] + pointParts[3]) / 2;
            //var envelopePolygon = [[pointParts[0], pointParts[3]], [pointParts[0], pointParts[2]], [pointParts[1], pointParts[2]], [pointParts[1], pointParts[3]], [pointParts[0], pointParts[3]]];
            //console.log(envelopePolygon);
            geoLocation = [lng, lat];
        }
    }

    return geoLocation;
}

function getCentroid(coords) {
    //console.log(coords);
    var center = coords.reduce(function (x,y) {
        //console.log('x[1]: ', x[1]);
        //console.log('y[1]: ', y[1]);
        return [x[0] + y[0]/coords.length, x[1] + y[1]/coords.length]; 
    }, [0,0])
    return center;
}

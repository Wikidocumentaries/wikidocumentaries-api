const express = require('express')
const app = express()
const axios = require('axios')
const cheerio = require('cheerio')

if (process.env.WIKIDOCUMENTARIES_API_USER_AGENT == undefined) {
    console.log("Set environment variable WIKIDOCUMENTARIES_API_USER_AGENT to e.g. your email. Please, see: https://en.wikipedia.org/api/rest_v1/");
    process.exit();
}


app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

app.get('/wiki', function(req, res) {

    var language = req.query.language;
    var topic = req.query.topic;
    console.log(topic);
    var encodedTopic = encodeURIComponent(topic);

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

        return axios.request(requestConfig);
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

        return axios.request(requestConfig);
    };

    var wikidataItemID = null;

    var wikidataItemIDPromise = function () {
        
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
        }

        return axios.request(requestConfig).then((response) => {

            var pages = Object.keys(response.data.query.pages).map(function(e) {
                return response.data.query.pages[e];
            });
            //console.log(pages);

            if (pages[0].pageprops != undefined && pages[0].pageprops.wikibase_item) {

                wikidataItemID = pages[0].pageprops.wikibase_item;

                var requestConfig = {
                    baseURL: "https://www.wikidata.org/w/api.php",
                    method: "get",
                    responseType: 'json',
                    headers: {
                        'Api-User-Agent': process.env.WIKIDOCUMENTARIES_API_USER_AGENT
                    },
                    params: {
                        action: "wbgetclaims",
                        entity: wikidataItemID,
                        format: "json"
                    }
                }
                return axios.request(requestConfig);
            }
            else {
                return { data: null };
            }
        });
    };

    axios.all([wikipediaSummaryPromise(), wikipediaHTMLPromise(), wikidataItemIDPromise() ])
        .then(axios.spread(function (wikipediaSummaryResponse, wikipediaHTMLResponse, wikidataItemIDResponse) {
            //console.log(wikidataItemIDResponse);

            var origHTML = wikipediaHTMLResponse.data.lead.sections[0].text;

            const $ = cheerio.load(origHTML);

            $("a").each(function(index) {
                href = $(this).attr('href');
                //console.log(href);
                if (href.indexOf('/wiki') == 0) {
                    //$(this).attr('href', '#' + href + "?language=" + language);
                    $(this).attr('href', href + "?language=" + language);
                }
                else if (href.indexOf('#cite_') == 0) {
                    $(this).attr('href', 'https://' + language + '.wikipedia.org/wiki/' + topic + href);
                    $(this).attr('target', '_blank');
                }
                else {
                    //https://fi.wikipedia.org/wiki/Vapaamuurarin_hauta#cite_note-1
                    $(this).replaceWith($(this).html());
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

            var responseData = {
                wikipedia: wikipediaSummaryResponse.data,
                wikipediaExcerptHTML: $.html(),
                wikidataRaw: wikidataItemIDResponse.data
            }

            return responseData;

    })).then((responseData) => {
        //console.dir(responses);
        if (responseData.wikidataRaw != null) {

            var claims = Object.keys(responseData.wikidataRaw.claims).map(function(e) {
                return responseData.wikidataRaw.claims[e];
            });

            responseData.wikidataRaw = claims;
            //console.dir(claims[0]);

            var ids = [];

            claims.forEach((claim) => {
                //console.dir(claim[0]);
                ids.push(claim[0].mainsnak.property);
                if (claim[0].mainsnak.datavalue.type == "wikibase-entityid") {
                    ids.push(claim[0].mainsnak.datavalue.value.id);
                }
                // else if (claim[0].mainsnak.datavalue.type == "globecoordinate") {

                // }
                // else if (claim[0].mainsnak.datavalue.type == "string") {

                // }
            });

            if (ids.length > 50) {
                origIDs = ids;
                ids = ids.slice(0, 50);

                // Make sure instance of and coordinates are always included if they are in the original ids
                if (ids.indexOf('P31') == -1 && origIDs.indexOf('P31') != -1) {
                    ids = ids.slice(0, 49).unshift('P31');
                }
                if (ids.indexOf('P625') == -1 && origIDs.indexOf('P625') != -1) {
                    ids = ids.slice(0, 49).push('P625');
                }
            }

            ids = ids.join('|');
            console.dir(ids);

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
                    props: "labels",
                    languages: (language != "en" ? language + "|en" : "en"),
                    format: "json"
                }
            }

            axios.request(requestConfig).then((wikidataEntitiesResponse) => {
                //console.log(wikidataEntitiesResponse.data);
                var entities = Object.keys(wikidataEntitiesResponse.data.entities).map(function(e) {
                    return wikidataEntitiesResponse.data.entities[e];
                });

                //console.log(entities);

                var wikidata = {
                    id: wikidataItemID,
                    instance_of: {
                        value: null,
                        url: 'https://www.wikidata.org/wiki/'
                    },
                    statements: [],
                    geo: {
                        lat: null,
                        lon: null,
                    },
                    dates : []

                }

                for (var i = 0; i < responseData.wikidataRaw.length; i++) {
                    //console.log(responseData.wikidataRaw[i][0]);
                    var mainsnak = responseData.wikidataRaw[i][0].mainsnak;
                    if (mainsnak.property == 'P31') { // instance_of
                        if (mainsnak.datavalue.type == "wikibase-entityid") {
                            for (var j = 0; j < entities.length; j++) {
                                if (entities[j].id == mainsnak.datavalue.value.id) {
                                    //console.log(entities[j]);
                                    label = entities[j].labels[language] != undefined ? entities[j].labels[language].value : "";
                                    if (label == "") {
                                        label = entities[j].labels.en != undefined ? entities[j].labels.en.value : "";
                                    }
                                    wikidata.instance_of.value = label;
                                    wikidata.instance_of.url += entities[j].id;
                                    break;
                                }
                            }
                        }
                        else {
                            // TODO ?
                        }
                    }
                    else if (mainsnak.property == 'P625') { // coordinates
                        var statement = {
                            id: mainsnak.property,
                            label: null,
                            value: mainsnak.datavalue.value.latitude + ", " + mainsnak.datavalue.value.longitude,
                            url: 'https://tools.wmflabs.org/geohack/geohack.php?params=' + mainsnak.datavalue.value.latitude + '_N_' + mainsnak.datavalue.value.longitude + '_E_globe:earth&language=' + language
                        }

                        statement.label = findLabel(entities, mainsnak.property, language);
                        wikidata.statements.push(statement);

                        wikidata.geo.lat = mainsnak.datavalue.value.latitude;
                        wikidata.geo.lon = mainsnak.datavalue.value.longitude;
                    }
                    else if (mainsnak.property == 'P373') { // commons class
                        var statement = {
                            id: mainsnak.property,
                            label: null,
                            value: mainsnak.datavalue.value,
                            url: 'https://commons.wikimedia.org/wiki/Category:' + mainsnak.datavalue.value.split(' ').join('_')
                        }

                        statement.label = findLabel(entities, mainsnak.property, language);
                        if (statement.label != "" && statement.value != null && statement.url != null) {
                            wikidata.statements.push(statement);
                        }
                    }
                    else if (mainsnak.property == 'P18') { // commons media
                        var statement = {
                            id: mainsnak.property,
                            label: null,
                            value: mainsnak.datavalue.value,
                            url: 'https://commons.wikimedia.org/wiki/File:' + mainsnak.datavalue.value.split(' ').join('_')
                        }

                        statement.label = findLabel(entities, mainsnak.property, language);
                        if (statement.label != "" && statement.value != null && statement.url != null) {
                            wikidata.statements.push(statement);
                        }
                    }
                    else if (mainsnak.datavalue.type == "string") {
                        var statement = {
                            id: mainsnak.property,
                            label: null,
                            value: mainsnak.datavalue.value,
                            url: null
                        }

                        statement.label = findLabel(entities, mainsnak.property, language);
                        if (statement.label != "" && statement.value != null && statement.url != null) {
                            wikidata.statements.push(statement);
                        }
                    }
                    else if (mainsnak.datavalue.type == "wikibase-entityid") {
                        var statement = {
                            id: mainsnak.property,
                            label: null,
                            value: null,
                            url: 'https://www.wikidata.org/wiki/' + mainsnak.datavalue.value.id
                        }

                        statement.label = findLabel(entities, mainsnak.property, language);
                        //console.log(mainsnak.datavalue.value);
                        statement.value = findLabel(entities, mainsnak.datavalue.value.id, language);
                        if (statement.label != "" && statement.value != null && statement.url != null) {
                            wikidata.statements.push(statement);
                        }
                    }
                    else if (mainsnak.datavalue.type == "time") {

                        var timeString = mainsnak.datavalue.value.time.substring(1);

                        var date = new Date(timeString);
                        //var dateFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };

                        var statement = {
                            id: mainsnak.property,
                            label: null,
                            value: date.toLocaleDateString(language + "-" + language.toUpperCase()/*, dateFormatOptions*/),
                            url: null
                        }

                        statement.label = findLabel(entities, mainsnak.property, language);
                        if (statement.label != "" && statement.value != null) {
                            wikidata.statements.push(statement);
                        }

                        var dateItem = {
                            date: timeString,
                            wikidata_property: mainsnak.property,
                            type: null
                        }
                        if (mainsnak.property == 'P569') {
                            dateItem.type = "date_of_birth";
                        }
                        else if (mainsnak.property == 'P570') {
                            dateItem.type = "date_of_death";
                        }
                        else if (mainsnak.property == 'P571') {
                            dateItem.type = "inception"; // date founded
                        }
                        wikidata.dates.push(dateItem);

                    }
                    else {
                        // TODO ?
                        console.log("unhandled entity:", mainsnak);
                    }
                }
                responseData.wikidataRaw = undefined;
                //responseData.wikidataEntities = wikidataEntitiesResponse.data;
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
        res.send({});
    });
});


app.get('/images', function(req, res) {

    console.log(req.originalUrl);

    var language = req.query.language;
    var topic = req.query.topic;
    console.log(topic);
    var encodedTopic = encodeURIComponent(topic);

    var getImagesFromCommonsWithTitle = function() {
        var requestConfig = {
            baseURL: "https://commons.wikimedia.org/",
            url: "/w/api.php",
            method: "get",
            params: {
                action: "query",
                generator: "search",
                prop: "imageinfo",
                iiprop: "url",
                iiurlwidth: 400,
                iiurlheight: 400,
                redirects: "resolve",
                gsrsearch: topic,
                gsrnamespace: 6,
                iiprop: "timestamp|user|userid|comment|url|size|dimensions|mime|extmetadata",
                format: "json"
            }
        };

        return axios.request(requestConfig);
    }

    var getImagesFromCommonsWithRadius = null;
    var coords = null;

    if (req.query.lat != undefined && req.query.lon != undefined) {
        coords = {
            lat: req.query.lat,
            lon: req.query.lon
        }

        getImagesFromCommonsWithRadius = function() { 
            var requestConfig = {
                baseURL: "https://commons.wikimedia.org/",
                url: "/w/api.php",
                method: "get",
                params: {
                    action: "query",
                    generator: "geosearch",
                    ggsprimary: "all",
                    ggsnamespace: 6,
                    ggsradius: 500,
                    ggscoord: coords.lat + '|' + coords.lon,
                    ggslimit: 10,
                    prop: "imageinfo",
                    iilimit: 10,
                    iiprop: "url",
                    iiurlwidth: 400,
                    iiurlheight: 400,
                    format: "json"
                }
            };

            return axios.request(requestConfig);
        }
    }


    var getImagesFromFinnaWithTitle = function() {
        var requestConfig = {
            baseURL: "https://api.finna.fi/",
            url: "/v1/search",
            method: "get",
            params: {
                lookfor: topic.split('_').join('+'),
                type: 'AllFields',
                limit: 10,
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

        //console.log(requestConfig);

        return axios.request(requestConfig);
    }

    axios.all([getImagesFromCommonsWithTitle(), getImagesFromFinnaWithTitle()])
        .then(axios.spread(function (imagesFromCommonsWithTitleResponse, imagesFromFinnaWithTitleResponse) {
            //console.log(imagesFromFinnaWithTitleResponse.data);
            //console.log(imagesFromCommonsWithTitleResponse.data);
            //res.send(imagesFromCommonsWithTitleResponse.data);

            var images = [];

            if (imagesFromCommonsWithTitleResponse.data.query != undefined && imagesFromCommonsWithTitleResponse.data.query.pages != undefined) {

                var pages = Object.keys(imagesFromCommonsWithTitleResponse.data.query.pages).map(function(e) {
                    return imagesFromCommonsWithTitleResponse.data.query.pages[e];
                });

                //console.log(pages);

                //res.send(pages);

                pages.forEach((page) => {

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

                    if ( page.imageinfo[0].extmetadata.ImageDescription != undefined) {
                        var origHTML = page.imageinfo[0].extmetadata.ImageDescription.value;
                        const $ = cheerio.load(origHTML);
                        var title = $.text();
                        image.title = title;
                    }

                    if (page.imageinfo[0].extmetadata.GPSLatitude != undefined && page.imageinfo[0].extmetadata.GPSLongitude != undefined) {
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

                    images.push(image);
                });

                // var data = {
                //     orig: imagesFromCommonsWithTitleResponse.data,
                //     images: images
                // }
                // res.send(data);
            }
            else {
                // nothing to do
            }

            if (imagesFromFinnaWithTitleResponse.data.records != undefined) {
                for (var i = 0; i < imagesFromFinnaWithTitleResponse.data.records.length; i++) {
                    var record = imagesFromFinnaWithTitleResponse.data.records[i];
                    if (record.images != undefined && record.images.length > 0) {

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
                            source: "finna",
                            title: record.title,
                            geoLocations: (record.geoLocations != undefined ? record.geoLocations : []),
                            imageURL: "https://api.finna.fi" + record.images[0],
                            thumbURL: "https://api.finna.fi" + record.images[0],
                            year: record.year,
                            publisher: record.publisher,
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

            res.send(images);
        }));

    // axios.all([getImagesFromCommonsWithRadius(),])
    //     .then(axios.spread(function (imagesFromCommonsWithRadiusResponse) {
    //         console.log(imagesFromCommonsWithRadiusResponse.data);
    //         res.send(imagesFromCommonsWithRadiusResponse.data);
    //     }));
});


app.listen(3000, () => console.log('Listening on port 3000'));


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
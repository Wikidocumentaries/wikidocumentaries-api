const axios = require('axios');
const turf = require('@turf/turf');
const BASE_URL = "https://api.finna.fi";

module.exports = {
    async getImagesFromFinnaWithTitle(topic, lat, lon, maxradius) {
        
        let query = '"' + JSON.parse(topic).join('" OR "') + '"';

        //construct query
        const requestConfig = {
            baseURL: BASE_URL+"/",
            url: "/v1/search",
            method: "get",
            params: {
                lookfor: query,
                type: 'AllFields',
                limit: 100,
                //"filter[0]": '~format:"0/Image/"',
                //"filter[1]": '~format:"0/WorkOfArt/"',
                //"filter[2]": 'usage_rights_str_mv:"usage_E"',
                //"filter[0]": 'free_online_boolean:"1"',
                'filter[0]': '~format_ext_str_mv:"0/Image/"',
                'filter[1]': '~format_ext_str_mv:"0/Map/"',
                'filter[2]': '~format_ext_str_mv:"0/WorkOfArt/"',
                'filter[3]': 'free_online_boolean:1',
                "field[0]": 'id',
                "field[1]": 'title',
                "field[2]": 'geoLocations',
                "field[3]": 'images',
                "field[4]": 'year',
                "field[5]": 'publisher',
                "field[6]": 'authors',
                "field[7]": 'institutions',
                "field[8]": 'imageRights',
                "field[9]": 'summary',
                "field[10]": 'onlineUrls',
                "field[11]": 'nonPresenterAuthors',
                "field[12]": 'subjectActors',
                "field[13]": 'subjectDetails',
                "field[14]": 'subjectPlaces',
                "field[15]": 'buildings',
                "field[16]": 'subjects',
                "field[17]": 'formats',
                "field[18]": 'identifierString',
                "field[19]": 'measurements',
                "field[20]": 'inscriptions',
                "field[21]": 'imagesExtended',
                "field[22]": 'events',
            //    field[]=collections&
            //    field[]=thumbnail&
            }
        }

        // Remove images too faraway from the provided coordinates if they and maxdistance given
        // if (lat != undefined &&
        //     lon != undefined &&
        //     maxradius != undefined) {

        //         var filter =
        //             '{!geofilt sfield=location_geo pt=' +
        //             lat +
        //             ',' +
        //             lon +
        //             ' d=' +
        //             maxradius / 1000 +
        //             '}';

        //         requestConfig.params['filter[2]'] = filter;
        // }

        const response = await axios.request(requestConfig);

        let images = [];

        if (!response.data.records) {
            return [];
        }

        //format response
        for (var i = 0; i < response.data.records.length; i++) {
            var record = response.data.records[i];
            if (record.images != undefined && record.images.length > 0) {

                // Remove images too faraway from the provided coordinates if they and maxdistance given
                if (lat != undefined &&
                    lon != undefined &&
                    maxradius != undefined &&
                    record.geoLocations != undefined) {
                        var location = getFirstGeoLocationAsPoint(record);
                        if (location != null) {
                            var distance =
                                turf.distance([lon, lat], [location[0], location[1]]);
                            if (distance > maxradius / 1000) {
                                continue;
                            }
                        }
                }

                // var authors = "";
                // if (record.authors != undefined) {
                //     for (var author in record.authors) {
                //         if (record.authors.hasOwnProperty(author)) {
                //             for (var key in record.authors[author]) {
                //                 if (record.authors[author].hasOwnProperty(key)) {
                //                     authors += key + ", ";
                //                 }
                //             }
                //         }
                //     }
                //     authors = authors.slice(0, -2);
                // }

                let collection = "";
                if ((record.buildings!=undefined) && (record.buildings.length>1) && (record.buildings[1].value!=undefined)) {
                  let collectionElements = record.buildings[1].value.split("/");
                  if (collectionElements.length > 2) collection = collectionElements[2];
                }

                let formats = "";
                if ((record.formats!=undefined) && (record.formats.length>1) && (record.formats[1].value!=undefined)) {
                  let formatsElements = record.formats[1].value.split("/");
                  if (formatsElements.length > 2) formats = formatsElements[2];
                }

                // let thumbURL = BASE_URL + record.images[0];
                let thumbURL = '/static/pngs/imageplaceholder.png';
                if (!!record.imagesExtended) {
                  let imagesExtendedUrls = record.imagesExtended[0].urls;
                  //if (!!imagesExtendedUrls.small) {
                    thumbURL = BASE_URL + imagesExtendedUrls.small + '&h=300';
                  //}
                //   else if (imagesExtendedUrls.medium != undefined) thumbURL = BASE_URL + imagesExtendedUrls.medium;
                }

                var subjects = record.subjects && [].concat(...record.subjects) || [];

                var datecreated = [];
                var materials = [];
                if (!!record.events && !!record.events.valmistus) {
                  datecreated = record.events.valmistus.filter(x => (x.type==='valmistus' && x.date)).map(x => x.date);
                  materials = record.events.valmistus.filter(x => (x.type==='valmistus' && x.materials)).map(x => x.materials);
                }

                //assign data to metadata properties
                var image = {
                    actors: record.subjectActors,
                    collection: collection,
                    creators: record.nonPresenterAuthors,
                    creditline: record.imagesExtended[0].rights.creditline,
                    datecreated: datecreated,
                    description: record.summary,
                    details: record.subjectDetails,
                    downloadURL: '',
                    formats: formats,
                    geoLocations: (record.geoLocations != undefined ? record.geoLocations : []),
                    id: record.id,
                    imageURL: BASE_URL + record.images[0],
                    infoURL: "https://www.finna.fi/Record/" + encodeURIComponent(record.id),
                    inscriptions: record.inscriptions,
                    institutions: [],
                    inventoryNumber: record.identifierString,
                    license: (record.imageRights != undefined ? record.imageRights.copyright : ""),
                    materials: materials,
                    measurements: record.measurements,
                    places: record.subjectPlaces,
                    publisher: (record.publisher != undefined ? record.publisher : null),
                    rightsstatement: '',
                    source: "Finna",
                    subjects: subjects,
                    thumbURL: thumbURL,
                    title: [],
                    year: ''
                }

                if (record.title) {
                    image.title.push(record.title);
                }

                if (record.institutions) {
                    for (let institution of record.institutions) {
                        image.institutions.push(institution.translated);
                      }
                }

                if (record.year != undefined) {
                    image.year = parseInt(record.year, 10);
                }

                images.push(image);
            }
        }

        if (images.length > 30) { // Good practice
            images = images.slice(0, 30);
        }


        return images;
    }
};

function getFirstGeoLocation(image) {
    var geoLocation = null;
    if (image.geoLocations.length > 0) {
        var wkt = image.geoLocations[0];
        if (wkt.indexOf("POINT") != -1) {
            // "POINT(24.9600002 60.1796223)"
            var coordPart = wkt.split('(')[1].split(')')[0];
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
            geoLocation = [];
            var parenthesisPart = wkt.substring(wkt.indexOf('('));
            var parenthesisPartInner = parenthesisPart.substr(1, parenthesisPart.length - 2);
            var polygonPartCount = parenthesisPartInner.match(/\(/g).length;
            var parts = parenthesisPartInner.split('(').slice(1);
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

            for (var i = 0; i < partsWithoutParenthesis.length; i++) {
                var pointParts = partsWithoutParenthesis[i].split(',');
                var polygonPart = [];
                for (var j = 0; j < pointParts.length; j++) {
                    polygonPart.push(pointParts[j].trim().split(' ').map(Number));
                }
                geoLocation.push(polygonPart);
            }
        }
        else if (wkt.indexOf("ENVELOPE") != -1) {
            // "ENVELOPE(24.9320989, 24.9512479, 60.1799755, 60.1677043)"
            var coordPart = wkt.split('(')[1].split(')')[0];
            var pointParts = coordPart.split(',').map(Number);
            var envelopePolygon = [[pointParts[0], pointParts[3]], [pointParts[0], pointParts[2]], [pointParts[1], pointParts[2]], [pointParts[1], pointParts[3]], [pointParts[0], pointParts[3]]];
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
            var lng = (pointParts[0] + pointParts[1]) / 2;
            var lat = (pointParts[2] + pointParts[3]) / 2;
            //var envelopePolygon = [[pointParts[0], pointParts[3]], [pointParts[0], pointParts[2]], [pointParts[1], pointParts[2]], [pointParts[1], pointParts[3]], [pointParts[0], pointParts[3]]];
            geoLocation = [lng, lat];
        }
    }

    return geoLocation;
}

function getCentroid(coords) {
    var center = coords.reduce(function (x,y) {
        return [x[0] + y[0]/coords.length, x[1] + y[1]/coords.length];
    }, [0,0])
    return center;
}

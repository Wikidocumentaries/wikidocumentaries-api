const axios = require('axios');
const turf = require('@turf/turf');
const BASE_URL = "https://www.europeana.eu/api/v2/search.json";

module.exports = {
    async getImagesEuropeana(topic,language) {
        const requestConfig = {
            baseURL: BASE_URL + "/",
            params: {
                wskey: 'BXEGTQYKm',
                query: topic,
                qf: '',
                media: true,
                thumbnail: true,
                sort: 'timestamp_created',
                rows: 30
            }
        }

        console.log(requestConfig);

        const response = await axios.request(requestConfig);

        let images = [];

        if (!response.data.items) {
            return [];
        }

        //format response
        for (var i = 0; i < response.data.items.length; i++) {
            var item = response.data.items[i];

            var image = {
                id: item.id,
                source: 'Europeana',
                title: [], //dcTitleLangAware
                description: item.dcDescription,//dcDescriptionLangAware/langcode
                imageURL: item.edmIsShownBy,
                thumbURL: item.edmPreview,
                //download_url: result.detail,
                creators: [],
                institutions: [],
                subjects: item.subject,
                //legacy_tags: result.legacy_tags,
                //license: result.license,
                //license_id: result.license, //rights
                //license_version: result.license_version,
                license_link: item.rights,
                infoURL: '',
                inventoryNumber: '',
                geoLocations: '',//transformation FIX
                measurements: '',
                formats: '',
                year: item.year,
                publisher: '',
                actors: item.edmAgent,
                places: item.edmPlaceLabel,//.def = language
                collection: '',
                imageRights: '',
                inscriptions: '',
                datecreated: item.when,
                language: ''
            }

            if (item.edmIsShownAt) {
                image.infoURL = item.edmIsShownAt[0];
            }

            if (item.title) {
                for (let title of item.title) {
                    image.title.push(title);
                  }
            }

            if (item.dcCreator) {
                for (let creator of item.dcCreator) {
                    image.creators.push(creator);
                  }
            }

            if (item.dataProvider) {
                for (let provider of item.dataProvider) {
                    image.institutions.push(provider);
                  }
            }

            // if (item.edmIsShownAt) {
            //     for (let info of item.edmIsShownAt) {
            //         image.infoURL.push(info);
            //       }
            // }
            
            // if (item.edmPlaceLatitude != 0 && item.edmPlaceLongitude != 0) {
            
            //     var geoLocation =
            //         "POINT(" +
            //         item.edmPlaceLongitude +
            //         " " +
            //         item.edmPlaceLatitude +
            //         ")";
            
            //     image.geoLocations.push(geoLocation);
            // }

            // for (var j = 0; j < CCLicenses.length; j++) {
            //     if (CCLicenses[j].id == result.license) {
            //         image.license = CCLicenses[j].short;
            //         image.license_link = CCLicenses[j].url;
            //         break;
            //     }
            // }

            // for (var k = 0; k < glams.length; k++) {
            //     if (glams[k].id == result.provider) {
            //         image.institutions = glams[k].defaultname;
            //     }
            //     if (glams[k].id == result.source) {
            //         image.source = glams[k].defaultname;
            //         break;
            //     }
            // }

            console.log(image);

            images.push(image);
        }

        return images;
    }
};

const CCLicenses = [
    { "id": 'by', "short": "CC BY", "qid": "xxx", "url": "xxx", "icon": "xxx" },
    { "id": 'cc0', "short": "CC0", "qid": "xxx", "url": "xxx", "icon": "xxx" },
    { "id": 'by-nc-nd', "short": "CC BY-NC-ND", "qid": "xxx", "url": "xxx", "icon": "xxx" },
    { "id": 'by-nc-sa', "short": "CC BY-NC-SA", "qid": "xxx", "url": "xxx", "icon": "xxx" },
    { "id": 'by-nd', "short": "CC BY-ND", "qid": "xxx", "url": "xxx", "icon": "xxx" },
    { "id": 'pdm', "short": "PD", "qid": "xxx", "url": "xxx", "icon": "xxx" },
    { "id": 'by-sa', "short": "CC BY-SA", "qid": "xxx", "url": "xxx", "icon": "xxx" },
    { "id": 'by-nc', "short": "CC BY-NC", "qid": "xxx", "url": "xxx", "icon": "xxx" }
];

const glams = [
    { "id": "thorvaldsensmuseum", "defaultname": "Thorvaldsens Museum", "qid": "xxx", "url": "xxx", "included": false },
    { "id": "thingiverse", "defaultname": "Thingiverse", "qid": "xxx", "url": "xxx", "included": false },
    { "id": "svgsilh", "defaultname": "SVG Silh", "qid": "xxx", "url": "xxx", "included": false },
    { "id": "sciencemuseum", "defaultname": "Science Museum – UK", "qid": "xxx", "url": "xxx", "included": true },
    { "id": "rijksmuseum", "defaultname": "Rijksmuseum", "qid": "xxx", "url": "xxx", "included": true },
    { "id": "rawpixel", "defaultname": "Rawpixel", "qid": "xxx", "url": "xxx", "included": false },
    { "id": "nypl", "defaultname": "NYPL", "qid": "xxx", "url": "xxx", "included": true },
    { "id": "museumsvictoria", "defaultname": "Museums Victoria", "qid": "xxx", "url": "xxx", "included": true },
    { "id": "met", "defaultname": "Metropolitan Museum of Art", "qid": "xxx", "url": "xxx", "included": true },
    { "id": "mccordmuseum", "defaultname": "xxx", "qid": "xxx", "url": "xxx", "included": false },
    { "id": "iha", "defaultname": "iha", "qid": "xxx", "url": "xxx", "included": false },
    { "id": "floraon", "defaultname": "xxx", "qid": "xxx", "url": "xxx", "included": false },
    { "id": "geographorguk", "defaultname": "Geograph Britain and Ireland", "qid": "xxx", "url": "xxx", "included": false },
    { "id": "flickr", "defaultname": "Flickr", "qid": "xxx", "url": "xxx", "included": false },
    { "id": "eol", "defaultname": "xxx", "qid": "xxx", "url": "xxx", "included": true },
    { "id": "digitaltmuseum", "defaultname": "Digitalt Museum", "qid": "xxx", "url": "xxx", "included": true },
    { "id": "deviantart", "defaultname": "DeviantArt", "qid": "xxx", "url": "xxx", "included": false },
    { "id": "clevelandmuseum", "defaultname": "Cleveland Museum of Art", "qid": "xxx", "url": "xxx", "included": true },
    { "id": "brooklynmuseum", "defaultname": "Brooklyn Museum", "qid": "xxx", "url": "xxx", "included": true },
    { "id": "behance", "defaultname": "Bēhance", "qid": "xxx", "url": "xxx", "included": false },
    { "id": "animaldiversity", "defaultname": "Animal Diversity Web", "qid": "xxx", "url": "xxx", "included": false },
    { "id": "WoRMS", "defaultname": "World Register of Marine Species", "qid": "xxx", "url": "xxx", "included": false },
    { "id": "CAPL", "defaultname": "CAPL", "qid": "xxx", "url": "xxx", "included": false },
    { "id": "500px", "defaultname": "500px", "qid": "xxx", "url": "xxx", "included": false }
];
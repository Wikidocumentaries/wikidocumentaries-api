const axios = require('axios');
const turf = require('@turf/turf');
const BASE_URL = "https://api.dimu.org";

module.exports = {
    async getImagesDigitaltMuseum(topic) {

        //construct query
        const requestConfig = {
            baseURL: BASE_URL + "/",
            url: "/api/solr/",
            method: "get",
            params: {
                q: topic,
                wt: json,
                api.key: demo,
            }
        }

        const response = await axios.request(requestConfig);

        let images = [];

        if (!response.data.records) {
            return [];
        }

        console.log(response.data.records);

        //format response
        for (var i = 0; i < response.data.records.length; i++) {
            var record = response.data.records[i];
            if (record.images != undefined && record.images.length > 0) {

                //assign data to metadata properties
                var image = {
                    id: artifact.uuid,
                    // source: result.source,
                    title: artifact.ingress.title,
                    // imageURL: result.url,
                    // thumbURL: result.thumbnail,
                    // download_url: result.detail,
                    creators: artifact.ingress.producer,
                    creator_roles: artifact.ingress.producerRole, //new
                    // creator_urls: result.creator_url,
                    institutions: identifier.owner,
                    subjects: artifact.ingress.subjects,
                    // legacy_tags: result.legacy_tags,
                    license: artifact.ingress.license,
                    // license_id: result.license,
                    // license_version: result.license_version,
                    // license_link: '',
                    // infoURL: result.foreign_landing_url,
                    inventoryNumber: identifier.id,
                    geoLocations: artifact.coordinate,
                    measurements: artifact.defaultPictureDimension,
                    formats: artifact.type,
                    year: artifact.ingress.production.fromYear,
                    year_end: artifact.ingress.production.toYear, //new
                    // publisher: '',
                    // actors: '',
                    places: artifact.ingress.production.place,
                    // collection: '',
                    // imageRights: '',
                    // description: '',
                    // inscriptions: '',
                    datecreated: artifact.publishedDate
                }

                //console.log(image);

                images.push(image);
            }
        }

        if (images.length > 30) { // Good practice
            images = images.slice(0, 30);
        }

        return images;
    }
};
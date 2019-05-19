const axios = require('axios');
const turf = require('@turf/turf');
const BASE_URL = "https://api.creativecommons.engineering";

module.exports = {
    async getImagesCC(topic) {
        const requestConfig = {
            baseURL: BASE_URL + "/",
            url: "image/search/",
            method: "get",
            params: {
                format: 'json',
                q: topic,
                provider: 'nypl,met,rijksmuseum,digitaltmuseum,sciencemuseum,clevelandmuseum,thorvaldsensmuseum,museumsvictoria',
                lt: 'all',
                page: 1,
                pagesize: 30,
                filter_dead: true
            }
        }
        const response = await axios.request(requestConfig);

        let images = [];

        if (!response.data.results) {
            return [];
        }

        //format response
        for (var i = 0; i < response.data.results.length; i++) {
            var result = response.data.results[i];

            var image = {
                id: result.id,
                source: result.source,
                title: result.title,
                imageURL: result.url,
                thumbURL: result.thumbnail,
                download_url: result.detail,
                creators: result.creator,
                creator_urls: result.creator_url,
                institutions: result.provider,
                subjects: result.tags,
                legacy_tags: result.legacy_tags,
                license: result.license,
                license_version: result.license_version,
                infoURL: result.foreign_landing_url,
                inventoryNumber: '',
                geoLocations: '',
                measurements: '',
                formats: '',
                year: '',
                publisher: '',
                actors: '',
                places: '',
                collection: '',
                imageRights: '',
                description: '',
                inscriptions: '',
                datecreated: ''
            }

            console.log(image);

            images.push(image);
        }
        return images;
    }
};
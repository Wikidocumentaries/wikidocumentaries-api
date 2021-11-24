const axios = require('axios');
const turf = require('@turf/turf');
const BASE_URL = "https://api.trove.nla.gov.au/v2/result";

if (process.env.TROVE_API_KEY == undefined) {
    console.log("Set environment variable TROVE_API_KEY to your TROVE API key.");
}

module.exports = {
    async getImagesTroveTextsearch(topic,language) {

        let query = '"' + JSON.parse(topic).join('" OR "') + '"';

        const requestConfig = {
            baseURL: BASE_URL + "/",
            params: {
                key: process.env.TROVE_API_KEY,
                zone: 'picture',
                q: query,
                n: 50,
                sortby: 'relevance',
                encoding: 'json',
                include: 'links'
            }
        }

        const response = await axios.request(requestConfig);

        let images = [];

        if (!response.data.response || !response.data.response.zone.length || !response.data.response.zone[0].records.work) {
            return [];
        }

        //format response
        for (var i = 0; i < response.data.response.zone[0].records.work.length; i++) {
            var item = response.data.response.zone[0].records.work[i];

            var image = {
                //download_url: result.detail,
                //legacy_tags: result.legacy_tags,
                //license_version: result.license_version,
                actors: [],
                collection: '',
                creators: item.contributor,
                datecreated: '',
                description: item.snippet,
                formats: item.type,
                geoLocations: '',
                id: item.id,
                imageRights: item.rights,
                imageURL: '',
                infoURL: item.troveUrl,
                inscriptions: '',
                institutions: [],
                inventoryNumber: '',
                language: item.language,
                license_id: '',
                license_link: '',
                license: '',
                measurements: '',
                places: '',
                publisher: '',
                rightsstatement: '',
                source: 'Trove',
                subjects: item.subject,
                thumbURL: '',
                title: [],
                year: item.issued
            }

            if (item.title) {
                image.title.push(item.title);
            }

            images.push(image);
        }

        return images;
    }
};

const axios = require('axios');
const turf = require('@turf/turf');
const BASE_URL = "https://api.si.edu/openaccess/api/v1.0/search";

if (process.env.SMITHSONIAN_API_KEY == undefined) {
    console.log("Set environment variable SMITHSONIAN_API_KEY to your Smithsonian API key.");
}

module.exports = {
    async getImagesSmithsonianTextsearch(topic,language) {

        //let query = '"' + JSON.parse(topic).join('" OR "') + '"';
        let query = JSON.parse(topic)[0];

        const requestConfig = {
            baseURL: BASE_URL + "/",
            params: {
                api_key: process.env.SMITHSONIAN_API_KEY,
                q: query,
                rows: 50,
                sort: 'relevancy'
                //include: 'tags'
            }
        }

        const response = await axios.request(requestConfig);

        let images = [];

        if (!response.data.response || !response.data.response.rows.length) {
            return [];
        }

        //format response
        for (var i = 0; i < response.data.response.rows.length; i++) {
            var item = response.data.response.rows[i];

            var image = {
                //download_url: result.detail,
                //legacy_tags: result.legacy_tags,
                //license_version: result.license_version,
                actors: item.content.indexedStructured.object_type.name,
                collection: '',
                creators: '',
                datecreated: item.content.indexedStructured.date,
                description: '',
                formats: item.content.indexedStructured.object_type,
                geoLocations: '',
                id: item.content.descriptiveNonRepeating.record_ID,
                imageRights: '',
                imageURL: '',
                infoURL: item.content.descriptiveNonRepeating.record_link,
                inscriptions: '',
                institutions: item.content.descriptiveNonRepeating.data_source,
                inventoryNumber: '',
                language: '',
                license_id: '',
                license_link: '',
                license: '',
                measurements: '',
                places: item.content.indexedStructured.place,
                publisher: '',
                rightsstatement: '',
                source: 'Smithsonian',
                subjects: '',
                thumbURL: '',
                title: [],
                year: ''
            }

            if (item.title) {
                image.title.push(item.title);
            }

            images.push(image);
        }

        return images;
    }
};

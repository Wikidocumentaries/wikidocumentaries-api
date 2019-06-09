const axios = require('axios');
const turf = require('@turf/turf');
const BASE_URL = "https://api.dp.la/v2/items/";

// format request
module.exports = {
    async getImagesDpla(topic) {
        const requestConfig = {
            baseURL: BASE_URL,
            params: {
                q: topic,
                page_size: 30,
                api_key: '2fa4e490d8e6c99261865141de8d3614'
                // 'sourceResource.type': image
            }
        }

        const response = await axios.request(requestConfig);

        let images = [];

        if (!response.data.docs) {
            return [];
        }

        //format response
        for (var i = 0; i < response.data.docs.length; i++) {
            var item = response.data.docs[i];

            var image = {
                id: item.id,
                source: 'DPLA',
                title: [], //dcTitleLangAware
                description: '',//dcDescriptionLangAware/langcode
                imageURL: '',
                thumbURL: item.object,
                download_url: '',
                creators: [],
                institutions: [],
                subjects: '',
                // //legacy_tags: result.legacy_tags,
                // //license: result.license,
                // //license_id: result.license, //rights
                // //license_version: result.license_version,
                license_link: '',
                infoURL: '',
                inventoryNumber: '',
                geoLocations: '',//transformation FIX
                measurements: '',
                formats: '',
                year: '',
                publisher: '',
                actors: '',
                places: '',//.def = language
                collection: [],
                imageRights: '',
                inscriptions: '',
                datecreated: '',
                language: ''
            }

            // if (!!item.year && item.year.length > 0) {
            //     image.year = item.year[0];
            // }

            // if (!!item.isShownAt && item.isShownAt.length > 0) {
            //     image.infoURL = item.isShownAt[0];
            // }

            // if (!!item.sourceResource.title && item.sourceResource.title.length > 0) {
            //     for (let title of item.sourceResource.title) {
            //         image.title.push(title);
            //       }
            // }

            // if (!!item.sourceResource.creator && item.sourceResource.creator.length > 0) {
            //     for (let creator of item.sourceResource.creator) {
            //         image.creators.push(creator);
            //       }
            // }

            // if (!!item.provider.name && item.provider.name.length > 0) {
            //         image.institutions.push(item.provider.name);
            // }

            // if (!!item.sourceResource.collection.title && item.sourceResource.collection.title.length > 0) {
            //     for (let title of item.sourceResource.collection.title) {
            //         image.collection.push(title);
            //       }
            // }
            

            images.push(image);
        }

        return images;
    }
};

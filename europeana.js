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
                year: '',
                publisher: '',
                actors: item.edmAgent,
                places: item.edmPlaceLabel,//.def = language
                collection: '',
                imageRights: '',
                inscriptions: '',
                datecreated: item.when,
                language: ''
            }

            if (!!item.year && item.year.length > 0) {
                image.year = item.year[0];
            }

            if (!!item.edmIsShownAt && item.edmIsShownAt.length > 0) {
                image.infoURL = item.edmIsShownAt[0];
            }

            if (!!item.title && item.title.length > 0) {
                for (let title of item.title) {
                    image.title.push(title);
                  }
            }

            if (!!item.dcCreator && item.dcCreator.legth > 0) {
                for (let creator of item.dcCreator) {
                    image.creators.push(creator);
                  }
            }

            if (!!item.dataProvider && item.dataProvider > 0) {
                for (let provider of item.dataProvider) {
                    image.institutions.push(provider);
                  }
            }

            images.push(image);
        }

        return images;
    }
};

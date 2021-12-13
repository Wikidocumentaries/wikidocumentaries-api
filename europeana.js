const axios = require('axios');
const turf = require('@turf/turf');
const BASE_URL = "https://api.europeana.eu/record/v2/search.json";

if (process.env.EUROPEANA_API_KEY == undefined) {
    console.log("Set environment variable EUROPEANA_API_KEY to your EUROPEANA API key.");
}

module.exports = {
    async getImagesEuropeana(topic,language) {

        let query = '"' + JSON.parse(topic).join('" OR "') + '"';

        const requestConfig = {
            baseURL: BASE_URL + "/",
            params: {
                wskey: process.env.EUROPEANA_API_KEY,
                query: query,
                qf: '',
                media: true,
                thumbnail: true,
                sort: 'timestamp_created',
                rows: 100
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
                thumbURL: item.edmPreview[0],
                //download_url: result.detail,
                creators: [],
                institutions: [],
                subjects: item.subject,
                //legacy_tags: result.legacy_tags,
                license: '',
                license_id: '',
                //license_version: result.license_version,
                license_link: item.rights[0],
                rightsstatement: '',
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

            if (item.year) {
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

            if (!!item.rights && item.rights > 0) {
                switch (item.rights) {
                    case "http://creativecommons.org/licenses/by/4.0":
                        license = "CC BY 4.0";
                        license_id = "CC BY 4.0";
                    case "http://creativecommons.org/licenses/by-sa/4.0":
                        license = "CC BY-SA 4.0";
                        license_id = "CC BY-SA 4.0";
                    case "http://creativecommons.org/licenses/by-nc/4.0":
                        license = "CC BY-NC 4.0";
                        license_id = "CC BY-NC 4.0";
                    case "http://creativecommons.org/licenses/by-nd/4.0":
                        license = "CC BY-ND 4.0";
                        license_id = "CC BY-ND 4.0";
                    case "http://creativecommons.org/licenses/by-nc-sa/4.0":
                        license = "CC BY-NC-SA 4.0";
                        license_id = "CC BY-NC-SA 4.0";
                    case "http://creativecommons.org/licenses/by-nc-nd/4.0":
                        license = "CC BY-NC-ND 4.0";
                        license_id = "CC BY-NC-ND 4.0";
                    case "http://creativecommons.org/publicdomain/mark/1.0/":
                        license = "CC0";
                        license_id = "CC0";
                    case "http://rightsstatements.org/vocab/InC/1.0/":
                        rightsstatement = "In copyright";
                    case "http://rightsstatements.org/vocab/NoC-OKLR/1.0/":
                        rightsstatement = "Other legal restrictions";
                }
            }

            if (!!item.type && item.type > 0) {
                for (let type of item.type) {
                    image.formats.push(type);
                  }
            }

            images.push(image);
        }

        return images;
    }
};

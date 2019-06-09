const axios = require('axios');
const turf = require('@turf/turf');
const BASE_URL = "https://api.dp.la/v2/items/";

// format request
// Info at https://pro.dp.la/developers/requests
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
                // provider: dataProvider,
                title: [],
                description: '',
                // imageURL: '',
                thumbURL: item.object,
                // download_url: '',
                creators: [],
                institutions: [],
                subjects: [],
                // // //legacy_tags: result.legacy_tags,
                // // //license: result.license,
                // // //license_id: result.license, //rights
                // // //license_version: result.license_version,
                // license_link: '',
                infoURL: item.isShownAt,
                inventoryNumber: [],
                // geoLocations: '',//transformation FIX
                measurements: [],
                formats: [],
                // year: '',
                // publisher: '',
                // actors: '',
                places: [],
                collection: [],
                // imageRights: '', //!!
                // inscriptions: '',
                // datecreated: '',
                // language: ''
            }

            // if (!!item.year && item.year.length > 0) {
            //     image.year = item.year[0];
            // }

            if (!!item.sourceResource.title && item.sourceResource.title.length > 0) {
                for (let title of item.sourceResource.title) {
                    image.title.push(title);
                  }
            }

            if (!!item.sourceResource.creator && item.sourceResource.creator.length > 0) {
                for (let creator of item.sourceResource.creator) {
                    image.creators.push(creator);
                }
            }

            if (!!item.provider) {
                image.institutions.push(item.provider.name);
            }

            if (!!item.sourceResource.collection && item.sourceResource.collection.length > 0) {
                for (let collection of item.sourceResource.collection) {
                    image.collection.push(collection.title);
                }
            }

            if (!!item.sourceResource.date && item.sourceResource.date.length > 0) {
                image.datecreated = item.sourceResource.date[0];
            }

            if (!!item.sourceResource.description && item.sourceResource.description.length > 0) {
                image.description = item.sourceResource.description[0];
            }

            if (!!item.sourceResource.format && item.sourceResource.format.length > 0) {
                for (let format of item.sourceResource.format) {
                    image.formats.push(format);
                }
            }

            if (!!item.sourceResource.extent && item.sourceResource.extent.length > 0) {
                for (let extent of item.sourceResource.extent) {
                    image.measurements.push(extent);
                }
            }

            if (!!item.sourceResource.identifier && item.sourceResource.identifier.length > 0) {
                for (let identifier of item.sourceResource.identifier) {
                    image.inventoryNumber.push(identifier);
                }
            }

            if (!!item.sourceResource.spatial && item.sourceResource.spatial.length > 0) {
                for (let spatial of item.sourceResource.spatial) {
                    image.places.push(spatial.name);
                }
            }

            if (!!item.sourceResource.subject && item.sourceResource.subject.length > 0) {
                for (let subject of item.sourceResource.subject) {
                    image.subjects.push(subject.name);
                }
            }
            
            images.push(image);
        }

        return images;
    }
};

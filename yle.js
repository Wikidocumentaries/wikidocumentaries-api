const axios = require('axios');
const BASE_URL = "https://external.api.yle.fi";

module.exports = {
    async getImagesYle(topic) {

        //construct query
        const requestConfig = {
            baseURL: BASE_URL + "/",
            url: "/v1/programs/items.json",
            method: "get",
            params: {
                app_id: "cac1239e",
                app_key: "71eab9be802dc9f2f142639673fc16f4",
                availability: "ondemand",
                mediaobject: "video",
                category: "5-130",
                order: "playcount.24h:desc",
                q: topic
            }
        }

        const response = await axios.request(requestConfig);
        let images = [];

        if (!response.data) {
            return [];
        }

        for (var i = 0; i < response.data.length; i++) {
            var video = response.data[i];

            //assign data to metadata properties
            var image = {
                actors: '',
                collection: '',
                creators: video.creator,
                datecreated: '',
                description: video.description,
                details: '',
                download_url: '',
                formats: '',
                geoLocations: '',
                id: '',
                imageRights: '',
                imageURL: '',
                infoURL: '',
                inscriptions: '',
                institutions: video.creator,
                inventoryNumber: '',
                language: video.language,
                license: '',
                license_id: '',
                license_link: '',
                license_version: '',
                materials: '',
                measurements: '',
                places: '',
                publisher: '',
                source: '',
                subjects: video.subject.title,
                thumbURL: '',
                title: video.title.fi,
                year: '',
            }

            if (video.title) {
                image.title.push(video.title);
            }

            images.push(image);
        }
        if(images.length > 30) { // Good practice
    images = images.slice(0, 30);
}


return images;
    }
}
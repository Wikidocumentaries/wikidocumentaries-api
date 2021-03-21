const axios = require('axios');
const turf = require('@turf/turf');

if (process.env.FLICKR_KEY == undefined) {
    console.log("Set environment variable FLICKR_KEY to your FLICKR key. Please, see: https://www.flickr.com/services/apps/create/apply/");
}

module.exports = {
    async getImagesFlickr(topic, lat, lon, maxradius) {
        const requestConfig = {
            baseURL: "https://api.flickr.com/",
            url: "/services/rest/",
            method: "get",
            params: {
                method: "flickr.photos.search",
                api_key: process.env.FLICKR_KEY,
                text: topic,
                license: "1,2,3,4,5,6,7,8,9,10",
                is_commons: "false",
                extras: "license,description,owner_name,geo,tags,url_l,url_n,path_alias,date_taken",
                per_page: 100,
                format: "json",
                nojsoncallback: 1
            }
        };

        const response = await axios.request(requestConfig);
        const photos = response.data.photos.photo;// && response.data.photos.photo || [];

        let images = [];

        photos.forEach((photoInfo) => {

            var image = null;

            if (photoInfo.license != 0) { // 0 = All rights reserved

                var uploaderURL = "https://www.flickr.com/photos/" + photoInfo.owner;

                let subjects = photoInfo.tags.split(' ');

                image = {
                    id: photoInfo.id,
                    title: [],
                    description: [],
                    inventoryNumber: '',
                    source: 'Flickr',
                    imageURL: photoInfo.url_l,
                    thumbURL: photoInfo.url_n,
                    measurements: '',
                    formats: '',
                    creators: '',
                    institutions: [],
                    infoURL: "https://www.flickr.com/photos/" + photoInfo.owner + "/" + photoInfo.id,
                    location: '',
                    geoLocations: [],
                    year: '',
                    datecreated: [],
                    publisher: '',
                    license: '',
                    uploader: photoInfo.ownername,
                    actors: '',
                    subjects: subjects,
                    places: '',
                    collection: '',
                    imageRights: '',
                    inscriptions: '',
                    uploaderURL: uploaderURL
                };

                if (photoInfo.description) {
                    image.description.push(photoInfo.description._content);
                }

                if (photoInfo.title) {
                    image.title.push(photoInfo.title);
                }

                if (photoInfo.datetaken) {
                    image.datecreated.push(photoInfo.datetaken);
                }

                if (photoInfo.latitude != 0 && photoInfo.longitude != 0 && photoInfo.geo_is_public == 1) {
                    // Remove images too faraway from the provided coordinates if they and maxdistance given
                    if (lat != undefined &&
                        lon != undefined &&
                        maxradius != undefined) {

                            var distance =
                                turf.distance([lon, lat], [photoInfo.longitude, photoInfo.latitude]);
                            if (distance > maxradius / 1000) {
                                return null;
                            }
                    }

                    var geoLocation =
                        "POINT(" +
                        photoInfo.longitude +
                        " " +
                        photoInfo.latitude +
                        ")";

                    image.geoLocations.push(geoLocation);
                }

                if (photoInfo.datetakenunknown == 0) {
                    var dateString = photoInfo.datetaken;
                    var year = parseInt(dateString.substr(0, 4), 10);
                    if (year != NaN) {
                        image.year = year;
                    }
                }

                for (var i = 0; i < flickrLicenses.length; i++) {
                    if (flickrLicenses[i].id == photoInfo.license) {
                        image.license = flickrLicenses[i].name;
                        break;
                    }
                }

                images.push(image);
            }
        });

        if (images.length > 30) { // https://www.flickr.com/services/api/tos/
            images = images.slice(0, 30);
        }

        return images;
    }
};

const flickrLicenses = [ // TODO update once per day or so
      { "id": 0, "name": "All Rights Reserved", "url": "" },
      { "id": 4, "name": "CC BY 2.0", "url": "https:\/\/creativecommons.org\/licenses\/by\/2.0\/" },
      { "id": 6, "name": "CC BY-ND 2.0", "url": "https:\/\/creativecommons.org\/licenses\/by-nd\/2.0\/" },
      { "id": 3, "name": "CC BY-NC-ND 2.0", "url": "https:\/\/creativecommons.org\/licenses\/by-nc-nd\/2.0\/" },
      { "id": 2, "name": "CC BY-NC 2.0", "url": "https:\/\/creativecommons.org\/licenses\/by-nc\/2.0\/" },
      { "id": 1, "name": "CC BY-NC-SA 2.0", "url": "https:\/\/creativecommons.org\/licenses\/by-nc-sa\/2.0\/" },
      { "id": 5, "name": "CC BY-SA 2.0", "url": "https:\/\/creativecommons.org\/licenses\/by-sa\/2.0\/" },
      { "id": 7, "name": "No known copyright restrictions", "url": "https:\/\/www.flickr.com\/commons\/usage\/" },
      { "id": 8, "name": "United States Government Work", "url": "http:\/\/www.usa.gov\/copyright.shtml" },
      { "id": 9, "name": "CC0", "url": "https:\/\/creativecommons.org\/publicdomain\/zero\/1.0\/" },
      { "id": 10, "name": "Public Domain", "url": "https:\/\/creativecommons.org\/publicdomain\/mark\/1.0\/" }
];

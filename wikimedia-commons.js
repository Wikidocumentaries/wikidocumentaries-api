const axios = require('axios');
const cheerio = require('cheerio')


module.exports = {
    async getImagesFromCommonsWithTitle(commons_category) {
        let requestConfig;

        if (commons_category != undefined) {
            //console.log("commons_category", commons_category);
            requestConfig = {
                baseURL: "https://commons.wikimedia.org/",
                url: "/w/api.php",
                method: "get",
                timeout: 10000,
                params: {
                    action: "query",
                    generator: "categorymembers",
                    gcmtype: "file",
                    gcmtitle: "Category:" + commons_category,
                    gcmlimit: 30,
                    prop: "imageinfo",
                    iiurlwidth: 400,
                    iiurlheight: 400,
                    redirects: "resolve",
                    iiprop: "user|url|extmetadata",
                    format: "json"
                }
            };
        } else {
            requestConfig = {
                baseURL: "https://commons.wikimedia.org/",
                url: "/w/api.php",
                method: "get",
                params: {
                    action: "query",
                    generator: "search",
                    prop: "imageinfo",
                    iiurlwidth: 400,
                    iiurlheight: 400,
                    redirects: "resolve",
                    gsrsearch: topic,
                    gsrnamespace: 6,
                    iiprop: "user|url|extmetadata",
                    format: "json"
                }
            };
        }

        const response = await axios.request(requestConfig);

        let images = [];

        //console.log(response.data);

        if (!response.data.query || !response.data.query.pages) {
            return [];
        }

        const pages = Object.keys(response.data.query.pages).map(function(e) {
            return response.data.query.pages[e];
        });

        //console.log(pages.length);

        //res.send(pages);

        pages.forEach((page, index) => {
            console.log(index);
            var image = {
                id: page.title,
                source: 'Wikimedia Commons',
                imageURL: page.imageinfo[0].url,
                thumbURL: page.imageinfo[0].thumburl,
                title: "",
                authors: null,
                uploader: page.imageinfo[0].user,
                institutions: "",
                infoURL: page.imageinfo[0].descriptionurl,
                location: null,
                geoLocations: [],
                year: null,
                license: null
            };

            if (page.imageinfo[0].extmetadata.ImageDescription != undefined) {
                console.log(page.imageinfo[0].extmetadata.ImageDescription);
                var origHTML = page.imageinfo[0].extmetadata.ImageDescription.value;
                const $ = cheerio.load(origHTML);
                var title = $.text();
                image.title = title;
            }

            if (page.imageinfo[0].extmetadata.GPSLatitude != undefined && page.imageinfo[0].extmetadata.GPSLongitude != undefined) {

                // if (req.query.lat != undefined &&
                //     req.query.lon != undefined &&
                //     req.query.maxradius != undefined) {

                //         var distance =
                //             turf.distance([req.query.lon, req.query.lat], [page.imageinfo[0].extmetadata.GPSLongitude.value, page.imageinfo[0].extmetadata.GPSLatitude.value]);
                //         if (distance > req.query.maxradius / 1000) {
                //             return;
                //         }
                // }

                image.geoLocations.push("POINT(" + page.imageinfo[0].extmetadata.GPSLongitude.value + " " + page.imageinfo[0].extmetadata.GPSLatitude.value + ")")
            }

            if (page.imageinfo[0].extmetadata.DateTimeOriginal != undefined) {
                var dateString = page.imageinfo[0].extmetadata.DateTimeOriginal.value;
                var year = parseInt(dateString.substr(0, 4), 10);
                if (year != NaN) {
                    image.year = year;
                }
            }

            if (page.imageinfo[0].extmetadata.LicenseShortName != undefined) {
                image.license = page.imageinfo[0].extmetadata.LicenseShortName.value;
            }

            //console.log(index);
            images.push(image);
        });

        //console.log(images.length);

        if (images.length > 30) { // Good practice
            images = images.slice(0, 30);
        }

        return images;
    }

    //     getImagesFromCommonsWithRadius = function() {
    //         var requestConfig = {
    //             baseURL: "https://commons.wikimedia.org/",
    //             url: "/w/api.php",
    //             method: "get",
    //             params: {
    //                 action: "query",
    //                 generator: "geosearch",
    //                 ggsprimary: "all",
    //                 ggsnamespace: 6,
    //                 ggsradius: 500,
    //                 ggscoord: lat + '|' + lon,
    //                 ggslimit: 10,
    //                 prop: "imageinfo",
    //                 iilimit: 10,
    //                 iiprop: "url",
    //                 iiurlwidth: 400,
    //                 iiurlheight: 400,
    //                 format: "json"
    //             }
    //         };

    //         return axios.request(requestConfig);
    //     }
};

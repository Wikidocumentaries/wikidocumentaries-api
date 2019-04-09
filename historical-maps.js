const axios = require('axios');
const cheerio = require('cheerio');


module.exports = {
    getHistoricalMaps,
};


async function getHistoricalMaps(leftLon, bottomLat, rightLon, topLat) {
    const requestConfig = {
        baseURL: "http://warper.wmflabs.org/",
        url: "/api/v1/maps.json",
        method: "get",
        params: {
            show_warped: 1,
            bbox: leftLon + "," + bottomLat + "," + rightLon + "," + topLat,
            per_page: 50
        }
    };

    const response = await axios.request(requestConfig);
    //console.log(response.data);
    const warpedMaps = response.data.data;

    let commonsTitles = [];

    for (var i = 0; i < warpedMaps.length; i++) {
        commonsTitles.push(warpedMaps[i].attributes.title);
    }

    const titles = commonsTitles.join('|');

    const requestConfigGetImageInfo = {
        baseURL: "https://commons.wikimedia.org/",
        url: "/w/api.php",
        method: "get",
        timeout: 10000,
        params: {
            action: "query",
            titles: titles,
            iiurlwidth: 400,
            iiurlheight: 400,
            prop: "imageinfo",
            iiprop: "user|url|extmetadata",
            redirects: "resolve",
            format: "json"
        }
    };

    const imageInfoResponse = await axios.request(requestConfigGetImageInfo);
    //console.log(response.data);

    const pages = Object.keys(imageInfoResponse.data.query.pages).map(function(e) {
        return imageInfoResponse.data.query.pages[e];
    });

    let basemaps = [];

    for (var i = 0; i < warpedMaps.length; i++) {
        for (var j = 0; j < pages.length; j++) {
            if (warpedMaps[i].attributes.title == pages[j].title &&
                pages[j].imageinfo != undefined) {
                var page = pages[j];
                //console.log(page);
                //console.log(page.imageinfo);
                var basemap = {
                    id: page.title,
                    title: "",
                    imageURL: page.imageinfo[0].url,
                    thumbURL: page.imageinfo[0].thumburl,
                    commonsInfoURL: page.imageinfo[0].descriptionurl,
                    year: null,
                    license: null,
                    server: "http://warper.wmflabs.org/",
                    warperID: parseInt(warpedMaps[i].id, 10),
                    bbox: warpedMaps[i].attributes.bbox
                };

                if (page.imageinfo[0].extmetadata.ImageDescription != undefined) {
                    var origHTML = page.imageinfo[0].extmetadata.ImageDescription.value;
                    const $ = cheerio.load(origHTML);
                    var title = $.text();
                    basemap.title = title;
                }

                if (page.imageinfo[0].extmetadata.DateTimeOriginal != undefined) {
                    var dateString = page.imageinfo[0].extmetadata.DateTimeOriginal.value;
                    var year = parseInt(dateString.substr(0, 4), 10);
                    if (year != NaN) {
                        basemap.year = year;
                    }
                }

                if (page.imageinfo[0].extmetadata.LicenseShortName != undefined) {
                    basemap.license = page.imageinfo[0].extmetadata.LicenseShortName.value;
                }

                if (basemap.year != null && basemap.year < 2000) {
                    basemaps.push(basemap);
                }
            }
        }
    }

    return basemaps;
}

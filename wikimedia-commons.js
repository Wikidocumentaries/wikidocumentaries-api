const axios = require('axios');

const requestConfigTemplate = {
    baseURL: 'https://commons.wikimedia.org/',
    url: '/w/api.php',
    method: 'get',
    timeout: 10000,
    params: {
        action: 'query',
        prop: 'imageinfo',
        iiurlwidth: 400,
        iiurlheight: 400,
        redirects: 'resolve',
        iiprop: 'user|url|extmetadata',
        format: 'json',
    },
};

module.exports = {
    getImagesFromCommonsWithTitle,
    getImageFromPage
};

function getImageFromPage(page, source){
    const extMetadata = page.imageinfo[0].extmetadata;
    // console.log(12345);
    // console.log(page.imageinfo[0].url);
    let image = {
        id: page.pageid,
        source: source,
        imageURL: page.imageinfo[0].url,
        thumbURL: page.imageinfo[0].thumburl,
        title: [],
        creators: [],
        uploader: page.imageinfo[0].user,
        institutions: [],
        infoURL: page.imageinfo[0].descriptionurl,
        location: null,
        geoLocations: [],
        year: null,
        license: '',
        license_link: null,
        description: [],
        datecreated: [],
        downloadURL: page.imageinfo[0].url,
    };

    image.title.push(page.title.replace('File:', '').replace(/\.[^/.]+$/, ''));

    if (extMetadata.GPSLatitude !== undefined && extMetadata.GPSLongitude !== undefined) {
        image.geoLocations.push('POINT(' + extMetadata.GPSLongitude.value + ' ' + extMetadata.GPSLatitude.value + ')')
    }

    if (extMetadata.DateTimeOriginal !== undefined) {
        const dateString = extMetadata.DateTimeOriginal.value;
        image.datecreated.push(dateString);
        const year = parseInt(dateString.substr(0, 4), 10);
        if (year !== NaN) {
            image.year = year;
        }
    }
    if (extMetadata.Artist) {
        image.creators.push(extMetadata.Artist.value);
    }
    if (extMetadata.ImageDescription) {
        image.description.push(extMetadata.ImageDescription.value);
    }
    if (extMetadata.LicenseShortName !== undefined) {
        image.license = extMetadata.LicenseShortName.value;
    }
    if (extMetadata.LicenseUrl !== undefined) {
      image.license_link = extMetadata.LicenseUrl.value;
  }
  
    return image;
}

async function getImagesFromCommonsWithTitle(topic, commonsCategory) {
    let requestConfig = requestConfigTemplate;

    if (commonsCategory !== undefined) {
        requestConfig.params.generator = 'categorymembers';
        requestConfig.params.gcmtype = 'file';
        requestConfig.params.gcmtitle = 'Category:' + commonsCategory;
        requestConfig.params.gcmlimit = 30;
    } else {
        requestConfig.params.generator = 'search';
        requestConfig.params.gsrsearch = topic;
        requestConfig.params.gsrlimit = 30;
        requestConfig.params.gsrnamespace = 6;
    }

    const response = await axios.request(requestConfig);

    if (!response.data.query || !response.data.query.pages) {
        return [];
    }

    return Object.keys(response.data.query.pages).map(p => {
        const page = response.data.query.pages[p];
        return getImageFromPage(page, 'Wikimedia Commons');
    });
}
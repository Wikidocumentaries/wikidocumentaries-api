// The Upload.js provides a set of utility functions for completing the image upload process with the Wikimedia API.
// The upload process is limited to images from finna for now.
// The image upload process includes: retrieving CSRF tokens, downloading files with Finna Id,
// uploading files with associated text, and deleting files based on Finna Id.
const axios = require('axios');
var fs = require('fs'),
request = require('request').defaults({jar: true}),
url = "https://commons.wikimedia.org/w/api.php";
const { once } = require('events');

module.exports = {
    uploadWithFinnaId,
    getCsrfToken,
    downloadWithFinnaId,
    deleteFileWithFinnaId
};

async function getCsrfToken(access_token) {
    var params = {
        action: "query",
        meta: "tokens",
        format: "json"
    };
    const requestConfig = {
        baseURL: url,
        method: "get",
        responseType: "json",
        headers: {
            "Authorization": 'Bearer ' + access_token
        },
        params: params
    };
    const response = await axios.request(requestConfig);
    if (response.status === 200) {
        const data = response.data;
        if (data.query && data.query.tokens && data.query.tokens.csrftoken) {
            console.log(data.query.tokens.csrftoken);
            return data.query.tokens.csrftoken;
        }
        console.error("Response to CSRF request", data);
    }
    console.error("Failed to get a CSRF token for upload.");
    return;
}

async function downloadWithFinnaId(finnaId) {
    //only finna is allowed rightnow
    var params = {
        id: finnaId,
        format: "json",
        "field[0]": "id",
        "field[1]": "imagesExtended",
    };
    const requestConfig = {
        baseURL: "https://api.finna.fi/v1/record",
        method: "get",
        responseType: "json",
        params: params
    };
    const response = await axios.request(requestConfig);
    var downloadURL = "" , filename = "";
    if (response.data.records){
        console.log(response.data.records[0].imagesExtended);
        let imagesExtendedContent = response.data.records[0].imagesExtended[response.data.records[0].imagesExtended.length - 1];
        let displayImage = imagesExtendedContent.urls.large ? imagesExtendedContent.urls.large : imagesExtendedContent.urls.medium;
        downloadURL = "https://api.finna.fi" + displayImage;
        if (imagesExtendedContent.highResolution){
            let highResolution = imagesExtendedContent.highResolution;
            if (highResolution.original) {
                downloadURL = highResolution.original[highResolution.original.length - 1].url;
            }
            else if (highResolution.master) {
                downloadURL = highResolution.master[highResolution.master.length - 1].url;
            }
        }
        else if (imagesExtendedContent.urls.master) {
            downloadURL = imagesExtendedContent.urls.master;
        }
        console.log(downloadURL);
    }
   
    filename = await getFilenameWithFinnaId(finnaId);
    console.log(filename);
    if (downloadURL && filename){
        console.log("Starting", downloadURL);
        const response = await axios.get(downloadURL, { responseType: "stream" });
        console.log("Piping to", filename);
        const writeStream = fs.createWriteStream(filename);
        response.data.pipe(writeStream);
        await once(writeStream, 'finish');
        return;
    }
    else{
        console.log("Download not allowed, please check download url is from finna.");
        return "Download not allowed, please check download url is from finna.";
    }

}

// This is a helper function that generate the image filename with its finna Id.
async function getFilenameWithFinnaId(finnaId) {
    var params = {
        id: finnaId,
        format: "json",
        "field[0]": "id",
        "field[1]": "title",
        "field[2]": 'nonPresenterAuthors',
        "field[3]": 'year',
    };
    const requestConfig = {
        baseURL: "https://api.finna.fi/v1/record",
        method: "get",
        responseType: "json",
        params: params
    };
    const response = await axios.request(requestConfig);
    var title = [];
    var creator = "";
    var date = "";
    var filename = "";
    console.log(response.data.records[0]);
    if (response.data.records[0].title) {
        title.push(response.data.records[0].title);
        // need more special character transformation
        title = title[0]
            .replace(/[\.\-\s\<\>]/gi, " ")
            .replace(/[\s]{2,}/gi, " ")
            .replace(/[\s]$/, "");
            console.log(title);
        filename = title.charAt(0).toUpperCase() + title.slice(1);
    }
    if (response.data.records[0].nonPresenterAuthors[0]) {
        creator = response.data.records[0].nonPresenterAuthors[0].name
            .split(", ")
            .reverse()
            .join(" ")
            .replace(/[\.\-\s\<\>]/gi, " ");
        filename += "_by_" + creator;
        }
    if (response.data.records[0].year) {
        date = parseInt(response.data.records[0].year, 10);
        date = date != "" && date != null ? date : "";
        filename += "_" + date;
    }
    filename = filename.replace(/\s/g, "_");
    return filename;
}

async function uploadWithFinnaId(csrf_token, access_token, finnaId, text) {
    // check the filename with finna id
    filename = await getFilenameWithFinnaId(finnaId);
    var params = {
        action: "upload",
        filename: filename,
        ignorewarnings: "1",
        token: csrf_token,
        format: "json",
        text: text,
        comment: `Uploaded with Wikidocumentaries from https://finna.fi/Record/${finnaId}`,
    };

    console.log("in upload")
    console.log(filename)
    var file = { file: fs.createReadStream(filename) };
    var formData = Object.assign( {}, params, file );

    return new Promise((resolve) => {
        request.post({ url: url, headers: {"Authorization": 'Bearer ' + access_token}, formData: formData }, 
        (error, response, body) => {
            return resolve(JSON.parse(response.body));
        });
  });
}

async function deleteFileWithFinnaId(finnaId){
    //get filename from finna and then delete
    filename = await getFilenameWithFinnaId(finnaId);
    console.log("start delete");
        fs.unlink(filename, err => {
            if (err) console.log(err);
            else{
                console.log('Deleted file:');
                console.log(filename);
            }
        });
}

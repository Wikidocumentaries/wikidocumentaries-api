const axios = require('axios');
var fs = require('fs'),
request = require('request').defaults({jar: true}),
url = "https://commons.wikimedia.org/w/api.php";
const { once } = require('events');

module.exports = {
    upload,
    getCsrfToken
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
        console.log(response.data.query.tokens.csrftoken)
        return response.data.query.tokens.csrftoken;

    }
    return;
}

async function upload(csrf_token, access_token,filename, text, downloadURL) {

    async function download(url, filename) {
        console.log("Starting", url);
        const response = await axios.get(url, { responseType: "stream" });
        console.log("Piping to", filename);
        const writeStream = fs.createWriteStream(filename);
        response.data.pipe(writeStream);
        await once(writeStream, 'finish');
        console.log("Done");
    }
       
    await download(downloadURL, filename);

    var params = {
        action: "upload",
        filename: filename,
        ignorewarnings: "1",
        token: csrf_token,
        format: "json",
        text: text
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
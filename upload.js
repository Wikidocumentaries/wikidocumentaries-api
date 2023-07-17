var fs = require('fs'),
    request = require('request').defaults({jar: true}),
    url = "https://commons.wikimedia.org/w/api.php";

    module.exports = {
        upload,
        getCsrfToken
    };

// Step 1: GET request to fetch login token
function getLoginToken() {
    var params_0 = {
        action: "query",
        meta: "tokens",
        type: "login",
        format: "json"
    };

    request.get({ url: url, qs: params_0 }, function (error, res, body) {
        if (error) {
            console.log("getLoginToken error");
            return;
        }
        var data = JSON.parse(body);
        console.log(1);
        console.log(data.query.tokens.logintoken);
        loginRequest(data.query.tokens.logintoken);
    });
}

// Step 2: POST request to log in. 
// Use of main account for login is not
// supported. Obtain credentials via Special:BotPasswords
// (https://www.mediawiki.org/wiki/Special:BotPasswords) for lgname & lgpassword
//The new password to log in with Zexi.gong721@abcd is u8fv58pjgqtdv33e4e6d27ua9jc0g8at. Please record this for future reference.
// (For old bots which require the login name to be the same as the eventual username, you can also use Zexi.gong721 as username and abcd@u8fv58pjgqtdv33e4e6d27ua9jc0g8at as password.)
function loginRequest(login_token) {
    var params_1 = {
        action: "login",
        lgname: "Zexi.gong721",
        lgpassword: "abcd@u8fv58pjgqtdv33e4e6d27ua9jc0g8at",
        lgtoken: login_token,
        format: "json"
    };

    request.post({ url: url, form: params_1 }, function (error, res, body) {
        if (error) {
            console.log("loginRequest error");
            return;
        }
        console.log(2);
        var data = JSON.parse(body);
        console.log(data);
        getCsrfToken();
    });
}

// Step 3: GET request to fetch CSRF token
function getCsrfToken(access_token) {
    var fs = require('fs'),
    request = require('request').defaults({jar: true}),
    url = "https://commons.wikimedia.org/w/api.php";
    var params_2 = {
        action: "query",
        meta: "tokens",
        format: "json"
    };

    request.get({     url: url,    headers: {
        "Authorization": 'Bearer ' + access_token
      }, qs: params_2 }, function(error, res, body) {
        if (error) {
            console.log("getCsrfToken error")
            return;
        }
        var data = JSON.parse(body);
        console.log(3);
        console.log(data);
        upload(data.query.tokens.csrftoken, access_token);
    });
}

// Step 4: POST request to upload a file directly
function upload(csrf_token, access_token) {
    var fs = require('fs'),
    request = require('request').defaults({jar: true}),
    url = "https://commons.wikimedia.org/w/api.php";
    var params_3 = {
        action: "upload",
        filename: "Mona_Lisa.jpg",
        ignorewarnings: "1",
        token: csrf_token,
        
        format: "json",
        text: "[[Category:Images uploaded from Wikidocumentaries]]"
    };

    var file = {
        file: fs.createReadStream('Mona_Lisa.jpg')
    };
console.log(file);
    var formData = Object.assign( {}, params_3, file );

    request.post({ url: url, headers: {
        "Authorization": 'Bearer ' + access_token
      },formData: formData }, function (error, res, body) {
        console.log(body);
        body = JSON.parse(body);
        console.log(body);
        if (error) {
            console.log('error');
            return;
        }
        else if (body.result === "Success"){
            console.log("File Uploaded :)");
        }
    });
}

// Start From Step 1
// getLoginToken();
// getCsrfToken();
// upload("5c512ff3bd496288e97097e59bc474aa649b120b+\\");

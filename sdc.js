var fs = require('fs'),
    request = require('request').defaults({jar: true}),
    url = "https://commons.wikimedia.org/w/api.php";

    function getCsrfToken() {
        var access_token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIyY2Y3ZjMyZGFkODljMzMxODYzYzFmYzNhNTI0NjNiMCIsImp0aSI6ImMwNWQ1YzliNDAwNDU2ZTRhNmI2YzNkZWRlZWU4NjVlMWJjZTVmMzBjNmI1NWUzZjBiMTAyYzBjZGZkOTA5MTAwZDEyODBhZGZhZjhkZDMxIiwiaWF0IjoxNjg4OTQ0NzE1LjIyNzM4NSwibmJmIjoxNjg4OTQ0NzE1LjIyNzM4OCwiZXhwIjozMzI0NTg1MzUxNS4yMjI4OTMsInN1YiI6IjcyOTEzNDYyIiwiaXNzIjoiaHR0cHM6Ly9tZXRhLndpa2ltZWRpYS5vcmciLCJyYXRlbGltaXQiOnsicmVxdWVzdHNfcGVyX3VuaXQiOjUwMDAsInVuaXQiOiJIT1VSIn0sInNjb3BlcyI6WyJiYXNpYyIsImVkaXRwYWdlIiwiZWRpdG15Y3NzanMiLCJlZGl0bXlvcHRpb25zIiwiZWRpdGludGVyZmFjZSIsImVkaXRzaXRlY29uZmlnIiwiY3JlYXRlZWRpdG1vdmVwYWdlIiwidXBsb2FkZmlsZSIsInVwbG9hZGVkaXRtb3ZlZmlsZSJdfQ.s0ogB5NFmdri4scCoDHupx3iSnw68_6ntaBaoqRo7L8MHE5k0zoB-LmQFcrJbF0mv2KLXHom2zjOuMIDs4vyLnYPSd4-ZOuDzKfViir6GrbQjqDqkSkfuBPDt5P-mIiLknYEnesqbontLd_u1pdOr0DBttEKBx1WSvJ_0s5v9G_uX7UfsbUxPmmmiu2IekAIA-HT8iRy94ukvtgeTrCC_rzxx2S5HEakq-OpHWgySEZH0SRLVxv5RMCNo9PYQtMDw9sREfS2YWWmZYRSkEgJaygHygDxyxKgj9yuR7HRvXs0czjTSVJ2RoL228aomjgCE7whi1tjZrZ0P9Pr6YZ4eCgPB1gy0ZVTeE2yUuyeF7D0cLZEMMroZSgBtK76zJBhLdWZ6uCgC9jBsdrNR5TWSLAzWd8YD27FZRV54mTrpI-bsGpl53Qqtu6jQDjmyyNFo5TrPfJKmlgNsRvHp7Q9I0xMXYssNUGWUqARQT-jMjms4nUD5YD-xBXPZ7lmWZfHe7tR1SMu3xQsOKqG5I2iOX1Bc7SXWAu0f3I8opwQTU1Uv9hxLoZtRqzmOXcKkynwKRroWikNfzeaeNFpJYha6ji2snDWPJ20zma-ZbVxXlxZ7kr1HSSVUWa_RzbcmJ1f-wm1izLg2SIv0C36ODjPvj4hHqB0XN81nyitx9p9DOE";
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
            sdc(data.query.tokens.csrftoken, access_token);
        });
    }

    function sdc(csrftoken, access_token){
        var params_3 = {
            action: "wbgetentities",
            token: csrftoken,
            format: "json",
            ids: "M134309660"
        };
        request.post({ url: url, headers: {
            "Authorization": 'Bearer ' + access_token
          },qs: params_3 }, function (error, res, body) {
            console.log(body);
            body = JSON.parse(body);
            console.log(body);
        });
    }

    getCsrfToken();
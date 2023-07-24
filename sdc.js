const axios = require('axios');
var fs = require('fs'),
    request = require('request').defaults({jar: true}),
    url = "https://commons.wikimedia.org/w/api.php";

module.exports = {
    getPageID,
    depict
};

async function getPageID(title){
    var params = {
        action: "query",
        titles: title,
        format: "json"
    };

    return new Promise((resolve) => {
        request.get({ url: url, qs: params}, 
        (error, response, body) => {
            var body = JSON.parse(body);
            if(body.query.pages){
                return resolve(body.query.pages[Object.keys(body.query.pages)[0]].pageid);
            }
            return "";
        });
  });
}

async function depict(csrftoken, access_token, MID, depictId){
    console.log(MID);
    console.log(depictId);

    let value = {'entity-type':'item',id: depictId} ;
    let data = {claims:[{mainsnak:{snaktype:"value",property:'P180',datavalue:{value:value,type:'wikibase-entityid'}},type:"statement",rank:"normal"}]} ;
    var paramsForDepicts = {
        action : 'wbeditentity',
        format :'json',
        id : MID,
        data : JSON.stringify(data),
        summary : '#wikidocumentaries',
        token : csrftoken,
        };
        const requestConfig = {
            baseURL: url,
            method: "post",
            responseType: "json",
            headers: {
                "Authorization": 'Bearer ' + access_token,
               "content-type": "application/json"
            },
            body: JSON.stringify(paramsForDepicts)
        };
        const response = await axios.request(requestConfig);
        if (response.status === 200) {
            console.log(response.data)
            return response.data;
        }
        return;

    // return new Promise((resolve) => {
    //     request.post({ url: url, headers: {
    //         "Authorization": 'Bearer ' + access_token
    //         },qs: paramsForDepicts, body:{"token" : csrftoken}, json: true}, 
    //     (error, response, body) => {
    //         return resolve(response);
    //     });
    // });
    
}
////////////////////////////////////////////////////////////////////////////////////////////


// request.post({ url: url, headers: {
//     "Authorization": 'Bearer ' + access_token
//     },qs: paramsForDepicts, body:{"token" : csrftoken}}, function (error, res, body) {
//     console.log('Depict response')
//     body = JSON.parse(body);
//     console.log(body);
// });

// return request.post({ url: url, headers: {
//     "Authorization": 'Bearer ' + access_token
//     },body:{ "token" : csrftoken},qs: paramsForDepicts, json: true}, function (error, res, body) {
//     console.log('Depict response')
//     console.log(body);
// });    

// request.get({     url: url,  qs: params }, function(error, res, body) {
//     if (error) {
//         console.log("error")
//         return;
//     }
//     var data = JSON.parse(body);
//     console.log(data.query.pages[Object.keys(data.query.pages)[0]].pageid)
//     let pageID = data.query.pages[Object.keys(data.query.pages)[0]].pageid;
//     var MID = `M${pageID}`;
//     console.log(MID);
// });
    // getCsrfToken1();
// getPageID();
// var params_3 = {
//     action: "wbgetentities",
//     token: csrftoken,
//     format: "json",
//     ids: MID
// };
// request.post({ url: url, form: params_3,headers: {
//     "Authorization": 'Bearer ' + access_token
//   }}, function (error, res, body) {

// console.log(4);
// body = JSON.parse(body);
// console.log(body);
// }); 

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
        var params_2 = {
            action: "query",
            meta: "tokens",
            format: "json"
        };
    
        request.get({     url: url, qs: params_2 }, function(error, res, body) {
            if (error) {
                console.log("getCsrfToken error")
                return;
            }
            var data = JSON.parse(body);
            console.log(3);
            console.log(data);
            sdc(data.query.tokens.csrftoken);
        });
    }
    // getLoginToken();

    // function get_token( callback ) {
    //     $.post ( 'https://commons.wikimedia.org/w/api.php' , {
    //         action : 'query' ,
    //         meta : 'tokens' ,
    //         format : 'json' ,
    //     } , function ( d ) {
    //         callback(d.query.tokens.csrftoken);
    //     } ) ;
    // } 

    // get_token ( function ( token ) {
    //     let value = {'entity-type':'item',id: 'Q80151'} ;
	// 	let data = {claims:[{mainsnak:{snaktype:"value",property:'P180',datavalue:{value:value,type:'wikibase-entityid'}},type:"statement",rank:"normal"}]} ;
    //     let params = {
    //         action:'wbeditentity',
    //         id:"M134309660",
    //         data:JSON.stringify(data),
    //         token:token,
    //         summary:"summary",
    //         format:'json'
    //     } ;
    //     $.post('/w/api.php',params,function(d){
    //         callback(true);
    //     },'json');
    // } );
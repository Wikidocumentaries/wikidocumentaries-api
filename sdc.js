// The sdc.js provides utility functions for making structure data with Wikimedia Commons API.
// It includes functions to fetch a page's ID and depict an item.
var request = require('request').defaults({jar: true}),
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
        };

    await request.post({ url: url, headers: {
    "Authorization": 'Bearer ' + access_token,
    "Content-type": "application/x-www-form-urlencoded"
    }, body:"token=" + encodeURIComponent(csrftoken), qs: paramsForDepicts}, function (error, res, body) {
    console.log('Depict response')
    console.log(body);
    });    
    return "";
}
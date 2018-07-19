const express = require('express')
const app = express()
const axios = require('axios')

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

app.get('/wiki', function(req, res) {

    var topic = req.query.topic;
    console.log(topic);

    var wikipediaSummaryPromise = function() { 

        var requestConfig = {
            baseURL: "https://fi.wikipedia.org/api/rest_v1/",
            url: "/page/summary/" + topic,
            method: "get",
            responseType: 'json',
            headers: {
                'Api-User-Agent': process.env.WIKIDOCUMENTARIES_API_USER_AGENT
            },
        };

        return axios.request(requestConfig);
    };

    // var wikipediaHTMLPromise = function() { 

    //     var requestConfig = {
    //         baseURL: "https://fi.wikipedia.org/api/rest_v1/",
    //         url: "/page/mobile-sections/" + topic,
    //         method: "get",
    //         responseType: 'json',
    //         headers: {
    //             'Api-User-Agent': process.env.WIKIDOCUMENTARIES_API_USER_AGENT
    //         },
    //     };

    //     return axios.request(requestConfig);
    // };

    var wikidataItemIDPromise = function () {
        
        var requestConfig = {
            baseURL: "https://fi.wikipedia.org/w/api.php",
            method: "get",
            responseType: 'json',
            headers: {
                'Api-User-Agent': process.env.WIKIDOCUMENTARIES_API_USER_AGENT
            },
            params: {
                action: "query",
                prop: "pageprops",
                ppprop: "wikibase_item",
                redirects: "resolve",
                titles: topic,
                format: "json"
            }
        }

        return axios.request(requestConfig).then((response) => {

            var pages = Object.keys(response.data.query.pages).map(function(e) {
                return response.data.query.pages[e];
            })
            //console.log(pages);

            if (pages[0].pageprops != undefined && pages[0].pageprops.wikibase_item) {

                var requestConfig = {
                    baseURL: "https://www.wikidata.org/w/api.php",
                    method: "get",
                    responseType: 'json',
                    headers: {
                        'Api-User-Agent': process.env.WIKIDOCUMENTARIES_API_USER_AGENT
                    },
                    params: {
                        action: "wbgetclaims",
                        entity: pages[0].pageprops.wikibase_item,
                        format: "json"
                    }
                }
                return axios.request(requestConfig); 
            }
            else {
                return { data: null };
            }
        });
    };

    axios.all([wikipediaSummaryPromise(), wikidataItemIDPromise() ]).then(axios.spread(function (wikipediaSummaryResponse, wikidataItemIDResponse) {
        //console.log(wikipediaSummaryResponse.data);
        var data = {
            wikipedia: wikipediaSummaryResponse.data,
            wikidata: wikidataItemIDResponse.data
        }
        res.send(data);
    })).catch(function (error) {
        console.log(error);
    });
});

app.listen(3000, () => console.log('Listening on port 3000'));

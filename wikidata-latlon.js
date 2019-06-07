const axios = require('axios');


module.exports = {
    getWikidataByLatLon,
};


async function getWikidataByLatLon(lat, lon, radius, language, topic) {
    const requestConfig = {
        baseURL: 'https://query.wikidata.org/',
        url: '/bigdata/namespace/wdq/sparql?query=SELECT%3Fitem(SAMPLE(%3Fitem_label)as%3Flabel)(SAMPLE(%3Flocation)as%3Flocation)WHERE%7BSERVICE%20wikibase%3Aaround%7B%3Fitem%20wdt%3AP625%3Flocation.bd%3AserviceParam%20wikibase%3Acenter"Point(' + lon + '%20' + lat + ')"%5E%5Egeo%3AwktLiteral.%20bd%3AserviceParam%20wikibase%3Aradius"' + radius / 1000 + '".%7DOPTIONAL%7B%3Fitem%20rdfs%3Alabel%3Fitem_label.%7D%7DGROUP%20BY%20%3Fitem',
        timeout: 20000,
        method: 'get',
        params: {
            format: 'json'
        }
    };

    const response = await axios.request(requestConfig);

    // res.send(response.data);
    // return;

    let wikiItems = [];

    for(var i = 0; i < response.data.results.bindings.length; i++) {
        var index = response.data.results.bindings[i].item.value.lastIndexOf('/') + 1;
        var id = response.data.results.bindings[i].item.value.substring(index);
        var startIndex = response.data.results.bindings[i].location.value.indexOf('(') + 1;
        var endIndex = response.data.results.bindings[i].location.value.indexOf(')');
        var parts = response.data.results.bindings[i].location.value.substring(startIndex, endIndex).split(' ');
        var lat = parts[1];
        var lon = parts[0];

        wikiItems.push({
            id: id,
            title: response.data.results.bindings[i].label.value,
            lat: Number(lat),
            lon: Number(lon)
        });
    }

    let ids = [];

    for (var i = 0; i < wikiItems.length; i++) {
        ids.push(wikiItems[i].id);
    }

    if (ids.length == 0) {
        return [];
    }

    if (ids.length > 50) { // "Maximum number of values is 50" https://www.wikidata.org/w/api.php?action=help&modules=wbgetentities
        ids = ids.slice(0, 50);
    }

    ids = ids.join('|');

    const requestConfigGetEntities = {
        baseURL: "https://www.wikidata.org/w/api.php",
        method: "get",
        responseType: "json",
        headers: {
            "Api-User-Agent": process.env.WIKIDOCUMENTARIES_API_USER_AGENT
        },
        params: {
            action: "wbgetentities",
            ids: ids,
            props: "labels|sitelinks",
            languages: (language != "en" ? language + "|en" : "en"),
            format: "json"
        }
    };

    let items = [];

    const wikidataEntitiesResponse = await axios.request(requestConfigGetEntities);
    const entities = Object.keys(wikidataEntitiesResponse.data.entities).map(function(e) {
        return wikidataEntitiesResponse.data.entities[e];
    });
    for (var i = 0; i < wikiItems.length; i++) {
        for (var j = 0; j < entities.length; j++) {
            if (wikiItems[i].id == entities[j].id) {
                if (entities[j].sitelinks[language + 'wiki'] != undefined &&
                entities[j].sitelinks[language + 'wiki'].title == topic) {
                    // Do not include the topic item itself
                }
                else {
                    var item = {
                        title: wikiItems[i].title,
                        position: [wikiItems[i].lon, wikiItems[i].lat],
                        wikidata: entities[j]
                    };
                    items.push(item);
                }
                break;
            }
        }
    }

    return items;
}

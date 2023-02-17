const axios = require('axios');


module.exports = {
    getWikidata,
};


// language fallback list XXX hardcoded for now
const languageFallback = ["en", "fi", "sv", "es"];

// get a suitable localised value from languageMap based on locale and fallbacks
function getI18n(locale, languageMap) {
    if (!languageMap) {
        return languageMap; // pass on the same non-true value
    }
    if (languageMap[locale]) {
        return languageMap[locale];
    }
    for (var i = 0; i < languageFallback.length; i++) {
        if (languageMap[languageFallback[i]]) {
            return languageMap[languageFallback[i]];
        }
    }
    if (languageMap["en"]) {
        return languageMap["en"];
    }
    return Object.values(languageMap)[0];
}

// get suitable localised keys from languageMap based on locale and fallbacks
// postfix - appended to locale codes to get a key, e.g. "en" -> "enwiki"
function getI18nKeys(locale, languageMap, postfix) {
    var result = [];
    const fallbackKeys = languageFallback.map(language => language+postfix);
    if (languageMap[locale+postfix]) {
        result.push(locale+postfix);
    }
    for (var i = 0; i < languageFallback.length; i++) {
        if (languageFallback[i] == locale) {
            continue; // skip this as it was already included
        }
        if (languageMap[languageFallback[i]+postfix]) {
            result.push(languageFallback[i]+postfix);
        }
    }

/* Don't add English twice as long as it's in the fallback list anyway
    if (languageMap["en"+postfix]) {
        result.push("en"+postfix);
    }
*/

    // List all the remaining languages for which content is available
    for (var key in languageMap) {
        if (key != locale+postfix && !fallbackKeys.includes(key)) {
            result.push(key);
        }
    }

/* No need for this as long as all languages are included above
    if (!result) {
        result.push(Object.keys(languageMap)[0]);
    }
*/
    return result;
}


async function getWikidata(wikidataItemID, language) {
    const requestConfig = {
        baseURL: "https://www.wikidata.org/w/api.php",
        method: "get",
        responseType: "json",
        headers: {
            "Api-User-Agent": process.env.WIKIDOCUMENTARIES_API_USER_AGENT
        },
        params: {
            action: "wbgetentities",
            ids: wikidataItemID,
            format: "json"
        }
    };
    const response = await axios.request(requestConfig);

    const wikidataRaw = response.data.entities && response.data.entities[wikidataItemID];

    // combineResults:

    let topic="";
    let wikidatatitle="";
    let wikidatadescription="";
    let wikidataaliases=[];
    function getOrNull(object, field) {
        return object && object[field];
    }
    if (wikidataRaw) {
        topic = getOrNull(getOrNull(wikidataRaw.sitelinks, language + "wiki"), "title");
        wikidatatitle = getOrNull(getI18n(language, wikidataRaw.labels), "value");
        wikidatadescription = getOrNull(getI18n(language, wikidataRaw.descriptions), "value");
        wikidataaliases = wikidataRaw.aliases;
    }

    if (!wikidataRaw || !wikidataRaw.claims
        || !Object.keys(wikidataRaw.claims).length) {
        // no Wikidata item associated with the Wikipedia item
        return {
            topic: null,
            wikidata: null,
        };
    }

    const sitelinks = wikidataRaw.sitelinks;

    const claims = Object.keys(wikidataRaw.claims).map(function(e) {
        return wikidataRaw.claims[e];
    });

    // alias used below
    const responseData = {
        wikidataRaw: claims,
    };

    let ids = [];

    claims.forEach((claim) => {
        claim.forEach(statement => {
            if (statement.mainsnak.snaktype == "value") {
                if (ids.indexOf(statement.mainsnak.property) == -1) {
                    ids.push(statement.mainsnak.property);
                }
                if (statement.mainsnak.datavalue.type == "wikibase-entityid") {
                    if (ids.indexOf(statement.mainsnak.datavalue.value.id) == -1) {
                        ids.push(statement.mainsnak.datavalue.value.id);
                    }
                }
                else if (statement.mainsnak.datavalue.type == "quantity" && statement.mainsnak.datavalue.value.unit.indexOf("/entity/Q") != -1) {
                    var index = statement.mainsnak.datavalue.value.unit.lastIndexOf('/') + 1;
                    var id = statement.mainsnak.datavalue.value.unit.substring(index);
                    if (ids.indexOf(id) == -1) {
                        ids.push(id);
                    }
                }
            }
            if (statement.qualifiers != undefined) {
                var qualifiers = Object.keys(statement.qualifiers).map(function(e) {
                    return statement.qualifiers[e];
                });
                qualifiers.forEach(qualifier => {
                    if (ids.indexOf(qualifier[0].property) == -1) {
                        ids.push(qualifier[0].property);
                    }
                    if (qualifier[0].snaktype == "value" && qualifier[0].datavalue.type == "wikibase-entityid") {
                        if (ids.indexOf(qualifier[0].datavalue.value.id) == -1) {
                            ids.push(qualifier[0].datavalue.value.id);
                        }
                    }
                });
            }
        });
    });

    const entities = await collectWikidataInfo(ids, language);

    const translations =
        getI18nKeys(language, sitelinks, "wiki")
        .map(key => sitelinks[key])
        .filter(sitelink => sitelink.site.endsWith('wiki'))
        .filter(sitelink => !['commonswiki', 'specieswiki'].includes(sitelink.site));

    let wikidata = {
        id: wikidataItemID,
        title: wikidatatitle,
        description: wikidatadescription,
        aliases: wikidataaliases,
        instance_of: {
            id: null,
            value: null,
            url: 'https://www.wikidata.org/wiki/'
        },
        statements: [],
        geo: {
            lat: null,
            lon: null,
        },
        dates : [],
        sitelinks: translations,
    };

    for (var i = 0; i < responseData.wikidataRaw.length; i++) {
        var statement = {
            id: null,
            label: null,
            values: []
        };


        for (var j = 0; j < responseData.wikidataRaw[i].length; j++) {
            var mainsnak = responseData.wikidataRaw[i][j].mainsnak;

            if (statement.id == null) {
                statement.id = mainsnak.property;
            }
            if (statement.label == null) {
                statement.label = findLabel(entities, mainsnak.property, language);
            }

            var valueWasAdded = true;

            if (mainsnak.snaktype == "value") {
                if (mainsnak.property == 'P31') { // instance_of
                    if (mainsnak.datavalue.type == "wikibase-entityid") {
                        for (var k = 0; k < entities.length; k++) {
                            if (entities[k].id == mainsnak.datavalue.value.id) {
                                label = entities[k].labels[language] != undefined ? entities[k].labels[language].value : "";
                                if (label == "") {
                                    label = entities[k].labels.en != undefined ? entities[k].labels.en.value : "";
                                }
                                if (wikidata.instance_of.id == null) { // The first instance of definition
                                    wikidata.instance_of.value = label;
                                    wikidata.instance_of.id = entities[k].id;
                                    wikidata.instance_of.url += entities[k].id;
                                }
                                var value = {
                                    value: label,
                                    url: 'https://www.wikidata.org/wiki/' + entities[k].id
                                }
                                statement.values.push(value);
                                break;
                            }
                        }
                    }
                    else {
                        // TODO ?
                    }
                }
                else if (mainsnak.property == 'P625') { // coordinates
                    var value = {
                        value: mainsnak.datavalue.value.latitude + ", " + mainsnak.datavalue.value.longitude,
                        url: 'https://tools.wmflabs.org/geohack/geohack.php?params=' + mainsnak.datavalue.value.latitude + '_N_' + mainsnak.datavalue.value.longitude + '_E_globe:earth&language=' + language
                    }

                    statement.values.push(value);

                    wikidata.geo.lat = mainsnak.datavalue.value.latitude;
                    wikidata.geo.lon = mainsnak.datavalue.value.longitude;
                }
                else if (mainsnak.property == 'P373') { // commons class
                    var value = {
                        value: mainsnak.datavalue.value,
                        url: 'https://commons.wikimedia.org/wiki/Category:' + mainsnak.datavalue.value.split(' ').join('_')
                    }

                    statement.values.push(value);
                }
                else if (mainsnak.property == 'P18') { // commons media
                    var value = {
                        value: mainsnak.datavalue.value,
                        url: 'https://commons.wikimedia.org/wiki/File:' + mainsnak.datavalue.value.split(' ').join('_')
                    }

                    statement.values.push(value);
                }
                else if (mainsnak.datavalue.type == "string") {
                    var value = {
                        value: mainsnak.datavalue.value,
                        url: null
                    }

                    if (mainsnak.property == 'P856' && mainsnak.datavalue.value.indexOf('http') == 0) { // official website
                        value.url = mainsnak.datavalue.value;
                        value.value = value.value.substring(value.value.indexOf('/') + 2);
                    }

                    statement.values.push(value);
                }
                else if (mainsnak.datavalue.type == "wikibase-entityid") {
                    var value = {
                        value: null,
                        url: 'https://www.wikidata.org/wiki/' + mainsnak.datavalue.value.id,
                        id: mainsnak.datavalue.value.id,
                        sitelinks: {}
                    }

                    for (var k = 0; k < entities.length; k++) {
                        if (entities[k].id == mainsnak.datavalue.value.id) {
                            var entity = entities[k];

                            if (entity.sitelinks != undefined) {
                                if (entity.sitelinks[language + 'wiki'] != undefined) {
                                    value.sitelinks[language + 'wiki'] =
                                        entity.sitelinks[language + 'wiki'].title;
                                }
                                if (language != 'en' && entity.sitelinks.enwiki != undefined) {
                                    value.sitelinks.enwiki =
                                        entity.sitelinks.enwiki.title;
                                }
                            }

                            break;
                        }
                    }

                    value.value = findLabel(entities, mainsnak.datavalue.value.id, language);

                    statement.values.push(value);
                }
                else if (mainsnak.datavalue.type == "time") {

                    // See also: https://www.wikidata.org/wiki/Help:Dates

                    const dateString = getFormattedDateString(mainsnak.datavalue.value, language);
                    //var date = new Date(timeString);

                    var value = {
                        value: dateString,
                        url: null
                    }

                    statement.values.push(value);

                    var dateItem = {
                        wikidata_property: mainsnak.property,
                        value: mainsnak.datavalue.value,
                        label: statement.label
                    }
                    wikidata.dates.push(dateItem);
                }
                else if (mainsnak.datavalue.type == "quantity") {

                    var value = {
                        value: Number(mainsnak.datavalue.value.amount),
                        url: null
                    }

                    if (mainsnak.datavalue.value.unit.indexOf("/entity/Q") != -1) {
                        var index = mainsnak.datavalue.value.unit.lastIndexOf('/') + 1;
                        var id = mainsnak.datavalue.value.unit.substring(index);
                        var label = findLabel(entities, id, language);
                        value.unit = label;
                    }

                    statement.values.push(value);
                }
                else if (mainsnak.datavalue.type == "monolingualtext") {
                    var value = {
                        value: mainsnak.datavalue.value.text,
                        url: null
                    }

                    statement.values.push(value);
                }
                else {
                    // TODO
                    console.log("unhandled entity:", mainsnak);
                    valueWasAdded = false;
                }

                if (valueWasAdded && responseData.wikidataRaw[i][j].qualifiers != undefined) {
                    statement.values[statement.values.length -1].qualifiers = [];

                    var qualifiers = Object.keys(responseData.wikidataRaw[i][j].qualifiers).map(function(e) {
                        return responseData.wikidataRaw[i][j].qualifiers[e];
                    });

                    qualifiers.forEach(qualifier => {
                        if (qualifier[0].snaktype == "value") {

                            var q = {
                                value: null,
                                label: null,
                                url: null
                            }

                            q.label = findLabel(entities, qualifier[0].property, language);

                            if (qualifier[0].datavalue.type == "string") {
                                q.value = qualifier[0].datavalue.value;
                            }
                            else if(qualifier[0].datavalue.type == "time") {
                                q.value = getFormattedDateString(qualifier[0].datavalue.value, language);
                            }
                            else if (qualifier[0].datavalue.type == "wikibase-entityid") {
                                q.url = 'https://www.wikidata.org/wiki/' + qualifier[0].datavalue.value.id;

                                q.value = findLabel(entities, qualifier[0].datavalue.value.id, language);
                            }
                            else if (qualifier[0].datavalue.type == "quantity") {
                                q.value = Number(qualifier[0].datavalue.value.amount);
                            }
                            else if (qualifier[0].datavalue.type == "monolingualtext") {
                                q.value = qualifier[0].datavalue.value.text;
                            }
                            else {
                                // TODO
                                console.log("unhandled qualifier:", qualifier);
                            }

                            if (q.value != null) {
                                statement.values[statement.values.length -1].qualifiers.push(q);
                            }
                        }
                    });
                }
            }
        }

        if (statement.id != null && statement.label != null && statement.values.length > 0) {
            wikidata.statements.push(statement);
        }
    }

    return {
        topic,
        wikidata,
    };
}

// Try to find a label in language (or English) for entity with id within entities
// Return the first found: label in language, label in English, id within entities, empty string
const findLabel = function (entities, id, language) {
    for (let j = 0; j < entities.length; j++) {
        if (entities[j].id === id) {
            const labels = entities[j].labels;
            let label = labels && labels[language] && labels[language].value;
            if (!label) {
                label = labels && labels["en"] && labels["en"].value;
            }
            if (!label) {
                label = id;
            }
            return label;
        }
    }

    return "";
}

const collectWikidataInfo = async function(allIDs, language) {
    var index = 0;
    var parts = [];
    while (index < allIDs.length) {
        var part = allIDs.slice(index, index + 50);
        parts.push(part);
        index += 50;
    }

    var allEntities = [];

    for (var i = 0; i < parts.length; i++) {
        const ids = parts[i].join('|');

        const requestConfig = {
            baseURL: "https://www.wikidata.org/w/api.php",
            method: "get",
            responseType: "json",
            headers: {
                'Api-User-Agent': process.env.WIKIDOCUMENTARIES_API_USER_AGENT
            },
            params: {
                action: "wbgetentities",
                ids: ids,
                props: "labels|sitelinks|descriptions|aliases",
                languages: (language != "en" ? language + "|en" : "en"),
                format: "json"
            }
        }

        const wikidataEntitiesResponse = await axios.request(requestConfig);

        const entities = Object.keys(wikidataEntitiesResponse.data.entities).map(function(e) {
            return wikidataEntitiesResponse.data.entities[e];
        });
        allEntities = allEntities.concat(entities);
    }

    return allEntities;
}


function getFormattedDateString(dateWikidataValue, language) {
    var timeString = dateWikidataValue.time;

    //timeString = "-0050-00-00T00:00:00Z";

    var year = parseInt((timeString.indexOf('-') != 0 ? timeString.substring(1, timeString.indexOf('-')) : timeString.substring(0, timeString.indexOf('-', 1))), 10);
    var month = parseInt(timeString.substr(6, 2));
    var day = parseInt(timeString.substr(9, 2));
    // var hour = parseInt(timeString.substr(12, 2));
    // var mintutes = parseInt(timeString.substr(15, 2));
    // var seconds = parseInt(timeString.substr(18, 2));

    var formattedDateString = "";

    switch (dateWikidataValue.precision) {
    case 11:
        var date = new Date();
        date.setFullYear(year, month - 1, day);
        // date.setHours(hour);
        // date.setMinutes(mintutes);
        // date.setSeconds(seconds);

        //var dateFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        formattedDateString = (year < 0 ? year + "-" + month + "-" + day : date.toLocaleDateString(language + "-" + language.toUpperCase()/*, dateFormatOptions*/));
        break;
    case 10:
        formattedDateString = year + "-" + month;
        break;
    case 9:
        formattedDateString = year.toString();
        break;
    case 8:
        formattedDateString = year + " - " + (year + 9);
        break;
    case 7:
        if (year % 100 == 0) {
            formattedDateString = (year - 99) + " - " + year;
        }
        else {
            formattedDateString = year + " - " + (year + 98);
        }
        break;
    case 6:
        formattedDateString = "~" + year;
        break;
    case 4:
    case 3:
    case 2:
    case 1:
    case 0:
        formattedDateString = year;
        break;
    default:
        formattedDateString = timeString;
    }

    return formattedDateString;
}

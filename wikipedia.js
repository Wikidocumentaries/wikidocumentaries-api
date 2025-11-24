const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
    findWikidataItemFromWikipedia,
    getWikipediaData,
};

async function findWikidataItemFromWikipedia(language, topic) {
    const requestConfig = {
        baseURL: "https://" + language + ".wikipedia.org/w/api.php",
        method: "get",
        responseType: "json",
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
    };

    const response = await axios.request(requestConfig);

    if (response.data.query)
    {
        const key = Object.keys(response.data.query.pages)[0];
        const page = response.data.query.pages[key];
        if (page["pageprops"] && page["pageprops"]["wikibase_item"]) {
            return page["pageprops"]["wikibase_item"];
        }
    }

    return null;
}

async function getWikipediaData(language, topic) {

    const encodedLanguage = language && encodeURIComponent(language);
    const encodedTopic = topic && encodeURIComponent(topic);

    const wikipediaSummaryPromise = function() {
        const requestConfig = {
            baseURL: "https://" + language + ".wikipedia.org/api/rest_v1/",
            url: "/page/summary/" + encodedTopic,
            method: "get",
            responseType: "json",
            headers: {
                "Api-User-Agent": process.env.WIKIDOCUMENTARIES_API_USER_AGENT
            },
        };
        if (!encodedTopic || !language) return "";
        else return axios.request(requestConfig);
    };

    const wikipediaHTMLPromise = function() {
        const requestConfig = {
            baseURL: "https://" + language + ".wikipedia.org/w/rest.php/v1/page/",
            url: encodedTopic + "/html",
            method: "get",
            responseType: "text",
            headers: {
                "Api-User-Agent": process.env.WIKIDOCUMENTARIES_API_USER_AGENT
            },
        };
        if (!encodedTopic || !language) return "";
        else return axios.request(requestConfig);
    };

    const [summaryRes, htmlRes] = await Promise.allSettled([
        wikipediaSummaryPromise(),
        wikipediaHTMLPromise()
    ]);

    const wikipediaSummaryResponse = summaryRes.status === "fulfilled" ? summaryRes.value : null;
    const wikipediaHTMLResponse = htmlRes.status === "fulfilled" ? htmlRes.value : null;

    let excerptHTML = "";
    let remainingHTML = null;

    if (wikipediaHTMLResponse && wikipediaHTMLResponse.data != null && typeof wikipediaHTMLResponse.data === 'string') {
        let rawHTML = wikipediaHTMLResponse.data;

        const bodyMatch = rawHTML.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        if (bodyMatch) {
            rawHTML = bodyMatch[1];
        }

        const splitIndex = rawHTML.search(/<h2[\s>]/i);
        const origHTML = splitIndex > -1 ? rawHTML.substring(0, splitIndex) : rawHTML;

        if (splitIndex > -1) {
            const remainingOrigHTML = rawHTML.substring(splitIndex);
            remainingHTML = convertToWikidocumentariesHTML(remainingOrigHTML, topic, language);
        }

        excerptHTML = convertToWikidocumentariesHTML(origHTML, topic, language);
    }

    return {
        wikipedia: wikipediaSummaryResponse ? wikipediaSummaryResponse.data : null,
        excerptHTML,
        remainingHTML,
    };
};

// Adapt Wikipedia's HTML to our needs
const convertToWikidocumentariesHTML = function(origHTML, topic, language) {
    const $ = cheerio.load(origHTML);

    // Convert links appropriately
    $("a").each(function() {
        const href = $(this).attr('href');
        if (!href) return;

        if (href.startsWith('/wiki')) {
            // A link to another page on the wiki
            const isFileLink = $(this).hasClass('mw-file-description');
            if (isFileLink || href.startsWith('/wiki/Special:')) {
                // Point special pages to the original wiki
                $(this).attr('href', 'https://' + language + '.wikipedia.org' + href);
                $(this).attr('target', '_blank');
                $(this).attr('class', 'extlink;');
            } else {
                // Point normal pages internally
                var noHashPart = href.split('#')[0];
                var internalPage = noHashPart.replace("/wiki/", "/wikipedia/" + language + "/");
                $(this).attr('href', internalPage + "?language=" + language);
            }
        }
        else if (href.indexOf('#cite_') == 0) {
            $(this).attr('href', 'https://' + language + '.wikipedia.org/wiki/' + topic + href);
            $(this).attr('target', '_blank');
            $(this).attr('class', 'extlink;');
        }
        else {
            //https://fi.wikipedia.org/wiki/Vapaamuurarin_hauta#cite_note-1
            $(this).attr('target', '_blank');
            $(this).attr('class', 'extlink;');
            //$(this).replaceWith($(this).html());
        }
    });

    $("table").each(function(index) { //Remove English Wikipedia infobox
        var div_class = $(this).attr('class');
        if (div_class != undefined && div_class.indexOf('infobox') != -1) {
            $(this).remove();
        }
    });
    $("table").each(function(index) { //Remove warning boxes
        var div_class = $(this).attr('class');
        if (div_class != undefined && div_class.indexOf('ambox') != -1) {
            $(this).remove();
        }
    });
    $("div").each(function(index) { //Remove French Wikipedia infobox
        var div_class = $(this).attr('class');
        if (div_class == undefined || div_class != 'infobox_v3') {
            $(this).remove();
        }
    });
    $("ul").each(function(index) {
        var div_class = $(this).attr('class');
        if (div_class != undefined && div_class.indexOf('gallery') != -1) {
            $(this).remove();
        }
    });

    return $.html();
};

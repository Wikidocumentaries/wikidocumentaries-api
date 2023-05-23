const oauth2 = require('./oauth2');
const buffer = require('buffer');

const axios = require('axios');
const cheerio = require('cheerio');
const { getImageFromPage } = require('./wikimedia-commons');

module.exports = {
    findWikidataItemFromWikipedia,
    getWikipediaData,
    getImageInfoFromWikipedia,
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

// input the title of an image, returns the first image item with metadata in the api results
async function getImageInfoFromWikipedia(language, titles) {

    // console.log(oauth2.ajax);
    // console.log(oauth2.startLogin());
    console.log(12121)
    titleString = titles.join("|");
    console.log(titleString)
    // There is a bug when title contains latin1 characters.
    // const latin1Buffer = buffer.transcode(Buffer.from(titleString), "utf8", "latin1");
    // const latin1TitleString = latin1Buffer.toString("latin1");
    // console.log(Buffer.from(titleString).toString("latin1"));
    

    var requestConfig = {
        baseURL: "https://" + language + ".wikipedia.org/w/api.php",
        method: "get",
        responseType: "json",
        headers: {
            'Api-User-Agent': process.env.WIKIDOCUMENTARIES_API_USER_AGENT
        },
        params: {
            action: "query",
            prop: "imageinfo",
            titles: titleString,
            format: "json",
            iiprop: "url|extmetadata",
            iiextmetadatalanguage: language,
        }
    };
    const response = await axios.request(requestConfig);
    if (response.data) {
        console.log(99999);
        console.log(response.data.query.pages[Object.keys(response.data.query.pages)[1]]["title"].replace(/\s/g, "_"));
        
        const page = response.data.query.pages[Object.keys(response.data.query.pages)[0]];
        return getImageFromPage(page, 'Wikipedia');
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
            baseURL: "https://" + language + ".wikipedia.org/api/rest_v1/",
            url: "/page/mobile-sections/" + encodedTopic,
            method: "get",
            responseType: "json",
            headers: {
                "Api-User-Agent": process.env.WIKIDOCUMENTARIES_API_USER_AGENT
            },
        };
        if (!encodedTopic || !language) return "";
        else return axios.request(requestConfig);
    };

    const [wikipediaSummaryResponse, wikipediaHTMLResponse]
        = await axios.all([wikipediaSummaryPromise(), wikipediaHTMLPromise()]);

    if (wikipediaHTMLResponse.data == undefined ) {
        // No wikipedia article
        excerptHTML="";
        remainingHTML=null;
    }
    else {
        var origHTML = wikipediaHTMLResponse.data.lead.sections[0].text;
        var remainingHTML = null;

        if (wikipediaHTMLResponse.data.lead.disambiguation != undefined && wikipediaHTMLResponse.data.lead.disambiguation == true) {
            wikipediaHTMLResponse.data.remaining.sections.forEach(section => {
                origHTML += section.text;
            });
        }
        else {
            var remainingOrigHTML = "";

            wikipediaHTMLResponse.data.remaining.sections.forEach(section => {
                if (section.isReferenceSection == undefined) {
                    var sectionHeaderStartTag = "";
                    var sectionHeaderEndTag = "";
                    switch(section.toclevel) {
                    case 1:
                        sectionHeaderStartTag = "<h2 class='h2'>";
                        sectionHeaderEndTag = "</h2>";
                        break;
                    case 2:
                        sectionHeaderStartTag = "<h3 class='h3'>";
                        sectionHeaderEndTag = "</h3>";
                        break;
                    case 3:
                        sectionHeaderStartTag = "<h4 class='h4'>";
                        sectionHeaderEndTag = "</h4>";
                        break;
                    case 4:
                        sectionHeaderStartTag = "<h5 class='h5'>";
                        sectionHeaderEndTag = "</h5>";
                        break;
                    }
                    remainingOrigHTML += sectionHeaderStartTag + section.line + sectionHeaderEndTag;
                    remainingOrigHTML += section.text;
                }
            });

/*             if (remainingOrigHTML.length > 3000) { */ // Small count of HTML should be with the leading section
            remainingHTML = convertToWikidocumentariesHTML(remainingOrigHTML, topic, language);
/*             }
            else {
                origHTML += remainingOrigHTML;
            } */
        }
        var excerptHTML = convertToWikidocumentariesHTML(origHTML, topic, language);
    }

    return {
        wikipedia: wikipediaSummaryResponse.data,
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
/*     $("table").each(function(index) {
        $(this).remove();
    });
    $("figure").each(function(index) {
        $(this).remove();
    });
    $("figure-inline").each(function(index) {
        $(this).remove();
    });
    $("sup").each(function(index) {
        $(this).remove();
    });
    
    $("div").each(function(index) {
        var div_class = $(this).attr('class');
        if (div_class == undefined || div_class != 'noprint') {
            $(this).remove();
        }
    }); */
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
}

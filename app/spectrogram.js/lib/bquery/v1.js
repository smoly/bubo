/*!
 * birdQuery v1.0   "JQuery for Birders"
 * Documentation:   http://www.accubirder.com/bquery/documentation.php
 * Author:          Zachary DeBruine
 * Author Contact:  zacharydebruine@gmail.com or support@birdventurebirding.com
 * Release Date:    7-21-2016
 * Notes:           I appreciate your feedback and any relevant contributions you may have to this project!
 */


var $$ = {};


$$.xhr = function (url) { // Synchronous XMLHttpRequest and return response
    var r = new XMLHttpRequest(), r2;
    url = "https://cors-anywhere.herokuapp.com/" + url;
    r.open("GET", url, false);
    r.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    r.onreadystatechange = function () {
        if (r.readyState == 4 && r.status == 200) {
            r2 = r.response;
        }
    };
    r.send();
    return r2;
};


$$.get = {}; // These functions call $$.xhr() for appropriate eBird API/barchart based on parameters.

$$.get.obs = function (p) {
    var url = "http://ebird.org/ws1.1/";
    if (typeof p != 'object') {
        r = p;
        p = {};
        p.r = r;
    }
    if (p.lat && p.lng) {
        url += "data/obs/geo/recent?&lat=" + p.lat + "&lng=" + p.lng;
        if (p.distance) {
            url += "&dist=" + p.distance;
        }
        else {
            url += "&dist=50";
        }
    }
    else if (p.r) {
        var r = p.r;
        if (r instanceof Array) {
            url += "data/obs/loc/recent?&r=" + loop(p.r, "&r=");
            if (!p.detail || p.detail == "full") {
                url += "&detail=full";
            }
            else {
                url += "&detail=simple";
            }
        }
        else {
            var s = r.split("-");
            if (s.length == 3) {
                var rtype = "subnational2";
            }
            else if (s.length == 2) {
                var rtype = "subnational1";
            }
            else if (r.length == 2) {
                var rtype = "country";
            }
            if (rtype) {
                url += "data/obs/region/recent?&rtype=" + rtype + "&r=" + p.r;
            }
            else {
                url += "data/obs/loc/recent?&r=" + p.r;
                if (!p.detail || p.detail == "full") {
                    url += "&detail=full";
                }
                else {
                    url += "&detail=simple";
                }
            }
        }
    }
    else {
        console.error("$$.get.obs() has no valid parameter lat&&lng/r");
    }

    if (!p.includeProvisional || p.includeProvisional == true) {
        url += "&includeProvisional=true";
    }
    if (p.hotspot == true) {
        url += "&hotspot=true";
    }
    if (p.sciName) {
        url = url.replace("/recent", "_spp/recent");
        url += "&sci=" + p.sciName;
    }
    if (p.back) {
        url += "&back=" + p.back;
    }
    if (p.maxResults) {
        url += "&maxResults=" + p.maxResults;
    }
    if (p.locale) {
        url += "&locale=" + p.locale;
    }
    url += "&fmt=json";
    return JSON.parse($$.xhr(url));
}

$$.get.rare = function (p) {
    var url = "http://ebird.org/ws1.1/";
    if (typeof p != 'object') {
        r = p;
        p = {};
        p.r = r;
    }
    if (p.lat && p.lng) {
        url += "data/notable/geo/recent?&lat=" + p.lat + "&lng=" + p.lng;
        if (p.distance) {
            url += "&dist=" + p.distance;
        }
    }
    else if (p.r) {
        var r = p.r;
        if (r instanceof Array) {
            url += "data/notable/loc/recent?r=" + loop(p.r, "&r=");
        }
        else {
            var s = r.split("-");
            if (s.length == 3) {
                var rtype = "subnational2";
            }
            else if (s.length == 2) {
                var rtype = "subnational1";
            }
            else if (r.length == 2) {
                var rtype = "country";
            }
            if (rtype) {
                url += "data/notable/region/recent?&rtype=" + rtype + "&r=" + p.r;
            }
            else {
                url += "data/notable/loc/recent&r=" + p.r;
            }

        }
    }
    else {
        console.error("$$.get.rare() has no valid parameter lat&&lng/r");
    }
    if (p.hotspot == true) {
        url += "&hotspot=true";
    }
    if (!p.detail || p.detail == "full") {
        url += "&detail=full";
    }
    else {
        url += "&detail=simple";
    }
    if (p.back) {
        url += "&back=" + p.back;
    }
    if (p.maxResults) {
        url += "&maxResults=" + p.maxResults;
    }
    if (p.locale) {
        url += "&locale=" + p.locale;
    }
    if (p.includeProvisional == true) {
        url += "&includeProvisional=true";
    }
    else if (p.includeProvisional == false) {
        url += "&includeProvisional=false";
    }
    else {
        url += "&includeProvisional=true";
    }
    url += "&fmt=json";
    return JSON.parse($$.xhr(url));
}


$$.get.nearestLocs = function (p) { // returns nearest locations with observations of a species
    var url = "http://ebird.org/ws1.1/";
    if (p.lat && p.lng && p.sciName) {
        url += "data/nearest/geo_spp/recent?&lat=" + p.lat + "&lng=" + p.lng + "&sci=" + p.sciName;
    }
    else {
        console.error("$$.get.nearestLocs() has no valid parameter p.lat&&p.lng&&p.sciName");
    }
    if (p.hotspot == true) {
        url += "&hotspot=true";
    }
    if (p.back) {
        url += "&back=" + p.back;
    }
    if (p.maxResults) {
        url += "&maxResults=" + p.maxResults;
    }
    if (p.locale) {
        url += "&locale=" + p.locale;
    }
    if (!p.includeProvisional) {
        url += "&includeProvisional=true";
    }
    url += "&fmt=json";
    return JSON.parse($$.xhr(url));
}

$$.get.taxa = function (p) {
    var url = "http://ebird.org/ws1.1/ref/taxa/ebird?";
    if (p) {
        if (p.cat) {
            url += "cat=" + loop(p.cat, ",");
        }
        else {
            url += "cat=species";
        }
        if (p.locale) {
            url += "&locale=" + p.locale;
        }
    }
    url += "&fmt=json";
    return JSON.parse($$.xhr(url));
}

$$.get.hotspots = function (p) {
    var url = "http://ebird.org/ws1.1/ref/hotspot/";
    if (typeof p != 'object') {
        r = p;
        p = {};
        p.r = r;
    }
    if (p.lat && p.lng) {
        url += "geo?lat=" + p.lat + "&lng=" + p.lng;
        if (p.dist) {
            url += "&dist=" + p.dist;
        }
    }
    else if (p.r) {
        var r = p.r;
        var s = r.split("-");
        if (s.length == 3) {
            var rtype = "subnational2";
        }
        else if (s.length == 2) {
            var rtype = "subnational1";
        }
        else if (r.length == 2) {
            var rtype = "country";
        }
        url += "region?rtype=" + rtype + "&r=" + p.r;
    }
    if (p.back) {
        url += "&back=" + p.back;
    }
    url += "&fmt=xml";
    var json = XMLtoJSON($$.xhr(url));

    for (var i = 0; i < json.length; i++) { // convert hyphenated property names to non-hyphenated.
        if (json[i]['country-code']) {
            json[i]['countryCode'] = json[i]['country-code'];
            delete json[i]['country-code'];
        }
        if (json[i]['subnational1-code']) {
            json[i]['subnational1Code'] = json[i]['subnational1-code'];
            delete json[i]['subnational1-code'];
        }
        if (json[i]['subnational2-code']) {
            json[i]['subnational2Code'] = json[i]['subnational2-code'];
            delete json[i]['subnational2-code'];
        }
        if (json[i]['loc-id']) {
            json[i]['locID'] = json[i]['loc-id'];
            delete json[i]['loc-id'];
        }
        if (json[i]['loc-name']) {
            json[i]['locName'] = json[i]['loc-name'];
            delete json[i]['loc-name'];
        }
    }

    return json;
}


$$.get.barchart = function (p) {
    if (typeof p != 'object' || p instanceof Array) {
        r = p;
        p = {};
        p.r = r;
    }
    // Generate URL based on parameters
    var url = "http://ebird.org/ebird/BarChart?cmd=getChart&displayType=download&getLocations=";
    var r = p.r;
    if (r instanceof Array) {
        var s = r[0].split("-");
        r = r[0];
    }
    else {
        var s = r.split("-");
    }
    if (s.length == 3) {
        var split = r.split("-");
        var parentState = split[0] + "-" + split[1];
        url += "counties&counties=" + loop(p.r, ",") + "&parentState=" + parentState;
    }
    else if (s.length == 2) {
        url += "states&states=" + loop(p.r, ",");
    }
    else if (r.length == 2) {
        url += "countries&countries=" + loop(p.r, ",");
    }
    else if (r.indexOf("L") == 0) {
        url += "hotspots&hotspots=" + loop(p.r, ",");
    }
    else {
        console.error("$$.get.barchart did not receive a valid region code specified by 'r'. Please use an eBird-recognized country, subnational1, subnational2, or location code (i.e. 'US-NY-108').");
    }
    if (p.species) {
        url += "&speciesCodes=" + loop(p.species, ",");
    }
    if (p.beginYear) {
        var beginYear = p.beginYear;
    }
    else {
        var beginYear = 1900;
    }
    if (p.endYear) {
        var endYear = p.endYear;
    }
    else {
        var endYear = new Date().getFullYear();
    }
    if (p.beginMonth) {
        var beginMonth = p.beginMonth;
    }
    else {
        var beginMonth = 1;
    }
    if (p.endMonth) {
        var endMonth = p.endMonth;
    }
    else {
        var endMonth = 12;
    }
    url += "&bYear=" + beginYear + "&eYear=" + endYear + "&bMonth=" + beginMonth + "&eMonth=" + endMonth;
    if (p.species) {
        url += "&reportType=species";
    }
    else {
        url += "&reportType=location";
    }
    var result = $$.xhr(url);  // Request .csv file while overwriting CORS through cors-anywhere

    // Parse CSV to JSON
    result = result.split(/\n/);
    var sampleSize = [];
    var sampling = result[13].split(/\t/);
    for (var i = 1; i < sampling.length - 1; i++) {
        sampleSize.push(parseInt(sampling[i]));
    }
    var months = [];
    for (var i = 1; i <= 12; i++) {
        months.push(i + "/1", i + "/7", i + "/14", i + "/21");
    }
    var json = [];
    for (var i = 15; i < result.length - 2; i++) {
        var item = result[i].split(/\t/);
        var obj = {};
        obj['species'] = item[0];
        obj['samplesize'] = sampleSize;
        obj['key'] = months;
        var occurrenceArr = [];
        for (var j = 1; j < item.length - 1; j++) {
            occurrenceArr.push(parseFloat(Number(item[j]).toFixed(5)));
        }
        obj['occurrence'] = occurrenceArr;
        json.push(obj);
    }

    // Apply filters for spuhs and minimum threshold

    if (!p.spuhs || !p.hasOwnProperty("spuhs")) { // Spuhs
        for (var i = 0; i < json.length; i++) {
            var sp = json[i].species;
            if (sp.indexOf("(") != -1 || sp.indexOf(".") != -1 || sp.indexOf("/") != -1) {
                json.splice(i, 1);
                i--;
            }
        }
    }
    return json;
}

$$.get.graph = function (p) {
    var url = "http://ebird.org/ebird/GuideMe?cmd=sppResults&displayType=download&speciesCodes=" + loop(p.species, ",") + "&getLocations=";
    var r = p.r;
    if (r instanceof Array) {
        var s = r[0].split("-");
        r = r[0];
    }
    else {
        var s = r.split("-");
    }
    if (s.length == 3) {
        var split = r.split("-");
        var parentState = split[0] + "-" + split[1];
        url += "counties&counties=" + loop(p.r, ",") + "&parentState=" + parentState;
    }
    else if (s.length == 2) {
        url += "states&states=" + loop(p.r, ",");
    }
    else if (r.length == 2) {
        url += "countries&countries=" + loop(p.r, ",");
    }
    else if (r.indexOf("L") == 0) {
        url += "hotspots&hotspots=" + loop(p.r, ",");
    }
    else {
        console.error("$$.get.graph() did not receive a valid region code specified by 'r'. Please use an eBird-recognized country, subnational1, subnational2, or location code (i.e. 'US-NY-108').");
    }
    if (!p.beginYear) {
        p.beginYear = 1900;
    }
    if (!p.endYear) {
        p.endYear = 2016;
    }
    if (!p.beginMonth) {
        p.beginMonth = 1;
    }
    if (!p.endMonth) {
        p.endMonth = 12;
    }
    url += "&bYear=" + p.beginYear + "&eYear=" + p.endYear + "&bMonth=" + p.beginMonth + "&eMonth=" + p.endMonth + "&reportType=species";
    var result = $$.xhr(url);

    // convert CSV into JSON
    d = result.split(/\n/);
    if (p.species instanceof Array) {
        var l = p.species.length;
    }
    else {
        var l = 1;
    }
    var json = [];
    for (var i = 0; i < l; i++) {
        var n = {};
        n.key = d[4].split(/\t/);
        n.sampleSize = d[l + 6 + i].split(/\t/);
        n.frequency = d[6 + i].split(/\t/);
        n.species = n.frequency[1];
        n.abundance = d[8 + l * 2 + i].split(/\t/);
        n.birdsPerHour = d[10 + l * 4 + i].split(/\t/);
        n.averageCount = d[12 + l * 6 + i].split(/\t/);
        n.highCount = d[14 + l * 8 + i].split(/\t/);
        n.totals = d[16 + l * 10 + i].split(/\t/);
        n.highCount.splice(0, 2);
        n.averageCount.splice(0, 2);
        n.birdsPerHour.splice(0, 2);
        n.abundance.splice(0, 2);
        n.frequency.splice(0, 2);
        n.sampleSize.splice(0, 2);
        n.key.splice(0, 2);
        n.totals.splice(0, 2);
        json.push(n);
    }
    return json;
}


$$.ref = {};

$$.ref.list = function (p) {
    var u = "http://ebird.org/ws1.1/ref/location/list?rtype=";
    if (p == "country" || !p) {
        u += "country&fmt=xml";
    }
    else if (p == "subnational1") {
        u += "subnational1&fmt=xml";
    }
    else if (p == "subnational2") {
        u += "subnational2&fmt=xml";
    }
    else if (p.indexOf("-") > 0) {
        u += "subnational2&subnational1Code=" + p + "&fmt=xml";
    }
    else if (p.length == 2) {
        u += "subnational1&countryCode=" + p + "&fmt=xml";
    }
    var json = XMLtoJSON($$.xhr(u));
    for (var i = 0; i < json.length; i++) { // convert hyphenated property names to non-hyphenated.
        if (json[i]['country-code']) {
            json[i]['countryCode'] = json[i]['country-code'];
            delete json[i]['country-code'];
        }
        if (json[i]['subnational1-code']) {
            json[i]['subnational1Code'] = json[i]['subnational1-code'];
            delete json[i]['subnational1-code'];
        }
        if (json[i]['subnational2-code']) {
            json[i]['subnational2Code'] = json[i]['subnational2-code'];
            delete json[i]['subnational2-code'];
        }
        if (json[i]['local-abbrev']) {
            json[i]['localAbbrev'] = json[i]['local-abbrev'];
            delete json[i]['local-abbrev'];
        }
    }
    return json;
}

$$.ref.find = function (query, level) {
    var url = "http://ebird.org/ws1.1/ref/location/find?fmt=xml&rtype=";
    if (level == "subnational1" || level == "subnational2" || level == "country") {
        var json = XMLtoJSON($$.xhr(url + level + "&match=" + query));
    }
    else {
        var x1 = XMLtoJSON($$.xhr(url + "country&match=" + query));
        var x2 = XMLtoJSON($$.xhr(url + "subnational1&match=" + query));
        var x3 = XMLtoJSON($$.xhr(url + "subnational2&match=" + query));
        var json = x1;
        for (var i = 0; i < x2.length; i++) {
            json.push(x2[i]);
        }
        for (var i = 0; i < x3.length; i++) {
            json.push(x3[i]);
        }
    }
    for (var i = 0; i < json.length; i++) { // convert hyphenated property names to non-hyphenated.
        if (json[i]['country-code']) {
            json[i]['countryCode'] = json[i]['country-code'];
            delete json[i]['country-code'];
        }
        if (json[i]['subnational1-code']) {
            json[i]['subnational1Code'] = json[i]['subnational1-code'];
            delete json[i]['subnational1-code'];
        }
        if (json[i]['subnational2-code']) {
            json[i]['subnational2Code'] = json[i]['subnational2-code'];
            delete json[i]['subnational2-code'];
        }
        if (json[i]['local-abbrev']) {
            json[i]['localAbbrev'] = json[i]['local-abbrev'];
            delete json[i]['local-abbrev'];
        }
    }
    return json;
}

$$.ref.code = function (p) {
    if (typeof p != 'object') {
        r = p;
        p = {};
        p.name = r;
    }

    if (p.name && p.subnational1Code) {
        var counties = $$.ref.list(p.subnational1Code);
        for (var i = 0; i < counties.length; i++) {
            if (counties[i].name == p.name) {
                return counties[i].subnational2Code;
            }
        }
    }
    else if (p.name && p.countryCode) {
        var states = $$.ref.list(p.countryCode);
        for (var i = 0; i < states.length; i++) {
            if (states[i].name == p.name) {
                return states[i].subnational1Code;
            }
        }
    }
    else if (p.name) {
        var countries = $$.ref.list();
        for (var i = 0; i < countries.length; i++) {
            if (countries[i].name == p.name) {
                return countries[i].countryCode;
            }
        }
    }
}

$$.ref.name = function (code) {
    if (code.indexOf("-") > 0) {
        var s = code.split("-");
        if (s.length == 2) {
            var states = $$.ref.list(s[0]);
            for (var i = 0; i < states.length; i++) {
                if (states[i].subnational1Code == code) {
                    return states[i].name;
                }
            }
        }
        else if (s.length == 3) {
            var counties = $$.ref.list(s[0] + "-" + s[1]);
            for (var i = 0; i < counties.length; i++) {
                if (counties[i].subnational2Code == code) {
                    return counties[i].name;
                }
            }
        }
    }
    else {
        var countries = $$.ref.list();
        for (var i = 0; i < countries.length; i++) {
            if (countries[i].countryCode == code) {
                return countries[i].name;
            }
        }
    }
}

$$.ref.species = function (species) {
    var letter = species.substring(0, 1);
    if (species.length == 4) { // reference 4-letter codes
        var result = $$.xhr("http://www.accubirder.com/bquery/taxa-ref/4code/taxonomy-" + letter.toUpperCase() + ".json");
        result = JSON.parse(result);
        for (var i = 0; i < result.length; i++) {
            var c = result[i].bandingCodes;
            c = c.toLowerCase();
            var d = species.toLowerCase();
            if (c == d) {
                return result[i];
            }
        }
    }
    if (species.length == 6) { // reference 6-letter codes
        var result = $$.xhr("http://www.accubirder.com/bquery/taxa-ref/6code/taxonomy-" + letter + ".json");
        result = JSON.parse(result);
        for (var i = 0; i < result.length; i++) {
            var c = result[i].speciesCode;
            c = c.toLowerCase().substring(0, 6);;
            var d = species.toLowerCase().substring(0, 6);
            if (c == d) {
                return result[i];
            }
        }
    }
    else { // reference full species common name
        var result = $$.xhr("http://www.accubirder.com/bquery/taxa-ref/comName/taxonomy-" + letter.toUpperCase() + ".json");
        result = JSON.parse(result);
        for (var i = 0; i < result.length; i++) {
            var c = result[i].comName;
            c = c.toLowerCase().replace("-", "").replace("-", "").replace("'", "").replace(" ", "").replace(" ", "").replace(" ", "");
            var d = species.toLowerCase().replace("-", "").replace("-", "").replace("'", "").replace(" ", "").replace(" ", "").replace(" ", "");
            if (c == d) {
                return result[i];
            }
        }
    }
}

// ACCESSORY FUNCTIONS

function loop(arr, delimiter) {
    var r = "";
    if (arr.constructor === Array) {
        for (var i = 0; i < arr.length; i++) {
            r += arr[i];
            if (i < arr.length - 1) {
                r += delimiter;
            }
        }
    }
    else {
        r = arr;
    }
    return r;
}

function XMLtoJSON(xml) {
    var result = (new window.DOMParser()).parseFromString(xml, "text/xml").getElementsByTagName("result")[0];
    var json = [];
    for (var i = 0; i < result.childNodes.length; i++) {
        var x = result.childNodes[i].childNodes;
        var y = {};
        for (var j = 0; j < x.length; j++) {
            var prop = x[j].nodeName;
            var val = x[j].childNodes[0].nodeValue;
            y[prop] = val;
        }
        json.push(y);
    }
    return json;
}
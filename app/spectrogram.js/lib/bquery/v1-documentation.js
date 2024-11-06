var documentation = [
    {
        name: "$$.get.obs()",
        description: "Gets recent observations in a region or cirular area about a point.",
        parameters: [
            {
                name: "lat",
                description: "latitude (decimal format)",
                values: "-180 to 180",
                defaultValue: "N/A",
                required: "(1)",
            },
            {
                name: "lng",
                description: "longitude (decimal format)",
                values: "-90 to 90",
                defaultValue: "N/A",
                required: "(1)",
            },
            {
                name: "distance",
                description: "radius of coverage about lat,lng in km. Applicable only when lat,lng are specified.",
                values: "1-50",
                defaultValue: "50",
                required: "No",
            },
            {
                name: "r",
                description: "region code or locIDs",
                values: "any valid country, subnational1, or subnational2 code or array of eBird location IDs",
                defaultValue: "N/A",
                required: "(2)",
            },
            {
                name: "detail",
                description: "observation detail level. Applicable only when locIDs are given or species is specified.",
                values: '"simple","full"',
                defaultValue: '"full"',
                required: "No",
            },
            {
                name: "includeProvisional",
                description: "show unconfirmed eBird records",
                values: "true, false",
                defaultValue: "false",
                required: "No",
            },
            {
                name: "hotspot",
                description: "show observations only at hotspots",
                values: "true, false",
                defaultValue: "false",
                required: "No",
            },
            {
                name: "sciName",
                description: "species scientific name if it is desired to limit results to a single species or specify detail:'full'.",
                values: "valid eBird taxonomy scientific name",
                defaultValue: "N/A",
                required: "No",
            },
            {
                name: "back",
                description: "days back to retrieve data",
                values: "1-30",
                defaultValue: "30",
                required: "No",
            },
            {
                name: "maxResults",
                description: "maximum number of results to return",
                values: "0-10000",
                defaultValue: "10000",
                required: "No",
            },
            {
                name: "locale",
                description: "locale for language of data returned",
                values: "any valid eBird-recognized locale",
                defaultValue: '"en_US"',
                required: "No",
            },
        ],
        examples: [
            {
                description: "Here we get the most recent report of every species observed in New York over the last 30 days:",
                code: "$$.get.obs({<br />&nbsp;&nbsp;r:'US-NY'<br />});"
            },
            {
                description: "If only <i>r</i> is specified, the value for <i>r</i> can also be passed directly into the $$.get.obs() method in the following manner:",
                code: "$$.get.obs('US-NY');",
            },
            {
                description: "Here we get the most recent report of every species observed in Kent County, Michigan over the last 14 days, excluding provisionals, and only at hotspots:",
                code: "$$.get.obs({<br />&nbsp;&nbsp;r:'US-MI-081',<br />&nbsp;&nbsp;back:14,<br />&nbsp;&nbsp;includeProvisional:false,<br />&nbsp;&nbsp;hotspot:true<br />});",
            },
            {
                description: "All observations of Ring-billed Gull ('Larus delawarensis') in Kansas with full detail:",
                code: "$$.get.obs({<br />&nbsp;&nbsp;rtype:'subnational1',<br />&nbsp;&nbsp;r:'US-KS',<br />&nbsp;&nbsp;sci:'Larus delawarensis' // automatically applies detail:full<br />});",
            },
            {
                description: "All observations within 25 km of downtown Grand Rapids, MI over the last 7 days:",
                code: "$$.get.obs({<br />&nbsp;&nbsp;lat:'42.966861',<br />&nbsp;&nbsp;lng:'-85.674684',<br />&nbsp;&nbsp;distance:25,<br />&nbsp;&nbsp;back:7<br />});",
            },
            {
                description: "Returns observations at two locations in NY with <code>detail:'full'</code> (see <code>$$.get.rare()</code> documentation for more info):",
                code: "$$.get.obs({<br />&nbsp;&nbsp;r:['L99381','L104031']<br />});",
            },
        ],
        result: {
            intro: "<code>var data = $$.get.obs()</code> will return a parsed array of objects which can be manipulated to extract information about the observation. Use <code>console.log()</code> to more fully explore data output. Here we document detail:'simple' output.",
            methods: [
                {
                    method: "data[i].comName",
                    description: "species common name",
                    example: "House Sparrow",
                },
                {
                    method: "data[i].howMany",
                    description: "individual count from that observation",
                    example: "1",
                },
                {
                    method: "data[i].lat",
                    description: "latitude of location",
                    example: "43.6834183",
                },
                {
                    method: "data[i].lng",
                    description: "longitude of location",
                    example: "-85.4804017",
                },
                {
                    method: "data[i].locID",
                    description: "eBird location identifier from observation checklist",
                    example: "L4616063",
                },
                {
                    method: "data[i].locName",
                    description: "User-designated location name",
                    example: "Ferris State University",
                },
                {
                    method: "data[i].locationPrivate",
                    description: "If location is not a hotspot",
                    example: "true",
                },
                {
                    method: "data[i].obsDt",
                    description: "UTC time format",
                    example: "2016-07-19 10:40",
                },
                {
                    method: "data[i].obsReviewed",
                    description: "Whether reviewer has checked record (dysfunctional, always false)",
                    example: "false",
                },
                {
                    method: "data[i].obsValid",
                    description: "Whether record has not been invalidated or flagged but pending review",
                    example: "true",
                },
                {
                    method: "data[i].sciName",
                    description: "scientific name of species",
                    example: "Passer domesticus",
                }
            ]
        }
    },
    {
        name: "$$.get.rare()",
        description: "Gets recent rarities in a region or circular area about a point.",
        parameters: [
            {
                name: "lat",
                description: "latitude (decimal format)",
                values: "-180 to 180",
                defaultValue: "N/A",
                required: "(1)",
            },
            {
                name: "lng",
                description: "longitude (decimal format)",
                values: "-90 to 90",
                defaultValue: "N/A",
                required: "(1)",
            },
            {
                name: "distance",
                description: "radius of coverage about lat,lng in km. Required when lat,lng are specified.",
                values: "1-250",
                defaultValue: "250",
                required: "No",
            },
            {
                name: "r",
                description: "region code or locIDs",
                values: "any valid country, subnational1, or subnational2 code or array of eBird location IDs",
                defaultValue: "N/A",
                required: "(2)",
            },
            {
                name: "detail",
                description: "observation detail level.",
                values: '"simple","full"',
                defaultValue: '"full"',
                required: "No",
            },
            {
                name: "includeProvisional",
                description: "show unconfirmed eBird records",
                values: "true, false",
                defaultValue: "false",
                required: "No",
            },
            {
                name: "hotspot",
                description: "show observations only at hotspots",
                values: "true, false",
                defaultValue: "false",
                required: "No",
            },
            {
                name: "back",
                description: "days back to retrieve data",
                values: "1-30",
                defaultValue: "30",
                required: "No",
            },
            {
                name: "maxResults",
                description: "maximum number of results to return",
                values: "0-10000",
                defaultValue: "10000",
                required: "No",
            },
            {
                name: "locale",
                description: "locale for language of data returned",
                values: "any valid eBird-recognized locale",
                defaultValue: '"en_US"',
                required: "No",
            },
        ],
        examples: [
            {
                description: "Here we get rarities observed in New York over the last 30 days:",
                code: "$$.get.rare({<br />&nbsp;&nbsp;r:'US-NY'<br />});"
            },
            {
                description: "If only <i>r</i> is specified, the value for <i>r</i> can also be passed directly into the $$.get.rare() method in the following manner:",
                code: "$$.get.rare('US-NY');",
            },
            {
                description: "Here we get every rarity observed in Kent County, Michigan over the last 14 days, excluding provisionals, and only at hotspots:",
                code: "$$.get.rare({<br />&nbsp;&nbsp;r:'US-MI-081',<br />&nbsp;&nbsp;back:14,<br />&nbsp;&nbsp;includeProvisional:false,<br />&nbsp;&nbsp;hotspot:true<br />});",
            },
            {
                description: "All rarities within 150 km of downtown Grand Rapids, MI over the last 7 days:",
                code: "$$.get.rare({<br />&nbsp;&nbsp;lat:'42.966861',<br />&nbsp;&nbsp;lng:'-85.674684',<br />&nbsp;&nbsp;distance:150, // optional<br />&nbsp;&nbsp;back:7<br />});",
            },
            {
                description: "Returns rarities at two locations in NY:",
                code: "$$.get.rare({<br />&nbsp;&nbsp;r:['L99381','L104031']<br />});",
            },
        ],
        result: {
            intro: "<code>var data = $$.get.rare()</code> will return a parsed array of objects which can be manipulated to extract information about the observation. Use <code>console.log()</code> to more fully explore data output. Here we document detail:'full' output.",
            methods: [
                {
                    method: "data[i].comName",
                    description: "species common name",
                    example: "Snowy Owl",
                },
                {
                    method: "data[i].howMany",
                    description: "individual count from that observation",
                    example: "1",
                },
                {
                    method: "data[i].lat",
                    description: "latitude of location",
                    example: "43.6834183",
                },
                {
                    method: "data[i].lng",
                    description: "longitude of location",
                    example: "-85.4804017",
                },
                {
                    method: "data[i].locID",
                    description: "eBird location identifier from observation checklist",
                    example: "L4616063",
                },
                {
                    method: "data[i].locName",
                    description: "User-designated location name",
                    example: "Livingston-1107-1199 Morgan Rd",
                },
                {
                    method: "data[i].locationPrivate",
                    description: "If location is not a hotspot",
                    example: "true",
                },
                {
                    method: "data[i].obsDt",
                    description: "UTC time format",
                    example: "2016-07-19 10:40",
                },
                {
                    method: "data[i].obsReviewed",
                    description: "Whether reviewer has checked record (dysfunctional, always false)",
                    example: "false",
                },
                {
                    method: "data[i].obsValid",
                    description: "Whether record has not been invalidated or flagged but pending review",
                    example: "false",
                },
                {
                    method: "data[i].sciName",
                    description: "scientific name of species",
                    example: "Bubo scandiacus",
                },
                {
                    method: "data[i].checklistID",
                    description: "eBird checklist identifier for observation",
                    example: "CL25949",
                },
                {
                    method: "data[i].countryCode",
                    description: "country code of observation",
                    example: "US",
                },
                {
                    method: "data[i].countryName",
                    description: "country name of observation",
                    example: "United States",
                },
                {
                    method: "data[i].firstName",
                    description: "observer's first name",
                    example: "Richard",
                },
                {
                    method: "data[i].hasComments",
                    description: "has the observation been submitted with comments/details",
                    example: "true",
                },
                {
                    method: "data[i].hasRichMedia",
                    description: "has the observation been submitted with uploaded photos, sound recordings, or linked media",
                    example: "false",
                },
                {
                    method: "data[i].lastName",
                    description: "observer's last name",
                    example: "Hornbuckle",
                },
                {
                    method: "data[i].locID",
                    description: "location identifier",
                    example: "L4800946",
                },
                {
                    method: "data[i].obsID",
                    description: "unique observation identifier",
                    example: "0BS418942828",
                },
                {
                    method: "data[i].presenceNoted",
                    description: "set to true if a count of 'X' was given",
                    example: "false",
                },
                {
                    method: "data[i].subID",
                    description: "checklist subID which can be used in URL to get checklist",
                    example: "S30766378",
                },
                {
                    method: "data[i].subnational1Code",
                    description: "state/province code",
                    example: "US-MI",
                },
                {
                    method: "data[i].subnational1Name",
                    description: "state/province name",
                    example: "Michigan",
                },
                {
                    method: "data[i].subational2Code",
                    description: "county code",
                    example: "US-MI-137",
                },
                {
                    method: "data[i].subational2Name",
                    description: "county name",
                    example: "Otsego",
                },
                {
                    method: "data[i].userDisplayName",
                    description: "usually equivalent to firstName + ' ' + lastName",
                    example: "Richard Hornbuckle",
                }
            ]
        }
    },
    {
        name: "$$.get.barchart()",
        description: "Gets eBird barchart data and outputs in JSON (weekly frequency data for every species observed in region or area)",
        parameters: [
            {
                name: "r",
                description: "region code or locIDs",
                values: "Valid eBird-recognized country, subnational1, subnational2, or location code(s). May be provided as array or as a single code. Codes in an array must be at the same regional level. See examples.",
                defaultValue: "N/A",
                required: "Yes",
            },
            {
                name: "species",
                description: "Limit returned data to single species (requests line graph barchart, speeds up request)",
                values: "6-letter species codes provided as either a single species in a string or multiple species (up to 4) in an array.",
                defaultValue: "N/A",
                required: "No",
            },
            {
                name: "beginYear",
                description: "Filters species only seen after this year",
                values: "4-digit integer",
                defaultValue: '"1900"',
                required: "No",
            },
            {
                name: "endYear",
                description: "Filters species only seen before this year",
                values: "4-digit integer",
                defaultValue: 'Current year',
                required: "No",
            },
            {
                name: "beginMonth",
                description: "Filters species only after this month",
                values: "2-digit integer (1-12)",
                defaultValue: '"1"',
                required: "No",
            },
            {
                name: "endYear",
                description: "Filters species only seen after this month",
                values: "2-digit integer (1-12)",
                defaultValue: '"12"',
                required: "No",
            }
        ],
        examples: [
            {
                description: "The following request simply returns US barchart data:",
                code: "$$.get.barchart('US');"
            },
            {
                description: "This function returns data for Kent County, Michigan",
                code: "$$.get.barchart('US-MI-081');",
            },
            {
                description: "This function returns data for New York filtering for species observed within Jun-Jul over the last 5 years",
                code: "$$.get.barchart({<br />&nbsp;&nbsp;r:'US-NY',<br />&nbsp;&nbsp;beginMonth:6,<br />&nbsp;&nbsp;endMonth:7,<br />&nbsp;&nbsp;beginYear:2011<br />&nbsp;&nbsp;//note that endYear is the current year by default and need not be specified.<br />});",
            },
            {
                description: "Here we request data for Pointe Mouillee SGA, Magee Marsh, and Point Pelee all in one barchart filtering for species observed only in May (you can't do this in eBird!):",
                code: "$$.get.barchart({<br />&nbsp;&nbsp;r:['L248057','L317582'],<br />&nbsp;&nbsp;beginMonth:5,<br />&nbsp;&nbsp;endMonth:5<br />});",
            },
            {
                description: "If you are only entering a region, and relying on default parameters for setting the timeframe, you can just enter the region directly as a string or an array, for example:",
                code: "$$.get.barchart('US-CA');<br />$$.get.barchart(['US-CA','US-NV','US-AZ']);<br />$$.get.barchart(['US-MI-081','US-MI-078','US-WI-042']); // you couldn't do this in eBird!<br />$$.get.barchart(['NL','BE','DE','LU']);<br />$$.get.barchart('L328405');",
            },
        ],
        result: {
            intro: "<code>var data = $$.get.barchart()</code> will return a parsed array of objects which can be manipulated to extract frequency and sample size information about each species. Use <code>console.log()</code> to more fully explore data output.",
            methods: [
                {
                    method: "data[i].species",
                    description: "species common name",
                    example: "King Rail",
                },
                {
                    method: "data[i].key",
                    description: "Array[48] with mm/dd markings for each array value, indicating weeks to which frequency data corresponds in data[i].occurrence",
                    example: "['1/1','1/7','1/14','1/21','2/1','2/7'...'12/21']",
                },
                {
                    method: "data[i].occurrence",
                    description: "Array[48] of frequency data for species occurrence in barchart region each week",
                    example: "[0,0,0,0,0,0,0,0.0011,0.0018,0004...0]",
                },
                {
                    method: "data[i].samplesize",
                    description: "Array[48] of sample size (sum of all complete checklists and incomplete checklists submitting the species)",
                    example: "[11709,7741,7969,10073,7352,11493...8450]",
                }
            ]
        }
    },
    {
        name: "$$.get.nearestLocs()",
        description: "Returns the nearest locations with observations of a species.",
        parameters: [
            {
                name: "lat",
                description: "latitude (decimal format)",
                values: "-180 to 180",
                defaultValue: "N/A",
                required: "Yes",
            },
            {
                name: "lng",
                description: "longitude (decimal format)",
                values: "-90 to 90",
                defaultValue: "N/A",
                required: "Yes",
            },
            {
                name: "sciName",
                description: "Scientific name of species",
                values: "any valid eBird taxonomy species scientific name",
                defaultValue: "N/A",
                required: "Yes",
            },
            {
                name: "hotspot",
                description: "show observations only at hotspots",
                values: "true, false",
                defaultValue: "false",
                required: "No",
            },
            {
                name: "back",
                description: "days back to retrieve data",
                values: "1-30",
                defaultValue: "30",
                required: "No",
            },
            {
                name: "maxResults",
                description: "maximum number of results to return",
                values: "0-10000",
                defaultValue: "10000",
                required: "No",
            },
            {
                name: "locale",
                description: "locale for language of data returned",
                values: "any valid eBird-recognized locale",
                defaultValue: '"en_US"',
                required: "No",
            },
            {
                name: "includeProvisional",
                description: "show unconfirmed eBird records",
                values: "true, false",
                defaultValue: 'true',
                required: "No",
            },
        ],
        examples: [
            {
                description: "Returns the 500 nearest locations with observations of Ring-billed Gull around Grand Rapids:",
                code: "$$.get.nearestLocs({<br />&nbsp;&nbsp;lat:'42.966861',<br />&nbsp;&nbsp;lng:'-85.674684',<br />&nbsp;&nbsp;sciName:'Larus delawarensis',<br />&nbsp;&nbsp;maxResults:500 // optional, default 1000<br />});"
            }
        ],
        result: {
            intro: "<code>var data = $$.get.obs()</code> will return a parsed array of objects which can be manipulated to extract information about the observation. Use <code>console.log()</code> to more fully explore data output. Here we document detail:'simple' output.",
            methods: [
                {
                    method: "data[i].comName",
                    description: "species common name",
                    example: "Ring-billed Gull",
                },
                {
                    method: "data[i].howMany",
                    description: "individual count from that observation",
                    example: "1",
                },
                {
                    method: "data[i].lat",
                    description: "latitude of location",
                    example: "43.6834183",
                },
                {
                    method: "data[i].lng",
                    description: "longitude of location",
                    example: "-85.4804017",
                },
                {
                    method: "data[i].locID",
                    description: "eBird location identifier from observation checklist",
                    example: "L4616063",
                },
                {
                    method: "data[i].locName",
                    description: "User-designated location name",
                    example: "Ah Nab Awen Park",
                },
                {
                    method: "data[i].locationPrivate",
                    description: "If location is not a hotspot",
                    example: "false",
                },
                {
                    method: "data[i].obsDt",
                    description: "UTC time format",
                    example: "2016-07-19 10:40",
                },
                {
                    method: "data[i].obsReviewed",
                    description: "Whether reviewer has checked record (dysfunctional, always false)",
                    example: "false",
                },
                {
                    method: "data[i].obsValid",
                    description: "Whether record has not been invalidated or flagged but pending review",
                    example: "true",
                },
                {
                    method: "data[i].sciName",
                    description: "scientific name of species",
                    example: "Larus delawarensis",
                }
            ]
        }
    },
    {
        name: "$$.get.hotspots()",
        description: "Gets hotspots in a region or within a circular region about a point with or without recent data.",
        parameters: [
            {
                name: "lat",
                description: "latitude (decimal format)",
                values: "-180 to 180",
                defaultValue: "N/A",
                required: "(1)",
            },
            {
                name: "lng",
                description: "longitude (decimal format)",
                values: "-90 to 90",
                defaultValue: "N/A",
                required: "(1)",
            },
            {
                name: "distance",
                description: "radius of coverage about lat,lng in km. Applicable only when lat,lng are specified",
                values: "1-250",
                defaultValue: "250",
                required: "No",
            },
            {
                name: "r",
                description: "region code",
                values: "valid country, subnational1, or subnational2 code or an array of eBird location IDs",
                defaultValue: "N/A",
                required: "(2)",
            },
            {
                name: "back",
                description: "days back to retrieve data",
                values: "1-30",
                defaultValue: "30",
                required: "No",
            },
        ],
        examples: [
            {
                description: "Here we get all hotspots in New York:",
                code: "$$.get.hotspots({<br />&nbsp;&nbsp;r:'US-NY'<br />});"
            },
            {
                description: "If only <i>r</i> is specified, the value for <i>r</i> can also be passed directly into the <code>$$.get.hotspots()</code> method in the following manner:",
                code: "$$.get.hotspots('US-NY');"
            },
            {
                description: "Here we get all hotspots with recent data within the last 14 days within 25 km of Grand Rapids, MI:",
                code: "$$.get.hotspots({<br />&nbsp;&nbsp;lat:'42.966861',<br />&nbsp;&nbsp;lng:'-85.674684',<br />&nbsp;&nbsp;distance:25,<br />&nbsp;&nbsp;back:14<br />});"
            }
        ],
        result: {
            intro: "<code>var data = $$.get.obs()</code> will return a parsed array of objects which can be manipulated to extract information about the observation. Use <code>console.log()</code> to more fully explore data output.",
            methods: [
                {
                    method: "data[i].countryCode",
                    description: "country code of location",
                    example: "US",
                },
                {
                    method: "data[i].lat",
                    description: "latitude of location",
                    example: "43.6834183",
                },
                {
                    method: "data[i].lng",
                    description: "longitude of location",
                    example: "-85.4804017",
                },
                {
                    method: "data[i].locID",
                    description: "eBird location identifier from observation checklist",
                    example: "L4616063",
                },
                {
                    method: "data[i].locName",
                    description: "hotspot location name",
                    example: "92nd St. flooded field",
                },
                {
                    method: "data[i].subnational1Code",
                    description: "State/province code for location",
                    example: "'US-MI'",
                },
                {
                    method: "data[i].subnational2Code",
                    description: "County code for location",
                    example: "'US-MI-081'",
                }
            ]
        }
    },
    {
        name: "$$.get.taxa()",
        description: "Gets eBird taxonomy, optionally filtered by type of taxonomic designation. Output is automatically parsed JSON.",
        parameters: [
            {
                name: "cat",
                description: "Category. Can be entered as array for multiple use.",
                values: "'domestic','form','hybrid','intergrade','issf','slash','species','spuh'",
                defaultValue: "all",
                required: "No",
            },
            {
                name: "locale",
                description: "output language/dialect",
                values: "en,en_US,de,en_AE,en_AU,en_IN,en_NZ,en_UK,en_ZA,es,es_AR,es_CL,es_CU, es_DO,es_ES,es_MX,es_PA,es_PR,fi,fr,fr_HT,ht_HT,in,is,pt_BR,pt_PT,tr,zh",
                defaultValue: "'en_US'",
                required: "No",
            }
        ],
        examples: [
            {
                description: "Here we get the entire eBird taxonomy:",
                code: "$$.get.taxa();"
            },
            {
                description: "Here we get hybrids and spuhs in german:",
                code: "$$.get.taxa({<br />&nbsp;&nbsp;cat:['hybrid','spuh'],<br />&nbsp;&nbsp;locale:'de'<br />});"
            },
        ],
        result: {
            intro: "<code>var data = $$.get.taxa()</code> will return a parsed array of objects which can be manipulated to extract information about taxa of interest. Use <code>console.log()</code> to more fully explore data output. <b>Please note that you are requesting a large file from eBird servers when you request this function</b>. If possible, you can significantly increase efficiency by iteratively using the <code>$$.ref.species()</code> function if you have a few species of interest.",
            methods: [
                {
                    method: "data[i].bandingCodes",
                    description: "Most commonly used 4-letter code in an Array[1]",
                    example: "CODU",
                },
                {
                    method: "data[i].category",
                    description: "class of taxonomic entry",
                    example: "'species'",
                },
                {
                    method: "data[i].comName",
                    description: "common name",
                    example: "'Comb Duck'",
                },
                {
                    method: "data[i].comNameCodes",
                    description: "Common name code in an Array[1]",
                    example: "CBDU",
                },
                {
                    method: "data[i].sciName",
                    description: "scientific name",
                    example: "'Sarkidiornis melanotos'",
                },
                {
                    method: "data[i].sciNameCodes",
                    description: "4-letter scientific name in an Array[1]",
                    example: "['SAME']",
                },
                {
                    method: "data[i].speciesCode",
                    description: "6-letter species code (sometimes with a 1 suffixed to the end)",
                    example: "comduc1",
                },
                {
                    method: "data[i].taxonID",
                    description: "unique identifier for species",
                    example: "TC000150",
                },
                {
                    method: "data[i].taxonOrder",
                    description: "Order of taxa",
                    example: "309",
                },
            ]
        }
    },
    {
        name: "$$.get.graph()",
        description: "Gets eBird line graph data (species frequency, abundance, birds per hour, high counts, totals) and returns as JSON.",
        parameters: [
            {
                name: "r",
                description: "Region or location of coverage.",
                values: "Valid eBird-recognized country, subnational1, subnational2, or hotspot location code(s). May be provided as array or as a single code. Codes in array must be at same regional level. See examples.",
                defaultValue: "N/A",
                required: "Yes",
            },
            {
                name: "species",
                description: "Species to include in report.",
                values: "6-letter species codes provided as either a single species in a string or multiple species in an array.",
                defaultValue: "N/A",
                required: "Yes",
            },
            {
                name: "beginYear",
                description: "Filters species only seen after this year",
                values: "4-digit integer",
                defaultValue: '"1900"',
                required: "No",
            },
            {
                name: "endYear",
                description: "Filters species only seen before this year",
                values: "4-digit integer",
                defaultValue: 'Current year',
                required: "No",
            },
            {
                name: "beginMonth",
                description: "Filters species only after this month",
                values: "2-digit integer (1-12)",
                defaultValue: '"1"',
                required: "No",
            },
            {
                name: "endYear",
                description: "Filters species only seen after this month",
                values: "2-digit integer (1-12)",
                defaultValue: '"12"',
                required: "No",
            }
        ],
        examples: [
            {
                description: "This function returns line graph data for Snowy Owl in Hawaii",
                code: "$$.get.graph({<br />&nbsp;&nbsp;r:'US-HI',<br />&nbsp;&nbsp;species:'snoowl1' // this is eBird's '6-letter' code, use $$.ref.species('snowy owl') to look up.<br />});"
            },
            {
                description: "This function returns data for common owls in Michigan, Wisconsin, and Minnesota between November and February:",
                code: "$$.get.graph({<br />&nbsp;&nbsp;r:['US-MI','US-WI','US-MN'],<br />&nbsp;&nbsp;species:['nswowl','brdowl','grhowl','easowl'],<br />&nbsp;&nbsp;beginMonth:11,<br />&nbsp;&nbsp;endMonth:2<br />});"
            },
            {
                description: "Here we get data for Great Gray Owl and Long-eared Owl at a few hotspots in Sax Zim Bog:",
                code: "$$.get.graph({<br />&nbsp;&nbsp;r:['L241872','L491854','L284351'],<br />&nbsp;&nbsp;species:['grgowl','loeowl'],<br />});"
            },
        ],
        result: {
            intro: "<code>var data = $$.get.graph()</code> will return a parsed array of objects which can be manipulated to extract information about species statistics. Use <code>console.log()</code> to more fully explore data output.  One object is returned for each species with statistics.",
            methods: [
                {
                    method: "data[i].species",
                    description: "species common name",
                    example: "Great Horned Owl",
                },
                {
                    method: "data[i].key",
                    description: "Array[48] (or whatever the date frame is restricted to) with mm/dd markings for each array value, indicating weeks to which frequency data corresponds in data[i].occurrence",
                    example: "['1/1','1/7','1/14','1/21','2/1','2/7'...'12/21']",
                },
                {
                    method: "data[i].samplesize",
                    description: "Array[48] (or whatever the date frame is restricted to) of sample size (sum of all complete checklists and incomplete checklists submitting the species)",
                    example: "['11709','7741','7969','10073','7352',...'8450']",
                },
                {
                    method: "data[i].abundance",
                    description: "Array[48] (or whatever the date frame is restricted to) of species abundance data.",
                    example: "['0.016','0.016','0.020','0.021','0.022'...'0.024']",
                },
                {
                    method: "data[i].frequency",
                    description: "Array[48] (or whatever the date frame is restricted to) of species frequency data.",
                    example: "['1.365','1.484','1.674','1.745'...'2.023']",
                },
                {
                    method: "data[i].averageCount",
                    description: "Array[48] (or whatever the date frame is restricted to) of species average count data.",
                    example: "['1.307','1.293','1.363','1.337'...'1.256']",
                },
                {
                    method: "data[i].highCount",
                    description: "Array[48] (or whatever the date frame is restricted to) of species high count data.",
                    example: "['5','8','8','5','19'...'3']",
                },
                {
                    method: "data[i].birdsPerHour",
                    description: "Array[48] (or whatever the date frame is restricted to) of birds per hour data.",
                    example: "['3.501','2.841','2.937','4.058'...'3.300']",
                },
                {
                    method: "data[i].totals",
                    description: "Array[48] (or whatever the date frame is restricted to) of total individuals counted data.",
                    example: "['319','322','349','468','360'...'555']",
                },
            ]
        }
    },
    {
        name: "$$.ref.list()",
        description: "Returns JSON list of national or subnational regions (optionally within a region) with details.<br /><br />Only a single parameter is required and is passed into the object as a string.",
        parameters: [
            {
                name: "<i>region</i>",
                description: "Passed into the object as a string.<ul><li>A list of all subnational2, subnational1, or country districts can be retrieved using 'subnational2', 'subnational1', or 'country'</li><li>A list of all districts within a country or subnational1 region can be retrieved by specifying a subnational1 or country code.</li><li>A list of all countries can be retrieved by not specifying anything.</li></ul>",
                values: "'subnational2','subnational1','country', or a valid eBird subnational1 or country code.",
                defaultValue: "N/A",
                required: "No",
            }
        ],
        examples: [
            {
                description: "Here we get a list of all countries:",
                code: "$$.ref.list();"
            },
            {
                description: "Here we get a list of all subnational2 districts in the world (kind of big file):",
                code: "$$.ref.list('subnational2');"
            },
            {
                description: "Here we get a list of all subnational2 districts in West Virginia, US:",
                code: "$$.ref.list('US-WV');"
            },
            {
                description: "Here we get a list of all subnational1 districts in Mexico:",
                code: "$$.ref.list('MX');"
            },
        ],
        result: {
            intro: "<code>var data = $$.ref.list()</code> will return a parsed array of objects which can be manipulated to extract information about regions of interest. Use <code>console.log()</code> to more fully explore data output. When parsing data about subnational1 or country-level information, you can use method <code>data[i].localAbbrev</code>, but this is not available for subnational2-level information. Similarly, <code>data[i].subnational2Code</code> will be undefined for subnational1-level data, and <code>data[i].subnational1Code</code> will also be undefined for country-level data.",
            methods: [
                {
                    method: "data[i].name",
                    description: "Region name",
                    example: "Hawaii",
                },
                {
                    method: "data[i].countryCode",
                    description: "country code",
                    example: "'US'",
                },
                {
                    method: "data[i].subnational1Code",
                    description: "eBird subnational1 code (if applicable)",
                    example: "'US-HI'",
                },
                {
                    method: "data[i].subnational2Code",
                    description: "eBird subnational2 code (if applicable)",
                    example: "'US-HI-009'",
                },
                {
                    method: "data[i].localAbbrev",
                    description: "local abbreviation for the region (if data is at country or subnational1 level)",
                    example: "'HI'",
                },
            ],
        },
    },
    {
        name: "$$.ref.find()",
        description: "Searches for national and/or subnational regions with names containing the query string. The parameter is defined as <code>$$.ref.find(query,level)</code>, where <i>query</i> is the string to lookup, and <i>level</i> is optional and limits results to a 'country', 'subnational1', or 'subnational2' level.",
        parameters: [
            {
                name: "<i>query</i>",
                description: "Text string to search for location names containing matches",
                values: "any valid string (<i>i.e.</i> 'north')",
                defaultValue: "N/A",
                required: "Yes",
            },
            {
                name: "<i>level</i>",
                description: "The level at which search results will be limited. Specifying a level if known reduces number of APIs needed to complete function from 3 to 1, so consider specifying a level when possible to improve efficiency.",
                values: "'country','subnational1','subnational2'",
                defaultValue: "all",
                required: "No",
            }
        ],
        examples: [
            {
                description: "Here we search for all locations containing a match for 'west':",
                code: "$$.ref.find('west');"
            },
            {
                description: "Here we search for subnational2 regions containing a match for 'long':",
                code: "$$.ref.find('long','subnational2');"
            },
        ],
        result: {
            intro: "<code>var data = $$.ref.find()</code> will return a parsed array of objects which can be manipulated to extract information about regions of interest. Use <code>console.log()</code> to more fully explore data output. Please be aware that <code>data[i].subnational2Code</code> will be undefined for subnational1-level data, and <code>data[i].subnational1Code</code> will also be undefined for country-level data.",
            methods: [
                {
                    method: "data[i].name",
                    description: "regional name",
                    example: "Tamenglong",
                },
                {
                    method: "data[i].countryCode",
                    description: "country code",
                    example: "'IN'",
                },
                {
                    method: "data[i].subnational1Code",
                    description: "eBird subnational1 code (if applicable)",
                    example: "'IN-MN'",
                },
                {
                    method: "data[i].subnational2Code",
                    description: "eBird subnational2 code (if applicable)",
                    example: "'IN-MN-TA'",
                },
            ],
        },
    },
    {
        name: "$$.ref.code()",
        description: "<code>$$.ref.code()</code> returns the regional code of the provided regional name.<ul><li>If you wish to get the code of a <b>country</b>, just specify <i>name</i></li><li>If you wish to get the code of a <b>state/province</b>, specify <i>name</i> and <i>countryCode</i>.</li><li>If you wish to get the code of a <b>county</b>, specify <i>name</i> and <i>subnational1Code</i>.",
        parameters: [
            {
                name: "name",
                description: "Name of the country, state, or county you wish to get the code for.",
                values: "any valid eBird-recognized regional name (in local special characters if applicable)",
                defaultValue: "N/A",
                required: "Yes",
            },
            {
                name: "countryCode",
                description: "country code applicable to your region to ensure proper match-up",
                values: "any valid eBird country code",
                defaultValue: "N/A",
                required: "if <i>name</i> is at state level",
            },
            {
                name: "subnational1Code",
                description: "state code applicable to your region to ensure proper match-up",
                values: "any valid eBird state code",
                defaultValue: "N/A",
                required: "if <i>name</i> is at county level",
            },
        ],
        examples: [
            {
                description: "Here we get the code for Long county in Georgia:",
                code: "$$.ref.code({<br />&nbsp;&nbsp;name:'Long',<br />&nbsp;&nbsp;subnational1Code:'US-GA',<br />});"
            },
            {
                description: "Here are two acceptable ways to get the code for Luxembourg (applicable to country level only):",
                code: "$$.ref.code({<br />&nbsp;&nbsp;name:'Luxembourg',<br />});<br /><br />$$.ref.code('Luxembourg');"
            },
        ],
        result: {
            intro: "<code>var code = $$.ref.code()</code> will return a string with the code corresponding to the location you specified. It is not an object.",
            methods: [
                {
                    method: "string",
                    description: "resulting code is returned as a string",
                    example: "'US-MI-081'",
                },
            ],
        },
    },
    {
        name: "$$.ref.name()",
        description: "<code>$$.ref.name(<i>string</i>)</code> returns the name of the given region code. Simply provide a string with the eBird-recognized national or subnational code (see examples).",
        parameters: [
            {
                name: "<i>string</i>",
                description: "Provide a string with your code of interest",
                values: "any eBird-recognized national or subnational cdoe.",
                defaultValue: "N/A",
                required: "Yes, if not passing in object",
            },
        ],
        examples: [
            {
                description: "Here we get the name for 'US-MI-081':",
                code: "$$.ref.name('US-MI-081');"
            },
        ],
        result: {
            intro: "<code>var code = $$.ref.name()</code> will return a string with the name corresponding to the region code you specified.",
            methods: [
                {
                    method: "string",
                    description: "resulting name is returned as a string",
                    example: "'Michigan'",
                },
            ],
        },
    },
    {
        name: "$$.ref.species()",
        description: "<code>$$.ref.species(<i>string</i>)</code> returns taxonomic details about a species in response to provided common name or 4/6-letter codes. This function uses small archived JSON arrays hosted on accubirder.com for species lookup. This is significantly more efficient than working with the entire eBird taxonomy through the API or <code>$$.get.taxa()</code>.<br /><br /><b>Note:</b> Because this reference source is archived on accubirder servers, it does not automatically update with changes to eBird taxonomy. Last update was 7/19/2016.",
        parameters: [
            {
                name: "<i>string</i>",
                description: "Provide a string with your species' common name (not case-sensitive), 4-letter bandcode (must be 4 letters), or 6-letter code (must be 6 letters)",
                values: "any eBird-recognized common name or 4/6-letter code",
                defaultValue: "N/A",
                required: "Yes",
            },
        ],
        examples: [
            {
                description: "Here are several ways to get taxonomic information for Great Horned Owl:",
                code: "$$.ref.species('Great Horned Owl');<br />$$.ref.species('GHOW');<br />$$.ref.species('grhowl');",
            },
        ],
        result: {
            intro: "<code>var code = $$.ref.species()</code> will return an array of objects with taxonomic information about the given species:",
            methods: [
                {
                    method: "data[i].comName",
                    description: "species common name",
                    example: "'Great Horned Owl'",
                },
                {
                    method: "data[i].sciName",
                    description: "species scientific name",
                    example: "'Bubo virginianus'",
                },
                {
                    method: "data[i].category",
                    description: "taxonomic entry classification",
                    example: "'species'",
                },
                {
                    method: "data[i].bandingCodes",
                    description: "Array[1] of banding code (most commonly used)",
                    example: "'GHOW'",
                },
                {
                    method: "data[i].comNameCodes",
                    description: "Array[1] of species common name code (less commonly used)",
                    example: "'GHOW'",
                },
                {
                    method: "data[i].sciNameCodes",
                    description: "Array[1] of species scientific name code",
                    example: "'BUVI'",
                },
                {
                    method: "data[i].speciesCode",
                    description: "6-letter species code",
                    example: "'grhowl'",
                },
                {
                    method: "data[i].taxonID",
                    description: "eBird unique taxonomic identifier",
                    example: "'TC003483'",
                },
                {
                    method: "data[i].taxonOrder",
                    description: "position in eBird taxonomy (useful for sorting by taxonomy)",
                    example: "'grhowl7254'",
                },
            ],
        },
    },
];
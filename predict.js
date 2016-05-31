function getRecommandation(timeStamp) {
    // function that returns recommandations for given timestamp
    // recommandations are returned in the form of JSON:
    // {"recommandation":[
    //         { "tag" : "blah",
    //           "rank": 2,
    //           "freq": 150,
    //           "pages": [
    //             {"url": "www.blah.com", 
    //              "title": "blah"},
    //             {"url": "www.blah2.com", 
    //              "title": "blah2"}
    //           ]
    //         }
    //     ]
    // }
    
    // // initialize empty json
    // var result = {recommandation: []};

    // // first get list of top ranking tags
    // var tags = getAdjustedTopTags(timeStamp);

    // for (var i = 0; i < tags.length; i++) {
    //     var tag_curr = tags[i];
    //     // get corresponding pages by tag
    //     pages_curr = getPagesByTag(tag_curr.tag, timeStamp);
    //     // insert result
    //     result.recommandation.push({
    //         "tag" : tag_curr.tag,
    //         "rank": tag_curr.rank,
    //         "freq": tag_curr.freq,
    //         "pages" : pages_curr
    //     });
    // }



    result = {"recommandation":[
            { "tag" : "blah",
              "rank": 2,
              "freq": 150,
              "pages": [
                {"url": "www.youtube.com", 
                 "title": "Youtube"},
                {"url": "www.amazon.com", 
                 "title": "Amazon"}
              ]
            },
            { "tag" : "battery",
              "rank": 3,
              "freq": 250,
              "pages": [
                {"url": "https://www.google.com/?ion=1&espv=2#q=battery%20shop", 
                 "title": "battery shop"},
                {"url": "http://www.amazon.com/s/ref=nb_sb_noss_2?url=search-alias%3Daps&field-keywords=battery", 
                 "title": "battery on amazon"}
              ]
            }
        ]
    }

    return "hello";
}

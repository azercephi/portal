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

    // initialize empty json
    var result = {recommandation: []};

    // first get list of top ranking tags
    var tags = getAdjustedTopTags(timeStamp);

    for (var i = 0; i < tags.length; i++) {
        var tag_curr = tags[i];
        // get corresponding pages by tag
        pages_curr = getPagesByTag(tag_curr.tag, timeStamp);
        // insert result
        result.recommandation.push({
            "tag" : tag_curr.tag,
            "rank": tag_curr.rank,
            "freq": tag_curr.freq,
            "pages" : pages_curr
        });
    }
    return result
}

function getAdjustedTopTags(timeStamp) {
    // adjusted ranking based on user feedback
    // directly returns getTopTags for now
    // selects the top 10 tags
    top_tags = getTopTags(timeStamp);
    new_top_tags = {};
    max_tags = 10;

    // sort the tags by frequency from large to small
    sorted_tags = Object.keys(top_tags).sort(function(a,b){return -top_tags[a]+top_tags[b]});

    // select the top tags
    if (sorted_tags.length > max_tags) {
        sorted_tags = sorted_tags.slice(0, max_tags)
    }

    return sorted_tags;
}

function getTopTags(timeStamp) {
    // returns list of tag objects in the form of:
    // tag_object_1.tag = "blah"
    // tag_object_1.rank = 2
    // tag_object_1.freq = 250
    // ranking based on weighted average of daily, weekly, previous hour
    // and overall ranking

    // place holder for testing
    var test_tag = {};

    test_tag.tag = "blah";
    test_tag.rank = 2;
    test_tag.freq = 250;
    // return [test_tag];

    // combines stat from daily, weekly, hourly and overall rankings
    daily_ranks = getDailyRanks(timeStamp);
    weekly_ranks = getWeeklyRanks(timeStamp);
    previous_hourly_ranks = getPreviousHourRanks(timeStamp);
    overall_ranks = getOverallRanks(timeStamp);
    weighted_ranks = mergeRankings(daily_ranks, weekly_ranks);
    weighted_ranks = mergeRankings(weighted_ranks, previous_hourly_ranks);
    weighted_ranks = mergeRankings(weighted_ranks, overall_ranks);
    return weighted_ranks;
}

function mergeRankings(target, source) {
    // merge two rankings
    for (var property in source) {  
        if ( source.hasOwnProperty(property) ) {
            var sourceProperty = source[ property ];
            if ( typeof sourceProperty === 'object' ) {
                target[ property ] = util.merge( target[ property ], sourceProperty );
                continue;
            }
            target[ property ] += sourceProperty;
        }
    }
    for (var a = 2, l = arguments.length; a < l; a++) {
        mergeRankings(target, arguments[a]);
    }
    return target;
};


function getPagesByTag(tagName, timeStamp) {
    // returns list of selected pages 
    // [{"url": "www.blah.com", 
    //   "title": "blah"},
    //  {"url": "www.blah2.com", 
    //   "title": "blah2"}]
    // (max of 5 pages for now)

    // place holder for testing
    return [{"url": "www.blah.com", 
      "title": "blah"},
     {"url": "www.blah2.com", 
      "title": "blah2"}];

}


function updateRanks(timeStamp) {
    // updates the corresponding rankings

    var hrInMicrosec = 1000 * 60 * 60;
    var dayInMicrosec = hrInMicrosec * 24;
    var weekInMicrosec = 1000 * 60 * 60 * 24 * 7;
    var oneWeekAgo = (new Date).getTime() - weekInMicrosec;

    // get the tags & freq during the past hour
    // placeholder
    var last_hour = timeStamp - (timeStamp % hrInMicrosec);
    var next_hour = last_hour + hrInMicrosec;

    // hour_record = getRecord(last_hour , next_hour)
    // new_hour_record = mergeRankings(hour_record, getDailyRanks)

}


function getDailyRanks(timeStamp) {
    // returns ranks in the form of 
    // ["tag_1": score_1, "tag_2" : score_2 ]
    return {"aha": 2, "blah": 3};
}

function getWeeklyRanks(timeStamp) {
    return {"aha": 2, "blah": 8};
}

function getPreviousHourRanks(timeStamp) {
    return {"aha": 2, "blah": 8};
}

function getOverallRanks(timeStamp) {
    return {"aha": 2, "blah": 8};
}

console.log(getAdjustedTopTags(2));


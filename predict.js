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
    // actually merges the value of each property
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

function mergeRankingsWeighted(target, source, source_weight) {
    // merge two rankings by given weight and then normalize them 
    // actually merges the value of each property
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

function trimNormRankings(source,p_max, total_freq) {
    // trims the ranking to top p_max entries 
    // normazlizes total freq down to total_freq

    // check for empty source
    if (source == {}) {
        return {};
    }

    var target = {};
    var p_count = 0;
    var freq_sum = 0;

    // transfer the top tags into target

    top_tags = Object.keys(source).sort(function(a,b){return -source[a]+source[b]});

    for (var tag in top_tags) {
        target[top_tags[tag]] = source[top_tags[tag]];
        freq_sum += source[top_tags[tag]];
        p_count += 1;
        if (p_count >= p_max) {
            break;
        }
    }

    // normalize the new ranking
    if (freq_sum > 0) {
        for (var tag in target) {
            target[tag] = Math.floor(target[tag] * total_freq / freq_sum);
        }
    }
    
    return target;
}


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


function getRecords(start_time, end_time) {
    // placeholder
    return {"aha": 2, "blah": 8, "blahh": 8};
}

function storeRanks(rank_id, ranks) {
    // placeholder
    console.log(rank_id, ranks);
}

function getRanks(rank_id) {
    // placeholder
    return {"aha": 2, "blah": 8, "blahh": 8};
}

function updateRanks(date) {
    // updates the corresponding rankings
    // called at the end of each hour

    var hrInMicrosec = 1000 * 60 * 60;
    var dayInMicrosec = hrInMicrosec * 24;
    var weekInMicrosec = 1000 * 60 * 60 * 24 * 7;
    var oneWeekAgo = (new Date).getTime() - weekInMicrosec;
    var d = date;
    // for tesing
    var d = new Date();

    // update hourly ranks
    // get the tags & freq during the past hour
    var past_hour_start = timeStamp - (timeStamp % hrInMicrosec) - hrInMicrosec;
    var past_hour_end = past_hour_start + hrInMicrosec;

    var hour_ranks = getRecords(past_hour_start , past_hour_end)
    // store the hour ranks
    var hour_rank_id = "H" + String(d.getFullYear()) + String(d.getMonth()) + String(d.getDay()) + String(d.getHours()-1)
    storeRanks(hour_rank_id, hour_ranks);

    // update daily ranks
    // exponential decay factor 
    var alpha = 0.85;
    var total_weight = 10000;
    var max_tags = 100;
    var daily_rank_id = "D" + String(d.getHours()-1);
    // multiply by weight
    var daily_ranks = trimNormRankings(getRanks(daily_rank_id),max_tags, alpha * total_weight);
    var trimmed_hour_ranks = trimNormRankings(hour_ranks, max_tags, (1-alpha) * total_weight);
    // merge the two ranks 
    daily_ranks = trimNormRankings(mergeRankings(daily_ranks, trimmed_hour_ranks), max_tags, total_weight);

    // store the updated daily rank
    storeRanks(daily_rank_id, daily_ranks);

    


}


function getDailyRanks(timeStamp) {
    // returns ranks in the form of 
    // ["tag_1": score_1, "tag_2" : score_2 ]
    return {"aha": 2, "blah": 3};
}

function getWeeklyRanks(timeStamp) {
    return {"aha": 2, "blah": 8, "blahh": 8};
}

function getPreviousHourRanks(timeStamp) {
    return {"aha": 2, "blah": 8};
}

function getOverallRanks(timeStamp) {
    return {"aha": 2, "blah": 8};
}


console.log(trimNormRankings({"aha": 2, "blah": 8, "blsah": 8}, 100 ,1000000));


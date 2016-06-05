
// calls init function for the element 
window.onload = init;

function init() {
    // Initialization work goes here.
    // moniters the time selection screen
    var time_select = document.getElementById('hour');
    time_select.addEventListener("change", createTagCircles);
    time_select.value = (new Date()).getHours();
    createTagCircles();

    // reset to current time
    document.getElementById("reset").addEventListener("click", function () {
        document.getElementById('hour').value = (new Date()).getHours();
    });

}

function createTagCircles() {
    // function that generates tag circles with the top tags 
    var max_circles = 5;
    // obtain given time value
    current_time = document.getElementById('hour').value;
    // get the top tags
    top_tags = getTopTags(current_time);

    // update the top 5 tages 

    for (var i = 0; i < max_circles; i++) {
        if (i < top_tags.length) {
            
            var tag_circle = document.getElementById("tag" + String(i));
            tag_circle.innerHTML = top_tags[i];

            // add page boxes
            createPageLeaves(tag_circle, top_tags[i]);
        }
        else {
            document.getElementById("tag" + String(i)).innerHTML = "__";
        }
    }

}

function createPageLeaves (tag_circle, tag) {
    var pages = getPagesByTag(tag);
    for (var i = 0; i < pages.length; i++) {
        page_object = pages[i];
        // Create a <li> node
        var node = document.createElement("LI");
        // Create a text node
        var textnode = document.createTextNode(page_object.title.link(page_object.url));
        // Append the text to <li>
        node.appendChild(textnode);
        // Append <li> to <ul> with id="myList"        
        tag_circle.appendChild(node);     

    } 
}

function getTopTags(hour) {
    // adjusted ranking based on user feedback
    // directly returns getTopTags for now
    // selects the top 10 tags

    // get the top predictions
    top_tags = getRanks("P" + String(hour));
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


function trimNormRankings(source, p_max, total_freq, scale_factor=1) {
    // trims the ranking to top p_max entries 
    // scales all freq by scale_factor
    // normazlizes total freq down to total_freq
    // no normalization if total_freq = 0

    // check for empty source
    if (source == {}) {
        return {};
    }

    var target = {};
    var p_count = 0;
    var freq_sum = 0;

    // transfer the top tags into target
    var top_tags = Object.keys(source).sort(function(a,b){return -source[a]+source[b]});

    for (var tag in top_tags) {
        target[top_tags[tag]] = source[top_tags[tag]] * scale_factor;
        freq_sum += source[top_tags[tag]];
        p_count += 1;
        if (p_count >= p_max) {
            break;
        }
    }

    // normalize the new ranking
    if ((freq_sum > 0) && (total_freq > 0)) {
        for (var tag in target) {
            target[tag] = Math.floor(target[tag] * total_freq / freq_sum);
        }
    }
    
    return target;
}

function updateRanks(date) {
    // updates the corresponding rankings
    // should be called at the end of each hour
    
    var hrInMicrosec = 1000 * 60 * 60;

    var d = date;
    // for testing
    var d = new Date();
    timeStamp = d.getTime();
    // update hourly ranks
    // get the tags & freq during the past hour
    var past_hour_start = timeStamp - (timeStamp % hrInMicrosec) - hrInMicrosec;
    var past_hour_end = past_hour_start + hrInMicrosec;

    var hour_ranks = getRecords(past_hour_start , past_hour_end)
    // store the hour ranks
    var hour_rank_id = "H" + String(d.getHours()-1)
    storeRanks(hour_rank_id, hour_ranks);

    // update daily ranks
    // exponential decay factor 
    var alpha = 0.85;
    var total_weight = 0;
    var max_tags = 100;
    var daily_rank_id = "D" + String(d.getHours()-1);
    // multiply by weight
    var daily_ranks = trimNormRankings(getRanks(daily_rank_id),max_tags, alpha * total_weight);
    var trimmed_hour_ranks = trimNormRankings(hour_ranks, max_tags, (1-alpha) * total_weight);
    // merge the two ranks 
    daily_ranks = trimNormRankings(mergeRankings(daily_ranks, trimmed_hour_ranks), max_tags, total_weight);

    // store the updated daily rank
    storeRanks(daily_rank_id, daily_ranks);

    // update alltime ranks 
    var alltime_rank_id = "A";
    var alltime_ranks = getRanks(alltime_rank_id);
    var alpha = 0.85;
    var total_weight = 0;
    var max_tags = 100;
    alltime_ranks = trimNormRankings(alltime_ranks, max_tags, alpha * total_weight);
    alltime_ranks = trimNormRankings(mergeRankings(trimmed_hour_ranks, alltime_ranks), max_tags, total_weight);
    // update the corresponding ranking
    storeRanks(alltime_rank_id, alltime_ranks);

    // update weekly ranks
    // only do this after a day has passed
    if (d.getHours() == 0) {
        var past_day_ranks = {};
        // get all records for the past day
        for (var i = 0; i < 23; i++) {
            // get the record of ith hour of past day
            hour_rank_id = "H" + String(i);
            hour_ranks = getRanks(hour_rank_id);
            past_day_ranks = mergeRankings(past_day_ranks, hour_ranks);
        }
        // get the corresponding weekday rank id
        var weekly_rank_id = "W" + String((d.getDay() + 7 - 1) % 7);
        var weekly_ranks = getRanks(weekly_rank_id);
        var alpha = 0.85;
        var total_weight = 0;
        var max_tags = 100;
        past_day_ranks = trimNormRankings(past_day_ranks,max_tags, (1-alpha) * total_weight);
        weekly_ranks = trimNormRankings(weekly_ranks, max_tags, alpha * total_weight);
        weekly_ranks = trimNormRankings(mergeRankings(past_day_ranks, weekly_ranks), max_tags, total_weight);
        // update the corresponding ranking
        storeRanks(weekly_rank_id, weekly_ranks);
    }

    // generate the new prediction ranking for next (current) hour
    // combines stat from daily, weekly, hourly and overall rankings
    daily_ranks = getRanks("D" + String(d.getHours()));
    weekly_ranks = getRanks("W" + String(d.getDay()));
    previous_hourly_ranks = getRanks("H" + String((d.getHours() + 24 - 1) % 24 ));
    overall_ranks = getRanks("A");
    weighted_ranks = mergeRankings(daily_ranks, weekly_ranks);
    weighted_ranks = mergeRankings(weighted_ranks, previous_hourly_ranks);
    weighted_ranks = mergeRankings(weighted_ranks, overall_ranks);
    storeRanks("P" + String(d.getHours()), weighted_ranks);
}

function getPagesByTag(tag) {
    // returns list of selected pages 
    // [{"url": "www.blah.com", 
    //   "title": "blah"},
    //  {"url": "www.blah2.com", 
    //   "title": "blah2"}]
    // (max of 5 pages for now)

    // place holder for testing
    if (tag == "blah") {
        return [{"url": "http://www.google.com", 
                "title": "blah"},
                {"url": "http://www.google.com", 
                "title": "blah2"}];
    }
    return [{"url": "http://www.amazon.com",
      "title": "amazon"},
     {"url": "http://www.google.com",
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

function pageFeedback (page, z) {
    // adds feedback value z for page
    // place holder
    console.log(page, z);
}


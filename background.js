/** Sets up Web SQL  database */

// create database obj, acting as namespace to functions/interfacing
var logger = {};
logger.webdb = {};
logger.webdb.db = null;

// Generic in case of error
logger.webdb.onError = function(tx, e) {
  // console.log("There has been an error: " + e.message);
}

// Generic in case of success
logger.webdb.onSuccess = function(tx, r) {
  // probably for debugging want to print out current db state
  // console.log("So far so good. " + r.message);
}

// Create database
logger.webdb.open = function(mb) {
  var dbSize = mb * 1024 * 1024; // 5 MB
  logger.webdb.db = openDatabase("Data_Log", "", "Log Manager", dbSize);
  // empty version string means any version is fine
}

/** Deletes tables in order of foreign key references 
 * tags, times -> urls -> domains 
 * Tables should also be created in backwards order */
logger.webdb.cleanTables = function() {
  var db = logger.webdb.db;  // for ease of use

  db.transaction(function (tx) {
    tx.executeSql('DROP TABLE tags');
  }); 

  db.transaction(function (tx) {
    tx.executeSql('DROP TABLE times'); 
  });

  db.transaction(function (tx) {
    tx.executeSql('DROP TABLE urls');
  });

  db.transaction(function (tx) {
    tx.executeSql('DROP TABLE domains');   
  });
}

// Creates 3 SQL tables. One for associating url w/ id,
// one time-accesstype table, one domain table, one tags table
// Because there's an order that these need to be made, and js is 
// asynchronous, may need to nest callback functions
logger.webdb.createDataTables = function() {
  var db = logger.webdb.db;  // for ease of use

  // logger.webdb.cleanTables(); // for testing and debugging

  // Create table associating domains with id -- domain table
  db.transaction(function(tx) {
    var tableStats = "domains(id INTEGER NOT NULL PRIMARY KEY," +
                            " domain VARCHAR(20) UNIQUE NOT NULL)";
    // NOTE: the uniqueness means if domain exists, db.transaction 
    // gives error if tries to add again. Be careful when debugging
    tx.executeSql("CREATE TABLE IF NOT EXISTS " + tableStats, []);
  });

  // Create table associating url with id and title -- urls index table
  db.transaction(function(tx) {
    var tableStats = "urls(id INTEGER NOT NULL PRIMARY KEY," +
                        " title VARCHAR(40)," +
                        " url VARCHAR(200) UNIQUE NOT NULL," +
                        " dom_id INT NOT NULL REFERENCES domains(id))";
    // can't seem to auto_incremement, but that should be ok b/c
    /* "webSql (sqlite) PRIMARY KEY automatically increments unless 
     * you pass values. Additional information here: 
     * http://sqlite.org/autoinc.html */
    tx.executeSql("CREATE TABLE IF NOT EXISTS " + tableStats, []);
  });

  // create table associating id with timestamp + access -- log table
  db.transaction(function(tx) {
    var tableStats = "times(id INTEGER NOT NULL REFERENCES urls(id)," +
                        " tmstmp BIGINT NOT NULL," +
                        " access CHAR(1) NOT NULL," +
                        " PRIMARY KEY (id, tmstmp))";
    tx.executeSql("CREATE TABLE IF NOT EXISTS " + tableStats, []);
  });

  // Create table associating tags with id -- tags table
  db.transaction(function(tx) {
    var tableStats = "tags(id INTEGER NOT NULL REFERENCES urls(id)," +
                        " tag VARCHAR(20) NOT NULL," +
                        " PRIMARY KEY (id, tag))";
    // NOTE: Primary key => uniqueness so relevant comment above applies here
    tx.executeSql("CREATE TABLE IF NOT EXISTS " + tableStats, []);
  });
}

/** Deletes record table */
logger.webdb.cleanRecords = function() {
  var db = logger.webdb.db;  // for ease of use

  db.transaction(function (tx) {
    tx.executeSql('DROP TABLE ranks');
  }); 
}

// Creates a table for storing ranks of tag-frequency pairs for GUI usage
logger.webdb.createRecords = function() {
  var db = logger.webdb.db;  // for ease of use

  // logger.webdb.cleanRecords(); // for testing and debugging

  // Create records table
  db.transaction(function(tx) {
    var tableStats = "ranks(id INTEGER NOT NULL," +
                          " tag VARCHAR(40) NOT NULL," + 
                          " freq INTEGER NOT NULL," +
                          " PRIMARY KEY (id, tag, freq))";
    tx.executeSql("CREATE TABLE IF NOT EXISTS " + tableStats, []);
  });
}

/** Function that initializes database, if not already in existence
 * and creates tables, if not already in existence */
function init() {
  logger.webdb.open();
  // console.log("Create db for logging.");
  logger.webdb.createDataTables();
  // console.log("Created tables for db.");
  logger.webdb.createRecords();
  // console.log("Created table for recording tag-frequency pairs.")
}

// Initialize database for use -- This needs to happen first, exists possibility
// of running into asynch problems
init();

/** Parsing ****************************************************************/
var getUrlDomain = function (fullurl) {
  var parsed = document.createElement('a');
  parsed.href = fullurl;
  
  // get domain name tags
    if (parsed.hostname != null) {
      // get domain name and remove "www" part, if any
      // edge case: if any other part of url also include 'www.'
      var domain_name = parsed.hostname.split(/www\.{1}/).pop();
      return domain_name;
    }
}

// limitation: assumes title is in English
var getTags = function(fullurl, title) {
  var tags = [];
  var parsed = document.createElement('a');
  parsed.href = fullurl;

  // get keywords from path name
  if (parsed.pathname != undefined) {
    tags = tags.concat(parsed.pathname.split(/[/+_=.-]+/)
                         .map (function (tag) { return tag.toLowerCase(); })
                  );
  }
  // get keywords from title
  if (title != undefined) {
    tags = tags.concat(title.split(/[ ,.;:]+/)
                         .map (function (tag) { return tag.toLowerCase(); }));
  }

  // filter tags of unwanted words and non words
  return tags.filter(function (word, i) {
    var hitlist = ["", "the", "a", "an", "&", "-", "and", "or", "but", 
    "yet", "so", "for"];
    return hitlist.indexOf(word) == -1 && (/^\w+$/.test(word));
    // '\w' symbol represents [A-Za-z0-9_] re
   })
};

/** Data table logging functions ********************************************/

// could we combine the logging url and domain. Would you ever log one w/out other?
// Log url to 'domains' and 'urls'. Table updating was tested separately. 
logger.webdb.logToUrls_Domain = function(title, fullurl) {
  var db = logger.webdb.db;
  // get domain part of url
  var dname = getUrlDomain(fullurl);

  // update domains table
  db.transaction(function(tx) {
    tx.executeSql("INSERT INTO domains (domain) VALUES (?)",
      // "INSERT INTO domains (domain) SELECT ? FROM domains WHERE NOT EXISTS(SELECT * FROM domains WHERE domain=?)"
      // [dname, dname],
          [dname],
          logger.webdb.onSuccess, 
          // logger.webdb.onError
          function(tx, e) {/*console.log("Error logging domains ");*/}// + dname + e); }
    );
    // update urls table
    tx.executeSql("INSERT INTO urls (title, url, dom_id)" + 
          " VALUES (?, ?, "+
          " (SELECT id FROM domains WHERE domain=?))",
           [title, fullurl, dname],
           logger.webdb.onSuccess,
           // logger.webdb.onError
           function(tx, e) {/*console.log("Error logging urls ");*/}//+ fullurl + e); }
    );
  })
};

// Log tags -- didn't ck tags for redundancies b/c assume database k-v unique
logger.webdb.logToTags = function(fullurl, tagsArray) {
  var db = logger.webdb.db;

  db.transaction(function(tx) {
    tagsArray.forEach(function(tag) {
      tx.executeSql("INSERT INTO tags VALUES ((SELECT id FROM urls WHERE url=?), ?)",
            [fullurl, tag],
            logger.webdb.onSuccess,
            // logger.webdb.onError
            function(tx, e) {/*console.log("Error logging tags ");*/}// + fullurl + tag + e);}
      );
    });
  });
}

// Log times
/* Access tags are defined below:
 * c = new/created = new tab opened or navigated to in new tab
 * e = exited  = tab closed or navigated away from in same tab
 * s = stalled = current tab exists, but switched to another tab
 * r = returned/reactivated = current tab existed, switched back into focus
 */
logger.webdb.logTimes = function(fullurl, tmstmp, access){
  var db = logger.webdb.db;

  db.transaction(function(tx) {
    tx.executeSql("INSERT INTO times VALUES ((SELECT id FROM urls WHERE url=?), ?, ?)",
             [fullurl, tmstmp, access],
             logger.webdb.onSuccess,
             // logger.webdb.onError
             function(tx, e) {/*console.log("Error logging times");*/}//, e);}
    );
  });
}


/** Query db Data tables **************************************************/

/** Generalized query function that takes in a string that is in the format
 * of standard SQL SELECT queries. If the query is successful, the data
 * returned is are acted on by processor, which is a function that takes in
 * 2 args: transaction and results set. 
 */
// Google for more explanation. http://www.html5rocks.com/en/tutorials/webdatabase/todo/
// gives good quick overview
logger.webdb.query = function(fullquery, processor) {
  var db = logger.webdb.db;
  db.transaction(function(tx) {
    tx.executeSql(fullquery, [], processor, logger.webdb.onError);
  });
}

/** Retrieves all tags related to specified url */
// works
logger.webdb.getTags4Url = function(fullurl) {
  var db = logger.webdb.db;

  // function for dealing with returned rows of tags
  function onTagsRetrieved(tx, results) {
    var t = [];
    for (var i = 0; i < results.rows.length; i++) {
      // Each row is a standard JavaScript object indexed by col names,
      // not including rowid.
      var row = results.rows.item(i);
      t.push(row['tag']);
    }
    console.log("Tags of " + fullurl + " = " + t);
    return t;
  };

  db.transaction(function(tx) {
    tx.executeSql("SELECT tag FROM tags WHERE id=(SELECT id FROM urls WHERE url=?)",
                  [fullurl],
                  onTagsRetrieved,
                  function(tx, e) {console.log("Error Tags4Url", e);}
    );
  });
}

// function dealing with returned rows of urls Helper function for Urls4*
function onUrlsRetrieved(tx, results) {
  var u = [];
  var j = 0;
  for (var i = 0; i < results.rows.length; i++) {
    var row = results.rows.item(i);
    var pair = {url: row['url'], title: row['title']}
    u.push(pair);
  }
  console.log("Urls :" + u);
  return u;
};

/** Retrieves all urls related to specified tags => array of objects {title, url}
 * Can modify to return "top n" urls to specified tag */
logger.webdb.getUrls4Tag = function(tag) {
  var db = logger.webdb.db;

  db.transaction(function(tx) {
    tx.executeSql("SELECT * FROM urls WHERE id=(SELECT id FROM tags WHERE tag=?)",
                  [tag],
                  onUrlsRetrieved,
                  function(tx, e) {console.log("Error onUrlsRetrieved", e);}
    );
  });
}

// BUG: What condition is causing is s->s to be logged?
/* folds the time stamps of url into a "normalized total time"
 *     - ignore time intervals \leq \epsilon  (not yet implemented)
 *     - accessed with rapid switching or in long blocks (maybe if has time)
 */
/* In order of decreasing weight:
 * -Edge-              -Scale by-
 * c -> s == r -> s             
 * c -> e == r -> e
 * s -> r
 * s -> e
 */
function fold(tx, results) {
  var cs = 1, ce = 0.9, sr = 0.75, se = 0.5;    // scale factors
  var total = 0;         // running normalized time
  var prevT, prevAc;     // remember previous timestamp

  // rows are returned in chronological order -- as they were logged, which means
  // can proccess like a stream
  for (var i = 0; i < results.rows.length; i++) {
      if (i == 0) {
      prevT = results.rows.item(i)['tmstmp'];
      prevAc = results.rows.item(i)['access'];
    }
    else {
      var row = results.rows.item(i);

      if ((prevAc == 'c' && row['access'] == 's')
           || (prevAc == 'r' && row['access'] == 's')) {
        total += row['tmstmp'] - prevT;
        prevT = row['tmstmp'];
        prevAc = row['access'];
      }
      else if ((prevAc == 'c' && row['access'] == 'e')
                || (prevAc == 'r' && row['access'] == 'e')) {
        total += (row['tmstmp'] - prevT) * 0.9;
        prevT = row['tmstmp'];
        prevAc = row['access'];
      }
      else if (prevAc == 's' && row['access'] == 'r') {
        total += (row['tmstmp'] - prevT) * 0.75;
        prevT = row['tmstmp'];
        prevAc = row['access'];
      }
      else if (prevAc == 's' && row['access'] == 'e') {
        total += (row['tmstmp'] - prevT) * 0.5;
        prevT = row['tmstmp'];
        prevAc = row['access'];
      }
      else {
        console.log("Invalid logging happened at ", row['tmstmp']);
      }
    }
  }
  console.log("fold", total);
  return total;
}

/** Retrieves all time stamps for a given the url's corresponding id (urls table)
 * and folds the time stamps into a "normalized total time" */
logger.webdb.getWeight4UrlId = function (urlId, start_t, end_t) {
  var db = logger.webdb.db;

  db.transaction(function(tx) {
    tx.executeSql("SELECT * FROM times WHERE id=? AND tmstmp BETWEEN ? AND ?",
                  [urlId, start_t, end_t],
                  fold,
                  function(tx, e) {console.log("Error getWeight4UrlId", e)}
    );
  });

}


/** Retrieves all website Ids accesssed within [start_t, end_t) */
logger.webdb.getUrls4Interval = function(start_t, end_t) {
  var db = logger.webdb.db;
  var rec = [];

  function getRecord (tx, result) {
    console.log("rows ", result)
    if (result != undefined) {
      for (var i = 0; i < result.rows.length; i++) {
        var row = result.rows.item(i);
        var w = logger.webdb.getWeight4UrlId(urlId, start_t, end_t);
        console.log(row['url']);
        console.log("w ", w);
        rec.push({url: row['url'], weigh:w})
      }
    }
    console.log(rec);
    return rec;
  }

  // Outputs array of [{url, weight}] pairs
  function getUrl4Id(ids) {
    var db = logger.webdb.db;
    console.log(ids);
    ids.forEach(function(urlId) {
      db.transaction( function(tx) {
        tx.executeSql("SELECT url from urls where id=?", [urlId],
            getRecord,
            function(tx, e) {console.log("Error getRecord", e)});
      });
    });
  }

  // function dealing with returned rows.
  function onUrlIdsRetrieved(tx, results, callback) {
    var ids = []; // keeps track of unique ids, no redundant ids
    console.log("urls retrieved")
    for (var i = 0; i < results.rows.length; i++) {
      // Each row is a standard JavaScript object indexed by col names,
      // not including rowid.
      var row = results.rows.item(i);
      if (ids.indexOf(row['id']) == -1) {
        ids.push(row['id']);
      }
    }
    return callback(ids);
  };

  db.transaction(function(tx) {
    tx.executeSql(//"SELECT * from urls WHERE id=(SELECT id FROM times WHERE tmstmp BETWEEN ? AND ?)",
      "SELECT id FROM times WHERE tmstmp BETWEEN ? AND ?",
                  [start_t, end_t],
                  function(tx, r) {onUrlIdsRetrieved(tx, r, getRecord);},
                  function(tx, e) {console.log("Error Urls4Interval", e);}
    );
  });
}



/** Stores & Extract from db ranks table *****************************************/

// Stores the ranks in form of [{tag, freq}] into table.
logger.webdb.storeRank = function (id, pairs) {
  var db = logger.webdb.db;
  // insert each pair as separate row
  pairs.forEach(function (kfpair) {
    db.transaction(function(tx) {
      tx.executeSql("INSERT INTO ranks VALUES(?, ?, ?)",
        [id, kfpair['tag'], kfpair['freq']],
        webdb.db.onSuccess,
        function(tx, e) {console.log("Error storing ranks ");
      });
    });
  });
}

// Retrieves all rank pairs for a given id
logger.webdb.getRanks = function (id) {
  var db = logger.webdb.db;

  var onRanksRetrieved = function(tx, results) {
    var r = [];
    for (var i = 0; i < results.rows.length; i++) {
      var row = results.rows.item(i);
      var pair = {url: row['tag'], title: row['freq']}
      r.push(pair);
    }
    return r;
  };

  db.transaction(function(tx) {
    tx.executeSql("SELECT * FROM ranks WHERE id=?",
                  [id],
                  onRanksRetrieved,
                  function(tx, e) {console.log("Error getRanks", e);}
    );
  });
}

// Remove pair given id. If jsut removing, let newpairs be empty array
logger.webdb.removeRanks = function (id, callback, newpairs) {
  var db = logger.webdb.db;

  db.transaction(function (tx) {
    tx.executeSql("DELETE FROM ranks WHERE id=?", [id],
                  logger.webdb.onError, logger.webdb.onSuccess);
  });

  callback(id, newpairs);
}

/** Track user browsing behavior ************************************************/

/* Tracks user behavior as they change tabs. Except for first few fcts, all fcts
 * are event triggered */
/* Identifies when user:
 *   - switches between existing tabs
 *   - changes url/link within tab
 *   - when tab is switched in from Google Instant
 */

/* Declare global variable that tracks which tab is currently in view 
 * Initialize to dummy value. */
var viewingId = -1;

// global tabState[tabId] = {lastUniqueUpdate:msTime, lastURL:"http://..."}
// Because history API doesn't notify when tabs are switched between
tabState = {};

var peer = function () {
  console.log(JSON.stringify(tabState));
  console.log("viewingId", viewingId)
};

/* In case extension is invoked in middle of browsing session, with 
 * some windows currently opened, first INITIALIZE dicts with 
 * currently opened tabs. */
chrome.tabs.query({},function(tabs){     
  // console.log("\nIntializing dictionary with all open tabs\n");
  
  // Initializes viewingID to first tab clicked by user
  // Nested fcts b/c javascript executes asynchronously, the only way for 
  // currently set viewingId to be used after it's been determined
  // is to put it in scope of query callback function
  chrome.tabs.query({active: true, currentWindow: true}, function(qtabs) {
    viewingId = qtabs[0].id;

    tabs.forEach(function(tab){
      // update tabState 
      var initTime = (new Date).getTime();
      var tabInfo = {"lastUniqueUpdate":initTime, lastUrl:tab.url};
      tabState[tab.id] = tabInfo; 

      // add each tab to domains, urls, and tags, if not already there
      logger.webdb.logToUrls_Domain(tab.title, tab.url);
      logger.webdb.logToTags(tab.url, getTags(tab.url, tab.title));

      // add each tab to times table.
      if (tab.id != viewingId)
        logger.webdb.logTimes(tab.url, initTime, 's');
      else 
        logger.webdb.logTimes(tab.url, initTime, 'c');
    });
  });
});


/* Fires when new tab is opened */
chrome.tabs.onCreated.addListener(function (newTab) {
  // update tabState 
  var initTime = (new Date).getTime();
  var tabInfo = {"lastUniqueUpdate":initTime, lastUrl:newTab.url};
  tabState[newTab.id] = tabInfo; 

  // add each tab to domains, urls, and tags, if not already there
  logger.webdb.logToUrls_Domain(newTab.title, newTab.url);
  logger.webdb.logToTags(newTab.url, getTags(newTab.url, newTab.title));

  // add each tab to times table.
  logger.webdb.logTimes(newTab.url, initTime, 'c');
  // console.log("Tab created and tracked.", newTab.title);
});


/* Fires upon tab update -- reload/refresh/changed url
 * assumes tabId already tracked */
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, updatedTab) {
  // if (changeInfo.status == "complete" && tabId == viewingId)
  var updateTime = (new Date).getTime();
  
  // if page was refreshed, url should be same, no action
  // if navigated to page, url changed
  if (tabState[tabId].lastUrl != updatedTab.url) {
    // save lastUrl, update tabState[tabId] values
    var lastUrl = tabState[tabId].lastUrl;
    var tabInfo = {"lastUniqueUpdate":updateTime, lastUrl:updatedTab.url};
    tabState[tabId] = tabInfo;

    // log exit in db
    logger.webdb.logTimes(lastUrl, updateTime, 'e');
    // console.log("old url Updated")

    // track updatedTab to tabState

    // add each tab to domains, urls, and tags, if not already there
    logger.webdb.logToUrls_Domain(updatedTab.title, updatedTab.url);
    logger.webdb.logToTags(updatedTab.url, getTags(updatedTab.url, updatedTab.title));

    // add each tab to times table.
    logger.webdb.logTimes(updatedTab.url, updateTime, 'c');

    // console.log(tabId + " updated to " + tabState[tabId]);
  };
});


/* Fires when viewer has switched between tabs */
/* This function is deprecated, so find way to make onUpdated and 
 * onActivated compatible with each other --> known bug, unresolved */
chrome.tabs.onSelectionChanged.addListener(function(tabId, props) {
  
  var switchTime = (new Date).getTime();

  /* using old viewingId, which is the id of tab user was previously on,
   * log switch from previously viewed tab in db */
  /* need to account for case where tab closed and then view switched
   * by checking that viewingId is a key of in tabState, 
   * assming tabState up to date */
  if (viewingId in tabState) {
    logger.webdb.logTimes(tabState[viewingId].lastUrl, switchTime, 's');
  }

  // console.log("Switched attention from tab " + viewingId + " to " + tabId);

  // update viewingId to current tab and get handle on current tab
  viewingId = tabId;

  // log switch from previously viewed tab in db
  // can't just assume continuity b/c onSelectionChanged is fired before onReplaced
  if (viewingId in tabState) {
  logger.webdb.logTimes(tabState[viewingId].lastUrl, switchTime, 'r');
  }
});


/* Fires when an open tab (current or other) is closed. 
 * viewingId should be updated with onSelectionChanged, which should
 * fire after this. */
chrome.tabs.onRemoved.addListener( function (tabId, removeInfo) {
  // save last URL of removed tab
  var lastUrl = tabState[tabId].lastUrl;
  var exitTime = (new Date).getTime();

  // remove tab's Id from tabState b/c no longer need to track
  delete tabState[tabId];

  // should be safe to assume removed tab was already tracked (not tested yet)
  logger.webdb.logTimes(lastUrl, exitTime, 'e');

  // console.log("Tab " + tabId + " was removed.");
});


/* This should only fire for Google Instant in omnibox, but need to keep
 * tabState updated.
 * It appears that on updated is also called? -- Investigate further
 * Perhaps unnecessary b/c accounted for?
 * Also, this is a very poor way of tracking google instant. More useful is 
 * knowing the search term and putting that in the tags. Perhaps use omnibox API?
 */ 
/* Fires after onSelection changed, which is troublesome. */
chrome.tabs.onReplaced.addListener( function (addedTabId, removedTabId) {
  console.log("Operation replace")
  var replaceTime = (new Date).getTime();

  // save lastUrl from tabState[removedTabId]
  var lastUrl = tabState[removedTabId].lastUrl;

  // remove removedTab from tabState b/c no longer need to track
  delete tabState[removedTabId];
  // log exit in db
  logger.webdb.logTimes(lastUrl, replaceTime, 'e');

  // track addedTab to tabState 
  // first get url of addedTabId
  chrome.tabs.get(addedTabId, function (newTab) {
    var tabInfo = {"lastUniqueUpdate":replaceTime, lastUrl:newTab.url};
    tabState[addedTabId] = tabInfo; 

    // add each tab to domains, urls, and tags, if not already there
    logger.webdb.logToUrls_Domain(newTab.title, newTab.url);
    logger.webdb.logToTags(newTab.url, getTags(newTab.url, newTab.title));

    // add each tab to times table.
    logger.webdb.logTimes(newTab.url, replaceTime, 'c');

    // console.log("Tab " + removedTabId + " was replaced by " + addedTabId);
  });
});

//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////
// TESTING for FUNCTIONS using dummy data



// PROBLEM: main query gets the ids related to websites accessed in interval
// but we want urls, so either we can combine the functions, or, what I am
// trying to do, do a separate query to get url from id. But returning that
// is also somewhat problematic, described later.
// THIS A PROBLEM FOR ALL QUERY FUNCTIONS 

chrome.topSites.get( function(mostVisited) {
  mostVisited.forEach( function(site) {
    // console.log(site.title);

    // store urls and domain to database
    logger.webdb.logToUrls_Domain(site.title, site.url);

    // store tags to database
    logger.webdb.logToTags(site.url, getTags(site.url, site.title))
  });

  // PROBLEM: Runs asynchronously, specifically, if I try to return the websites
  // I want, this call is the first to run after db are created, which means
  // it finds no entries... However, if I try console.log(websites) it runs
  // in the order synchro in this encapsulating topsites function
  var l = logger.webdb.getUrls4Interval(1464858334712, 1465039213954);
  // console.log("l is ", l);

  // // log a dummy selection of times
  // // Current time + various other times and access for url = http://www.boredpanda.com/.
  // initTime = 1464858334702;//(new Date).getTime();
  // logger.webdb.logTimes("http://www.boredpanda.com/", initTime, 'c');
  // logger.webdb.logTimes("http://www.boredpanda.com/", initTime+10, 's');
  // logger.webdb.logTimes("http://www.boredpanda.com/", initTime+20, 'r');
  // logger.webdb.logTimes("http://www.boredpanda.com/", initTime+30, 's');
  // logger.webdb.logTimes("http://www.boredpanda.com/", initTime+40, 'e');

  // console.log("Tags return: ", logger.webdb.getTags4Url("http://www.boredpanda.com/"));
  // console.log("Urls return: ", logger.webdb.getUrls4Tag("pandas"));

  // console.log("Stamps: ", logger.webdb.getWeight4UrlId(19, 1464858334712, 1465039213954));
});


//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////

// interfacing functions with predict.js
function getRanks(rank_id) {
    // placeholder
    raw_result = logger.webdb.getRanks(rank_id);
    result = {};
    for (var i in raw_result) {
      tag = i.tag;
      result.tag = i.weigh;
    }
    // return result;

    return {"aha": 2, "blah": 8, "blahh": 8};
}

function storeRanks(rank_id, ranks) {
    // placeholder
    logger.webdb.removeRanks(rank_id);

    result = [];
    for (var tag in ranks) {
      result.append({tag, ranks.tag});
    }

    logger.webdb.storeRanks(rank_id, result);
    console.log(rank_id, ranks);
}

function pageFeedback (page, z) {
    // adds feedback value z for page = {url, title}
    // place holder

    console.log(page, z);
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
  results = {};
  var raw_record = logger.webdb.getUrls4Interval(start_time, end_time);
  for (var i  in raw_record) {
    tags = getTags4Url(i.url)
    for (tag in tags) {
      if (result.hasOwnProperty(tag)) {
        result.tag += i.weigh;
      }
      else {
        result.tag = i.weigh;
      }
    }
  }
  // 
  // return results;
  // placeholder
  return {"aha": 2, "blah": 8, "blahh": 8};
}


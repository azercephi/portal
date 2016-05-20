/** Sets up Web SQL  database */

// create database obj, acting as namespace to functions/interfacing
var logger = {};
logger.webdb = {};
logger.webdb.db = null;

// In case of error
logger.webdb.onError = function(tx, e) {
  alert("There has been an error: " + e.message);
}

// In case of success
logger.webdb.onSuccess = function(tx, r) {
  // probably for debugging want to print out current db state
  alert("So far so good. " + r.message);
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
logger.webdb.createTables = function() {
  var db = logger.webdb.db;  // for ease of use

  logger.webdb.cleanTables();

  // Create table associating domains with id -- domain table
  db.transaction(function(tx) {
    var tableStats = "domains(id INT NOT NULL PRIMARY KEY," +
                            " domain VARCHAR(20) NOT NULL)";
    tx.executeSql("CREATE TABLE IF NOT EXISTS " + tableStats, []);
  });

  // Create table associating url with id -- index table
  db.transaction(function(tx) {
    var tableStats = "urls(id INT NOT NULL PRIMARY KEY," +
                        " url VARCHAR(200) NOT NULL," +
                        " dom_id INT NOT NULL REFERENCES domains(id))";
    // can't seem to auto_incremement, but that should be ok b/c
    /* "webSql (sqlite) PRIMARY KEY automatically increments unless 
     * you pass values. Additional information here: 
     * http://sqlite.org/autoinc.html */
    tx.executeSql("CREATE TABLE IF NOT EXISTS " + tableStats, []);
  });

  // create table associating id with timestamp + access -- log table
  db.transaction(function(tx) {
    var tableStats = "times(id INT NOT NULL REFERENCES urls(id)," +
                        " tmstmp BIGINT NOT NULL," +
                        " access CHAR(1) NOT NULL," +
                        " PRIMARY KEY (id, tmstmp))";
    tx.executeSql("CREATE TABLE IF NOT EXISTS " + tableStats, []);
  });

  // Create table associating tags with id -- tags table
  db.transaction(function(tx) {
    var tableStats = "tags(id INT NOT NULL REFERENCES urls(id)," +
                        " tag VARCHAR(20) NOT NULL," +
                        " PRIMARY KEY (id, tag))";
    tx.executeSql("CREATE TABLE IF NOT EXISTS " + tableStats, []);
  });
}

/** Puts single data entry into specified table
 * domains => fullurl
 * urls    => fullurl
 * times   => fullurl, Object.freeze([timestamp, access])
 * tags    => fullurl, Object.freeze([arrayOfTags]) <-- preprocessed
 */
/* Access tags are defined below:
 * n = new/created = new tab opened or navigated to in new tab
 * e = exited  = tab closed or navigated away from in same tab
 * s = stalled = current tab exists, but switched to another tab
 * r = returned/reactivated = current tab existed, switched back into focus
 */
logger.webdb.logTo = function(tableName, fullurl, entry) { // arrOfEntries) {
  var db = logger.webdb.db;
  var dname = getUrlDomain(fullurl);

  db.transaction(function(tx) {
    if (tableName === "domains") {
      tx.executeSql("INSERT INTO domains (domain) VALUES (?)",
            [entry],
            logger.webdb.onSuccess, logger.webdb.onError);
    }
    else if (tableName === "urls") {
      // get domain part of url
      tx.executeSql("INSERT INTO urls (url, dom_id)" + 
            " VALUES (?, "+
            " (SELECT id FROM domains WHERE domain=?))",
             [entry, dname],
             logger.webdb.onSuccess, logger.webdb.onError);
    }
    else if (tableName === "times") {
      var access = entry[1];
      var tmstmp = entry[0];
      // don't need to specify which columns
      tx.executeSql("INSERT INTO times " + 
            " VALUES ((SELECT id FROM urls WHERE url=" +
            "?, ?, ?)",
             [fullurl, tmstmp, access],
             logger.webdb.onSuccess, logger.webdb.onError);
    }
    else if (tableName === "tags") {
      entry.forEach(function(tag) {
        tx.executeSql("INSERT INTO tags " + 
            " VALUES ((SELECT id FROM urls WHERE url=" +
              "?, ?)",
               [fullurl, tag],
               logger.webdb.onSuccess, logger.webdb.onError);
      });
    }
    else  {
      console.log(" Invalid table name.")
    }
  });
}

// logger.webdb.deleteFrom(tableName, arrOfEntries) {
// http://www.html5rocks.com/en/tutorials/webdatabase/todo/
// }

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

// May eventually want specific query functions
/** Retrieves specified website and access record within [start_t, end_t) */

/** Retrieves all websites that were accessed within [start_t, end_t) */

/** Retrieves all tags related to specified url */

/** Retrieves websites */

/** Function that initializes database, if not already in existence
 * and creates tables, if not already in existence */
function init() {
  logger.webdb.open();
  console.log("Create db for logging.")
  logger.webdb.createTables();
  console.log("Created tables for db.")
}

// Initialize database for use -- This needs to happen first, exists possibility
// of running into asynch problems
init();

/*****************************************************************************/
/** Parsing */

//import 'url';

var getTags = function(fullurl) {
  var tabs = [];
  var parsed = url.parse(fullurl);

  // get domain name tags
  if (parsed.hostname != null) {
    // get domain name tags
    var l = parsed.hostname.split(/[.]/);
    // remove "www" part, if any
    l = l.splice(l.indexOf("www") + 1, l.length);
    // remove ending, if any
    if (null != 
      parsed.hostname.match(/.com\b|.edu\b|.org\b|.net\b|.gov\b|.io\b/g)) {
      l = l.splice(0, l.length - 1);
    }
    // update tags
    tags = tags.concat(l);
  }

  if (parsed.pathname != null) {
    tags = tags.concat(parsed.pathname.split(/[/+_.-]/));
  }

  if (parsed.hash != null) {
     tags = tags.concat(parsed.query.hash.split(/[/+_.-=]/));
  }

  // if (parsed.search != null) {}

  // if (parsed.query != null) {}

  return tags;
};

/*****************************************************************************/
/** Logs the user browsing behavior into database */

var peer = function() {
  console.log(JSON.stringify(tabState));
  console.log(JSON.stringify(pageVisits));
};

var logTabInfo = function(tabId) {
  var actionTime = new Date;
  var indent = "     "
  chrome.tabs.get(tabId, function(tab) {
    console.log(indent + actionTime + " " + tabId.url + " " + tab.title);
  });
};

/* Declare global variable that tracks which tab is currently in view 
 * Initialize to dummy value. */
viewingId = -1;

// global tabState[tabId] = {lastUniqueUpdate:msTime, lastURL:"http://..."}
// Because history API doesn't notify when tabs are switched between
tabState = {};

// global pageVisits[url] = array of times "timeinMS+type"
/* n = new/created = new tab opened or navigated to in new tab
 * e = exited  = tab closed or navigated away from in same tab
 * s = stalled = current tab exists, but switched to another tab
 * r = returned/reactivated = current tab existed, switched back into focus
 */
pageVisits = {};

// Helper function that updates pageVisits & tabState for a newly created tab
var updateDictsNew = function(newTab, tag) {
  // tracks the newTab's id in tabState
  // specifically, update key=tabId and lastUrl: , lastTime:
  var initTime = (new Date).getTime();
  var tabInfo = {"lastUniqueUpdate":initTime, lastUrl:newTab.url};
  tabState[newTab.id] = tabInfo; 

  // update pageVisits
  var timeStamp = initTime.toString() + "+" + tag;
  // if url is already tracked in pageVisits
  if (newTab.url in pageVisits) {
    // append to array "currentTime+n"
    pageVisits[newTab.url].push(timeStamp);
  }
  else {
    // else, create a new key w/ newTab url and val = ["currentTime+n"]
    pageVisits[newTab.url] = [timeStamp];
  }
};

/* In case extension is invoked in middle of browsing session, with 
 * some windows currently opened, first INITIALIZE dicts with 
 * currently opened tabs. */
chrome.tabs.query({},function(tabs){     
  console.log("\nIntializing dictionary with all open tabs\n");
  
  // Initializes viewingID to first tab clicked by user
  chrome.tabs.query({active: true, currentWindow: true}, function(qtabs) {
    viewingId = qtabs[0].id;
    // console.log("Initialize Viewing Id " + viewingId);
    tabs.forEach(function(tab){
      // should be same function as tabs onCreated
      if (tab.id != viewingId)
        updateDictsNew(tab, "s");
      // b/c javascript executes asynchronously, the only way for 
      // currently set viewingId to be used after it's been determined
      // is to put it in scope of query callback function
      else 
        updateDictsNew(tab, "c");
      console.log("Tab tracked.");
    });
    peer();
  });
  // // console.log("Initialize Viewing Id " + viewingId);
  // tabs.forEach(function(tab){
  //   // should be same function as tabs onCreated
  //   if (tab.id != viewingId)
  //     updateDictsNew(tab, "s");
  //   else // This way doesn't work.
  //     updateDictsNew(tab, "c");
  //   console.log("Tab tracked.");
  // });
});

/* Updates dictionaries with info of newly created tab
 * uses updateDictsNew helper function */
chrome.tabs.onCreated.addListener(function (newTab) {
  updateDictsNew(newTab, "n");
  console.log("Tab created and tracked.");
});

/* Updates dictionaries with removed tab info
 * assumes url and tabId already tracked in dicts */
chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
  // save last URL of removed tab
  var lastUrl = tabState[tabId].lastUrl;
  // remove tab's Id from tabState b/c no longer need to track
  delete tabState[tabId];
  console.log("Tab removed and untracked.");

  // append state change to pageVisits "currentTime+e"
  var endTime = (new Date).getTime();
  var timeStamp = endTime.toString() + "+e";
  if (tabId == viewingId) {
    pageVisits[lastUrl].push(timeStamp);
  }
  // otherwise, tab was just closed without being revisited
  else {
    // can be checked by seeing if last timeStamp was +s
    var prevTimeStamp = pageVisits[lastUrl].pop();
    // modify
    // put back in
  }
});

/* Updates dictionaries upon tab update -- reload/refresh/changed url
 * assumes tabId already tracked */
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, updatedTab) {
  // if (changeInfo.status == "complete" && tabId == viewingId)
  var updateT = (new Date).getTime();
  
  // if page was refreshed, url should be same, no action
  // if navigated to page, url changed
  if (tabState[tabId].lastUrl != updatedTab.url) {
    // save lastUrl, update tabState[tabId] values
    var lastUrl = tabState[tabId].lastUrl;
    var tabInfo = {"lastUniqueUpdate":updateT, lastUrl:updatedTab.url};
    tabState[tabId] = tabInfo;
    console.log("tabState updated")

    // for lastUrl, update pageVisits to indicate it was navigated away from
    var timeStamp = updateT + "+e";
    // if url is already tracked in pageVisits
    if (lastUrl in pageVisits) {
      // append to array "currentTime+e"
      pageVisits[lastUrl].push(timeStamp)
    }
    else {
      // else, shouldn't reach this case b/c to be exited means had to 
      // exist in first place
      console.log("ERROR: navigated away from untracked url\n")
    }
    console.log("old url updated")

    // if new url is already tracked in pageVisits
    // update pageVisits
    var newtimeStamp = updateT + "+n";
    // if new url is already tracked in pageVisits
    if (updatedTab.url in pageVisits) {
        // append to array "currentTime+n"
        pageVisits[updatedTab.url].push(timeStamp);
      }
    else {
      // else, create a new key w/ newTab url and val = ["currentTime+n"]
      pageVisits[updatedTab.url] = [timeStamp];
    }
    console.log("new url updated")
  }
});

// This should only fire for Google Instant in omnibox
// It appears that on updated is also called? -- Investigate further
chrome.tabs.onReplaced.addListener( function (addedTabId, removedTabId) {
  var replacedT = (new Date).getTime();

  // save lastUrl from tabState[removedTabId]
  var lastUrl = tabState[removedTabId].lastUrl;
  // remove removedTab's Id from tabState b/c no longer need to track
  delete tabState[removedTabId];
  console.log("Tab removed and untracked.");

  // for lastUrl, update pageVisits
  // append state change to pageVisits "currentTime+e"
  var timeStamp = replacedT + "+e";
  pageVisits[lastUrl].push(timeStamp);
  
  // tracks the addedTabId in tabState
  // first get url of addedTabId
  var addedUrl = chrome.tabs.get(addedTabId, function (tab) {
                   return tab.url;
                 });
  var tabInfo = {"lastUniqueUpdate":replacedT, lastUrl:addedUrl};
  tabState[addedTabId] = tabInfo; 

  // update pageVisits
  var timeStamp = replacedT + "+n";
  // if url is already tracked in pageVisits
  if (addedUrl in pageVisits) {
    // append to array "currentTime+n"
    pageVisits[addedUrl].push(timeStamp);
  }
  else {
    // else, create a new key w/ newTab url and val = ["currentTime+n"]
    pageVisits[addedUrl] = [timeStamp];
  }
});

/* Detects when viewer has switched between tabs */
/* This function is deprecated, so find way to make onUpdated and 
 * onActivated compatible with each other */
chrome.tabs.onSelectionChanged.addListener(function(tabId, props) {
  var switchT = (new Date).getTime();
  // save old viewingId and old url;
  var oldId = viewingId;
  console.log("old viewing Id " + oldId);
  var oldUrl = tabState[oldId].lastUrl;
  // update viewingId to current tab and get handle on current tab
  viewingId = tabId;
  var newUrl = tabState[viewingId].lastUrl;

  // update pageVisits dict for old viewingId
  var timeStamp = switchT + "+s";
  // if url is already tracked in pageVisits
  if (oldUrl in pageVisits) {
    // append to array "currentTime+s"
    pageVisits[oldUrl].push(timeStamp)
  }
  else {
    // else, shouldn't reach this case b/c to be exited means had to 
    // exist in first place
    console.log("ERROR: navigated away from untracked url\n")
  }

  // update pageVisits dict for new viewingId
  var timeStamp = switchT + "+r";
  // if url is already tracked in pageVisits
  if (newUrl in pageVisits) {
    // append to array "currentTime+r"
    pageVisits[newUrl].push(timeStamp)
  }
  else {
    // else, shouldn't reach this case b/c to be exited means had to 
    // exist in first place
    console.log("ERROR: navigated away from untracked url\n")
  }

  peer();
});

/* perhaps use chrome.tabs.getCurrent */
// chrome.tabs.create() could be useful when opening up tabs

/* History API **************************************************************/

/* Time stamps */
var hrInMicrosec = 1000 * 60 * 60;
var dayInMicrosec = hrInMicrosec * 24;
var weekInMicrosec = 1000 * 60 * 60 * 24 * 7;
var oneWeekAgo = (new Date).getTime() - weekInMicrosec;

chrome.history.search({'text':'', 'startTime': oneWeekAgo},
  function(historyItems) {
    historyItems.forEach(function(item) {console.log(item); });
});

chrome.history.addUrl({url:"boredpanda.com"}, function())


/* top Sites API ************************************************************/
// Outputs the top 10 mostVisited sites
// - URL
// - page title
// chrome.topSites.get(function(mostVisited) {
//   mostVisited.forEach(function(site) { console.log(site); });
// });

/* Omnibox API **************************************************************/
// from lullabot
function resetDefaultSuggestion() {
    chrome.omnibox.setDefaultSuggestion({
    description: 'dapi: Search the Drupal API for %s'
    });
  }
  // resets the default omnibox suggestion
  resetDefaultSuggestion();

function navigate(url) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.update(tabs[0].id, {url: url});
    });
  }

chrome.omnibox.onInputEntered.addListener(function(text) {
    navigate("https://api.drupal.org/api/drupal/7/search/" + text);
  });

// simply.io
chrome.experimental.omnibox.onInputChanged.addListener(function (text, suggest) {
    if (text.search('coffee') > -1) {
        var suggestions = [];

        suggestions.push({ content: 'Coffee - Wikipedia', description: 'Coffee - Wikipedia' });
        suggestions.push({ content: 'Starbucks Coffee', description: 'Starbucks Coffee' });

        suggest(suggestions);
    }
});
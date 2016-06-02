/*****************************************************************************/
/** Parsing */ 

var getUrlDomain = function (fullurl) {
  var parsed = document.createElement('a');
  parsed.href = fullurl;
  
  // get domain name tags
    if (parsed.hostname != null) {
      // get domain name and remove "www" part, if any
      var domain_name = parsed.hostname.split(/www/).pop();
      return domain_name;

      // // remove ending, if any
      // if (null != 
      //   parsed.hostname.match(/.com\b|.edu\b|.org\b|.net\b|.gov\b|.io\b/g)) {
      //   l = l.splice(0, l.length - 1);
      // }
    }
}

var getTags = function(fullurl, title) {
    var tags = [];
    var parsed = document.createElement('a');
    parsed.href = fullurl;

  if (parsed.pathname != undefined) {
    tags = tags.concat(parsed.pathname.split(/[/+_.-]/));
  }

  // if (parsed.hash != undefined) {
  //   tags = tags.concat(parsed.query.hash.split(/[/+_.-=]/));
  // }

  if (title != undefined) {
    titlewords = title.split(" ");

    // iterate through array to remove articles
    titlewords.forEach(function(word) {
      if (word != "if" || word != 'the' || word != 'a' || word != 'of' ) {
        tags.push(word);
      }
    });

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
updateDictsNew = function(newTab, access) {
  var db = logger.webdb.db;

  // tracks the newTab's id in tabState
  // specifically, update key=tabId and lastUrl: , lastTime:
  var initTime = (new Date).getTime();
  var tabInfo = {"lastUniqueUpdate":initTime, lastUrl:newTab.url};
  tabState[newTab.id] = tabInfo; 

  // update pageVisits
  var timeStamp = initTime.toString();
  // is full url tracked yet?
  // db.transaction(function (tx) {
  //   tx.executeSql("SELECT * FROM urls WHERE url=?", [newTab.url],
  //     function(tx, results) {
  //       // not results returned means not in table
  //       if (results.length == 0) {
          var dname = getUrlDomain(newTab.url);
  //         // add entry to domains
          db.transaction (function(tx) {
            tx.executeSql("INSERT INTO domains (domain) VALUES (?)",
            [dname], logger.webdb.onSuccess, logger.webdb.onError);
          });

          // add entry to urls
          db.transaction (function(tx) {
            tx.executeSql("INSERT INTO urls (url, dom_id)" + 
            " VALUES (?, "+
            " (SELECT id FROM domains WHERE domain=?))",
             [newTab.url, dname], logger.webdb.onSuccess, logger.webdb.onError);
          });

          // add entry to tags
          var tags = getTags(newTab.url, newTab.title);
          db.transaction (function(tx) {
            tags.forEach(function(kw) {
              tx.executeSql("INSERT INTO tags " + 
            " VALUES ((SELECT id FROM urls WHERE url=" +
              "?, ?)",
               [newTab.url, kw],
               logger.webdb.onSuccess, logger.webdb.onError);
            });
          });
       // }
        // now url is in table regardless, so can safely update times
        db.transaction(function(tx) {
          tx.executeSql("INSERT INTO times " + 
            " VALUES ((SELECT id FROM urls WHERE url=" +
            "?, ?, ?)",
             [newTab.url, timeStamp, access],
             logger.webdb.onSuccess, function(tx, e) {console.log("times");});
        });
        //logger.webdb.logTo("times", newTab.url, Object.freeze([timeStamp, tag]));
      // },
      // logger.webdb.onError);
  //});
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
// var hrInMicrosec = 1000 * 60 * 60;
// var dayInMicrosec = hrInMicrosec * 24;
// var weekInMicrosec = 1000 * 60 * 60 * 24 * 7;
// var oneWeekAgo = (new Date).getTime() - weekInMicrosec;

// chrome.history.search({'text':'', 'startTime': oneWeekAgo},
//   function(historyItems) {
//     historyItems.forEach(function(item) {console.log(item); });
// });

// chrome.history.addUrl({url:"boredpanda.com"}, function())


/* top Sites API ************************************************************/
// Outputs the top 10 mostVisited sites
// - URL
// - page title
// chrome.topSites.get(function(mostVisited) {
//   mostVisited.forEach(function(site) { console.log(site); });
// });

/* Omnibox API **************************************************************/
// from lullabot
// function resetDefaultSuggestion() {
//     chrome.omnibox.setDefaultSuggestion({
//     description: 'dapi: Search the Drupal API for %s'
//     });
//   }
//   // resets the default omnibox suggestion
//   resetDefaultSuggestion();

// function navigate(url) {
//     chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
//     chrome.tabs.update(tabs[0].id, {url: url});
//     });
//   }

// chrome.omnibox.onInputEntered.addListener(function(text) {
//     navigate("https://api.drupal.org/api/drupal/7/search/" + text);
//   });

// // simply.io
// chrome.experimental.omnibox.onInputChanged.addListener(function (text, suggest) {
//     if (text.search('coffee') > -1) {
//         var suggestions = [];

//         suggestions.push({ content: 'Coffee - Wikipedia', description: 'Coffee - Wikipedia' });
//         suggestions.push({ content: 'Starbucks Coffee', description: 'Starbucks Coffee' });

//         suggest(suggestions);
//     }
// });
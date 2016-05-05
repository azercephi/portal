/* Tracks user behavior as they change tabs */
/* Identifies when user:
 *   - switches between existing tabs
 *   - changes url/link within tab
 *   - when tab is switched in from Google Instant
 */

/* Declare global variable that tracks which tab is currently in view 
 * Initialize to dummy value. */
var viewingId = undefined;

// Initializes viewingID to first tab clicked by user
chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
  viewingId = tabs[0].id;
  console.log("query: Initial Tab " + viewingId);
});

/* Detects when viewer has switched between tabs */
/* This function is deprecated, so find way to make onUpdated and 
 * onActivated compatible with each other */
chrome.tabs.onSelectionChanged.addListener(function(tabId, props) {
  viewingId = tabId;
  console.log("Switched tabs to " + viewingId);
  // get and display info
  chrome.tabs.get(viewingId, function(tab) {
    console.log("    " + tab.url);
    console.log("    " + tab.title);
  });
});

// Detects when tab content has changed.
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, updatedTab) {
  if (changeInfo.status == "complete" && tabId == viewingId) {
    console.log(viewingId + " has been updated.");
    /* This way works poorly
    if (changeInfo.url != undefined) {
    console.log("        new URL: " + changeInfo.url);
    console.log("        new title: " + changeInfo.title);
    */
    /* works a bit better */
    // get and display info
    console.log("        new URL: " + updatedTab.url);
    console.log("        new title: " + updatedTab.title);
  }

  /* get tab information 
    chrome.tabs.get(selectedId, function(tab) {
      console.log(tab.url);
    }); */
});

/* Fires when tab is closed */
chrome.tabs.onRemoved.addListener( function (tabId, info) {
  console.log("Tab " + tabId + " was removed");
});

/* Perhaps could use with tab closed
chrome.tabs.onCreated.addListener(function (newTab) {
  console.log("Created new tab: " + newTab.tabId);
  console.log("    " + newTab.url);
  console.log("    " + newTab.title);
}); */

/* Fires when tab is replaced by another tab that Google prepared tab
 * beforehand by using Google Instant predictions */
chrome.tabs.onReplaced.addListener( function (addedTabId, removedTabId) {
  console.log("Tab " + addedTabId + " replaced " + removedTabId);
});

/* perhaps use chrome.tabs.getCurrent */

/* History API **************************************************************/

/* top Sites API ************************************************************/
chrome.topSites.get(function(mostVisited) {
  mostVisited.forEach(function(site) { console.log(site); });
});

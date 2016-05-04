/**
 * Identifies which tab user is currently viewing and
 * prints to console.log in background html */

/* Declare global variable that tracks which tab is currently in view 
 * Initialize to dummy value. */
var viewingId = -1;

// Initializes viewingID to first tab clicked by user
chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
  viewingId = tabs[0].id;
  console.log("query: Initial Tab " + viewingId);
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

/* History API **************************************************************/

/*
chrome.history.search(
			{ 
				'text' : '', 
				'startTime' : start_time, 
				'endTime' : end_time,
				'maxResults' : 100
			}, 
			function (arrayHistItems) {
				var counter = 0;
				arrayHistItems.forEach(function (histItem) {
					counter++;
					if (counter <= 32) {
						console.log("{ id : '" + histItem.id 
							+  "' , url : '" + histItem.url.slice(0, 40) 
							+ "...'} <p>");
					}
				});
			});
			*/
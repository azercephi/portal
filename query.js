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
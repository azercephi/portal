/** Sets up Web SQL  database */

// create database obj, acting as namespace to functions/interfacing
var logger = {};
logger.webdb = {};
logger.webdb.db = null;

// Generic in case of error
logger.webdb.onError = function(tx, e) {
  console.log("There has been an error: " + e.message);
}

// Generic in case of success
logger.webdb.onSuccess = function(tx, r) {
  // probably for debugging want to print out current db state
  console.log("So far so good. " + r.message);
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

  // logger.webdb.cleanTables(); // for testing and debugging

  // Create table associating domains with id -- domain table
  db.transaction(function(tx) {
    var tableStats = "domains(id INTEGER NOT NULL PRIMARY KEY," +
                            " domain VARCHAR(20) UNIQUE NOT NULL)";
    // NOTE: the uniqueness means if domain exists, db.transaction 
    // gives error if tries to add again. Be careful when debugging
    tx.executeSql("CREATE TABLE IF NOT EXISTS " + tableStats, []);
  });

  // Create table associating url with id -- index table
  db.transaction(function(tx) {
    var tableStats = "urls(id INTEGER NOT NULL PRIMARY KEY," +
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

// /** Is website being tracked? */ Why doesn't this work?
// logger.webdb.doesContain = function(url) {
//   var db = logger.webdb.db;
//   var contains;
//   db.transaction(function(tx) {
//     tx.executeSql("SELECT * FROM urls WHERE url=?", [url],
//       // if successful
//       function(tx, results) {
//         if (results.length == 0) { contains = false; }
//         else { contains = true; }
//         console.log("contains " contains);
//       },
//       logger.webdb.onError);
//     console.log("contains " contains);
//   });

//   console.log("contains " contains);
//   return contains;
// }


function updateCarList(transaction, results) {
    //initialise the listitems variable
    var listitems = "";
    //get the car list holder ul
    var listholder = document.getElementById("carlist");

    //clear cars list ul
    listholder.innerHTML = "";

    var i;
    //Iterate through the results
    for (i = 0; i < results.rows.length; i++) {
        //Get the current row
        var row = results.rows.item(i);

        listholder.innerHTML += "<li>" + row.make + " - " + row.model + " (<a href='javascript:void(0);' onclick='deleteCar(" + row.id + ");'>Delete Car</a>)";
    }

}

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

// We will test the logging and retrieving data on dummy data set obtained
// from top sites. This test involves parsing and retrieving

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

/** Log to Database tables **************************************************/

// could we combine the logging url and domain. Would you ever log one w/out other?
// Log url to 'domains' and 'urls'. Table updating was tested separately. 
logger.webdb.logToUrls_Domain = function(fullurl) {
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
          function(tx, e) {console.log("Error logging domains ");}// + dname + e); }
    );
    // update urls table
    tx.executeSql("INSERT INTO urls (url, dom_id)" + 
          " VALUES (?, "+
          " (SELECT id FROM domains WHERE domain=?))",
           [fullurl, dname],
           logger.webdb.onSuccess,
           // logger.webdb.onError
           function(tx, e) {console.log("Error logging urls ");}//+ fullurl + e); }
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
            function(tx, e) {console.log("Error logging tags ");}// + fullurl + tag + e);}
      );
    });
  });
}

// Log times
/* Access tags are defined below:
 * n = new/created = new tab opened or navigated to in new tab
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
             function(tx, e) {console.log("Error logging times");}//, e);}
    );
  });
}

/** Retrieves all tags related to specified url */
logger.webdb.getTags4Url = function(fullurl) {
  var db = logger.webdb.db;

  // function for dealing with returned rows
  function onTagsRetrieved(tx, results) {
    var t = [];
    for (var i = 0; i < results.rows.length; i++) {
      // Each row is a standard JavaScript object indexed by col names,
      // not including rowid.
      var row = results.rows.item(i);
      t.push(row['tag']);
    }
    console.log("Tags of " + fullurl + " = " + t);
  };

  db.transaction(function(tx) {
    tx.executeSql("SELECT * FROM tags WHERE id=(SELECT id FROM urls WHERE url=?)",
                  [fullurl],
                  onTagsRetrieved,
                  function(tx, e) {console.log("Error Tags4Url", e);}
    );
  });
}



// May eventually want specific query functions
/** Retrieves specified website and access record within [start_t, end_t) */


function errorHandler(transaction, error)
{
    // error.message is a human-readable string.
    // error.code is a numeric error code
    alert('Oops.  Error was '+error.message+' (Code '+error.code+')');
 
    // Handle errors here
    var we_think_this_error_is_fatal = true;
    if (we_think_this_error_is_fatal) return true;
    return false;
}
 
function dataHandler(transaction, results)
{
    // Handle the results
    var string = "Green shirt list contains the following people:\n\n";
    for (var i=0; i<results.rows.length; i++) {
        // Each row is a standard JavaScript array indexed by
        // column names.
        var row = results.rows.item(i);
        console.log(row);
        string = string + row['id'] + " (ID "+row['tag']+")\n";
    }
    alert(string);
}



// Actual testing



/** Retrieves all websites accesssed within [start_t, end_t) */
logger.webdb.getInterval_allUrls = function(start_t, end_t) {
  var db = logger.webdb.db;

  // function dealing with returned rows.
  function onUrlIdsRetrieved(tx, results) {
    var ids = []; // keeps track of unique ids
    var wb = [];

    for (var i = 0; i < results.rows.length; i++) {
      // Each row is a standard JavaScript object indexed by col names,
      // not including rowid.
      var row = results.rows.item(i);
      if (ids.indexOf(row['id']) == -1) {
        ids.push(row['id']);

        // // knowing id, get url
        // db.transaction(function(tx) {
        //   tx.executeSql("SELECT url FROM urls WHERE id=?", [row['id']],
        //                 function(tx, r) { console.log(r.rows.item(0)); },
        //                 logger.webdb.onError);
        // });
      }
    }
    console.log(ids);
    return ids;
  };

  db.transaction(function(tx) {
    tx.executeSql("SELECT id FROM times WHERE tmstmp BETWEEN ? AND ?",
                  [start_t, end_t],
                  onUrlIdsRetrieved,
                  function(tx, e) {console.log("Error Tags4Url", e);}
    );
  });
}

chrome.topSites.get( function(mostVisited) {
  mostVisited.forEach( function(site) {
    // console.log(site.title);

    // store urls and domain to database
    logger.webdb.logToUrls_Domain(site.url);

    // store tags to database
    logger.webdb.logToTags(site.url, getTags(site.url, site.title))
  });

  // log a dummy selection of times
  // Current time + various other times and access for url = http://www.boredpanda.com/.
  initTime = 1464858334702;//(new Date).getTime();
  logger.webdb.logTimes("http://www.boredpanda.com/", initTime, 'n');
  logger.webdb.logTimes("http://www.boredpanda.com/", initTime+10, 's');
  logger.webdb.logTimes("http://www.boredpanda.com/", initTime+20, 'r');
  logger.webdb.logTimes("http://www.boredpanda.com/", initTime+30, 's');
  logger.webdb.logTimes("http://www.boredpanda.com/", initTime+40, 'e');

  // logger.webdb.getTags4Url("http://www.boredpanda.com/");
  var l = logger.webdb.getInterval_allUrls(1464858334702, 1464858334740);
  console.log("l is ", l);
});



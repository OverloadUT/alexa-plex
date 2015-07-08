require('dotenv').load();
var Q = require('q');
var dice = require('clj-fuzzy').metrics.dice;
var alexa = require('alexa-app');
var app = new alexa.app('plex');
var plexAPI = require('plex-api');


var plexOptions = {
    product: process.env.APP_PRODUCT,
    version: process.env.APP_VERSION,
    device: process.env.APP_DEVICE,
    deviceName: process.env.APP_DEVICE_NAME,
    identifier: process.env.APP_IDENTIFIER
};
var plex = new plexAPI({
    hostname: process.env.PMS_HOSTNAME,
    username: process.env.PMS_USERNAME,
    port: process.env.PMS_PORT,
    password: process.env.PMS_PASSWORD,
    options: plexOptions
});

// HACK for manually supplying the auth token to plex-api.
// TODO add this as a feature in plex-api rather than this way
plex.authToken = process.env.PMS_AUTHTOKEN;

// Connect the alexa-app to AWS Lambda
//exports.handler = app.lambda();
exports.handler = function(event, context) {

    console.log("Request:", event.request);

    if(event.request.intent) {
        if(event.request.intent.slots) {
            console.log('Slots:', event.request.intent.slots);
        }
    }

    // Send requests to the alexa-app framework for routing
    app.lambda()(event, context);
};

// TODO there is no way to do any pre-logic in alexa-app to validate the appID.
// Need to hack something in or wait for next release.

app.launch(function(request,response) {
    response.say("Plex is listening...");
    response.shouldEndSession(false);
});

//app.error = function(error, request, response) {
//    console.log(error);
//    response.say("There was an error in the Plex App: " + error);
//    response.send();
//};

app.intent('OnDeckIntent', function(request,response) {
    plex.query('/library/onDeck').then(function(result) {

        if(result._children.length === 0) {
            response.say("You do not have any shows On Deck!");
            return response.send();
        }

        var shows = [];

        for(i = 0; i < result._children.length && i < 6; i++) {
            shows.push(result._children[i].grandparentTitle);
        }

        var showsPhraseHyphenized = buildNaturalLangList(shows, 'and', true);
        var showsPhrase = buildNaturalLangList(shows, 'and');

        //console.log(result);

        response.say("On deck you've got " + showsPhraseHyphenized + '.');
        response.card('Plex', showsPhrase + '.', 'On Deck');
        response.send();
    }).catch(function(err) {
        console.log("ERROR from Plex API on Query /library/onDeck");
        console.log(err);
        response.say("I'm sorry, Plex and I don't seem to be getting along right now");
        response.send();
    });

    return false; // This is how you tell alexa-app that this intent is async.
});

app.intent('StartShowIntent', function(request,response) {
    var showName = request.slot('showName', null);

    if(!showName) {
        // TODO ask for which show
        response.say("No show specified");
        return response.send();
    }

    startShow({
        spokenShowName: showName
    }, response).then(function() {
        response.send();
    }).catch(function () {
        response.send();
    });

    return false; // This is how you tell alexa-app that this intent is async.
});

app.intent('StartRandomShowIntent', function(request,response) {
    var showName = request.slot('showName', null);

    if(!showName) {
        // TODO ask for which show
        response.say("No show specified");
        return response.send();
    }

    startShow({
        spokenShowName: showName,
        forceRandom: true
    }, response).then(function() {
        response.send();
    }).catch(function () {
        response.send();
    });

    return false; // This is how you tell alexa-app that this intent is async.
});

function startShow(options, response) {
    if(!options.spokenShowName) {
        Q.reject(new Error('startShow must be provided with a showSpokenName option'));
    }
    var spokenShowName = options.spokenShowName;
    var forceRandom = options.forceRandom || false;

    return getListOfTVShows().then(function(listOfTVShows) {
        var show = findBestMatch(spokenShowName, listOfTVShows._children, function (show) {
            return show.title
        });

        if(!show) {
            // Show name not found
            console.log("Show requested not found: " + spokenShowName);
            response.say("Sorry, I couldn't find that show in your library");
            return Q.reject();
        }

        return getTVShowMetadata(show).then(function (showMetadata) {
            var episode;

            if(!forceRandom) {
                var episode = getFirstUnwatched(showMetadata._children);
            }

            if(episode) {
                response.say("Enjoy the next episode of " + show.title + ": " + episode.title);
                response.card('Plex', 'Playing ' + show.title + ': ' + episode.title, 'Playing Next Episode');
            } else {
                episode = showMetadata._children[randomInt(0, showMetadata._children.length - 1)];
                response.say("Enjoy this episode from Season " + episode.parentIndex + ": " + episode.title);
                response.card('Plex', 'Playing ' + show.title + ': ' + episode.title, 'Playing Random Episode');
            }

            return episode;
        });
    }).then(function(episode) {
        var test = playMedia(episode.key, process.env.PLEXPLAYER_NAME);
        return test;
    }).catch(function(err) {
        console.log("Error thrown in promise chain");
        console.log(err.stack);
        response.say("I'm sorry, Plex and I don't seem to be getting along right now");
        return Q.reject(err);
    });
}

function getListOfTVShows() {
    return plex.query('/library/sections/1/all');
}

function getTVShowMetadata(show) {
    if(typeof show === 'object') {
        show = show.ratingKey;
    }
    return plex.query('/library/metadata/' + show + '/allLeaves');
}

function playMedia(mediaKey, clientName) {
    // We need the server machineIdentifier for the final playMedia request
    return getMachineIdentifier().then(function(serverMachineIdentifier) {

        // Get the Client's IP, which can also be provided as an env var to skip an API call
        return getClientIP(clientName).then(function(clientIP) {
            var keyURI = encodeURIComponent('/library/metadata/' + mediaKey);
            // Yes, there is a double-nested URI encode here. Wacky Plex API!
            var libraryURI = encodeURIComponent('library://' + plex.getIdentifier() + '/item/' + keyURI);

            // To play something on a client, we need to add it to a new "Play Queue"
            return plex.postQuery('/playQueues?type=video&uri='+libraryURI+'&shuffle=0').then(function(result) {
                var playQueueID = result.playQueueID;
                var containerKeyURI=encodeURIComponent('/playQueues/' + playQueueID + '?own=1&window=200');

                var playMediaURI = '/system/players/'+clientIP+'/playback/playMedia' +
                    '?key=' + keyURI +
                    '&offset=0' +
                    '&machineIdentifier=' + serverMachineIdentifier +
                    //'&address=' + process.env.PMS_HOSTNAME + // Address and port aren't needed. Leaving here in case that changes...
                    //'&port=' + process.env.PMS_PORT +
                    '&protocol=http' +
                    '&containerKey=' + containerKeyURI +
                    '&token=transient-9f630d06-956e-410a-847c-ef81962578d4' +
                    '&commandID=1' +
                    '';

                return plex.perform(playMediaURI);
            });
        });
    });
}

function getClientIP(clientname) {
    if(process.env.PLEXPLAYER_IP) {
        return Q.resolve(process.env.PLEXPLAYER_IP);
    } else {
        return plex.find("/clients", {name: clientname}).then(function (clients) {
            var clientMatch;

            if (Array.isArray(clients)) {
                clientMatch = clients[0];
            }

            return Q.resolve(clientMatch.address);
        });
    }
}

function getMachineIdentifier() {
    if (process.env.PMS_IDENTIFIER) {
        return Q.resolve(process.env.PMS_IDENTIFIER);
    } else {
        return plex.query('/').then(function (res) {
            process.env.PMS_IDENTIFIER = res.machineIdentifier;
            return Q.resolve(process.env.PMS_IDENTIFIER);
        });
    }
}

function getFirstUnwatched(shows) {
    var firstepisode;

    for (i = 0; i < shows.length; i++) {
        if ('viewCount' in shows[i]) {
            continue;
        }

        if (firstepisode === undefined) {
            firstepisode = shows[i];
        } else if (!('viewCount' in shows[i])
            && shows[i].parentIndex < firstepisode.parentIndex
            || (shows[i].parentIndex == firstepisode.parentIndex
            && shows[i].index < firstepisode.index)
        ){
            firstepisode = shows[i];
        }
    }

    return firstepisode;
}

function findBestMatch(phrase, items, mapfunc) {
    var MINIMUM = 0.2;
    var bestmatch = {index: -1, score: -1};
    for(i=0; i<items.length; i++) {
        var item = items[i];
        if (mapfunc) {
            item = mapfunc(items[i]);
        }

        var score = dice(phrase, item);

        //console.log(score + ': ' + item);

        if(score >= MINIMUM && score > bestmatch.score) {
            bestmatch.index = i;
            bestmatch.score = score;
        }
    }

    if(bestmatch.index === -1) {
        return false;
    } else {
        return items[bestmatch.index];
    }
}

function buildNaturalLangList(items, finalWord, hyphenize) {
    var output = '';
    for(var i = 0; i<items.length; i++) {
        var item = items[i];
        if(hyphenize) {
            item = item.replace(/ /g, '-');
        }

        if(i === 0) {
            output += item;
        } else if (i < items.length-1) {
            output += ', ' + item;
        } else {
            if(items.length > 2) {
                output += ',';
            }
            output += ' ' + finalWord + ' ' + item;
        }
    }

    return output;
}

function randomInt(low, high) {
    return Math.floor(Math.random() * (high - low) + low);
}

if (process.env.NODE_ENV === 'test') {
    exports._private = {
        getMachineIdentifier: getMachineIdentifier,
        getClientIP: getClientIP,
        getListOfTVShows: getListOfTVShows,
        getTVShowMetadata: getTVShowMetadata,
        startShow: startShow
    }
}
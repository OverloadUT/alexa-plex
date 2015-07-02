require('dotenv').load();
var dice = require('clj-fuzzy').metrics.dice;
var alexa = require('alexa-app');
var app = new alexa.app('plex');
var plexAPI = require('plex-api');
var plex = new plexAPI({
    hostname: process.env.PMS_HOSTNAME,
    username: process.env.PMS_USERNAME,
    port: process.env.PMS_PORT,
    password: process.env.PMS_PASSWORD
});

// Connect the alexa-app to AWS Lambda
exports.handler = app.lambda();

// TODO remove for production - this is only exported for tests at the moment
exports.plex = plex;

// TODO there is no way to do any pre-logic in alexa-app to validate the appID.
// Need to hack something in or wait for next release.

app.launch(function(request,response) {
    response.say("Plex is ready");
});

app.error = function(error, request, response) {
    console.log(error);
    response.say("There was an error in the Plex App.");
    response.send();
};

app.intent('OnDeckIntent', function(request,response) {
    plex.query('/library/onDeck').then(function(result) {
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
    });

    return false; // This is how you tell alexa-app that this intent is async.
});

app.intent('ShowInfoIntent', function(request,response) {
    plex.query('/library/metadata/4357').then(function(result) {
        console.log(result);

        response.say("Temp probably");
        response.card('Plex', '', 'ShowInfoIntent');
        response.send();
    });

    return false; // This is how you tell alexa-app that this intent is async.
});

app.intent('StartShowIntent', function(request,response) {
    // If a show and episode was specified: play it
    // If a show was specified, check if there are any unwatched
    //   If unwatched exists, play oldest one
    //   If unwatched does not exist, play random one (ask to confirm?)

    var showName = request.slot('showName', null);

    if(showName) {
        // Get all TV shows
        plex.query('/library/sections/1/all').then(function(libraryResults) {
            //console.log(shows);

            var show = findBestMatch(showName, libraryResults._children, function(show) {
                return show.title
            });

            plex.query('/library/metadata/' + show.ratingKey + '/allLeaves').then(function(showResults) {
                //console.log(showResults);
                if(show.viewedLeafCount >= show.leafCount) {
                    // We've seen them all, so pick a random one
                    episode = showResults._children[randomInt(0, showResults._children.length-1)];
                    console.log(episode);
                    playMedia(episode.key, process.env.PLEXCLIENT_NAME, function(err, success) {
                        if(err || !success) {
                            response.say("Error: " + err);
                            response.send();
                        } else {
                            response.say("Enjoy this episode from Season " + episode.parentIndex + ": " + episode.title);
                            response.card('Plex', 'Playing ' + show.title + ': ' + episode.title, 'StartShowIntent');
                            response.send();
                        }
                    });
                } else {
                    // Play the next unwatched episode
                    var episode;

                    for(i=0; i<showResults._children.length; i++) {
                        if(episode === undefined && !('viewCount' in showResults._children[i])) {
                            episode = showResults._children[i];
                        } else if(
                            !('viewCount' in showResults._children[i])
                            && showResults._children[i].parentIndex <= episode.parentIndex
                            && showResults._children[i].index < episode.index
                        ){
                            episode = showResults._children[i];
                        }
                    }

                    if(!episode) {
                        response.say("Error: Couldn't find the first unwatched episode");
                        response.send();
                    } else {
                        //console.log(episode);
                        playMedia(episode.key, process.env.PLEXCLIENT_NAME, function(err, success) {
                            if(err || !success) {
                                response.say("Error: " + err);
                                response.send();
                            } else {
                                response.say("Enjoy the next episode of " + show.title + ": " + episode.title);
                                response.card('Plex', 'Playing ' + show.title + ': ' + episode.title, 'StartShowIntent');
                                response.send();
                            }
                        });

                    }
                }
            });
        }).catch(function(err) {
            response.say("Error: " + err);
            response.send();
        })
    } else {
        // TODO ask for which show
        response.say("No show specified");
        response.send();
    }


    //playMedia(4905, process.env.PLEXCLIENT_NAME, function(err, success) {
    //    if(err) {
    //        response.say("There was an error trying to start your show");
    //        response.card('Plex', '', 'StartShowError');
    //        response.send();
    //    } else {
    //        response.say("Enjoy the show!");
    //        response.card('Plex', '', 'StartShowIntent');
    //        response.send();
    //    }
    //});

    return false; // This is how you tell alexa-app that this intent is async.
});

function findBestMatch(phrase, items, mapfunc) {
    var bestmatch = {index: -1, score: -1};
    for(i=0; i<items.length; i++) {
        var item = items[i];
        if (mapfunc) {
            item = mapfunc(items[i]);
        }

        var score = dice(phrase, item);

        //console.log(score + ': ' + item);

        if(score > bestmatch.score) {
            bestmatch.index = i;
            bestmatch.score = score;
        }
    }

    return items[bestmatch.index];
}

function getShow(showName) {

}

function playMedia(mediaKey, client, callback) {
    // We need the server machineIdentifier for the final playMedia request
    getMachineIdentifier(function(err, serverMachineIdentifier) {
        if(err) {
            callback(new Error('Error getting server Machine Identifier'));
        } else {
            // We need the client's address. Could skip this entire call if we already had it
            // TODO see about having the IP address already on hand
            getClient('Aphrodite', function(err, client) {
                clientIP = client.address;

                var keyURI = encodeURIComponent('/library/metadata/' + mediaKey);
                // Yes, there is a double-nested URI encode here. Wacky Plex API!
                var libraryURI = encodeURIComponent('library://' + plex.getIdentifier() + '/item/' + keyURI);

                // To play something on a client, we need to add it to a new "Play Queue"
                plex.postQuery('/playQueues?type=video&uri='+libraryURI+'&shuffle=0').then(function(result) {

                    var playQueueID = result.playQueueID;
                    var containerKeyURI=encodeURIComponent('/playQueues/' + playQueueID + '?own=1&window=200');

                    // Finally, the call to actually start playing the video
                    plex.perform('/system/players/'+clientIP+'/playback/playMedia?key=' + keyURI + ' +' +
                        '&offset=0'+
                        '&machineIdentifier=' + serverMachineIdentifier+
                        //'&address=' + process.env.PMS_HOSTNAME + // Address and port aren't needed. Leaving here in case that changes...
                        //'&port=' + process.env.PMS_PORT +
                        '&protocol=http'+
                        '&containerKey=' + containerKeyURI +
                        '&commandID=1'+
                        ''
                    ).then(function() {
                        callback(null, true);
                    }).catch(function(error) {
                        callback(new Error('Error executing the client playMedia request'));
                    });
                }).catch(function(error) {
                    callback(new Error('Error executing the playQueues POST request'));
                })
            });
        }
    });
}

function getClient(clientname, callback) {
    plex.find("/clients", {name: clientname}).then(function(clients) {
        var clientMatch;

        if (Array.isArray(clients)) {
            clientMatch = clients[0];
        }

        callback(null, clientMatch);
    }).catch(function(error) {
        callback(error);
    });
}

function getMachineIdentifier(callback) {
    if(!process.env.PMS_IDENTIFIER) {
        plex.query('/').then(function(res) {
            process.env.PMS_IDENTIFIER = res.machineIdentifier;
            callback(null, process.env.PMS_IDENTIFIER);
        }).catch(function(error) {
            callback(error);
        });
    } else {
        callback(null, process.env.PMS_IDENTIFIER);
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
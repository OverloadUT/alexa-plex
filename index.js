require('dotenv').load();
var Q = require('q');
var dice = require('clj-fuzzy').metrics.dice;
var alexa = require('alexa-app');
var app = new alexa.app('plex');
var plexAPI = require('plex-api');

var CONFIDICE_CONFIRM_THRESHOLD = 0.4;


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

app.pre = function (request, response, type) {
    if(process.env.ALEXA_APP_ID) {
        if (request.sessionDetails.application.applicationId != "amzn1.echo-sdk-ams.app." + process.env.ALEXA_APP_ID) {
            // Fail silently
            response.send();
        }
    }
};

app.launch(function(request,response) {
    response.say("Plex is listening...");
    response.shouldEndSession(false);
});

// TODO: change this message before production release
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

app.intent('StartSpecificEpisodeIntent', function(request,response) {
    var showName = request.slot('showName', null);
    var episodeNumber = request.slot('episodeNumber', null);
    var seasonNumber = request.slot('seasonNumber', null);

    if(!showName) {
        // TODO ask for which show
        response.say("No show specified");
        return response.send();
    }

    startShow({
        spokenShowName: showName,
        episodeNumber: episodeNumber,
        seasonNumber: seasonNumber
    }, response).then(function() {
        response.send();
    }).catch(function () {
        response.send();
    });

    return false; // This is how you tell alexa-app that this intent is async.
});

app.intent('StartHighRatedEpisodeIntent', function(request,response) {
    var showName = request.slot('showName', null);

    if(!showName) {
        // TODO ask for which show
        response.say("No show specified");
        return response.send();
    }

    startShow({
        spokenShowName: showName,
        forceRandom: true,
        onlyTopRated: 0.10
    }, response).then(function() {
        response.send();
    }).catch(function () {
        response.send();
    });

    return false; // This is how you tell alexa-app that this intent is async.
});

app.intent('YesIntent', function(request,response) {
    promptData = request.session('promptData');

    if(!promptData) {
        console.log('Got a YesIntent but no promptData. Ending session.');
        return response.send();
    }

    if(promptData.yesAction === 'startEpisode') {
        playMedia({
            mediaKey: promptData.mediaKey,
            clientName: process.env.PLEXPLAYER_NAME,
            offset: promptData.mediaOffset || 0
        }).then(function() {
            return response.say(promptData.yesResponse).send();
        }).catch(function(err) {
            console.log("Error on playMedia promise: " + err);
            return response.say("I'm sorry, Plex and I don't seem to be getting along right now").send();
        });
    } else if(promptData.yesAction === 'endSession') {
        return response.say(promptData.yesResponse).send();
    } else {
        console.log("Got an unexpected yesAction. PromptData:");
        console.log(promptData);
        return response.send();
    }

    return false; // This is how you tell alexa-app that this intent is async.
});

app.intent('NoIntent', function(request,response) {
    promptData = request.session('promptData');

    if(!promptData) {
        console.log('Got a NoIntent but no promptData. Ending session.');
        return response.send();
    }

    if(promptData.noAction === 'endSession') {
        return response.say(promptData.noResponse).send();
    } else if(promptData.noAction === 'startEpisode') {
        playMedia({
            mediaKey: promptData.noMediaKey,
            clientName: process.env.PLEXPLAYER_NAME,
            offset: promptData.noMediaOffset || 0
        }).then(function() {
            return response.say(promptData.noResponse).send();
        }).catch(function(err) {
            console.log("Error on playMedia promise: " + err);
            return response.say("I'm sorry, Plex and I don't seem to be getting along right now").send();
        });
    } else {
        console.log("Got an unexpected noAction. PromptData:");
        console.log(promptData);
        return response.send();
    }

    return false; // This is how you tell alexa-app that this intent is async.
});

function startShow(options, response) {
    if(!options.spokenShowName) {
        Q.reject(new Error('startShow must be provided with a spokenShowName option'));
    }

    var spokenShowName = options.spokenShowName;
    var forceRandom = options.forceRandom || false;
    var onlyTopRated = options.onlyTopRated || null;
    var episodeNumber = options.episodeNumber || null;
    var seasonNumber = options.seasonNumber || null;

    var responseSpeech;
    var matchConfidence;

    return getListOfTVShows().then(function(listOfTVShows) {
        var bestShowMatch = getShowFromSpokenName(spokenShowName, listOfTVShows._children);
        var show = bestShowMatch.bestMatch;
        matchConfidence = bestShowMatch.confidence;

        if (!show) {
            // Show name not found
            console.log("Show requested not found: " + spokenShowName);
            response.say("Sorry, I couldn't find that show in your library");
            return Q.reject();
        }

        return getAllEpisodesOfShow(show).then(function (allEpisodes) {
            var episode;
            var viewOffset = 0;

            if(episodeNumber || seasonNumber) {
                // The user specififed a specific episode

                if(!seasonNumber && episodeNumber > 100) {
                    // Allow episode notation of "203" to mean s02e03
                    seasonNumber = Math.floor(episodeNumber / 100);
                    episodeNumber = episodeNumber % 100;
                } else if (!seasonNumber) {
                    seasonNumber = 1;
                }

                var seasonEpisodes = allEpisodes._children.filter(function(ep) {return ep.parentIndex==seasonNumber;});
                if(seasonEpisodes.length === 0) {
                    response.say("I'm sorry, there does not appear to be a season " + seasonNumber + " of " + show.title);
                    return Q.reject();
                }
                episode = seasonEpisodes.filter(function(ep) {return ep.index==episodeNumber})[0];

                if(!episode) {
                    response.say("I'm sorry, there does not appear to be an episode " + episodeNumber + ", season " + seasonNumber + " of " + show.title);
                    return Q.reject();
                } else {
                    responseSpeech = "Alright, here is s" + seasonNumber + "e" + episodeNumber + " of " + show.title + ": " + episode.title;
                }
            } else if(!forceRandom) {
                episode = getFirstUnwatched(allEpisodes._children);

                if(episode) {
                    if(episode.viewOffset > 0) {
                        viewOffset = episode.viewOffset;
                        responseSpeech = "Continuing the next episode of " + show.title + " from where you left off: " + episode.title;
                    } else {
                        responseSpeech = "Enjoy the next episode of " + show.title + ": " + episode.title;
                    }

                }
            }

            if(!episode) {
                // First check to see if there's a partially-watched episode in this show
                episode = findEpisodeWithOffset(allEpisodes._children, onlyTopRated);

                if(episode) {
                    // If there is an episode that is partially-watched, ask the user if they'd like to resume that one,
                    // otherwise they'll get a random episode.
                    var randomEpisode = getRandomEpisode(allEpisodes._children, onlyTopRated);
                    console.log('confidence: ' , matchConfidence);
                    response.session('promptData', {
                        yesAction  : 'startEpisode',
                        yesResponse: "Resuming this episode from Season " + episode.parentIndex + ": " + episode.title,
                        mediaKey   : episode.key,
                        mediaOffset : episode.viewOffset,
                        noResponse : "Alright, then enjoy this episode from Season " + randomEpisode.parentIndex + ": " + randomEpisode.title,
                        noAction   : 'startEpisode',
                        noMediaKey : randomEpisode.key,
                        noMediaOffset : 0
                    });
                    response.shouldEndSession(false);
                    return response.say("It looks like you're part-way through the episode" + episode.title + ". Would you like to resume that one?");
                }

                episode = getRandomEpisode(allEpisodes._children, onlyTopRated);
                responseSpeech = "Enjoy this episode from Season " + episode.parentIndex + ": " + episode.title;
            }

            response.card('Plex', 'Playing ' + show.title + ': ' + episode.title, 'Playing Episode');

            if (matchConfidence >= CONFIDICE_CONFIRM_THRESHOLD) {
                response.say(responseSpeech);
                return playMedia({
                    mediaKey: episode.key,
                    clientName: process.env.PLEXPLAYER_NAME,
                    offset: viewOffset
                });
            } else {
                console.log('confidence: ' , matchConfidence);
                response.session('promptData', {
                    yesAction  : 'startEpisode',
                    yesResponse: responseSpeech,
                    noResponse : 'Oh. Sorry about that.',
                    noAction   : 'endSession',
                    mediaKey   : episode.key,
                    mediaOffset : viewOffset
                });
                response.shouldEndSession(false);
                return response.say('You would like to watch an episode of ' + episode.grandparentTitle + '. Is that correct?');
            }
        });
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

function getAllEpisodesOfShow(show) {
    if(typeof show === 'object') {
        show = show.ratingKey;
    }
    return plex.query('/library/metadata/' + show + '/allLeaves');
}

function playMedia(parameters) {
    var mediaKey = parameters.mediaKey;
    var clientName = parameters.clientName;
    var offset = parameters.offset || 0;

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
                    '&offset=' + offset +
                    '&machineIdentifier=' + serverMachineIdentifier +
                    //'&address=' + process.env.PMS_HOSTNAME + // Address and port aren't needed. Leaving here in case that changes...
                    //'&port=' + process.env.PMS_PORT +
                    '&protocol=http' +
                    '&containerKey=' + containerKeyURI +
                    '&token=transient-9f630d06-956e-410a-847c-ef81962578d4' + // TODO !!!! why is this here? Crap, does it work without it?
                    '&commandID=1' +
                    '';

                console.log(playMediaURI);

                return plex.perform(playMediaURI);
            });
        });
    });
}

function filterEpisodesByBestRated(episodes, topPercent) {
    episodes.sort(function(a, b) {
        if(a.rating && b.rating)
            return a.rating - b.rating; // Shorthand for sort compare
        if(a.rating) {
            return 1;
        }
        if(b.rating) {
            return -1;
        }
        return 0;
    }).reverse();

    episodes = episodes.filter(function(item, i) {
        return i / episodes.length <= topPercent;
    });

    return episodes;
}

function findEpisodeWithOffset(episodes, onlyTopRated) {
    if (onlyTopRated) {
        episodes = filterEpisodesByBestRated(episodes, onlyTopRated);
    }

    var episodesWithOffset = episodes.filter(function(item, i) {
        return item.viewOffset > 0;
    });

    return episodesWithOffset[0];
}

function getRandomEpisode(episodes, onlyTopRated) {
    if (onlyTopRated) {
        episodes = filterEpisodesByBestRated(episodes, onlyTopRated);
    }

    return episodes[randomInt(0, episodes.length - 1)];
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

function getShowFromSpokenName(spokenShowName, listOfShows) {
    return findBestMatch(spokenShowName, listOfShows, function (show) {
        return show.title;
    });
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
        return {
            bestMatch: items[bestmatch.index],
            confidence: bestmatch.score
        };
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
        getTVShowMetadata: getAllEpisodesOfShow,
        startShow: startShow
    }
}
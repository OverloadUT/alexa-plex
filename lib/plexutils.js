var Q = require('q');
var utils = require('./utils.js');
var util = require('util');


function query(api, options) {
    console.time("query: " + options);
    return api.query(options).then(function(response) {
        console.timeEnd("query: " + options);
        return response;
    })
}

function postQuery(api, options) {
    console.time("postQuery: " + options);
    return api.postQuery(options).then(function(response) {
        console.timeEnd("postQuery: " + options);
        return response;
    })
}

function perform(api, options) {
    console.time("perform: " + options);
    return api.perform(options).then(function(response) {
        console.timeEnd("perform: " + options);
        return response;
    })
}

function find(api, options) {
    console.time("find: " + options);
    return api.find(options).then(function(response) {
        console.timeEnd("find: " + options);
        return response;
    })
}

/**
 * Get the list of online servers
 * @returns {Promise.array.object} An array of online servers, as returned by the plex API
 */
var getServers = function(app) {
    return query(app.plex.web, '/api/resources?includeHttps=1').then(function(resources) {
        return resources.MediaContainer.Device.filter(function(resource){
            return (resource.attributes.provides.search(/server/i) != -1 &&
            resource.attributes.presence == '1');
        });
    });
};

/**
 * Get the list of players available to a Plex Media Server for playback
 * @returns {Promise.array.object} An array of online clients capable of playback, as returned by the plex API
 */
var getPlayers = function(app) {
    return query(app.plex.pms, '/clients').then(function(resources) {
        return resources._children.filter(function(resource){
            return (resource.protocolCapabilities.search(/playback/i) != -1
                && resource.product != 'Plex for iOS');
        });
    });
};

/**
 * Get a list of items that are "On Deck"
 * @param {module:App~App} app
 * @param {?Object} library - Optional library object to ask for only items in that library
 * @returns {Object} JSON object of shows/movies/etc on desk
 */
var getOnDeck = function(app, library) {
    if(library) {
        return query(app.plex.pms, library.uri + '/onDeck');
    } else {
        return query(app.plex.pms, '/library/onDeck');
    }
};

/**
 * Gets a list of items that have been recently added, either for all library types or a specific one.
 * @param {module:App~App} app
 * @param {?Object} library - Optional library object to ask for only items in that library
 * @returns {Object} JSON object of shows/movies/etc recently added
 */
var getRecentlyAdded = function(app, library) {
    if (library) {
        return query(app.plex.pms, library.uri + '/recentlyAdded');
    } else {
        return query(app.plex.pms, '/library/recentlyAdded');
    }
};

/**
 * @typedef {Object} PlexAPI.Directory
 */

/**
 * Get a list of available libraries
 * @returns {PlexAPI.Directory} JSON object of "Directories"
 */
var getLibrarySections = function(app) {
    return query(app.plex.pms, '/library/sections');
};

var startShow = function(app, options, response) {
    if(!options.spokenShowName) {
        return Q.reject(new Error('startShow must be provided with a spokenShowName option'));
    }
    if(!options.playerName) {
        return Q.reject(new Error('startShow must be provided with a playerName option'));
    }

    var playerName = options.playerName;
    var spokenShowName = options.spokenShowName;
    var forceRandom = options.forceRandom || false;
    var onlyTopRated = options.onlyTopRated || null;
    var episodeNumber = options.episodeNumber || null;
    var seasonNumber = options.seasonNumber || null;

    var responseSpeech;
    var matchConfidence;

    return getListOfTVShows(app, app.user.TVLibrary).then(function(listOfTVShows) {
        var bestShowMatch = getShowFromSpokenName(spokenShowName, listOfTVShows._children);
        var show = bestShowMatch.bestMatch;
        matchConfidence = bestShowMatch.confidence;

        if (!show) {
            // Show name not found
            console.warn("Show requested not found: " + spokenShowName);
            response.say("Sorry, I couldn't find that show in your library");
            return Q.resolve();
        }

        return getAllEpisodesOfShow(app, show).then(function (allEpisodes) {
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
                    return Q.resolve();
                }
                episode = seasonEpisodes.filter(function(ep) {return ep.index==episodeNumber})[0];

                if(!episode) {
                    response.say("I'm sorry, there does not appear to be an episode " + episodeNumber + ", season " + seasonNumber + " of " + show.title);
                    return Q.resolve();
                } else {
                    responseSpeech = "Alright, here is <say-as interpret-as='digits'>s" + seasonNumber + "e" + episodeNumber + "</say-as> of " + show.title + ": " + episode.title;
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
                        playerName : playerName,
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

            response.card('Playing ' + show.title, 'Playing Season ' + episode.parentIndex + ' Episode ' + episode.index + ': "' + episode.title + '"');

            if (matchConfidence >= app.CONFIDICE_CONFIRM_THRESHOLD) {
                response.say(responseSpeech);
                return playMedia(app, {
                    playerName: playerName, // TODO! this is no longer respected and should be removed. Eventually player selection on each request will be supported
                    mediaKey: episode.key,
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
                    mediaOffset : viewOffset,
                });
                response.shouldEndSession(false);
                return response.say('You would like to watch an episode of ' + episode.grandparentTitle + '. Is that correct?');
            }
        });
    }).catch(function(err) {
        return Q.reject(err);
    });
};

/**
 * Gets a list of all top-level items in a given library. For TV shows this will be the shows, not episodes
 * @param {App~App} app
 * @param {Object} library
 */
var getListOfTVShows = function(app, library) {
    return query(app.plex.pms, library.uri + '/all');
};

var getAllEpisodesOfShow = function(app, show) {
    if(typeof show === 'object') {
        show = show.ratingKey;
    }
    return query(app.plex.pms, '/library/metadata/' + show + '/allLeaves');
};

var playMedia = function(app, parameters) {
    var mediaKey = parameters.mediaKey;
    var offset = parameters.offset || 0;

    var serverIdentifier = getServerIdentifier(app);
    var playerURI = getPlayerURI(app);
    var keyURI = encodeURIComponent(mediaKey);

    var playMediaURI = ''+playerURI+'/playback/playMedia' +
        '?key=' + keyURI +
        '&offset=' + offset +
        '&machineIdentifier=' + serverIdentifier +
        '&protocol=http' +
        '&containerKey=' + keyURI +
        '&commandID=1' + // TODO this is supposed to be an incrementing number on each request
        '';

    return perform(app.plex.pms, playMediaURI);
};

var getPlayerURI = function(app) {
    return app.user.playerURI;
};

var getServerIdentifier = function(app) {
    return app.user.serverIdentifier;
};

var filterEpisodesByExists = function(episodes) {
    return episodes.filter(function(item, i) {
        return (!item.deletedAt)
    });
};

var filterEpisodesByBestRated = function(episodes, topPercent) {
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
};

var findEpisodeWithOffset = function(episodes, onlyTopRated) {
    episodes = filterEpisodesByExists(episodes);
    if (onlyTopRated) {
        episodes = filterEpisodesByBestRated(episodes, onlyTopRated);
    }

    var episodesWithOffset = episodes.filter(function(item, i) {
        return item.viewOffset > 0;
    });

    return episodesWithOffset[0];
};

var getRandomEpisode = function(episodes, onlyTopRated) {
    episodes = filterEpisodesByExists(episodes);
    if (onlyTopRated) {
        episodes = filterEpisodesByBestRated(episodes, onlyTopRated);
    }

    return episodes[utils.randomInt(0, episodes.length - 1)];
};

var getFirstUnwatched = function(episodes) {
    var firstepisode;

    for (var i = 0; i < episodes.length; i++) {
        if ('viewCount' in episodes[i]) {
            continue;
        }

        if (firstepisode === undefined) {
            firstepisode = episodes[i];
        } else if (!('viewCount' in episodes[i])
            && episodes[i].parentIndex < firstepisode.parentIndex
            || (episodes[i].parentIndex == firstepisode.parentIndex
            && episodes[i].index < firstepisode.index)
        ){
            firstepisode = episodes[i];
        }
    }

    return firstepisode;
};

/**
 * Takes a list of shows/movies/episodes (from an On Deck request, for example) and returns an array of show and movie names
 * @param {Object} apiResult - A list of shows/movies/episodes as returned by the Plex API
 * @returns {String[]} An array of show and movie names
 */
var getShowNamesFromList = function(apiResult) {
    var shows = [];

    for(i = 0; i < apiResult._children.length && i < 6; i++) {
        if(apiResult._children[i].type == 'episode') {
            shows.push(apiResult._children[i].grandparentTitle);
        } else if (apiResult._children[i].type == 'season') {
            shows.push(apiResult._children[i].parentTitle);
        }else if (apiResult._children[i].type == 'movie') {
            shows.push(apiResult._children[i].title);
        }
    }

    return shows;
};

var getShowFromSpokenName = function(spokenShowName, listOfShows) {
    return utils.findBestMatch(spokenShowName, listOfShows, function (show) {
        return show.title;
    });
};

module.exports = {
    getServers: getServers,
    getPlayers: getPlayers,
    startShow: startShow,
    getOnDeck: getOnDeck,
    getRecentlyAdded: getRecentlyAdded,
    getListOfTVShows: getListOfTVShows,
    getAllEpisodesOfShow: getAllEpisodesOfShow,
    playMedia: playMedia,
    filterEpisodesByExists: filterEpisodesByExists,
    filterEpisodesByBestRated: filterEpisodesByBestRated,
    findEpisodeWithOffset: findEpisodeWithOffset,
    getRandomEpisode: getRandomEpisode,
    getFirstUnwatched: getFirstUnwatched,
    getShowNamesFromList: getShowNamesFromList,
    getShowFromSpokenName: getShowFromSpokenName,
    getLibrarySections: getLibrarySections
};
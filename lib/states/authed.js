/**
 * @module states/not-authed
 */

var utils = require('../utils');
var plexutils = require('../plexutils');

var setup = function(app) {
    // Ensure that a server and player are on the object with setupDefaults
    return app.user.setupDefaults();
};

var launch = function(request,response) {
    response.say("Plex is listening...");
    response.shouldEndSession(false);
};

var defaultIntent = function(request, response) {
    console.warn("Got an intent in the authed state that was not handled!");
    response.say("Sorry, I am not sure what to do with that request.");
};

var setupIntent = function(request, response) {
    var app = request.data._plex_app;
    app.user.setupDefaults(true).then(function(changed) {
        if(changed) {
            response.say("I'm sorry, right now the only configuration possible is to have me reset your server and player selections, which I " +
                "just did for you. Your server is now set to " + app.user.serverName + ", while your player is " + app.user.playerName + ". " +
                "More robust configuration options are coming soon!");
        } else {
            response.say("I'm sorry, but right now the ability to change your configuration is not supported. This feature is coming soon!");
        }
        response.send();
    }).catch(function(err) {
        app.skill.error(err, request, response);
    });

    return false;
};

var onDeckIntent = function(request, response) {
    var app = request.data._plex_app;
    plexutils.getOnDeck(app, app.user.TVLibrary)
        .then(plexutils.getShowNamesFromList)
        .then(function(showList) {
            if(showList.length === 0) {
                return response.say("You do not have any shows On Deck!").send();
            }

            var showListCard = showList.join('\n');
            var showSpokenListHyphenated = utils.buildNaturalLangList(showList, 'and', true);

            return response.say("On deck you've got " + showSpokenListHyphenated + '.')
                .card("TV Shows Ready to Watch", "On Deck in your TV library: \n\n" + showListCard)
                .send();
        }).catch(function(err) {
            app.skill.error(err, request, response);
        });

    return false;
};

var recentlyAddedIntent = function (request, response) {
    var app = request.data._plex_app;
    var libraryType = request.slot('libraryType', null);
    var library;

    if (libraryType === 'tv shows' || libraryType === 'shows') {
        library = app.user.TVLibrary;
    } else if (libraryType === 'movies' || libraryType === 'films') {
        library = app.user.MovieLibrary;
    }

    plexutils.getRecentlyAdded(app, library)
        .then(plexutils.getShowNamesFromList)
        .then(function (mediaList) {
            if(mediaList.length === 0) {
                return response.say("You have not added any media recently!").send();
            }

            var showListCard = mediaList.join('\n');
            var showSpokenListHyphenated = utils.buildNaturalLangList(mediaList, 'and', true);
            var libraryTypeTitle = ("Recently Added " + (utils.toTitleCase(libraryType) || '')).trim();

            return response.say(libraryTypeTitle + ": " + showSpokenListHyphenated + '.')
                .card(libraryTypeTitle, showListCard)
                .send();
        })
        .catch(function(err) {
            app.skill.error(err, request, response);
        });

    return false;
};

var startShowIntent = function(request,response) {
    var app = request.data._plex_app;
    var showName = request.slot('showName', null);

    if(!showName) {
        // TODO ask for which show
        response.say("No show specified");
        return response.send();
    }

    plexutils.startShow(app, {
        playerName: app.user.playerName,
        spokenShowName: showName
    }, response).then(function() {
        response.send();
    }).catch(function(err) {
        app.skill.error(err, request, response);
    });

    return false; // This is how you tell alexa-app that this intent is async.
};

var startRandomShowIntent = function(request,response) {
    var app = request.data._plex_app;
    var showName = request.slot('showName', null);

    if(!showName) {
        // TODO ask for which show
        response.say("No show specified");
        return response.send();
    }

    plexutils.startShow(app, {
        playerName: app.user.playerName,
        spokenShowName: showName,
        forceRandom: true
    }, response).then(function() {
        response.send();
    }).catch(function(err) {
        app.skill.error(err, request, response);
    });

    return false; // This is how you tell alexa-app that this intent is async.
};

var startSpecificEpisodeIntent = function(request,response) {
    var app = request.data._plex_app;

    var showName = request.slot('showName', null);
    var episodeNumber = request.slot('episodeNumber', null);
    var seasonNumber = request.slot('seasonNumber', null);

    if(!showName) {
        // TODO ask for which show
        response.say("No show specified");
        return response.send();
    }

    plexutils.startShow(app, {
        playerName: app.user.playerName,
        spokenShowName: showName,
        episodeNumber: episodeNumber,
        seasonNumber: seasonNumber
    }, response).then(function() {
        response.send();
    }).catch(function(err) {
        app.skill.error(err, request, response);
    });

    return false; // This is how you tell alexa-app that this intent is async.
};

var startHighRatedEpisodeIntent = function(request,response) {
    var app = request.data._plex_app;

    var showName = request.slot('showName', null);

    if(!showName) {
        // TODO ask for which show
        response.say("No show specified");
        return response.send();
    }

    plexutils.startShow(app, {
        playerName: app.user.playerName,
        spokenShowName: showName,
        forceRandom: true,
        onlyTopRated: 0.10
    }, response).then(function() {
        response.send();
    }).catch(function(err) {
        app.skill.error(err, request, response);
    });

    return false; // This is how you tell alexa-app that this intent is async.
};

var yesIntent = function(request,response) {
    var app = request.data._plex_app;
    var promptData = request.session('promptData');

    if(!promptData) {
        console.log('Got a AMAZON.YesIntent but no promptData. Ending session.');
        return response.send();
    }

    if(promptData.yesAction === 'startEpisode') {
        plexutils.playMedia(app, {
            playerName : promptData.playerName,
            mediaKey: promptData.mediaKey,
            offset: promptData.mediaOffset || 0
        }).then(function() {
            return response.say(promptData.yesResponse).send();
        }).catch(function(err) {
            app.skill.error(err, request, response);
        });
    } else if(promptData.yesAction === 'endSession') {
        return response.say(promptData.yesResponse).send();
    } else {
        console.log("Got an unexpected yesAction. PromptData:");
        console.log(promptData);
        return response.send();
    }

    return false; // This is how you tell alexa-app that this intent is async.
};

var noIntent = function(request,response) {
    var app = request.data._plex_app;
    var promptData = request.session('promptData');

    if(!promptData) {
        console.log('Got a AMAZON.NoIntent but no promptData. Ending session.');
        return response.send();
    }

    if(promptData.noAction === 'endSession') {
        return response.say(promptData.noResponse).send();
    } else if(promptData.noAction === 'startEpisode') {
        plexutils.playMedia(app, {
            playerName : promptData.playerName,
            mediaKey: promptData.noMediaKey,
            offset: promptData.noMediaOffset || 0
        }).then(function() {
            return response.say(promptData.noResponse).send();
        }).catch(function(err) {
            app.skill.error(err, request, response);
        });
    } else {
        console.log("Got an unexpected noAction. PromptData:");
        console.log(promptData);
        return response.send();
    }

    return false; // This is how you tell alexa-app that this intent is async.
};

module.exports = {
    intents: {
        'OnDeckIntent': onDeckIntent,
        'RecentlyAddedIntent': recentlyAddedIntent,
        'StartShowIntent': startShowIntent,
        'StartRandomShowIntent': startRandomShowIntent,
        'StartSpecificEpisodeIntent': startSpecificEpisodeIntent,
        'StartHighRatedEpisodeIntent': startHighRatedEpisodeIntent,
        'AMAZON.YesIntent': yesIntent,
        'AMAZON.NoIntent': noIntent,

        '_default': defaultIntent,

        // TODO currently all point to a stub "not implemented" intent
        'SetupIntent': setupIntent,
        'ContinueSetupIntent': setupIntent,
        'BeginSetupIntent': setupIntent,
        'AuthorizeMeIntent': setupIntent,
        'ChangeSettingsIntent': setupIntent,

        'WhatsNewIntent': require('./common-intents').whatsNewIntent
    },
    launch: launch,
    setup: setup
};
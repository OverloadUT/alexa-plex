// authed state

var common = require('../common.js');
var utils = require('../utils.js');
var plexutils = require('../plexutils.js');
var Q = require('q');

var setup = function() {
    plexutils.initPlexAPI();

    // Ensure that a server and player are on the object with setupDefaults
    return common.user.setupDefaults()
        .then(function() {
            plexutils.initPlexAPI();
        });
};

var launch = function(request,response) {
    response.say("Plex is listening...");
    response.shouldEndSession(false);
};

var defaultIntent = function(request, response) {
    response.say("Sorry, I am not sure what to do with that request.");
};

var setupIntent = function(request, response) {
    console.log(JSON.stringify(common.user.server));
    console.log(JSON.stringify(common.user.player));
    response.say("I'm sorry, but right now the ability to change your configuration is not supported. This feature is coming soon!");
};

var onDeckIntent = function(request, response) {
    plexutils.getOnDeck()
        .then(plexutils.getShowNamesFromList)
        .then(function(showList) {
            if(showList.length === 0) {
                return response.say("You do not have any shows On Deck!").send();
            }
            var showSpokenList = utils.buildNaturalLangList(shows, 'and');
            var showSpokenListHyphenated = utils.buildNaturalLangList(shows, 'and', true);

            return response.say("On deck you've got " + showSpokenListHyphenated + '.')
                .card('Plex', showSpokenList + '.', 'On Deck')
                .send();
        });

    return false;
};

var startShowIntent = function(request,response) {
    var showName = request.slot('showName', null);

    if(!showName) {
        // TODO ask for which show
        response.say("No show specified");
        return response.send();
    }

    plexutils.startShow({
        playerName: common.user.playerName,
        spokenShowName: showName
    }, response).then(function() {
        response.send();
    }).catch(function () {
        response.send();
    });

    return false; // This is how you tell alexa-app that this intent is async.
};

var startRandomShowIntent = function(request,response) {
    var showName = request.slot('showName', null);

    if(!showName) {
        // TODO ask for which show
        response.say("No show specified");
        return response.send();
    }

    plexutils.startShow({
        playerName: common.user.playerName,
        spokenShowName: showName,
        forceRandom: true
    }, response).then(function() {
        response.send();
    }).catch(function () {
        response.send();
    });

    return false; // This is how you tell alexa-app that this intent is async.
};

var startSpecificEpisodeIntent = function(request,response) {
    var showName = request.slot('showName', null);
    var episodeNumber = request.slot('episodeNumber', null);
    var seasonNumber = request.slot('seasonNumber', null);

    if(!showName) {
        // TODO ask for which show
        response.say("No show specified");
        return response.send();
    }

    plexutils.startShow({
        playerName: common.user.playerName,
        spokenShowName: showName,
        episodeNumber: episodeNumber,
        seasonNumber: seasonNumber
    }, response).then(function() {
        response.send();
    }).catch(function () {
        response.send();
    });

    return false; // This is how you tell alexa-app that this intent is async.
};

var startHighRatedEpisodeIntent = function(request,response) {
    var showName = request.slot('showName', null);

    if(!showName) {
        // TODO ask for which show
        response.say("No show specified");
        return response.send();
    }

    plexutils.startShow({
        playerName: common.user.playerName,
        spokenShowName: showName,
        forceRandom: true,
        onlyTopRated: 0.10
    }, response).then(function() {
        response.send();
    }).catch(function () {
        response.send();
    });

    return false; // This is how you tell alexa-app that this intent is async.
};

var yesIntent = function(request,response) {
    var promptData = request.session('promptData');

    if(!promptData) {
        console.log('Got a YesIntent but no promptData. Ending session.');
        return response.send();
    }

    if(promptData.yesAction === 'startEpisode') {
        plexutils.playMedia({
            playerName : promptData.playerName,
            mediaKey: promptData.mediaKey,
            offset: promptData.mediaOffset || 0
        }).then(function() {
            return response.say(promptData.yesResponse).send();
        }).catch(function(err) {
            console.error("Error on playMedia promise");
            console.error(err);
            console.error(err.stack);
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
};

var noIntent = function(request,response) {
    var promptData = request.session('promptData');

    if(!promptData) {
        console.log('Got a NoIntent but no promptData. Ending session.');
        return response.send();
    }

    if(promptData.noAction === 'endSession') {
        return response.say(promptData.noResponse).send();
    } else if(promptData.noAction === 'startEpisode') {
        plexutils.playMedia({
            playerName : promptData.playerName,
            mediaKey: promptData.noMediaKey,
            offset: promptData.noMediaOffset || 0
        }).then(function() {
            return response.say(promptData.noResponse).send();
        }).catch(function(err) {
            console.error("Error on playMedia promise");
            console.error(err);
            return response.say("I'm sorry, Plex and I don't seem to be getting along right now").send();
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
        'StartShowIntent': startShowIntent,
        'StartRandomShowIntent': startRandomShowIntent,
        'StartSpecificEpisodeIntent': startSpecificEpisodeIntent,
        'StartHighRatedEpisodeIntent': startHighRatedEpisodeIntent,
        'YesIntent': yesIntent,
        'NoIntent': noIntent,

        '_default': defaultIntent,

        // TODO currently all point to a stub "not implemented" intent
        'SetupIntent': setupIntent,
        'ContinueSetupIntent': setupIntent,
        'StartSetupIntent': setupIntent,
        'AuthorizeMeIntent': setupIntent,
        'ChangeSettingsIntent': setupIntent,

        'WhatsNewIntent': require('./common-intents').whatsNewIntent
    },
    launch: launch,
    setup: setup
};
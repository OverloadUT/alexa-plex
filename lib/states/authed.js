// authed state

var common = require('../common.js');
var utils = require('../utils.js');
var plexutils = require('../plexutils.js');

var launch = function(request,response) {
        response.say("Plex is listening...");
        response.shouldEndSession(false);
};

var onDeckIntent = function(request, response) {
    common.plex.query('/library/onDeck').then(function(result) {
        if(result._children.length === 0) {
            response.say("You do not have any shows On Deck!");
            return response.send();
        }

        var shows = [];

        for(i = 0; i < result._children.length && i < 6; i++) {
            shows.push(result._children[i].grandparentTitle);
        }

        var showsPhraseHyphenized = utils.buildNaturalLangList(shows, 'and', true);
        var showsPhrase = utils.buildNaturalLangList(shows, 'and');

        response.say("On deck you've got " + showsPhraseHyphenized + '.');
        response.card('Plex', showsPhrase + '.', 'On Deck');
        return response.send();
    }).catch(function(err) {
        console.error("ERROR from Plex API on Query /library/onDeck");
        console.error(err);
        response.say("I'm sorry, Plex and I don't seem to be getting along right now");
        return response.send();
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
            mediaKey: promptData.mediaKey,
            clientName: process.env.PLEXPLAYER_NAME,
            offset: promptData.mediaOffset || 0
        }).then(function() {
            return response.say(promptData.yesResponse).send();
        }).catch(function(err) {
            console.error("Error on playMedia promise");
            console.error(err);
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
            mediaKey: promptData.noMediaKey,
            clientName: process.env.PLEXPLAYER_NAME,
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
        'NoIntent': noIntent
    },
    launch: launch
};
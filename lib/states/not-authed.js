var common = require('../common');
var db = require('../db');
var plexutils = require('../plexutils');
var Q = require('q');

var setup = function() {
    plexutils.initPlexAPI();
    return Q.resolve();
};

var introIntent = function(request, response) {
    response.say("Welcome to the Plex Skill for Amazon Echo! In order to begin using this Skill, you will need to " +
        "allow me to use your Plex account. When you have a few minutes and are in front of a computer with a web browser open, simply say " +
        "'Alexa, ask the Home Theater to begin setup'");
};

var needsNewPin = function(response) {
    common.pinAuth.getNewPin().then(function(pin) {
        db.updatePin(common.user, pin).then(function() {
            var spokenPin = pin.code.split('').join(' ');

            // TODO this really needs SSML to work at all
            response.say("Alright, let's get started. In order to link me to your Plex account you'll need to open your web browser and navigate to Plex dot TV slash link. " +
                "On that page you're going to enter a PIN which I will speak to you in a moment. After you have entered the PIN, simply say 'Alexa, ask " +
                "the Home Theater to continue setup.' I will also put the PIN in your Alexa App for reference. Okay, ready? Your PIN is " + spokenPin + ".");
            // TODO put the PIN in a card
            // TODO reprompt here would probably be good
            response.send();
        });
    });
};

var pinExpired = function(response) {
    common.pinAuth.getNewPin().then(function(pin) {
        db.updatePin(common.user, pin).then(function() {
            var spokenPin = pin.code.split('').join(' ');

            // TODO this really needs SSML to work at all
            response.say("Sorry about that. It appears that your previous PIN expired, so I've generated a new one. Navigate to Plex dot TV slash link " +
                "and enter this new PIN: " + spokenPin + ".");
            // TODO put the PIN in a card
            // TODO reprompt here would probably be good
            response.send();
        });
    });
};

var promptPinAgain = function(response) {
    var pin = common.user.pin;
    var spokenPin = pin.code.split('').join(' ');

    // TODO this really needs SSML to work at all
    response.say("Navigate to Plex dot TV slash link and enter the following PIN: " +
        "Your PIN is " + spokenPin + ".");
    // TODO put the PIN in a card
    // TODO reprompt here would probably be good
    response.send();
};

var setupIntent = function(request, response) {
    if (common.user.pin) {
        common.pinAuth.checkPinForAuth(common.user.pin, function(err, result) {
            if (result === 'authorized') {
                db.updateAuthToken(common.user, common.pinAuth.token).then(function() {
                    return common.user.setupDefaults(true);
                }).then(function() {
                    response.say("Congratulations! I am now linked to your Plex account. To save you some time, I went ahead and made some " +
                        "assumptions about which server and which player you want to use. For the server, I picked " + common.user.serverName +
                        ". And for the player, I picked " + common.user.playerName + ". If you'd like to change this, simply say 'Alexa, ask " +
                        "the home theater to change some settings."); // TODO temp text
                    return response.send();
                });
            } else if (result === 'waiting') {
                promptPinAgain(response);
            } else if (result === 'invalid') {
                pinExpired(response); // TODO needs different copy explaining that the PIN expired
            }
        })
    } else {
        needsNewPin(response);
    }

    return false;
};

module.exports = {
    intents: {
        '_default': introIntent,
        'SetupIntent': setupIntent,
        'ContinueSetupIntent': setupIntent,
        'StartSetupIntent': setupIntent,
        'AuthorizeMeIntent': setupIntent,
        'ChangeSettingsIntent': setupIntent,

        'WhatsNewIntent': require('./common-intents').whatsNewIntent
    },
    launch: introIntent,
    setup: setup
};
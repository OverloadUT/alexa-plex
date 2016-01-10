/**
 * @module states/not-authed
 */

var db = require('../db');
var plexutils = require('../plexutils');
var Q = require('q');

var SPEECH = {
    spokenURL: "Plex dot TV <break strength='medium'/> slash <break strength='medium'/> link. "
};

/**
 * Takes a PIN and generates the SSML to speak it clearly
 * @param {Object} pin - A pin object
 * @param {String} pin.code
 * @returns {string} SSML for the spoken PIN
 */
function generateSpokenPin(pin) {
    return pin.code.split('').map(function(digit) {
        return "<say-as interpret-as='spell-out'>" + digit.toLowerCase() + "</say-as>"
    }).join("<break strength='strong'/>");
}

var setup = function() {
    return Q.resolve();
};

var introIntent = function(request, response) {
    var app = request.data._plex_app;

    console.dir(app);

    if (app.user.pin) {
        // If they already have a PIN, we should just push them to the next step, otherwise it can be confusing.
        setupIntent(request, response);
    } else {
        response.say("Welcome to the Plex Skill for Amazon Echo! In order to begin using this Skill, you will need to " +
            "allow me to use your Plex account. When you have a few minutes and are in front of a computer with a web browser open, simply say " +
            "'Alexa, ask the Home Theater to begin setup'").send();
    }

    return false;
};

var needsNewPin = function(app, response) {
    app.plex.pinAuth.getNewPin().then(function(pin) {
        db.updatePin(app.user, pin).then(function() {
            var spokenPin = generateSpokenPin(pin);

            response.say("Alright, let's get started. In order to link me to your Plex account you'll need to open your web browser and navigate to " + SPEECH.spokenURL +
                "<break strength='x-strong' />On that page enter the following PIN: " + spokenPin + ". <break strength='strong'/> After you have entered the PIN, " +
                "simply say <break strength='strong' /> 'Continue Setup'.");
            response.reprompt("Once again, the website is " + SPEECH.spokenURL + ", and your PIN is " + spokenPin + ". If you need a little more time, that's okay. Simply say <break strength='strong' /> 'Alexa, ask " +
                "the " + app.INVOCATION_NAME + " to continue setup' when you are ready to continue.");
            response.card("Link Alexa to your Plex account", "Open http://plex.tv/link and enter the following PIN: " + pin.code);
            response.shouldEndSession(false);
            response.send();
        });
    }).catch(function(err) {
        app.skill.error(err, request, response);
    });
};

var pinExpired = function(app, response) {
    app.plex.pinAuth.getNewPin().then(function(pin) {
        db.updatePin(app.user, pin).then(function() {
            var spokenPin = generateSpokenPin(pin);

            response.say("Sorry about that. It appears that your previous PIN expired, so I've generated a new one. Navigate to Plex dot TV slash link " +
                "and enter this new PIN: " + spokenPin + ".");
            response.reprompt("Once again, the website is " + SPEECH.spokenURL + ", and your PIN is " + spokenPin + ". If you need a little more time, that's okay. Simply say <break strength='strong' /> 'Alexa, ask " +
                "" + app.INVOCATION_NAME + " to continue setup' when you are ready to continue.");
            response.card("Link Alexa to your Plex account", "Open http://plex.tv/link and enter the following PIN: " + pin.code);
            response.send();
        });
    }).catch(function(err) {
        app.skill.error(err, request, response);
    });
};

var promptPinAgain = function(app, response) {
    var pin = app.user.pin;
    var spokenPin = generateSpokenPin(pin);

    response.say("Navigate to Plex dot TV slash link and enter the following PIN: " +
        "Your PIN is " + spokenPin + ".");
    response.reprompt("Again, your PIN is " + spokenPin + ".");
    response.card("Link Alexa to your Plex account", "Open http://plex.tv/link and enter the following PIN: " + pin.code);
    response.shouldEndSession(false);
    response.send();
};

var setupIntent = function(request, response) {
    var app = request.data._plex_app;

    if (app.user.pin) {
        app.plex.pinAuth.checkPinForAuth(app.user.pin, function(err, result) {
            if(err) {
                app.skill.error(err, request, response);
                return;
            }
            if (result === 'authorized') {
                db.updateAuthToken(app.user, app.plex.pinAuth.token).then(function() {
                    app.user.setupDefaults(true).then(function() {
                        response.say("Congratulations! I am now linked to your Plex account. To save you some time, I went ahead and made some " +
                            "assumptions about which server and which player you want to use. For the server, I picked " + app.user.serverName +
                            ". And for the player, I picked " + app.user.playerName + ". If you'd like to change this, simply say 'Alexa, ask " +
                            "" + app.INVOCATION_NAME + " to change some settings.");
                        return response.send();
                    });
                }).catch(function(err) {
                    app.skill.error(err, request, response);
                });
            } else if (result === 'waiting') {
                promptPinAgain(app, response);
            } else if (result === 'invalid') {
                pinExpired(app, response);
            }
        })
    } else {
        needsNewPin(app, response);
    }

    return false;
};

module.exports = {
    intents: {
        '_default': introIntent,
        'SetupIntent': setupIntent,
        'ContinueSetupIntent': setupIntent,
        'BeginSetupIntent': setupIntent,
        'AuthorizeMeIntent': setupIntent,
        'ChangeSettingsIntent': setupIntent,

        'WhatsNewIntent': require('./common-intents').whatsNewIntent
    },
    launch: introIntent,
    setup: setup
};
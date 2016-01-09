var Q = require('q');
var app = require('./app.js');

var states = {
    'authed': require('./states/authed'),
    'not-authed': require('./states/not-authed')
};

var initAppState = function(state) {
    if (!states[state]) {
        return Q.reject(new RangeError("No state function found: " + state));
    }

    // Set up some common handlers for all states
    // TODO: this could live inside states. Should it?
    app.skill.pre = appPre;
    app.skill.error = appError;

    // Set up the request handlers
    var intents = states[state]['intents'];

    Object.keys(intents).forEach(function (intentname) {
        app.skill.intent(intentname, intents[intentname]);
    });

    if (typeof states[state]['launch'] === 'function') {
        app.skill.launch(states[state]['launch']);
    }

    return runSetup(state);
};

function runSetup(state) {
    if(typeof states[state]['setup'] === 'function') {
        return states[state].setup();
    } else {
        return Q.resolve();
    }
}

function appPre(request, response, type) {
    if(process.env.ALEXA_APP_ID) {
        if (request.sessionDetails.application.applicationId != "amzn1.echo-sdk-ams.app." + process.env.ALEXA_APP_ID) {
            // Fail silently
            console.warn("An attempt was made to launch this app from an unauthorized App ID: " + request.sessionDetails.application.applicationId);
            response.send();
        }
    }
}

function appError(error, request, response) {
    console.error(error);
    console.error(error.stack);

    response.say("I'm sorry, but there was an error in the Plex Skill. The error has been logged and sent to the developer to take a look. Feel free to try your request again!");
    response.send();
}

module.exports.initApp = initAppState;
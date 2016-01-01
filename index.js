require('dotenv').load();
var common = require('./lib/common.js');
var db = require('./lib/db.js');
var stateMachine = require('./lib/statemachine.js');
var User = require('./lib/user');

// HACK this is pretty terrible, but for complicated reasons it's the only way I could get it to work with proxyquire in the unit tests :(
common.PlexAPI = require('plex-api');
common.PlexPinAuth = require('plex-api-pinauth');

// Connect the alexa-app to AWS Lambda
exports.handler = function(event, context) {
    console.log("Request: ", event.request);
    console.log("Session: ", event.session);

    if(event.request.intent) {
        if(event.request.intent.slots) {
            console.log('Slots:', event.request.intent.slots);
        }
    }

    db.initializeUserRecord(event.session.user.userId).then(function(dbuser) {
        common.user = new User(dbuser);

        if(!common.user.authtoken) {
            if(common.user.pin) {
                if(plexutils.checkPin()) {
                    return stateMachine.initApp('just-received-auth');
                } else {
                    return stateMachine.initApp('waiting-for-auth');
                }
            } else {
                return stateMachine.initApp('not-authed');
            }
        } else {
            // We have auth. Verify something else?
            return stateMachine.initApp('authed');
        }
    }).then(function() {
        common.app.lambda()(event, context);
    }).catch(function(err) {
        console.error(err);
    });
};

common.app.pre = function (request, response, type) {
    if(process.env.ALEXA_APP_ID) {
        if (request.sessionDetails.application.applicationId != "amzn1.echo-sdk-ams.app." + process.env.ALEXA_APP_ID) {
            // Fail silently
            response.send();
        }
    }
};

//// TODO: change this message before production release
common.app.error = function(error, request, response) {
    console.error(error);
    response.say("There was an error in the Plex App: " + error);
    response.send();
};

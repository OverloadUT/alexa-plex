require('dotenv').load();
var common = require('./lib/common.js');
var db = require('./lib/db.js');
var stateMachine = require('./lib/statemachine.js');

var PlexAPI = require('plex-api');
var PlexPinAuth = require('plex-api-pinauth');

var plexOptions = {
    product: process.env.APP_PRODUCT,
    version: process.env.APP_VERSION,
    device: process.env.APP_DEVICE,
    deviceName: process.env.APP_DEVICE_NAME,
    identifier: process.env.APP_IDENTIFIER
};

var pinAuth = new PlexPinAuth();
var plex = new PlexAPI({
    hostname: process.env.PMS_HOSTNAME,
    port: process.env.PMS_PORT,
    authenticator: pinAuth,
    options: plexOptions
});

// Inject plex and pinAuth in to the common module namespace so it can be accessed
// HACK this is pretty terrible, but for complicated reasons it's the only way I could get it to work with proxyquire in the unit tests :(
common.plex = plex;
common.pinAuth = pinAuth;

// Connect the alexa-app to AWS Lambda
exports.handler = function(event, context) {
    console.log("Request: ", event.request);
    console.log("Session: ", event.session);

    if(event.request.intent) {
        if(event.request.intent.slots) {
            console.log('Slots:', event.request.intent.slots);
        }
    }

    db.initializeUserRecord(event.session.user.userId).then(function(user) {
        if(!user.authtoken) {
            if(user.pin) {
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
            common.pinAuth.token = user.authtoken;
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

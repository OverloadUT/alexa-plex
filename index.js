require('dotenv').load();
var common = require('./lib/common.js');
var db = require('./lib/db.js');
var stateMachine = require('./lib/statemachine.js');
var User = require('./lib/user');
var Alexa = require('alexa-app');

//console.error = function(err) {
//        console.log(err);
//        console.log(err.stack);
//};

// HACK this is pretty terrible, but it's the only way I could get it to work with proxyquire in the unit tests :(
// There is a better way I'm sure. TODO fix it.
common.PlexAPI = require('plex-api');
common.PlexPinAuth = require('plex-api-pinauth');

/**
 * The main AWS Lambda handler.
 * @param {object} event - The JSON object sent from the Alexa cloud
 * @param {function|object} context - The callback function(s) to resolve the Lambda function
 */
exports.handler = function(event, context) {
    console.log("Request: ", event.request);
    console.log("Session: ", event.session);
    if(event.request.intent) {
        if(event.request.intent.slots) {
            console.log('Slots:', event.request.intent.slots);
        }
    }

    common.app = new Alexa.app('plex');

    db.initializeUserRecord(event.session.user.userId).then(function(dbuser) {
        common.user = new User(dbuser);

        if(!common.user.authtoken) {
            return stateMachine.initApp('not-authed');
        } else {
            return stateMachine.initApp('authed');
        }
    }).then(function() {
        common.app.lambda()(event, context);
    }).catch(function(err) {
        console.error(err);
    });
};

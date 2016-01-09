/**
 * @module
 */

require('dotenv').load();
var app = require('./lib/app');
var db = require('./lib/db');
var stateMachine = require('./lib/statemachine');
var User = require('./lib/user');
var Alexa = require('alexa-app');
var Plex = require('./lib/plex');

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

    app.skill = new Alexa.app('plex');
    app.plex = new Plex.Plex();

    db.initializeUserRecord(event.session.user.userId).then(function(dbuser) {
        app.user = new User(dbuser);
        app.plex.pinAuth.token = app.user.authtoken;

        if(!app.user.authtoken) {
            return stateMachine.initApp('not-authed');
        } else {
            return stateMachine.initApp('authed');
        }
    }).then(function() {
        app.skill.lambda()(event, context);
    }).catch(function(err) {
        console.error(err);
        console.error(err.stack);
    });
};

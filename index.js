/**
 * @module
 */
require('dotenv').load();
var App = require('./lib/app').App;

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

    var app = new App();
    app.execute(event, context);
};

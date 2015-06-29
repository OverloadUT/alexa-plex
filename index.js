var alexa = require('alexa-app');
var app = new alexa.app('plex');

// Connect the alexa-app to AWS Lambda
exports.handler = app.lambda();

// TODO there is no way to do any pre-logic in alexa-app to validate the appID.
// Need to hack something in or wait for next release.

app.launch(function(request,response) {
    response.say("Plex is ready");
});

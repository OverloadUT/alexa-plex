require('dotenv').load();
var alexa = require('alexa-app');
var app = new alexa.app('plex');
var plexAPI = require('plex-api');
var plex = new plexAPI({
    hostname: process.env.PMS_HOSTNAME,
    username: process.env.PMS_USERNAME,
    port: process.env.PMS_PORT,
    password: process.env.PMS_PASSWORD
});

// Connect the alexa-app to AWS Lambda
exports.handler = app.lambda();

// TODO remove for production - this is only exported for tests at the moment
exports.plex = plex;

// TODO there is no way to do any pre-logic in alexa-app to validate the appID.
// Need to hack something in or wait for next release.

app.launch(function(request,response) {
    response.say("Plex is ready");
});

app.intent('OnDeckIntent', function(request,response) {
    plex.query('/library/onDeck').then(function(result) {
        var shows = [];

        for(i = 0; i < result._children.length && i < 6; i++) {
            shows.push(result._children[i].grandparentTitle);
        }

        var showsPhrase = buildNaturalLangList(shows, 'and');

        //console.log(result);

        response.say("On deck you've got " + showsPhrase + '.');
        response.card('Plex', showsPhrase + '.', 'On Deck');
        response.send();
    });

    return false; // This is how you tell alexa-app that this intent is async.
});

//app.intent('StartShowIntent', function(request,response) {
//    plex.query('/library/metadata/4899').then(function(result) {
//        console.log(result);
//
//        response.say("Placeholder");
//        response.card('Plex', showsPhrase + '.', 'StartShowIntent');
//        response.send();
//    });
//
//    return false; // This is how you tell alexa-app that this intent is async.
//});

function buildNaturalLangList(items, finalWord) {
    var output = '';
    for(var i = 0; i<items.length; i++) {
        if(i === 0) {
            output += items[i];
        } else if (i < items.length-1) {
            output += ', ' + items[i];
        } else {
            if(items.length > 2) {
                output += ',';
            }
            output += ' ' + finalWord + ' ' + items[i];
        }
    }

    return output;
}

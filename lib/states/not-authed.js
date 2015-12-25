
var introIntent = function(request, response) {
    response.say("Welcome to the Plex Skill for Amazon Echo! In order to begin using this Skill, you will need to " +
        "allow me to use your Plex account. When you have a few minutes and are in front of a computer, simply say " +
        "'Alexa, ask the Home Theater to begin setup'");
    response.send();

    return false;
};

module.exports = {
    intents: {
        '_default': introIntent,
        'IntroIntent': introIntent
    },
    launch: introIntent
};
/**
 * Tells the user about new functionality in this app
 * @param request
 * @param response
 */
var whatsNewIntent = function(request, response) {
    response.say("Right now, everything is new! Check out your Alexa app for a detailed overview of what you can do with this skill.");
};

module.exports = {
    whatsNewIntent: whatsNewIntent
};
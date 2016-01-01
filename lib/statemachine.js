var Q = require('q');
var common = require('./common.js');

var states = {
    'authed': require('./states/authed'),
    'not-authed': require('./states/not-authed')
};

var initAppState = function(state) {
    if (!states[state]) {
        return Q.reject(new RangeError("No state function found: " + state));
    }

    // Set up the request handlers
    var intents = states[state]['intents'];

    Object.keys(intents).forEach(function (intentname) {
        common.app.intent(intentname, intents[intentname]);
    });

    if (typeof states[state]['launch'] === 'function') {
        common.app.launch(states[state]['launch']);
    }

    if(typeof states[state]['setup'] === 'function') {
        states[state].setup();
    }

    return Q.resolve();
};

module.exports.initApp = initAppState;
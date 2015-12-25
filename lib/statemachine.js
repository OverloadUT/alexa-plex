var Q = require('q');
var common = require('./common.js');

var states = {
    'authed': require('./states/authed'),
    'not-authed': require('./states/not-authed')
};

module.exports.initApp = function(state) {
    if(states[state]) {
        var intents = states[state]['intents'];

        Object.keys(intents).forEach(function(intentname) {
            common.app.intent(intentname, intents[intentname]);
        });

        if(typeof states[state]['launch'] === 'function') {
            common.app.launch(states[state]['launch']);
        }

        return true;
    } else {
        return Q.reject(new Error("No state function found: " + state));
    }
};
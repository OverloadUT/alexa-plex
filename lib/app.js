/**
 * @module App
 */

//var Plex = require('./plex').Plex;
var AlexaSkill = require('alexa-app').app;
var User = require('./user').User;

var db = require('./db');
var stateMachine = require('./statemachine');

/**
 * Creates a new App object, which holds all of the various stateful objects necessary on each request
 * @constructor App
 * @classdesc Holds all of the various stateful objects necessary on each request
 */
var App = function() {
    var Plex = require('./plex').Plex;

    /** @type {module:Plex~Plex} */
    this.plex = new Plex(this);
    /** @type {AlexaSkill} */
    this.skill = new AlexaSkill('plex');

    /** @type {module:User~User} */
    this.user = null;

    /**
     * How confident we need to be when trying to figure out which show a user is talkijng about
     * @const
     */
    this.CONFIDICE_CONFIRM_THRESHOLD = 0.4;

    /**
     * The invocation name used for this app. Used in many responses so put here in case it changes.
     * @const
     * @type {string}
     */
    this.INVOCATION_NAME = "the home theater";
};

App.prototype.execute = function(event, callbacks) {
    var context = this;
    db.initializeUserRecord(event.session.user.userId).then(function(dbuser) {
        context.user = new User(context, dbuser);
        context.plex.pinAuth.token = context.user.authtoken;

        if(!context.user.authtoken) {
            return stateMachine.initSkillState(context, 'not-authed');
        } else {
            return stateMachine.initSkillState(context, 'authed');
        }
    }).then(function() {
        // Pass off the rest of the execution to the alexa-plex module which handles running intents
        // TODO: we're doing so much of our own app framework now that it might make sense to just take over the last few things that alexa-app is handling?
        // HUGE HACK to make this App object available to the Intent handlers running inside the alexa-app module. Another reason why the above note makes sense
        event._plex_app = context;
        context.skill.lambda()(event, callbacks);
    }).catch(function(err) {
        console.error(err);
        console.error(err.stack);
    });
};

module.exports = {
    App: App
};
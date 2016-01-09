/**
 * @module app
 */

/**
 * @name module:app
 */
app = module.exports = {
    /** @type {module:Plex~Plex} */
    plex: null,

    // TODO figure out how to properly jsdoc this so that it is recognized as an alexa-app.app object
    /** @type {Object} */
    skill: null,

    /**
     * How confident we need to be when trying to figure out which show a user is talkijng about
     * @const
     */
    CONFIDICE_CONFIRM_THRESHOLD: 0.4,

    /**
     * The invocation name used for this app. Used in many responses so put here in case it changes.
     * @const
     * @type {string}
     */
    INVOCATION_NAME: "the home theater"
};
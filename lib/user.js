var common = require('./common');

var User = function(dbobject) {
    this.dbobject = dbobject;

    // TODO I am not sure if I like this whole defineProperty stuff. Mostly here to experiment.
    // Some of these will require some async stuff so it'll all need to be converted to Promise functions
    var context = this;
    Object.defineProperty(this, 'authtoken', {
        get: function() {
            return context.dbobject.authtoken;
        }
    });

    Object.defineProperty(this, 'hostname', {
        get: function() {
            if (context.dbobject.pms_hostname) {
                return context.dbobject.pms_hostname;
            } else {
                throw Error('No hostname in user object');
            }
        }
    });

    Object.defineProperty(this, 'port', {
        get: function() {
            if (context.dbobject.pms_port) {
                return context.dbobject.pms_port;
            } else {
                throw Error('No port in user object');
            }
        }
    });

    Object.defineProperty(this, 'https', {
        get: function() {
            // TODO is it smart to assume non-https if the value doesn't exist?
            return context.dbobject.pms_https || false;
        }
    });

    Object.defineProperty(this, 'playerName', {
        get: function() {
            if (context.dbobject.player_name) {
                return context.dbobject.player_name;
            } else {
                throw Error('No player_name in user object');
            }
        }
    });
};

module.exports = User;
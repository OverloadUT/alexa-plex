describe('db module', function() {
    before(function() {
        this.db = require('../lib/db')
    });

    describe('initializeUserRecord', function() {
        it('should return a user record if one was found');
        it('should create a new record if none existed');
        it('should gracefully handle a DB error in the get request');
        it('should gracefully handle a DB error in the put request');
    });

});

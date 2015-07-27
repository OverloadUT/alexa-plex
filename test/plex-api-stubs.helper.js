var proxyquire = require('proxyquire');
var sinon = require('sinon');

exports.plexAPIStubs = function() {
    before('set up main module with stubs for all plex-api methods', function () {
        var self = this;
        this.plexAPIStubs = null;
        this.plexAPIUtils = {
            stubAll      : function () {
                sinon.stub(self.plexAPIStubs, 'query').rejects(new Error('Unhandled URI in query stub'));
                sinon.stub(self.plexAPIStubs, 'postQuery').rejects(new Error('Unhandled URI in postQuery stub'));
                sinon.stub(self.plexAPIStubs, 'perform').rejects(new Error('Unhandled URI in perform stub'));
                sinon.stub(self.plexAPIStubs, 'find').rejects(new Error('Unhandled URI in find stub'));
            }, restoreAll: function () {
                self.plexAPIStubs.query.restore();
                self.plexAPIStubs.postQuery.restore();
                self.plexAPIStubs.perform.restore();
                self.plexAPIStubs.find.restore();
            }, construct : function (opts) {
                self.plexAPIStubs = this;
                self.plexAPIStubs.query = function () {};
                self.plexAPIStubs.postQuery = function () {};
                self.plexAPIStubs.perform = function () {};
                self.plexAPIStubs.find = function () {};
                self.plexAPIStubs.getIdentifier = sinon.stub().returns('STUBBED-IDENTIFIER');
            }
        };

        if(process.env.NODE_ENV === 'test') {
            this.lambda = proxyquire('../index.js', {
                'plex-api': this.plexAPIUtils.construct
            });
        } else if (process.env.NODE_ENV === 'test-live'){
            this.lambda = require('../index.js');
            this.plexAPIUtils.construct();
        }
    });

    beforeEach('Reset all plex-api stubs', function() {
        this.plexAPIUtils.stubAll();
    });

    afterEach('Restore all plex-api stubs to blank methods', function() {
        this.plexAPIUtils.restoreAll();
    });
};

exports.plexAPIResponses = function() {
    beforeEach('Set up query, find, and postQuery stubs', function() {
        this.plexAPIStubs.query.withArgs('/').resolves(require('./samples/root.json'));
        this.plexAPIStubs.query.withArgs(sinon.match(/\/library\/metadata\/[0-9]+$/))
            .resolves(require('./samples/library_metadata_item.json'));
        this.plexAPIStubs.query.withArgs('/library/sections/1/all')
            .resolves(require('./samples/library_section_allshows.json'));
        this.plexAPIStubs.query.withArgs('/library/metadata/1/allLeaves')
            .resolves(require('./samples/library_metadata_showepisodes_withunwatched.json'));
        this.plexAPIStubs.query.withArgs('/library/metadata/259/allLeaves')
            .resolves(require('./samples/library_metadata_showepisodes_withunwatched_withpartial.json'));
        this.plexAPIStubs.query.withArgs('/library/metadata/143/allLeaves')
            .resolves(require('./samples/library_metadata_showepisodes_allwatched.json'));
        this.plexAPIStubs.query.withArgs('/library/metadata/298/allLeaves')
            .resolves(require('./samples/library_metadata_showepisodes_allwatched_withpartial.json'));

        this.plexAPIStubs.postQuery.withArgs(sinon.match(/\/playQueues/))
            .resolves(require('./samples/playqueues.json'));

        this.plexAPIStubs.perform.withArgs(sinon.match(/\/playMedia/))
            .resolves();

        this.plexAPIStubs.find.withArgs('/clients')
            .resolves(require('./samples/clients.json'));
    });
};
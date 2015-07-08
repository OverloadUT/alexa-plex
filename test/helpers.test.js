var expect = require('chai').expect;
var sinon = require('sinon');

describe('API Helpers', function() {
    require('./plex-api-stubs.helper.js').plexAPIStubs();

    describe('getClientIP', function() {

        it('should return the IP from cache without an API call', function () {
            process.env.PLEXPLAYER_IP = "MOCHATEST_CACHED_PLAYER_IP";

            var self = this;
            return expect(this.lambda._private.getClientIP('clientname'))
                .to.eventually.equal('MOCHATEST_CACHED_PLAYER_IP')
                .then(function(){
                    expect(self.plexAPIStubs.find).to.not.have.been.called;
                });
        });

        it('should call the API to get an IP if not cached', function () {
            delete process.env.PLEXPLAYER_IP;

            this.plexAPIStubs.find.withArgs('/clients')
                .resolves(require('./samples/clients.json'));

            var self = this;
            return expect(this.lambda._private.getClientIP('clientname'))
                .to.eventually.equal('STUBBED_CLIENT_ADDRESS_FROM_API_CALL')
                .then(function(){
                    expect(self.plexAPIStubs.find).to.have.been.calledOnce;
                });
        });

        it('should reject the promise on a failed API call', function () {
            delete process.env.PMS_IDENTIFIER;

            this.plexAPIStubs.find.withArgs('/clients')
                .rejects(new Error("Stub error from Plex API"));

            return expect(this.lambda._private.getClientIP('clientname'))
                .to.be.rejected;
        });
    });

    describe('getMachineIdentifier', function() {

        it('should return the identifier from cache without an API call', function () {
            process.env.PMS_IDENTIFIER = "MOCHATEST_CACHED_MACHINE_ID";

            var self = this;
            return expect(this.lambda._private.getMachineIdentifier())
                .to.eventually.equal('MOCHATEST_CACHED_MACHINE_ID')
                .then(function(){
                    expect(self.plexAPIStubs.query).to.not.have.been.called;
                });
        });

        it('should call the API to get the identifier if not cached', function () {
            delete process.env.PMS_IDENTIFIER;

            this.plexAPIStubs.query.withArgs('/')
                .resolves(require('./samples/root.json'));

            var self = this;
            return expect(this.lambda._private.getMachineIdentifier())
                .to.eventually.equal('STUBBED_SERVER_MACHINE_IDENTIFIER_FROM_API_CALL')
                .then(function(){
                    expect(self.plexAPIStubs.query).to.have.been.calledOnce;
                });
        });

        it('should reject the promise on a failed API call', function () {
            delete process.env.PMS_IDENTIFIER;

            this.plexAPIStubs.query.withArgs('/')
                .rejects(new Error("Stub error from Plex API"));

            return expect(this.lambda._private.getMachineIdentifier())
                .to.be.rejected;
        });
    });

    describe('getListOfTVShows', function() {

        it('should return a list of TV shows', function () {
            this.plexAPIStubs.query.withArgs('/library/sections/1/all')
                .resolves(require('./samples/library_section_allshows.json'));

            var self = this;
            return expect(this.lambda._private.getListOfTVShows())
                .to.eventually.be.an('object')
                .then(function(){
                    expect(self.plexAPIStubs.query).to.have.been.calledOnce;
                });
        });

        it('should reject the promise on a failed API call', function () {
            this.plexAPIStubs.query.withArgs('/library/sections/1/all')
                .rejects(new Error("Stub error from Plex API"));

            return expect(this.lambda._private.getListOfTVShows())
                .to.be.rejected;
        });
    });

    describe('getTVShowMetadata', function() {

        it('should work with a provided show key as an integer', function () {
            this.plexAPIStubs.query.withArgs('/library/metadata/5/allLeaves')
                .resolves(require('./samples/library_metadata_showepisodes_allwatched.json'));

            var self = this;
            return expect(this.lambda._private.getTVShowMetadata(5))
                .to.eventually.be.an('object')
                .then(function(){
                    expect(self.plexAPIStubs.query).to.have.been.calledOnce;
                });
        });

        it('should work with a provided show key as a string', function () {
            this.plexAPIStubs.query.withArgs('/library/metadata/6/allLeaves')
                .resolves(require('./samples/library_metadata_showepisodes_allwatched.json'));

            var self = this;
            return expect(this.lambda._private.getTVShowMetadata('6'))
                .to.eventually.be.an('object')
                .then(function(){
                    expect(self.plexAPIStubs.query).to.have.been.calledOnce;
                });
        });

        it('should work with a provided show object', function () {
            this.plexAPIStubs.query.withArgs('/library/metadata/7/allLeaves')
                .resolves(require('./samples/library_metadata_showepisodes_allwatched.json'));

            var self = this;
            return expect(this.lambda._private.getTVShowMetadata({ratingKey:7}))
                .to.eventually.be.an('object')
                .then(function(){
                    expect(self.plexAPIStubs.query).to.have.been.calledOnce;
                });
        });

        it('should reject the promise on a failed API call', function () {
            this.plexAPIStubs.query.withArgs('/library/metadata/6/allLeaves')
                .rejects(new Error("Stub error from Plex API"));

            return expect(this.lambda._private.getTVShowMetadata(6))
                .to.be.rejected;
        });
    });

    describe('startShow', function() {
        require('./plex-api-stubs.helper.js').plexAPIResponses();

        before(function() {
            this.responseStub = {
                say: sinon.stub(),
                card: sinon.stub()
            }
        });

        afterEach(function() {
            this.responseStub.say.reset();
            this.responseStub.card.reset();
        });

        it("should require a spokenShowName option", function () {
            return expect(this.lambda._private.startShow({}, this.responseStub))
                .to.be.rejected;
        });

        it("should play the next unwatched episode if it's available", function () {
            var self = this;
            return expect(this.lambda._private.startShow({spokenShowName:'a show with unwatched episodes'}, this.responseStub))
                .to.be.fulfilled
                .then(function(){
                    expect(self.responseStub.say).to.have.been.calledWithMatch(/next episode of/);
                });
        });

        it("should play a random episode if no unwatched show is available", function () {
            var self = this;
            return expect(this.lambda._private.startShow({spokenShowName:"A Show I've Finished Watching"}, this.responseStub))
                .to.be.fulfilled
                .then(function(){
                    expect(self.responseStub.say).to.have.been.calledWithMatch(/this episode from season/i);
                });
        });

        it("should always play a random episode if forceRandom is set", function () {
            var self = this;
            return expect(this.lambda._private.startShow({
                spokenShowName:'a show with unwatched episodes',
                forceRandom: true
            }, this.responseStub))
                .to.be.fulfilled
                .then(function(){
                    expect(self.responseStub.say).to.have.been.calledWithMatch(/this episode from season/i);
                });
        });

        it('should reject the promise on a failed API call', function () {
            this.plexAPIStubs.query.withArgs('/library/sections/1/all')
                .rejects(new Error("Stub error from Plex API"));

            return expect(this.lambda._private.startShow({spokenShowName:'a show with unwatched episodes'}, this.responseStub))
                .to.be.rejected;
        });
    });
});
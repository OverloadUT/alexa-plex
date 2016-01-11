/* jshint node: true */
var expect = require('chai').expect;
var sinon = require('sinon');


describe('Main App Functionality', function () {

    before(function() {
        this.request = JSON.parse(JSON.stringify(require('./RequestTemplate.json')));
        this.oldAppID = process.env.ALEXA_APP_ID;
        process.env.ALEXA_APP_ID = 'BAD_APP_ID';
    });

    after('reset environment variables to default state', function() {
        process.env.ALEXA_APP_ID = this.oldAppID;
    });

    it('should reject invalid AppID', function (done) {
        this.lambda.handler(this.request, {
            succeed: function (res) {
                expect(res).to.not.have.deep.property('response.outputSpeech.ssml');
                done();
            }, fail: function(res) {
                done(new Error('Lambda function failed: ' + err));
            }
        });
    });
});

describe('Requests', function() {

    before(function() {
        this.lambdaFail = function(done) {
            return function(err) {
                done(new Error('Lambda function failed: ' + err));
            }
        };
    });

    beforeEach(function() {
        // Yes this is slow but hey it's just tests?
        this.request = JSON.parse(JSON.stringify(require('./RequestTemplate.json')));
    });

    require('./states.test.js')();

    describe('Launch', function () {

        it('should prompt for a command', function (done) {
            this.request.request.type = 'LaunchRequest';
            this.request.request.intent = null;

            var self = this;
            this.lambda.handler(this.request, {
                succeed: function (res) {
                    expect(res).to.have.deep.property('response.shouldEndSession').that.is.false;
                    expect(res).to.not.have.deep.property('response.card');
                    expect(res).to.have.deep.property('response.outputSpeech.ssml').that.matches(/plex is listening/i);
                    done();
                }, fail: this.lambdaFail(done)
            });
        });
    });

    describe('Intents', function () {

        beforeEach(function() {
            this.request.request.type = 'IntentRequest';
        });

        describe('Prompts', function() {

            beforeEach(function() {
                this.request.session.attributes.promptData = {
                    yesResponse: "MochaTest YesResponse",
                    noResponse: "MochaTest NoResponse",
                    yesAction: "endSession",
                    noAction: "endSession"
                };
            });

            describe('AMAZON.YesIntent', function() {
                beforeEach(function() {
                    this.request.request.intent.name = 'AMAZON.YesIntent';
                });

                describe('yesAction: startEpisode', function() {
                    beforeEach(function() {
                        this.request.session.attributes.promptData.yesAction = "startEpisode";
                    });

                    it('should play the episode in promptData from beginning when no offset is provided', function(done) {
                        this.request.session.attributes.promptData.mediaKey = "111111";

                        var self = this;
                        this.lambda.handler(this.request, {
                            succeed: function(res) {
                                expect(res).to.have.deep.property('response.outputSpeech.ssml')
                                    .that.matches(/MochaTest YesResponse/i);
                                expect(self.plexAPIStubs.perform)
                                    .to.have.been.calledWithMatch(/111111/i);
                                expect(self.plexAPIStubs.perform)
                                    .to.have.been.calledWithMatch(/offset=0/i);
                                done();
                            }, fail: self.lambdaFail(done)
                        });
                    });

                    it('should play using the offset if provided', function(done) {
                        this.request.session.attributes.promptData.mediaKey = "111111";
                        this.request.session.attributes.promptData.mediaOffset = "12345";

                        var self = this;
                        this.lambda.handler(this.request, {
                            succeed: function(res) {
                                expect(res).to.have.deep.property('response.outputSpeech.ssml')
                                    .that.matches(/MochaTest YesResponse/i);
                                expect(self.plexAPIStubs.perform)
                                    .to.have.been.calledWithMatch(/offset=12345/i);
                                done();
                            }, fail: self.lambdaFail(done)
                        });
                    });

                    it('should gracefully handle a plex error', function(done) {
                        this.request.session.attributes.promptData.mediaKey = "222222";

                        this.plexAPIStubs.perform.restore();
                        sinon.stub(this.plexAPIStubs, 'perform')
                            .rejects(new Error("Stub error from Plex API"));

                        var self = this;
                        this.lambda.handler(this.request, {
                            succeed: function(res) {
                                expect(res).to.have.deep.property('response.outputSpeech.ssml')
                                    .that.matches(/sorry/i);
                                expect(self.plexAPIStubs.perform)
                                    .to.have.been.calledWithMatch(/222222/i);
                                done();
                            }, fail: self.lambdaFail(done)
                        });
                    });
                });

                it('should respond with the yesResponse message', function(done) {
                    var self = this;
                    this.lambda.handler(this.request, {
                        succeed: function(res) {
                            expect(res).to.have.deep.property('response.outputSpeech.ssml')
                                .that.matches(/MochaTest YesResponse/i);
                            done();
                        }, fail: self.lambdaFail(done)
                    });
                });

                it('should gracefully handle a lack of promptData by closing the session', function(done) {
                    delete this.request.session.attributes.promptData;
                    var self = this;
                    this.lambda.handler(this.request, {
                        succeed: function(res) {
                            expect(res).to.not.have.deep.property('response.outputSpeech.ssml');
                            done();
                        }, fail: self.lambdaFail(done)
                    });
                });

                it('should gracefully handle an unknown yesAction by closing the session', function(done) {
                    this.request.session.attributes.promptData.yesAction = "MochaTestUnknownAction";
                    var self = this;
                    this.lambda.handler(this.request, {
                        succeed: function(res) {
                            expect(res).to.not.have.deep.property('response.outputSpeech.ssml');
                            done();
                        }, fail: self.lambdaFail(done)
                    });
                });
            });

            describe('AMAZON.NoIntent', function() {

                beforeEach(function() {
                    this.request.request.intent.name = 'AMAZON.NoIntent';
                });

                describe('noAction: startEpisode', function() {
                    beforeEach(function() {
                        this.request.session.attributes.promptData.noAction = "startEpisode";
                    });

                    it('should play the episode in promptData from beginning when no offset is provided', function(done) {
                        this.request.session.attributes.promptData.noMediaKey = "111111";

                        var self = this;
                        this.lambda.handler(this.request, {
                            succeed: function(res) {
                                expect(res).to.have.deep.property('response.outputSpeech.ssml')
                                    .that.matches(/MochaTest NoResponse/);
                                expect(self.plexAPIStubs.perform)
                                    .to.have.been.calledWithMatch(/111111/i)
                                    .and.to.have.been.calledWithMatch(/offset=0/i);
                                done();
                            }, fail: self.lambdaFail(done)
                        });
                    });

                    it('should play using the offset if provided', function(done) {
                        this.request.session.attributes.promptData.noMediaKey = "111111";
                        this.request.session.attributes.promptData.noMediaOffset = "12345";

                        var self = this;
                        this.lambda.handler(this.request, {
                            succeed: function(res) {
                                expect(res).to.have.deep.property('response.outputSpeech.ssml')
                                    .that.matches(/MochaTest NoResponse/);
                                expect(self.plexAPIStubs.perform)
                                    .to.have.been.calledWithMatch(/offset=12345/i);
                                done();
                            }, fail: self.lambdaFail(done)
                        });
                    });

                    it('should use the "no" versions of promptData', function(done) {
                        this.request.session.attributes.promptData.mediaKey = "111111";
                        this.request.session.attributes.promptData.mediaOffset = "12345";
                        this.request.session.attributes.promptData.noMediaKey = "222222";
                        this.request.session.attributes.promptData.noMediaOffset = "54321";

                        var self = this;
                        this.lambda.handler(this.request, {
                            succeed: function(res) {
                                expect(res).to.have.deep.property('response.outputSpeech.ssml')
                                    .that.matches(/MochaTest NoResponse/);
                                expect(self.plexAPIStubs.perform)
                                    .to.have.been.calledWithMatch(/222222/i)
                                    .and.to.have.been.calledWithMatch(/offset=54321/i);
                                done();
                            }, fail: self.lambdaFail(done)
                        });
                    });

                    it('should gracefully handle a plex error', function(done) {
                        this.request.session.attributes.promptData.noMediaKey = "222222";

                        this.plexAPIStubs.perform.restore();
                        sinon.stub(this.plexAPIStubs, 'perform')
                            .rejects(new Error("Stub error from Plex API"));

                        var self = this;
                        this.lambda.handler(this.request, {
                            succeed: function(res) {
                                expect(res).to.have.deep.property('response.outputSpeech.ssml')
                                    .that.matches(/sorry/i);
                                expect(self.plexAPIStubs.perform)
                                    .to.have.been.calledWithMatch(/222222/i);
                                done();
                            }, fail: self.lambdaFail(done)
                        });
                    });
                });
                
                it('should respond with the noResponse message', function(done) {
                    var self = this;
                    this.lambda.handler(this.request, {
                        succeed: function(res) {
                            expect(res).to.have.deep.property('response.outputSpeech.ssml')
                                .that.matches(/MochaTest NoResponse/);
                            done();
                        }, fail: self.lambdaFail(done)
                    });
                });

                it('should gracefully handle a lack of promptData by closing the session', function(done) {
                    delete this.request.session.attributes.promptData;
                    var self = this;
                    this.lambda.handler(this.request, {
                        succeed: function(res) {
                            expect(res).to.not.have.deep.property('response.outputSpeech.ssml');
                            done();
                        }, fail: self.lambdaFail(done)
                    });
                });

                it('should gracefully handle an unknown noAction by closing the session', function(done) {
                    this.request.session.attributes.promptData.noAction = "MochaTestUnknownAction";
                    var self = this;
                    this.lambda.handler(this.request, {
                        succeed: function(res) {
                            expect(res).to.not.have.deep.property('response.outputSpeech.ssml');
                            done();
                        }, fail: self.lambdaFail(done)
                    });
                });
            });
        });

        describe('OnDeckIntent', function() {
            beforeEach(function() {
                this.request.request.intent.name = 'OnDeckIntent';
            });

            it('should respond with shows that are On Deck', function (done) {
                this.plexAPIStubs.query.withArgs('/library/sections/1/onDeck').resolves(require('./samples/library_onDeck.json'));

                var self = this;
                this.lambda.handler(this.request, {
                    succeed: function(res) {
                        expect(res.response.shouldEndSession).to.be.true;
                        expect(res).to.have.deep.property('response.card.title')
                            .that.matches(/ready to watch/i);
                        expect(res).to.have.deep.property('response.outputSpeech.ssml')
                            .that.matches(/penny-dreadful.*game-of-thrones.*brooklyn-nine-nine/i);
                        // TODO: Remove a lot of the calledOnce checks, as that should be the job of the tests on the plexutils methods?
                        expect(self.plexAPIStubs.query).to.have.been.calledOnce;
                        done();
                    }, fail: self.lambdaFail(done)
                });
            });

            it('should handle a response with zero shows', function (done) {
                this.plexAPIStubs.query.withArgs('/library/sections/1/onDeck').resolves(function(){
                    var response = JSON.parse(JSON.stringify(require('./samples/library_onDeck.json')));
                    response._children = [];
                    return response;
                }());

                var self = this;
                this.lambda.handler(this.request, {
                    succeed: function (res) {
                        expect(res.response.shouldEndSession).to.be.true;
                        expect(res).to.not.have.deep.property('response.card');
                        expect(res).to.have.deep.property('response.outputSpeech.ssml').that.matches(/do not have any shows/i);
                        expect(self.plexAPIStubs.query).to.have.been.calledOnce;
                        done();
                    }, fail: self.lambdaFail(done)
                });
            });

            it('should handle an error from the Plex API', function (done) {
                this.plexAPIStubs.query.withArgs('/library/sections/1/onDeck').rejects(new Error("Stub error from Plex API"));

                var self = this;
                this.lambda.handler(this.request, {
                    succeed: function(res) {
                        expect(res.response.shouldEndSession).to.be.true;
                        expect(res).to.not.have.deep.property('response.card');
                        expect(res).to.have.deep.property('response.outputSpeech.ssml')
                            .that.matches(/sorry/i);
                        expect(self.plexAPIStubs.query).to.have.been.calledOnce;
                        done();
                    }, fail: self.lambdaFail(done)
                });
            });
        });

        describe('StartShowIntent', function() {

            beforeEach(function() {
                this.request.request.intent.name = 'StartShowIntent';
            });

            it('should play a random episode if they\'ve all been watched', function (done) {
                this.request.request.intent.slots.showName = {name: 'showName', value: "a show I've finished watching"};

                var self = this;
                this.lambda.handler(this.request, {
                    succeed: function(res) {
                        console.log(res);
                        expect(res.response.shouldEndSession).to.be.true;
                        expect(res).to.have.deep.property('response.outputSpeech.ssml')
                            .that.matches(/enjoy this episode from season/i);
                        expect(self.plexAPIStubs.perform).to.have.been.calledWithMatch(/playMedia/i);
                        done();
                    }, fail: self.lambdaFail(done)
                });
            });

            it('should offer to play a partially-watched episode when looking for a random one', function (done) {
                this.request.request.intent.slots.showName = {name: 'showName', value: "A fully watched show with a partially watched episode"};

                var self = this;
                this.lambda.handler(this.request, {
                    succeed: function(res) {
                        expect(res.response.shouldEndSession).to.be.false;
                        expect(res).to.have.deep.property('response.outputSpeech.ssml')
                            .that.matches(/would you like to resume/i);
                        expect(self.plexAPIStubs.perform).to.not.have.been.called;
                        expect(self.plexAPIStubs.postQuery).to.not.have.been.called;
                        expect(res).to.have.deep.property('sessionAttributes.promptData.yesResponse')
                            .that.matches(/resuming this episode/i);
                        expect(res).to.have.deep.property('sessionAttributes.promptData.mediaKey')
                            .that.equals('/library/metadata/4079');
                        done();
                    }, fail: self.lambdaFail(done)
                });
            });

            it('should play the next episode if there are any unwatched ones', function (done) {
                this.request.request.intent.slots.showName = {name: 'showName', value: 'a show with unwatched episodes'};

                var self = this;
                this.lambda.handler(this.request, {
                    succeed: function(res) {
                        expect(res.response.shouldEndSession).to.be.true;
                        expect(res).to.have.deep.property('response.outputSpeech.ssml')
                            .that.matches(/next episode/i);
                        expect(self.plexAPIStubs.perform).to.have.been.calledWithMatch(/playMedia/i);
                        done();
                    }, fail: self.lambdaFail(done)
                });
            });

            it('should start from where the user left off if show is partially watched', function (done) {
                this.request.request.intent.slots.showName = {name: 'showName', value: 'A show with an unwatched partially watched episode'};

                var self = this;
                this.lambda.handler(this.request, {
                    succeed: function(res) {
                        expect(res.response.shouldEndSession).to.be.true;
                        expect(res).to.have.deep.property('response.outputSpeech.ssml')
                            .that.matches(/from where you left off/i);
                        expect(self.plexAPIStubs.perform).to.have.been.calledWithMatch(/playMedia.*offset=379418/i);
                        done();
                    }, fail: self.lambdaFail(done)
                });
            });

            it('should ask for confirmation if the show name match has low confidence', function (done) {
                this.request.request.intent.slots.showName = {name: 'showName', value: 'unwat'};

                var self = this;
                this.lambda.handler(this.request, {
                    succeed: function(res) {
                        expect(res.response.shouldEndSession).to.be.false;
                        expect(res).to.have.deep.property('response.outputSpeech.ssml')
                            .that.matches(/is that correct/i);
                        expect(res).to.have.deep.property('sessionAttributes.promptData.yesResponse')
                            .that.matches(/next episode/i);
                        expect(res).to.have.deep.property('sessionAttributes.promptData.mediaKey')
                            .that.equals('/library/metadata/4079');
                        expect(self.plexAPIStubs.perform).to.not.have.been.called;
                        expect(self.plexAPIStubs.postQuery).to.not.have.been.called;
                        done();
                    }, fail: self.lambdaFail(done)
                });
            });

            // TODO this is really a test of the method that does this, so isolate that in to its own test
            it('should be able to find the next episode even if the array is out of order', function (done) {
                this.request.request.intent.slots.showName = {name: 'showName', value: 'a show with unwatched episodes'};

                this.plexAPIStubs.query.withArgs('/library/metadata/1/allLeaves')
                    .resolves(function(){
                        var result = JSON.parse(JSON.stringify(require('./samples/library_metadata_showepisodes_withunwatched.json')));
                        result._children.reverse();
                        return result;
                    }());

                var self = this;
                this.lambda.handler(this.request, {
                    succeed: function(res) {
                        expect(res.response.shouldEndSession).to.be.true;
                        expect(res).to.have.deep.property('response.outputSpeech.ssml')
                            .that.matches(/next episode.*Resurrection/i);
                        expect(self.plexAPIStubs.perform).to.have.been.calledWithMatch(/playMedia/i);
                        done();
                    }, fail: self.lambdaFail(done)
                });
            });

            it('should gracefully fail if the show name is not found', function (done) {
                this.request.request.intent.slots.showName = {name: 'showName', value: 'q'};

                var self = this;
                this.lambda.handler(this.request, {
                    succeed: function(res) {
                        expect(res.response.shouldEndSession).to.be.true;
                        expect(res).to.not.have.deep.property('response.card');
                        expect(res).to.have.deep.property('response.outputSpeech.ssml')
                            .that.matches(/I couldn't find that show in your library/i);
                        expect(self.plexAPIStubs.perform).to.not.have.been.calledWithMatch(/playMedia/i);
                        expect(self.plexAPIStubs.postQuery).to.not.have.been.calledWithMatch(/playQueues/i);
                        done();
                    }, fail: self.lambdaFail(done)
                });
            });

            it('should handle an error on query for all show names', function (done) {
                this.request.request.intent.slots.showName = {name: 'showName', value: "a show I've finished watching"};

                this.plexAPIStubs.query.withArgs('/library/sections/1/all')
                    .rejects(new Error("Stub error from Plex API"));

                var self = this;
                this.lambda.handler(this.request, {
                    succeed: function(res) {
                        expect(res.response.shouldEndSession).to.be.true;
                        expect(res).to.not.have.deep.property('response.card');
                        expect(res).to.have.deep.property('response.outputSpeech.ssml')
                            .that.matches(/sorry/i);
                        done();
                    }, fail: self.lambdaFail(done)
                });
            });

            it("Should complain if no show name was provided", function (done) {
                this.request.request.intent.slots = {};

                var self = this;
                this.lambda.handler(this.request, {
                    succeed: function(res) {
                        expect(res.response.shouldEndSession).to.be.true;
                        expect(res).to.not.have.deep.property('response.card');
                        expect(res).to.have.deep.property('response.outputSpeech.ssml')
                            .that.matches(/No show specified/i);
                        done();
                    }, fail: self.lambdaFail(done)
                });
            });
        });

        describe('StartRandomShowIntent', function() {

            beforeEach(function () {
                this.request.request.intent.name = 'StartRandomShowIntent';
            });

            it('should play a random episode of the requested show', function (done) {
                this.request.request.intent.slots.showName = {name: 'showName', value: "a show with unwatched episodes"};

                var self = this;
                this.lambda.handler(this.request, {
                    succeed: function(res) {
                        expect(res.response.shouldEndSession).to.be.true;
                        expect(res).to.have.deep.property('response.outputSpeech.ssml')
                            .that.matches(/enjoy this episode from season/i);
                        expect(self.plexAPIStubs.perform).to.have.been.calledWithMatch(/playMedia/i);
                        done();
                    }, fail: self.lambdaFail(done)
                });
            });

            it('should gracefully fail if the show name is not found', function (done) {
                this.request.request.intent.slots.showName = {name: 'showName', value: 'q'};

                var self = this;
                this.lambda.handler(this.request, {
                    succeed: function(res) {
                        //console.log(res);
                        expect(res.response.shouldEndSession).to.be.true;
                        expect(res).to.not.have.deep.property('response.card');
                        expect(res).to.have.deep.property('response.outputSpeech.ssml')
                            .that.matches(/I couldn't find that show in your library/i);
                        expect(self.plexAPIStubs.perform).to.not.have.been.calledWithMatch(/playMedia/i);
                        expect(self.plexAPIStubs.postQuery).to.not.have.been.calledWithMatch(/playQueues/i);
                        done();
                    }, fail: self.lambdaFail(done)
                });
            });

            it("Should complain if no show name was provided", function (done) {
                this.request.request.intent.slots = {};

                var self = this;
                this.lambda.handler(this.request, {
                    succeed: function(res) {
                        expect(res.response.shouldEndSession).to.be.true;
                        expect(res).to.not.have.deep.property('response.card');
                        expect(res).to.have.deep.property('response.outputSpeech.ssml')
                            .that.matches(/No show specified/i);
                        done();
                    }, fail: self.lambdaFail(done)
                });
            });

            it('should handle an error from the API', function (done) {
                this.request.request.intent.slots.showName = {name: 'showName', value: "a show I've finished watching"};

                this.plexAPIStubs.query.withArgs('/library/sections/1/all')
                    .rejects(new Error("Stub error from Plex API"));

                var self = this;
                this.lambda.handler(this.request, {
                    succeed: function(res) {
                        expect(res).to.have.deep.property('response.outputSpeech.ssml')
                            .that.matches(/sorry/i);
                        done();
                    }, fail: self.lambdaFail(done)
                });
            });
        });

        describe('StartHighRatedEpisodeIntent', function() {

            beforeEach(function () {
                this.request.request.intent.name = 'StartHighRatedEpisodeIntent';
            });

            it('should play a random episode of the requested show', function (done) {
                // TODO this test doesn't actually veirfy that it's getting a high rated
                this.request.request.intent.slots.showName = {name: 'showName', value: "a show with unwatched episodes"};

                var self = this;
                this.lambda.handler(this.request, {
                    succeed: function(res) {
                        expect(res.response.shouldEndSession).to.be.true;
                        expect(res).to.have.deep.property('response.outputSpeech.ssml')
                            .that.matches(/enjoy this episode from season/i);
                        expect(self.plexAPIStubs.perform).to.have.been.calledWithMatch(/playMedia/i);
                        done();
                    }, fail: self.lambdaFail(done)
                });
            });

            it('should gracefully fail if the show name is not found', function (done) {
                this.request.request.intent.slots.showName = {name: 'showName', value: 'q'};

                var self = this;
                this.lambda.handler(this.request, {
                    succeed: function(res) {
                        //console.log(res);
                        expect(res.response.shouldEndSession).to.be.true;
                        expect(res).to.not.have.deep.property('response.card');
                        expect(res).to.have.deep.property('response.outputSpeech.ssml')
                            .that.matches(/I couldn't find that show in your library/i);
                        expect(self.plexAPIStubs.perform).to.not.have.been.calledWithMatch(/playMedia/i);
                        expect(self.plexAPIStubs.postQuery).to.not.have.been.calledWithMatch(/playQueues/i);
                        done();
                    }, fail: self.lambdaFail(done)
                });
            });

            it("Should complain if no show name was provided", function (done) {
                this.request.request.intent.slots = {};

                var self = this;
                this.lambda.handler(this.request, {
                    succeed: function(res) {
                        expect(res.response.shouldEndSession).to.be.true;
                        expect(res).to.not.have.deep.property('response.card');
                        expect(res).to.have.deep.property('response.outputSpeech.ssml')
                            .that.matches(/No show specified/i);
                        done();
                    }, fail: self.lambdaFail(done)
                });
            });

            it('should handle an error from the API', function (done) {
                this.request.request.intent.slots.showName = {name: 'showName', value: "a show I've finished watching"};

                this.plexAPIStubs.query.withArgs('/library/sections/1/all')
                    .rejects(new Error("Stub error from Plex API"));

                var self = this;
                this.lambda.handler(this.request, {
                    succeed: function(res) {
                        expect(res).to.have.deep.property('response.outputSpeech.ssml')
                            .that.matches(/sorry/i);
                        done();
                    }, fail: self.lambdaFail(done)
                });
            });
        });

        describe('StartSpecificEpisodeIntent', function() {

            beforeEach(function () {
                this.request.request.intent.name = 'StartSpecificEpisodeIntent';
            });

            it('should play an episode of a specified show when a season and episode number are provided', function (done) {
                this.request.request.intent.slots.showName = {name: 'showName', value: "a show with unwatched episodes"};
                this.request.request.intent.slots.seasonNumber = {name: 'seasonNumber', value: 2};
                this.request.request.intent.slots.episodeNumber = {name: 'episodeNumber', value: 3};

                var self = this;
                this.lambda.handler(this.request, {
                    succeed: function(res) {
                        expect(res.response.shouldEndSession).to.be.true;
                        expect(res).to.have.deep.property('response.outputSpeech.ssml')
                            .that.matches(/S2E3/i);
                        expect(self.plexAPIStubs.perform).to.have.been.calledWithMatch(/playMedia/i);
                        done();
                    }, fail: self.lambdaFail(done)
                });
            });

            it('should play an episode of a specified show when only an episode number is provided, which refers to both a season and an episode', function (done) {
                this.request.request.intent.slots.showName = {name: 'showName', value: "a show with unwatched episodes"};
                this.request.request.intent.slots.episodeNumber = {name: 'episodeNumber', value: 208};

                var self = this;
                this.lambda.handler(this.request, {
                    succeed: function(res) {
                        expect(res.response.shouldEndSession).to.be.true;
                        expect(res).to.have.deep.property('response.outputSpeech.ssml')
                            .that.matches(/S2E8/i);
                        expect(self.plexAPIStubs.perform).to.have.been.calledWithMatch(/playMedia/i);
                        done();
                    }, fail: self.lambdaFail(done)
                });
            });

            it('should play an episode of a specified show when only an episode number is provided that does not indicate a season', function (done) {
                this.request.request.intent.slots.showName = {name: 'showName', value: "a show with unwatched episodes"};
                this.request.request.intent.slots.episodeNumber = {name: 'episodeNumber', value: 4};

                var self = this;
                this.lambda.handler(this.request, {
                    succeed: function(res) {
                        expect(res.response.shouldEndSession).to.be.true;
                        expect(res).to.have.deep.property('response.outputSpeech.ssml')
                            .that.matches(/S1E4/i);
                        expect(self.plexAPIStubs.perform).to.have.been.calledWithMatch(/playMedia/i);
                        done();
                    }, fail: self.lambdaFail(done)
                });
            });

            it('should gracefully fail if the show name is not found', function (done) {
                this.request.request.intent.slots.showName = {name: 'showName', value: 'q'};

                var self = this;
                this.lambda.handler(this.request, {
                    succeed: function(res) {
                        expect(res).to.have.deep.property('response.outputSpeech.ssml')
                            .that.matches(/I couldn't find that show in your library/i);
                        expect(res).to.not.have.deep.property('response.card');
                        expect(self.plexAPIStubs.perform).to.not.have.been.calledWithMatch(/playMedia/i);
                        expect(self.plexAPIStubs.postQuery).to.not.have.been.calledWithMatch(/playQueues/i);
                        done();
                    }, fail: self.lambdaFail(done)
                });
            });

            it("Should gracefully fail if the episode was not found", function (done) {
                this.request.request.intent.slots = {};

                var self = this;
                this.lambda.handler(this.request, {
                    succeed: function(res) {
                        console.warn(res);
                        expect(res).to.have.deep.property('response.outputSpeech.ssml')
                            .that.matches(/No show specified/i);
                        done();
                    }, fail: self.lambdaFail(done)
                });
            });

            it('should give feedback if a non-existant season was requested ', function (done) {
                this.request.request.intent.slots.showName = {name: 'showName', value: "a show with unwatched episodes"};
                this.request.request.intent.slots.seasonNumber = {name: 'seasonNumber', value: 10};
                this.request.request.intent.slots.episodeNumber = {name: 'episodeNumber', value: 1};

                var self = this;
                this.lambda.handler(this.request, {
                    succeed: function(res) {
                        expect(res.response.shouldEndSession).to.be.true;
                        expect(res).to.have.deep.property('response.outputSpeech.ssml')
                            .that.matches(/there does not appear to be a season/i);
                        expect(self.plexAPIStubs.postQuery).to.not.have.been.called;
                        expect(self.plexAPIStubs.perform).to.not.have.been.called;
                        done();
                    }, fail: self.lambdaFail(done)
                });
            });

            it('should give feedback if a non-existant episode was requested ', function (done) {
                this.request.request.intent.slots.showName = {name: 'showName', value: "a show with unwatched episodes"};
                this.request.request.intent.slots.seasonNumber = {name: 'seasonNumber', value: 2};
                this.request.request.intent.slots.episodeNumber = {name: 'episodeNumber', value: 80};

                var self = this;
                this.lambda.handler(this.request, {
                    succeed: function(res) {
                        expect(res.response.shouldEndSession).to.be.true;
                        expect(res).to.have.deep.property('response.outputSpeech.ssml')
                            .that.matches(/there does not appear to be an episode/i);
                        expect(self.plexAPIStubs.postQuery).to.not.have.been.called;
                        expect(self.plexAPIStubs.perform).to.not.have.been.called;
                        done();
                    }, fail: self.lambdaFail(done)
                });
            });

            it('should handle an error from the API', function (done) {
                this.request.request.intent.slots.showName = {name: 'showName', value: "a show I've finished watching"};

                this.plexAPIStubs.query.withArgs('/library/sections/1/all')
                    .rejects(new Error("Stub error from Plex API"));

                var self = this;
                this.lambda.handler(this.request, {
                    succeed: function(res) {
                        expect(res).to.have.deep.property('response.outputSpeech.ssml')
                            .that.matches(/sorry/i);
                        done();
                    }, fail: self.lambdaFail(done)
                });
            });
        });
    });
});

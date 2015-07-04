/* jshint node: true */
process.env.NODE_ENV = 'test';
//require('dotenv').config({path: './test/.env'});
var proxyquire = require('proxyquire');
var sinon = require('sinon');
var chai = require('chai');
var expect = require('chai').expect;
var sinonChai = require("sinon-chai");
chai.use(sinonChai);
require('sinon-as-promised');

var plexAPIStubs = null;
var plexAPIUtils = {
    stubAll: function() {
        sinon.stub(plexAPIStubs, 'query').rejects(new Error('Unhandled URI in query stub'));
        sinon.stub(plexAPIStubs, 'postQuery').rejects(new Error('Unhandled URI in postQuery stub'));
        sinon.stub(plexAPIStubs, 'perform').rejects(new Error('Unhandled URI in perform stub'));
        sinon.stub(plexAPIStubs, 'find').rejects(new Error('Unhandled URI in find stub'));
    },
    restoreAll: function() {
        plexAPIStubs.query.restore();
        plexAPIStubs.postQuery.restore();
        plexAPIStubs.perform.restore();
        plexAPIStubs.find.restore();
    },
    constructor: function(opts) {
        plexAPIStubs = this;
        this.query = function() {};
        this.postQuery = function() {};
        this.perform = function() {};
        this.find = function() {};
        this.getIdentifier = sinon.stub().returns('MOCHATESTS');
    }
};

//var lambda = require('../index.js');

var lambda = proxyquire('../index.js', {
    'plex-api': plexAPIUtils.constructor
});

beforeEach(function() {
    plexAPIUtils.stubAll();
});

afterEach(function() {
    plexAPIUtils.restoreAll();
});

describe('Main App Functionality', function () {
    //it('should reject invalid AppID', function () {
    //    var request = require('./LaunchRequestInvalidApp.json');
    //    // TODO reject invalid AppID
    //});
});

describe('Requests', function() {
    var request;

    beforeEach(function() {
        // Yes this is slow but hey it's just tests?
        request = JSON.parse(JSON.stringify(require('./RequestTemplate.json')));
    });

    describe('Launch', function () {

        it('should prompt for a command', function (done) {
            request.request.type = 'LaunchRequest';
            request.request.intent = null;

            lambda.handler(request, {
                succeed: function (res) {
                    expect(res).to.have.deep.property('response.shouldEndSession').that.is.false;
                    expect(res).to.not.have.deep.property('response.card');
                    expect(res).to.have.deep.property('response.outputSpeech.text').that.matches(/plex is listening/i);
                    done();
                }, fail: function (res) {
                    console.log(res);
                    expect.fail();
                    done();
                }
            });
        });
    });

    describe('Intents', function () {

        beforeEach(function() {
            request.request.type = 'IntentRequest';
        });

        describe('OnDeckIntent', function() {
            it('should respond with shows that are On Deck', function (done) {
                request.request.intent.name = 'OnDeckIntent';

                plexAPIStubs.query.withArgs('/library/onDeck').resolves(require('./samples/library_onDeck.json'));

                lambda.handler(request, {
                    succeed: function(res) {
                        expect(res.response.shouldEndSession).to.be.true;
                        expect(res).to.have.deep.property('response.card.subtitle')
                            .that.matches(/on deck/i);
                        expect(res).to.have.deep.property('response.outputSpeech.text')
                            .that.matches(/penny-dreadful.*game-of-thrones.*brooklyn-nine-nine/i);
                        expect(plexAPIStubs.query).to.have.been.calledOnce;
                        done();
                    }, fail: function(res) {
                        console.log(res);
                        done(Error('Lambda returned fail()'));
                    }
                });
            });

            it('should handle a response with zero shows', function (done) {
                request.request.intent.name = 'OnDeckIntent';

                plexAPIStubs.query.withArgs('/library/onDeck').resolves(function(){
                    var response = JSON.parse(JSON.stringify(require('./samples/library_onDeck.json')));
                    response._children = [];
                    return response;
                }());

                lambda.handler(request, {
                    succeed: function(res) {
                        expect(res.response.shouldEndSession).to.be.true;
                        expect(res).to.not.have.deep.property('response.card');
                        expect(res).to.have.deep.property('response.outputSpeech.text')
                            .that.matches(/do not have any shows/i);
                        expect(plexAPIStubs.query).to.have.been.calledOnce;
                        done();
                    }, fail: function(res) {
                        console.log(res);
                        done(Error('Lambda returned fail()'));
                    }
                });
            });

            it('should handle an error from the Plex API', function (done) {
                request.request.intent.name = 'OnDeckIntent';

                plexAPIStubs.query.withArgs('/library/onDeck').rejects(new Error("Stub error from Plex API"));

                lambda.handler(request, {
                    succeed: function(res) {
                        expect(res.response.shouldEndSession).to.be.true;
                        expect(res).to.not.have.deep.property('response.card');
                        expect(res).to.have.deep.property('response.outputSpeech.text')
                            .that.matches(/sorry/i);
                        expect(plexAPIStubs.query).to.have.been.calledOnce;
                        done();
                    }, fail: function(res) {
                        console.log(res);
                        done(Error('Lambda returned fail()'));
                    }
                });
            });
        });

        //describe('ShowInfoIntent', function() {
        //    it('should handle ShowInfo Intent', function (done) {
        //        request.request.intent.name = 'ShowInfoIntent';
        //
        //        lambda.handler(request, {
        //            succeed: function(res) {
        //                expect(res.response.shouldEndSession).to.be.true;
        //                expect(res).to.have.deep.property('response.card.subtitle')
        //                    .that.matches(/ShowInfoIntent/i);
        //                expect(res).to.have.deep.property('response.outputSpeech.text');
        //                expect(plexAPIStubs.query).to.have.been.calledOnce;
        //                done();
        //            }, fail: function(res) {
        //                console.log(res);
        //                done(Error('Lambda returned fail()'));
        //            }
        //        });
        //    });
        //});

        describe('StartShowIntent', function() {

            beforeEach(function(){
                plexAPIStubs.query.withArgs('/').resolves(require('./samples/root.json'));
                plexAPIStubs.query.withArgs(sinon.match(/\/library\/metadata\/[0-9]+$/))
                    .resolves(require('./samples/library_metadata_item.json'));
                plexAPIStubs.query.withArgs('/library/sections/1/all')
                    .resolves(require('./samples/library_section_allshows.json'));
                plexAPIStubs.query.withArgs('/library/metadata/1/allLeaves')
                    .resolves(require('./samples/library_metadata_showepisodes_withunwatched.json'));
                plexAPIStubs.query.withArgs('/library/metadata/143/allLeaves')
                    .resolves(require('./samples/library_metadata_showepisodes_allwatched.json'));

                plexAPIStubs.postQuery.withArgs(sinon.match(/\/playQueues/))
                    .resolves(require('./samples/playqueues.json'));

                plexAPIStubs.perform.withArgs(sinon.match(/\/playMedia/))
                    .resolves(null, true);

                plexAPIStubs.find.withArgs('/clients')
                    .resolves(require('./samples/clients.json'));
            });

            it('should play a random episode if they\'ve all been watched', function (done) {
                request.request.intent.name = 'StartShowIntent';
                request.request.intent.slots.showName = {name: 'showName', value: "a show I've finished watching"};

                lambda.handler(request, {
                    succeed: function(res) {
                        //console.log(res);
                        expect(res.response.shouldEndSession).to.be.true;
                        expect(res).to.have.deep.property('response.card.subtitle')
                            .that.matches(/Playing Random Episode/i);
                        expect(res).to.have.deep.property('response.outputSpeech.text')
                            .that.matches(/enjoy this episode from season/i);
                        expect(plexAPIStubs.perform).to.have.been.calledWithMatch(/playMedia/i);
                        expect(plexAPIStubs.postQuery).to.have.been.calledWithMatch(/playQueues/i);
                        done();
                    }, fail: function(res) {
                        console.log(res);
                        done(Error('Lambda returned fail()'));
                    }
                });
            });

            it('should play the next episode if there are any unwatched ones', function (done) {
                request.request.intent.name = 'StartShowIntent';
                request.request.intent.slots.showName = {name: 'showName', value: 'a show with unwatched episodes'};

                lambda.handler(request, {
                    succeed: function(res) {
                        console.log(res);
                        expect(res.response.shouldEndSession).to.be.true;
                        expect(res).to.have.deep.property('response.card.subtitle')
                            .that.matches(/Playing Next Episode/i);
                        expect(res).to.have.deep.property('response.outputSpeech.text')
                            .that.matches(/next episode/i);
                        expect(plexAPIStubs.perform).to.have.been.calledWithMatch(/playMedia/i);
                        expect(plexAPIStubs.postQuery).to.have.been.calledWithMatch(/playQueues/i);
                        done();
                    }, fail: function(res) {
                        console.log(res);
                        done(Error('Lambda returned fail()'));
                    }
                });
            });

            it('should be able to find the next episode even if the array is out of order', function (done) {
                request.request.intent.name = 'StartShowIntent';
                request.request.intent.slots.showName = {name: 'showName', value: 'a show with unwatched episodes'};

                plexAPIStubs.query.withArgs('/library/metadata/1/allLeaves')
                    .resolves(function(){
                        var result = JSON.parse(JSON.stringify(require('./samples/library_metadata_showepisodes_withunwatched.json')));
                        result._children.reverse();
                        return result;
                    }());

                lambda.handler(request, {
                    succeed: function(res) {
                        console.log(res);
                        expect(res.response.shouldEndSession).to.be.true;
                        expect(res).to.have.deep.property('response.card.subtitle')
                            .that.matches(/Playing Next Episode/i);
                        expect(res).to.have.deep.property('response.outputSpeech.text')
                            .that.matches(/next episode.*Resurrection/i);
                        expect(plexAPIStubs.perform).to.have.been.calledWithMatch(/playMedia/i);
                        expect(plexAPIStubs.postQuery).to.have.been.calledWithMatch(/playQueues/i);
                        done();
                    }, fail: function(res) {
                        console.log(res);
                        done(Error('Lambda returned fail()'));
                    }
                });
            });

            it('should gracefully fail if the show name is not found', function (done) {
                request.request.intent.name = 'StartShowIntent';
                request.request.intent.slots.showName = {name: 'showName', value: 'q'};

                lambda.handler(request, {
                    succeed: function(res) {
                        //console.log(res);
                        expect(res.response.shouldEndSession).to.be.true;
                        expect(res).to.not.have.deep.property('response.card');
                        expect(res).to.have.deep.property('response.outputSpeech.text')
                            .that.matches(/I couldn't find that show in your library/i);
                        expect(plexAPIStubs.perform).to.not.have.been.calledWithMatch(/playMedia/i);
                        expect(plexAPIStubs.postQuery).to.not.have.been.calledWithMatch(/playQueues/i);
                        done();
                    }, fail: function(res) {
                        console.log(res);
                        done(Error('Lambda returned fail()'));
                    }
                });
            });

            it('should handle an error on query for all show names', function (done) {
                request.request.intent.name = 'StartShowIntent';
                request.request.intent.slots.showName = {name: 'showName', value: "a show I've finished watching"};

                plexAPIStubs.query.withArgs('/library/sections/1/all')
                    .rejects(new Error("Stub error from Plex API"));

                lambda.handler(request, {
                    succeed: function(res) {
                        console.log(res);
                        expect(res.response.shouldEndSession).to.be.true;
                        expect(res).to.not.have.deep.property('response.card');
                        expect(res).to.have.deep.property('response.outputSpeech.text')
                            .that.matches(/sorry/i);
                        done();
                    }, fail: function(res) {
                        console.log(res);
                        done(Error('Lambda returned fail()'));
                    }
                });
            });

            it('should handle an error on query for all episodes of a show', function (done) {
                request.request.intent.name = 'StartShowIntent';
                request.request.intent.slots.showName = {name: 'showName', value: "A show that will cause an error"};

                plexAPIStubs.query.withArgs('/library/metadata/3754/allLeaves')
                    .rejects(new Error("Stub error from Plex API"));

                lambda.handler(request, {
                    succeed: function(res) {
                        console.log(res);
                        expect(res.response.shouldEndSession).to.be.true;
                        expect(res).to.not.have.deep.property('response.card');
                        expect(res).to.have.deep.property('response.outputSpeech.text')
                            .that.matches(/sorry/i);
                        done();
                    }, fail: function(res) {
                        console.log(res);
                        done(Error('Lambda returned fail()'));
                    }
                });
            });

            it('should handle an error on query the server machine identifier', function (done) {
                request.request.intent.name = 'StartShowIntent';
                request.request.intent.slots.showName = {name: 'showName', value: "a show I've finished watching"};

                delete process.env.PMS_IDENTIFIER; // Remove identifier from cache

                plexAPIStubs.query.withArgs('/')
                    .rejects(new Error("Stub error from Plex API"));

                lambda.handler(request, {
                    succeed: function(res) {
                        console.log(res);
                        expect(res.response.shouldEndSession).to.be.true;
                        expect(res).to.not.have.deep.property('response.card');
                        expect(res).to.have.deep.property('response.outputSpeech.text')
                            .that.matches(/sorry/i);
                        done();
                    }, fail: function(res) {
                        console.log(res);
                        done(Error('Lambda returned fail()'));
                    }
                });
            });

            it('should handle an error on query for client info (to get the IP address)', function (done) {
                request.request.intent.name = 'StartShowIntent';
                request.request.intent.slots.showName = {name: 'showName', value: "a show I've finished watching"};

                plexAPIStubs.find.withArgs('/clients')
                    .rejects(new Error("Stub error from Plex API"));

                lambda.handler(request, {
                    succeed: function(res) {
                        console.log(res);
                        expect(res.response.shouldEndSession).to.be.true;
                        expect(res).to.not.have.deep.property('response.card');
                        expect(res).to.have.deep.property('response.outputSpeech.text')
                            .that.matches(/sorry/i);
                        done();
                    }, fail: function(res) {
                        console.log(res);
                        done(Error('Lambda returned fail()'));
                    }
                });
            });

            it("should throw an error if it can't find an unwatched episode", function (done) {
                request.request.intent.name = 'StartShowIntent';
                request.request.intent.slots.showName = {name: 'showName', value: 'a show with unwatched episodes'};

                plexAPIStubs.query.withArgs('/library/metadata/1/allLeaves')
                    .resolves(require('./samples/library_metadata_showepisodes_allwatched.json'));

                lambda.handler(request, {
                    succeed: function(res) {
                        console.log(res);
                        expect(res.response.shouldEndSession).to.be.true;
                        expect(res).to.not.have.deep.property('response.card');
                        expect(res).to.have.deep.property('response.outputSpeech.text')
                            .that.matches(/sorry/i);
                        done();
                    }, fail: function(res) {
                        console.log(res);
                        done(Error('Lambda returned fail()'));
                    }
                });
            });

            it("Should complain if now show name was provided", function (done) {
                request.request.intent.name = 'StartShowIntent';
                request.request.intent.slots = {};

                plexAPIStubs.query.withArgs('/library/metadata/1/allLeaves')
                    .resolves(require('./samples/library_metadata_showepisodes_allwatched.json'));

                lambda.handler(request, {
                    succeed: function(res) {
                        console.log(res);
                        expect(res.response.shouldEndSession).to.be.true;
                        expect(res).to.not.have.deep.property('response.card');
                        expect(res).to.have.deep.property('response.outputSpeech.text')
                            .that.matches(/No show specified/i);
                        done();
                    }, fail: function(res) {
                        console.log(res);
                        done(Error('Lambda returned fail()'));
                    }
                });
            });
        });
    });
});





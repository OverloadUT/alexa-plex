var expect = require('chai').expect;

module.exports = function() {

    describe("'not-authorized' state", function() {
        beforeEach(function() {
            this.request.session.user.userId = "MOCHA_NON_AUTHED_USER";
        });

        describe('IntroIntent', function() {
            it('Should greet a new user', function(done) {
                this.request.request.type = 'LaunchRequest';
                var self = this;
                this.lambda.handler(this.request, {
                    succeed: function(res) {
                        expect(res.response.shouldEndSession).to.be.true;
                        expect(res).to.not.have.deep.property('response.card.subtitle');
                        expect(res).to.have.deep.property('response.outputSpeech.text')
                            .that.matches(/welcome to/i);
                        done();
                    }, fail: self.lambdaFail(done)
                });
            });
        })
    });
};

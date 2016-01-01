require('dotenv').config({path: './test/test.env'});

var chai = require('chai');

var sinonChai = require("sinon-chai");
chai.use(sinonChai);

var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);

require('sinon-as-promised');

var Q = require('q');

before('Start dynalite (mock DynamoDB server)', function(done) {
    var dynalite = require('dynalite');
    var dynaliteServer = dynalite({createTableMs: 0});
    // Worth noting that in a REAL DynamoDB database, the tables are NOT created instantly. This test code would not work there.

// Listen on port 4567
    dynaliteServer.listen(4567, function(err) {
        if (err) throw err;
        console.log('Dynalite started on port 4567');

        var AWS = require('aws-sdk');
        AWS.config.update({
            region: process.env.AWS_REGION || "us-east-1",
            endpoint: process.env.AWS_ENDPOINT || null
        });
        var dynamodb = new AWS.DynamoDB();

        var params = {
            TableName : "AlexaPlexUsers",
            KeySchema: [
                { AttributeName: "userid", KeyType: "HASH" }  //Partition key
            ],
            AttributeDefinitions: [
                { AttributeName: "userid", AttributeType: "S" }
            ],
            ProvisionedThroughput: {
                ReadCapacityUnits: 1,
                WriteCapacityUnits: 1
            }
        };

        dynamodb.createTable(params, function(err, data) {
            if (err) {
                console.error(err);
                throw err
            }

            var dynamodbDoc = new AWS.DynamoDB.DocumentClient();
            var dynamodbDocPut = Q.nbind(dynamodbDoc.put, dynamodbDoc);

            var mockData = require('./mockdbdata.json');
            var promises = [];
            mockData.forEach(function(data) {
                var params = {
                    TableName: "AlexaPlexUsers",
                    Item: {
                        "userid": data.userid,
                        "authtoken": data.authtoken || undefined,
                        "pms_hostname": data.pms_hostname || undefined,
                        "pms_port": data.pms_port || undefined,
                        "pms_https": data.pms_https || undefined,
                        "player_name": data.player_name || undefined
                    }
                };

                promises.push(dynamodbDocPut(params));
            });

            Q.all(promises).then(function(data) {
                done();
            }).catch(function(err){
                console.error(err);
                throw err;
            });
        });
    })
});
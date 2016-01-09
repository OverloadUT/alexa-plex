var Q = require('q');
var AWS = require('aws-sdk');
AWS.config.update({
    region: process.env.AWS_REGION || "us-east-1",
    endpoint: process.env.AWS_ENDPOINT || null
});

var TABLE_NAME = "AlexaPlexUsers";

function initializeUserRecord(userid) {
    var dynamodbDoc = new AWS.DynamoDB.DocumentClient();
    var deferred = Q.defer();

    var getItemParams = {
        TableName: TABLE_NAME,
        Key: { "userid": userid }
    };

    dynamodbDoc.get(getItemParams, function(err, data) {
        if (err) {
            return deferred.reject(err);
        }

        if(!data.Item) {
            // User not in database yet. Let's create a row for them.
            var putParams = {
                TableName: "AlexaPlexUsers",
                Item: { userid: userid }
            };
            dynamodbDoc.put(putParams, function(err, data) {
                if (err) {
                    callback(err);
                } else {
                    // Inserted new user ID; all is good
                    return deferred.fulfill(putParams.Item);
                }
            })
        } else {
            // Found existing record; all is good
            return deferred.fulfill(data.Item);
        }
    });
    return deferred.promise;
}

function updatePin(user, pin) {
    var dynamodbDoc = new AWS.DynamoDB.DocumentClient();
    var deferred = Q.defer();

    var userid = user;
    if(typeof user === 'object') {
        userid = user.dbobject.userid;
    }

    var updateParams = {
        TableName: TABLE_NAME,
        Key: { "userid": userid },
        UpdateExpression: "set pin = :p",
        ExpressionAttributeValues:{
            ":p":pin
        },
        ReturnValues:"ALL_NEW"
    };

    dynamodbDoc.update(updateParams, function(err, data) {
        if (err) {
            return deferred.reject(err);
        }

        if(typeof user === 'object') {
            user.dbobject = data.Attributes;
        }

        deferred.fulfill(data);
    });

    return deferred.promise;
}

// TODO maybe move this to a method on the user?
function updateAuthToken(user, token) {
    var dynamodbDoc = new AWS.DynamoDB.DocumentClient();
    var deferred = Q.defer();

    var userid = user;
    if(typeof user === 'object') {
        userid = user.dbobject.userid;
    }

    var updateParams = {
        TableName: TABLE_NAME,
        Key: { "userid": userid },
        UpdateExpression: "set authtoken = :t",
        ExpressionAttributeValues:{
            ":t":token
        },
        ReturnValues:"ALL_NEW"
    };

    dynamodbDoc.update(updateParams, function(err, data) {
        if (err) {
            return deferred.reject(err);
        }

        if(typeof user === 'object') {
            user.dbobject = data.Attributes;
        }

        deferred.fulfill(data);
    });

    return deferred.promise;
}

function updateUserServer(user, server) {
    var dynamodbDoc = new AWS.DynamoDB.DocumentClient();
    var deferred = Q.defer();

    var userid = user;
    if(typeof user === 'object') {
        userid = user.dbobject.userid;
    }

    var updateParams = {
        TableName: TABLE_NAME,
        Key: { "userid": userid },
        UpdateExpression: "set server = :s",
        ExpressionAttributeValues:{
            ":s":server
        },
        ReturnValues:"ALL_NEW"
    };

    dynamodbDoc.update(updateParams, function(err, data) {
        if (err) {
            return deferred.reject(err);
        }

        if(typeof user === 'object') {
            user.dbobject = data.Attributes;
        }

        deferred.fulfill(data);
    });

    return deferred.promise;
}

function updateUserPlayer(user, player) {
    var dynamodbDoc = new AWS.DynamoDB.DocumentClient();
    var deferred = Q.defer();

    var userid = user;
    if(typeof user === 'object') {
        userid = user.dbobject.userid;
    }

    var updateParams = {
        TableName: TABLE_NAME,
        Key: { "userid": userid },
        UpdateExpression: "set player = :p",
        ExpressionAttributeValues:{
            ":p":player
        },
        ReturnValues:"ALL_NEW"
    };

    dynamodbDoc.update(updateParams, function(err, data) {
        if (err) {
            return deferred.reject(err);
        }

        if(typeof user === 'object') {
            user.dbobject = data.Attributes;
        }

        deferred.fulfill(data);
    });

    return deferred.promise;
}

module.exports.initializeUserRecord = initializeUserRecord;
module.exports.updatePin = updatePin;
module.exports.updateAuthToken = updateAuthToken;
module.exports.updateUserServer = updateUserServer;
module.exports.updateUserPlayer = updateUserPlayer;

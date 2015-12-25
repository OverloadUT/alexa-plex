var Q = require('q');
var AWS = require('aws-sdk');
AWS.config.update({
    region: process.env.AWS_REGION || "us-east-1"
});

if(process.env.NODE_ENV == 'test') {
    AWS.config.update({
        endpoint: process.env.AWS_ENDPOINT || "http://localhost:8000"
    });
}

function initializeUserRecord(userid) {
    var dynamodbDoc = new AWS.DynamoDB.DocumentClient();
    var deferred = Q.defer();

    var getItemParams = {
        TableName: "AlexaPlexUsers",
        Key: { "userid": userid }
    };

    dynamodbDoc.get(getItemParams, function(err, data) {
        if (err) {
            return deferred.reject(err);
        } else {
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
        }
    });
    return deferred.promise;
}

exports.initializeUserRecord = initializeUserRecord;

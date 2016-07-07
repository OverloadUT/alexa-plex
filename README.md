# No longer maintained
*Great news for Plex and Amazon Echo fans alike!!* I am going to be working directly with Plex to make an official Alexa Plex skill, which will be totally streets ahead.

Stay tuned to Plex's [official channels](https://blog.plex.tv/) for more!

The final state of this public project will remain here for people to learn from, but no further development should be expected.

*(original readme follows)*

# aplexa
Alexa (Amazon Echo) app for interacting with a Plex Server and controlling client playback

**This page is for developers that want to help develop the app.** If you want to USE the app, check out this page: https://overloadut.github.io/aplexa

Development is being tracked on Waffle.io: https://waffle.io/OverloadUT/aplexa

# Demo
Here's an early proof-of-concept video

[![Video thumbnail](https://raw.githubusercontent.com/OverloadUT/aplexa/master/docs/video_thumbnail.jpg)](https://www.youtube.com/watch?v=-jZuSN0YkRM)

# Install for Development

1. ```npm install``` to install all dependencies
2. ```npm test``` to verify that all tests are passing. If they are, you're ready to rock!

## AWS Lambda
The app is meant to be deployed as an **AWS Lambda** function. Setting that up is beyond the scope of this readme though. There's a deploy.bat file in this project that will deploy to AWS Lambda if you're on Windows, but you will need to have the AWS toolkit installed and configured, and have an "aplexa" function set up.

## Dynamo DB
This app requires DynamoDB. You'll need to get that set up and create a table named `AlexaPlexUsers` with a primary string key of `userid`

## Testing on a live Plex server
You need to define a few environment variables to tell this app how to talk to your Plex server. The project is set up to use ```dotenv``` so you can simply create a ```.env``` file in the project root to define all of the needed variables. Here's a template:

```
APP_PRODUCT=Alexa Plex
APP_VERSION=2.0
APP_DEVICE=Amazon Echo
APP_DEVICE_NAME=Alexa
APP_IDENTIFIER=(generate a UUID for your app)
ALEXA_APP_ID=(create an alexa app and put the app ID here)
AWS_ACCESS_KEY_ID=(you need AWS credentials here that has read and write access to a DynamoDB table)
AWS_SECRET_ACCESS_KEY=(you need AWS credentials here that has read and write access to a DynamoDB table)
```

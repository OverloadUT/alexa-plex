
[![Travis](https://img.shields.io/travis/OverloadUT/alexa-plex.svg?style=flat-square)](https://travis-ci.org/OverloadUT/alexa-plex)
[![Coveralls](https://img.shields.io/coveralls/OverloadUT/alexa-plex.svg?style=flat-square)](https://coveralls.io/r/OverloadUT/alexa-plex)

# alexa-plex

[![Join the chat at https://gitter.im/OverloadUT/alexa-plex](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/OverloadUT/alexa-plex?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
Alexa (Amazon Echo) app for interacting with a Plex Server and controlling client playback

This app is a big work in progress and is not ready for public use yet. 

Development is being tracked on Waffle.io: https://waffle.io/OverloadUT/alexa-plex

# Demo
Here's an early proof-of-concept video

[![Video thumbnail](https://raw.githubusercontent.com/OverloadUT/alexa-plex/master/docs/video_thumbnail.jpg)](https://www.youtube.com/watch?v=-jZuSN0YkRM)

# Install for Development
I accept Pull Requests! To get set up for development simply:

1. ```npm install``` to install all dependencies
2. ```npm test``` to verify that all tests are passing. If they are, you're ready to rock!

## AWS Lambda
The app is meant to be deployed as an **AWS Lambda** function. Setting that up is beyond the scope of this readme though. There's a deploy.bat file in this project that will deploy to AWS Lambda if you're on Windows, but you will need to have the AWS toolkit installed and configured, and have an "alexa-plex" function set up.

## Testing on a live Plex server
You need to define a few environment variables to tell this app how to talk to your Plex server. The project is set up to use ```dotenv``` so you can simply create a ```.env``` file in the project root to define all of the needed variables. Here's a template:

```
PMS_HOSTNAME=
PMS_PORT=
PMS_USERNAME=
PMS_PASSWORD=
PLEXPLAYER_NAME=
APP_PRODUCT=Alexa Plex
APP_VERSION=0.1
APP_DEVICE=Amazon Echo
APP_DEVICE_NAME=Alexa Plex
APP_IDENTIFIER=(generate a UUID for your app)
```

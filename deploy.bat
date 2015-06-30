@echo off
rmdir dist\install /S /Q
mkdir dist\install
call npm install --prefix dist\install .
del dist\dist.zip
7z a dist\dist.zip .\dist\install\node_modules\alexa-plex\*
echo Function zipped. Updating...
aws lambda update-function-code --zip-file fileb://dist\dist.zip --function-name alexa-plex

# IShowOff for Visual Studio Code Extension

The companion extension for [IShowOff](https://github.com/parapsychic/ishowoff).

This extension can automatically run the Github Action to update your session time like this:

<img src="screenshots/img.png" width="100%">


## Setup

1. Get a [Personal Access Token](https://github.com/settings/tokens/new). Please keep in mind that this token is equivalent to your password. Do not give it admin permissions. repo:write permissions are required. Anything below that is not required. Also, for extra safety, set an expiration date.
2. Fork [IShowOff](https://github.com/parapsychic/ishowoff) and follow the instructions on that repo.
3. Set the settings in VS Code. You should be prompted during the first run. Be sure to set the **Token** from last step, **username**, **forked repo name** from last step (usually, just ishowoff).

## Known issues:
1. Editing config might trigger multiple timers and may send multiple rerun requests to github workflow. I'm working on a fix.
2. You tell me. Open an issue.


**Enjoy**

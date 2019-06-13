# pin_archiver

This is a discord bot made in node.js that allow to convert all pinned messages from a channel into a zip file.
This bot does:
* Read all the pinned messages of a channel.
* Save all pictures and embed pictures.
* Make a HTML file to help reading the logs.
* Zip it all.
* If the file is under 8 MB, upload it to discord.
* If the file is above 8 MB, keeps it in your server and post a link to the file.

This is very WIP and only a proof of concept at the moment. The current POC uses the default LAPM environment for the server file storage.

## Installation
Make sure you have a public domain on the same machine you run the bot.
$ cd /path/to/pin_archiver/
$ npm install js-yaml discord.js sync-request https
Open index.js with a text editor and set the values in the const declaration:
* storagePath -> put the path where your domain leads
* domainName -> name of your public domain
* botHost -> a message for people encountering some kind of error (you can leave blank)
Create a file called "secret.config.yaml" and write
"---
token: replaceWithYourDiscordBotToken" 
in it without quotes.
Save.
$ node index.js

## Usage
Put multiple words parameters in "quotes". Case is ignored.
* .r help |Sends you a help message.
* .r archive [me]|Post an archive of the current channel's pinned messages in the current channel. Specify "me" to send it in your dm.

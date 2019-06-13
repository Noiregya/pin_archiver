const Discord = require('discord.js')
const client = new Discord.Client()
const fs = require('fs');
const yaml = require('js-yaml')
const JSZip = require('jszip')
const prefix = '.R'
const https = require('https');
const request = require('sync-request');
const storagePath = '/var/www/html/storage/' //Where to save the zip files temporarily or forever if they're too big for Discord.
const DiscordMaxFileSize = 8388119 //Exact max file size allowed by discord for the bot.
const domainName = 'http://gya.services/'//Domain name for the storage server. Only works if the storage server is also the bot server.
const botHost = 'You can talk about your issue to Noiregya#1111 or by email noiregya@gmail.com.' //Contacts for the bot host in case an issue occurs to a user.
// Get document, or throw exception on error
try {
  var config = yaml.safeLoad(fs.readFileSync(__dirname+'/secret.yaml', 'utf8'));
} catch (e) {
  console.log(e);
}
const myDamnTokenDontLookAtIt = config['token']


const help = ["List of available commands:"+ //Help message.
'\`\`\`'+prefix+' help - DM this message'+
'\n'+prefix+' archive [me] - Archive all the pinned message in the current channel. [me] means you will receive the archive in a direct message.\`\`\`']

const Styles = '<style>\n'+ //Styles for the HTML file generated.
'  .author {\n'+
'    color: yellow;\n'+
'    font-family: "Calibri", sans-serif;\n'+
'  }\n'+
'  .createdAt {\n'+
'    text-align: right;\n'+
'    font-style: italic;\n'+
'    font-size: 12px;\n'+
'    font-family: "Courrier New", monospace;\n'+
'    color: #808080;\n'+
'  }\n'+
'  .content {\n'+
'    margin-left: 1em;\n'+
'    font-family: "Calibri", sans-serif;\n'+
'    padding-bottom: 25px;\n'+
'    border-bottom-style: dotted;\n'+
'    border-color: gray;\n'+
'    color: #B0B0B0;\n'+
'  }\n'+
'  body {\n'+
'    background-color: #101112;\n'+
'    display: block;\n'+
'    margin-left: auto;\n'+
'    margin-right: auto;\n'+
'    width: 50%;\n'+
'  }\n'+
'  a {\n'+
'    color: #5050FF;\n'+
'  }\n'+
'img {\n'+
'   width:100%;\n'+
'   max-width:600px;\n'+
'  }\n'+
'</style>'


function parseMessage(string){
	var spaces = string.trim().split('"');
  var peer = true;
  var parsedCommand = new Array();
  spaces.forEach(function(space){
    if(peer){
      parsedCommand = parsedCommand.concat(space.trim().split(" "));
    }else{
      parsedCommand.push(space);
    }
    peer = !peer;
  });
	return parsedCommand.filter(value => Object.keys(value).length !== 0);
}

/**
@param messageArray is an array containing all the messages to archive.
@returns a zip file that contains a webpage with all the pins and its files.
**/
async function downloadAll(messageArray){
  var zip = new JSZip()
  var images = zip.folder('images')
  i = 0
  let htmlString = '<!DOCTYPE html><html><head>\n' + Styles + '</head><body>'
  for (currentMessage of messageArray){
    //var currentMessage = pinnedArray[i]
    console.log('For message '+currentMessage.id)
    htmlString+= '<div class="author">'+currentMessage.author.tag+'</div>\n'+
    '<div class="createdAt"> <time>'+currentMessage.createdAt.toUTCString()+'</time></div>\n'+
    '<div class="content">'+currentMessage.content+'<br>\n'
    console.log('The message has '+currentMessage.attachments.array().length+' attachement(s).')
    var attachementArray = currentMessage.attachments.array()
    if(attachementArray.length > 0){
      for(currentAttachement of attachementArray){
		    var currentFilename = currentMessage.id+'_'+currentAttachement.filename
        console.log('Adding file '+currentFilename)
        if(currentFilename.toUpperCase().match(new RegExp('.JPG$|.GIF$|.PNG$|.JPEG$|.SVG$|.WEBP$'))){
          htmlString+='<img src="images/'+currentFilename+'" alt ="'+currentAttachement.filename+'">'
        } else {
          htmlString+='<a href="images/'+currentFilename+'"> '+currentFilename+'</a>'
        }
        var res = request('GET', currentAttachement.url);
        images.file(currentFilename, res.body)
      }
    }
    if(currentMessage.embeds != undefined){
      var embedArray = currentMessage.embeds
      if(embedArray.length > 0){
        for(currentEmbed of embedArray){
          var toSave = currentEmbed.image || currentEmbed.thumbnail
          if(toSave != undefined){
            var urlSplit = toSave.url.split('/')
            var currentFilename = currentMessage.id+'_'+urlSplit[urlSplit.length - 1 ]
            console.log('Adding file '+currentFilename)
            if(currentFilename.toUpperCase().match(new RegExp('.JPG|.GIF|.PNG|.JPEG|.SVG|.WEBP'))){
              htmlString+='<img src="images/'+currentFilename+'" alt ="'+toSave.url+'">'
            } else {
              htmlString+='<a href="images/'+currentFilename+'"> '+currentFilename+'</a>'
            }
            var res = request('GET', toSave.url);
            images.file(currentFilename, res.body)
          }
        }
      }
      htmlString+='</div>\n'
      i++
    }
  }
  htmlString += '</body></html>\n'
  zip.file("index.html", htmlString)
  return zip
}

//Client initialisation
client.on('ready', function(){
  console.log('Welcome to pin_archiver.'+'\n')
  console.log('Logged in as '+client.user.tag+'!')
  client.user.setActivity(prefix+" HELP",{ type: 'LISTENING' }).then(function(presence){
  },function(err){
    console.log(err)
  });
  client.on('message', function(msg){
    let parsedMessage = parseMessage(msg.content)
    if(parsedMessage.length >= 2 && parsedMessage[0].toUpperCase() == prefix){
      if(parsedMessage[1].toUpperCase() == 'HELP'){
        msg.author.createDM().then(function(DMChannel){
          DMChannel.send(help).catch(function(err){
            console.log(err)
          })
        }, function(err){
          //Couldn't create DM
          console.log(err)
        })
      }
      if(parsedMessage[1].toUpperCase() === 'ARCHIVE'){
        if (msg.channel.type === 'text'){
          var internalChannelID = msg.guild.id //Folder name in the local files
        } else {
          var internalChannelID = msg.author.id
        }
        var targetChannel = msg.channel
        if(parsedMessage.length >= 3 && parsedMessage[2].toUpperCase() === 'ME'){
          console.log('me')
          msg.author.createDM().then(function(DMChannel){
            targetChannel = DMChannel
          })
        }
        msg.channel.fetchPinnedMessages().then(function(pinnedMessages){
          let pinnedArray = pinnedMessages.array()
          downloadAll(pinnedArray).then(function(zipFile){
            let stream = zipFile.generateNodeStream({type:"nodebuffer"})
            //---------------
            var directory = storagePath+internalChannelID+"/"
            fs.mkdir(directory, { recursive: true }, (err) => {
              if (err && err.code!='EEXIST') {
                throw(err)
                //throw err
              }
              var filePath = directory+msg.channel.name+'.zip'
              var pipeStream = stream.pipe(fs.createWriteStream(filePath)) //Saving the file locally is needed to evaluate the size.
              pipeStream.on('finish', function () {
                //console.log('The file is '+fs.statSync(filePath).size+' bytes')
                if(fs.statSync(filePath).size < DiscordMaxFileSize- 200){
                  //If the file is small enough to be uploaded by the bot, -200 accounts for the text content too.
                  targetChannel.send('I prepared your archive!', new Discord.Attachment(filePath, msg.channel.name+'.zip')).then(
                    function(){//Delete the file.
                      fs.unlink(filePath, (err) => {
                        if (err) {
                          console.log(err)
                        }
                      })
                    },
                    function(err){
                      //Message failed to send. Still delete the file.
                      fs.unlink(filePath, (err2) => {
                        if (err2) {
                            console.log(err2)
                          }
                      })
                      console.log(err)
                  })
                } else {
                  /*
                  File is too big, so a link to the local file is given.
                  Works only if you set correctly domainName const and
                  domain/storage is accessible from wan.
                  Keep in mind that when it happens, files are stored indefinitely.*/
                  targetChannel.send('Ugh, it\'s really heavy... I still prepared your archive!\n'+domainName+'storage/'+internalChannelID+'/'+msg.channel.name+'.zip').catch(function(err){
                    console.log(err)
                  })
                }
              })
              pipeStream.on('error', function () {
                //Couldn't save the zip locally
                targetChannel.send('I\'m not sure why but I couldn\'t save the archive... Maybe  this archive is way too big or I already have too much?\n'+
              +botHost).catch(function(err){
                  console.log(err)
                })
              })
            })
          }, function(err){console.log(err)})
        }, function(err){console.log(err)})
      }
    }
  })
})

client.login(myDamnTokenDontLookAtIt)

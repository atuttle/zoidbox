# Zoidbox Help

### #help

gives you this help message as a private message.

### #help nick

sends `nick` a private message with help.

### #pounce nick message

The next time `nick` joins the room, send them a message on your behalf.

### #pounces

List users that have at least one pounce waiting for them.

### #lastseen

tells you the last people to leave.

### #lastseen nick

tells you when `nick` was last seen.

### +1 nick or nick: +1

gives karma to `nick`

### #karma

the karma leaderboard for this channel

### #karma nick

the karma for `nick`

### #karmagivers

the karma giving leaderboard for this channel

### #karmagivers nick

the karma given by that `nick`

### ^http://google.com

Will let you know if google.com appears to be up/down to Zoidbox (runs on AWS).

### #random

pick a random user currently in the chat

### #stats

show message counts from the room

### #stats nick

show message counts for that `nick`

### mention zoidbox

posts a random zoidism

### zoidbox {any question}?
### zoidbox 8ball

zoidbox replies with a magic 8ball response.  The question must end in a question mark. example: zoidbox, can I do this?

### #maxusers

shows the most number of users in the current channel and when.  You can also use #maxusers {channel} to get info for other channels that zoidbox is part of.

### #time

shows the current UTC time.

### !CFMLfunctionOrTagName

posts docs summary and link for requested function or tag from [cfdocs.org](http://cfdocs.org).  You can also do !cfscriptref for Adam Cameron's CFScript Reference.

You can also search for the following to get links to documentation:

- !cfscriptref - Adam Cameron's CFScript Reference
- !taffy
- !fw1
- !di1
- !coldbox
- !testbox
- !wirebox
- !commandbox
- !cfdownloads - coldfusion installers

If you have other documentation that would be a good fit, open an issue or even better, send a pull request.

### #cfdocs CFMLFunctionOrTagName

shows how many times that query has been searched for.

### #cfdocs !stats

show the top 10 searched for queries against cfdocs

### #cfbugs !poll

Check for any new bugs in the ColdFusion bugbase (https://bugbase.adobe.com). Zoidbox will check every 15 minutes, but if you can't wait that long you can request an immediate check with this command.

### #luceebugs !poll

Check for any new bugs in the lucee bitbucket issues list.  Zoidbox will check every 15 minutes, but if you can't wait that long you can request an immediate check with this command.

### end your message with a space and the word over

KSHHK

### box install {anything}

*giggles*

### #hush [minutes]

Shut zoidbox up for some minutes, default 15. Also available as `zoidbox hush`



### giphy:[phrase]

Will query the Giphy API and return a random animated gif based on your provided phrase / keyword

### #cfhour !latest

Will return the latest show from the CFHour feed. The title and .mp3 link will be given.

### #cfhour !poll

Check for any new shows in the CFHour feed (http://feeds.feedburner.com/CfhourColdfusionPodcast). Zoidbox will check every 15 minutes, but if you can't wait that long you can request an immediate check with this command.



##Polling

### #poll -create "question text" -options ["Option A", "Option B", "Option C"]

Create a new poll.  There cannot be a poll currently created.  Please use double quotes for the question text and the answers.  There must be at least two possible answers.

There are optional flags you can include (only at) the end of the -create command:

- ```-open``` will immediately open the poll
- ```-allowMultipleVotes``` will allow users to vote for multiple answers, but not the same answer multiple times.
- ```-pmOnly``` will only allow votes to be cast through PM.

### #poll -open

Opens poll for voting

### #poll -close

Closes poll and tallies the results.

### #poll -peek OR #poll -results

Shows the provisional results of the poll

### #poll or #poll -status

Shows the current status of the poll, the question and the answers.

### #poll {answer letter}

Votes for that answer.

### #poll -rescind

Rescind all of your votes from the current poll.

### #poll -clear

Clears all votes previously placed.

### #poll -reset

Clears the poll and votes.  You have to reset before you can create a new poll.

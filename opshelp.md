# OP Commands

### #ops

get a list of ops

### #op nick

make a user an op

### #deop nick

make a user not an op

### #karma !reset nick

reset a user's karma

### #karma !reset

resets all karma stats

### #karma !ban nick

bans nick from receiving karma in the current channel

### #karma !unban nick

restores karma privileges

### #karma !bans

shows who is banned from karma in the current channel

### #karma !all

will show you the karma leaderboard from all of the rooms the bot is currently in - can only be used from #zoidbox

### #karmagivers !all

will show you the karmagivers leaderboard from all of the rooms the bot is currently in - can only be used from #zoidbox

### #karmagivers !reset nick

reset a karma giver's stats

### #karmagivers !reset

resets all karma giving stats

### #stats !reset

resets all statistics for the current room

### #stats !all

will show you stats from all of the rooms the bot is currently in - can only be used from #zoidbox

### #cfbugs !init

Only useful to prevent chat flooding if the Redis store has been lost. With an empty Redis store, all bugs appear to be new, so it will notify about each one individually. If you wait until zoidbox joins the channel and then run this command, zoidbox will cache all visible bugId's without sending any messages to chat for any of them.

### #pounces !clear

clear all pending pounces

### #cooldowns !clear

clear all cooldowns

### !{anything} !desc newDescription

Override or set the description for anything.  Does not have to be an actual tag or function

### !{anything} !desc !clear

Clears the custom description

### #pause botname

Will block all input and output in the current room from the bot until an #unpause is issued by an op

### #unpause botname or #play botname

Will resume bot activities in the current room


### #cfhour !init

Only useful to prevent chat flooding if the Redis store has been lost. With an empty Redis store, all shows appear to be new, so it will notify about each one individually. If you wait until zoidbox joins the channel and then run this command, zoidbox will cache all visible showRefs without sending any messages to chat for any of them.

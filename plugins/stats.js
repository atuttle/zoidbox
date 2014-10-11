'use strict';

var _ = require("lodash");
var events = require("events");
var emit = new events.EventEmitter();
var moment = require('moment');

module.exports = (function(){

	var bot,
		redis,
		log,
        conf,
        currentlyOnline = {};

    emit.on("lastseen", function(from, to, text) {
        var nick = text.replace("#lastseen", "").trim();

        if (nick.length) {
            redis.hget(conf.get("botName") + "." + to + ".lastseen", nick, function(err, data) {
                if (data !== null) {
                    var date = new Date(parseInt(data, 10));
                    bot.say(to, "I last saw " + nick + " around " + date.toLocaleString());
                } else {
                    bot.say(to, "who? " + nick + "? Never heard of them.");
                }
            });
        } else {
            redis.hgetall(conf.get("botName") + "." + to + ".lastseen", function(err, data){
                log(data);
                if (data !== null) {
                    var people = _.map(_.sortBy(_.map(data, function(item, key) { return [key, item]}), 1).reverse().slice(0, 10), function(item) {return item[0];}).join(", ");
                    bot.say(to, "The last users to leave were: " + people);
                } else {
                    bot.say(to, "I haven't seen anyone all day.");
                }
            })
        }
    });

    emit.on("stats", function(from, to, text){
        var nick = text.replace("#stats", "").trim();

        if (nick.length) {
            if (nick.toLowerCase().split(" ")[0] === "!reset") {
                isOp(from, function(err, data){
                    if (data == 0) {
                        bot.say(to, "You must be an op to do that.")
                    } else {
                        resetStats(to);
                        bot.say(to, "All stats have been reset.");
                    }
                });
            } else {
                getNickMessageCount(to, nick, function(err, data){
                    if (data !== null && data !== 0) {
                        bot.say(to, nick + " has sent " + data.toString() + " messages.");
                    } else {
                        bot.say(to, " " + nick + " hasn't said anything yet.");
                    }
                });
            }
        } else {
            getChannelMessageCount(to, function(err, channelMessageCount){
                getMessageCountLeaderboard(to, function(err, data){
                    log("getMessageCountLeaderboard", err, data);
                    var leaders = _.map(
                                        _.sortBy(
                                            _.filter(
                                                    _.map(data, function(item, key) {
                                                        return [key, item]
                                                    }), function(item) {
                                                        return item[0] !== to;
                                            })
                                    , function(value){
                                        return _.parseInt(value[1], 10);
                                    })
                                .reverse()
                                .slice(0, 10)
                                , function(item) {
                                    return item[0] + ": " + item[1] + " (" + _.parseInt((item[1] / channelMessageCount) * 100, 10) + "%)";
                                }).join(", ");

                    bot.say(to, "Total Messages: " + channelMessageCount + ". Most talkative users are: " + leaders);
                    bot.say(to, "I have been running for " + moment(bot.starttime).fromNow(true));
                });

            })
        }
    });

    function setLastSeen (channel, nick) {
        redis.hset(conf.get("botName") + "." + channel + ".lastseen", nick.toLowerCase(), Date.now());
    }

    function setCurrentlyOnline(channel, nick, isOnline) {
        if (_.isBoolean(isOnline)) {
            if (isOnline) {
                currentlyOnline[channel + "." + nick.toLowerCase()] = 1;
            } else {
                delete currentlyOnline[channel + "." + nick.toLowerCase()];
            }
        }
    }

    function getCurrentlyOnline(channel) {
        return _.map(_.filter(_.keys(currentlyOnline), function(item) {
                return item.indexOf(channel + ".") === 0;
            }), function(item) {
                return item.replace(channel + ".", "");
            });
    }

    function isCurrentlyOnline(channel, nick) {
        return !_.isUndefined(currentlyOnline[channel + "." + nick.toLowerCase()])
    }

    function countMessage (channel, nick) {
        redis.hincrby(conf.get("botName") + "." + channel + ".messageCount", channel, 1);
        redis.hincrby(conf.get("botName") + "." + channel + ".messageCount", nick.toLowerCase(), 1);
    }

    function getChannelMessageCount(channel, callback) {
        redis.hget(conf.get("botName") + "." + channel + ".messageCount", channel, callback);
    }

    function getNickMessageCount(channel, nick, callback) {
        redis.hget(conf.get("botName") + "." + channel + ".messageCount", nick.toLowerCase(), callback);
    }

    function getMessageCountLeaderboard(channel, callback) {
        redis.hgetall(conf.get("botName") + "." + channel + ".messageCount", callback);
    }

    function resetStats(channel) {
        redis.del(conf.get("botName") + "." + channel + ".messageCount");
    }




    return function init (_bot){
		bot = _bot;
		log = bot.log;
        conf = bot.conf;
        redis = bot.redis;

        bot.addListener("part", function(channel, nick, reason, message) {
            log("part", channel, nick, reason);
            setLastSeen(channel, nick);
            setCurrentlyOnline(channel, nick, false);
        });

        bot.addListener("quit", function(channel, nick, reason, message) {
            log("quit", channel, nick, reason);
            setLastSeen(channel, nick);
            setCurrentlyOnline(channel, nick, false);
        });

        bot.addListener("join", function(channel, nick, message){
            log("join", channel, nick, message);
            setLastSeen(channel, nick);
            setCurrentlyOnline(channel, nick, true);
        });

        bot.addListener("names", function(channel, nicks){
            log("names", channel, nicks);

            _.each(nicks, function(item, key) {
                setLastSeen(channel, key);
                setCurrentlyOnline(channel, key, true);
            })

        });

        bot.addListener("nick", function(oldNick, newNick, channel, message) {
            setLastSeen(channel, oldNick);
            setLastSeen(channel, newNick);
            setCurrentlyOnline(channel, oldNick, false);
            setCurrentlyOnline(channel, newNick, true);
        });

        bot.addListener("message", function( from, to, text){

            setLastSeen(to, from);
            countMessage(to, from);

            if (to == conf.get("botName")) {
                //they are talking to us in a private message, set to to be from
                to = from;
            }

            if (text.indexOf("#lastseen") == 0) {
                emit.emit("lastseen", from, to, text);
            } else if (text.indexOf("#stats") == 0) {
                emit.emit("stats", from, to, text);
            }
        });

        bot.getCurrentlyOnline = getCurrentlyOnline;
        bot.isCurrentlyOnline = isCurrentlyOnline;

	};



})();

'use strict';

var _ = require('lodash');
var events = require('events');
var emit = new events.EventEmitter();
var moment = require('moment');

module.exports = (function(){

	var bot,
		redis,
		log,
		conf,
		currentlyOnline = {};

	emit.on('lastseen', function(from, to, text) {
		var nick = text.replace('#lastseen', '').trim();

		if (nick.length) {
			redis.hget(bot.botName + '.' + to + '.lastseen', nick, function(err, data) {
				if (data !== null) {
					var date = new Date(parseInt(data, 10));
					bot.say(to, 'I last saw ' + nick + ' around ' + date.toLocaleString());
				} else {
					bot.say(to, 'who? ' + nick + '? Never heard of them.');
				}
			});
		} else {
			redis.hgetall(bot.botName + '.' + to + '.lastseen', function(err, data){
				log(data);
				if (data !== null) {
					var people = _.map(_.sortBy(_.map(data, function(item, key) { return [key, item];}), 1).reverse().slice(0, 10), function(item) {return item[0];}).join(', ');
					bot.say(to, 'The last users to leave were: ' + people);
				} else {
					bot.say(to, 'I haven\'t seen anyone all day.');
				}
			});
		}
	});

	emit.on('stats', function(from, to, text){
		var nick = text.replace('#stats', '').trim();

		if (nick.length) {
            if (nick.toLowerCase().split(' ')[0] === '!reset') {
                bot.ops.isOp(from, function (err, data) {
                    if (data === 0) {
                        bot.say(to, 'You must be an op to do that.');
                    } else {
                        resetStats(to);
                        bot.say(to, 'All stats have been reset for: ' + to);
                    }
                });
            } else if (nick.toLowerCase().split(' ')[0] === '!all' && to === bot.testingChannel) {
                log('!all', to, bot.botName);
                getChannels(function(err, data){
                    bot.say(to, 'I have data for the following channels: ' + data.join(', '));
                    _.each(data, function(channel) {
                        displayStatsForChannel(channel, to);
                    });
                    displayRunningTime(to);
                });
            } else {
				getNickMessageCount(to, nick, function(err, data){
					if (data !== null && data !== 0) {
						bot.say(to, nick + ' has sent ' + data.toString() + ' messages.');
					} else {
						bot.say(to, ' ' + nick + ' hasn\'t said anything yet.');
					}
				});
			}
		} else {
            displayStatsForChannel(to, to);
            displayRunningTime(to);
		}
	});

	emit.on('random', function(from, to) {
		var currentlyOnlineUsers = getCurrentlyOnline(to);
		bot.say(to, 'eeny,  meeny,  miny, ... ' + currentlyOnlineUsers[_.random(0, currentlyOnlineUsers.length-1)]);
	});

	emit.on('currentlyonline', function(from, to) {
		var currentlyOnlineUsers = getCurrentlyOnline(to);
		bot.say(to, 'I see: ' + currentlyOnlineUsers.join(', '));
	});

    function displayStatsForChannel (channel, replyToChannel) {
        getChannelMessageCount(channel, function(err, channelMessageCount){
            getMessageCountLeaderboard(channel, function(err, data){
                log('getMessageCountLeaderboard', err, data);
                var leaders = _.map(
                                    _.sortBy(
                                        _.filter(
                                                _.map(data, function(item, key) {
                                                    return [key, item];
                                                }), function(item) {
                                                    return item[0] !== channel;
                                        }) ,
                                function (value){
                                    return _.parseInt(value[1], 10);
                                })
                            .reverse()
                            .slice(0, 10),
                            function(item) {
                                return item[0] + ': ' + item[1] + ' (' + _.parseInt((item[1] / channelMessageCount) * 100, 10) + '%)';
                            }).join(', ');

                bot.say(replyToChannel, 'Total Messages for ' + channel + ': ' + channelMessageCount + '. Most talkative users are: ' + leaders);
            });
        });
    }

    function displayRunningTime (replyToChannel) {
        bot.say(replyToChannel, 'I have been running for ' + moment(bot.starttime).fromNow(true));
    }

	function setLastSeen (channel, nick) {
		redis.hset(bot.botName + '.' + channel + '.lastseen', nick.toLowerCase(), Date.now());
	}

	function setCurrentlyOnline(channel, nick, isOnline) {
		if (_.isBoolean(isOnline)) {
			if (isOnline) {
                log('setCurrentlyOnline:', channel, nick, isOnline);
				currentlyOnline[channel + '.' + nick.toLowerCase()] = 1;
			} else {
                log('clearingCurrentlyOnline:', channel, nick, isOnline);
				delete currentlyOnline[channel + '.' + nick.toLowerCase()];
			}
		}
	}

	function getCurrentlyOnline (channel) {
		return _.map(_.filter(_.keys(currentlyOnline), function(item) {
				return item.indexOf(channel + '.') === 0;
			}), function(item) {
				return item.replace(channel + '.', '');
			});
	}

	function isCurrentlyOnline (channel, nick) {
        log('isCurrentlyOnline:', channel, nick, currentlyOnline, currentlyOnline[channel + '.' + nick.toLowerCase()]);
		return !_.isUndefined(currentlyOnline[channel + '.' + nick.toLowerCase()]);
	}

    function getChannels (callback) {
        redis.smembers(bot.botName + '.channels', callback);
    }

	function countMessage (channel, nick) {
        redis.sadd(bot.botName + '.channels', channel);
		redis.hincrby(bot.botName + '.' + channel + '.messageCount', channel, 1);
		redis.hincrby(bot.botName + '.' + channel + '.messageCount', nick.toLowerCase(), 1);
	}

	function getChannelMessageCount (channel, callback) {
		redis.hget(bot.botName + '.' + channel + '.messageCount', channel, callback);
	}

	function getNickMessageCount (channel, nick, callback) {
		redis.hget(bot.botName + '.' + channel + '.messageCount', nick.toLowerCase(), callback);
	}

	function getMessageCountLeaderboard (channel, callback) {
		redis.hgetall(bot.botName + '.' + channel + '.messageCount', callback);
	}

	function resetStats (channel) {
		redis.del(bot.botName + '.' + channel + '.messageCount');
	}

	return function init (_bot){
		bot = _bot;
		log = bot.log;
		conf = bot.conf;
		redis = bot.redis;

		bot.getChannels = getChannels;

		bot.addListener('part', function(channel, nick, reason) {
			log('part', channel, nick, reason);
			setLastSeen(channel, nick);
			setCurrentlyOnline(channel, nick, false);
		});

		bot.addListener('quit', function(nick, reason, channels) {
			log('quit', channels, nick, reason);
            _.each(channels, function(channel) {
                setLastSeen(channel, nick);
                setCurrentlyOnline(channel, nick, false);
            });
		});

		bot.addListener('join', function(channel, nick, message){
			log('join', channel, nick, message);
			setLastSeen(channel, nick);
			setCurrentlyOnline(channel, nick, true);
		});

		bot.addListener('names', function(channel, nicks){
			log('names', channel, nicks);

			_.each(nicks, function(item, key) {
				setLastSeen(channel, key);
				setCurrentlyOnline(channel, key, true);
			});

		});

		bot.addListener('nick', function(oldNick, newNick, channels) {
            log('nick', oldNick, newNick, channels);
            _.each(channels, function(channel) {
                setLastSeen(channel, oldNick);
                setLastSeen(channel, newNick);
                setCurrentlyOnline(channel, oldNick, false);
                setCurrentlyOnline(channel, newNick, true);
            });
		});

		bot.addListener('message', function( from, to, text){

			setLastSeen(to, from);
			countMessage(to, from);

			if (to === bot.botName) {
				//they are talking to us in a private message, set to to be from
				to = from;
			}

			if (text.indexOf('#lastseen') === 0) {
				emit.emit('lastseen', from, to, text);
			} else if (text.indexOf('#stats') === 0) {
				emit.emit('stats', from, to, text);
			} else if (text.indexOf('#random') === 0) {
				emit.emit('random', from, to, text);
			} else if (text.indexOf('#currentlyonline') === 0) {
				emit.emit('currentlyonline', from, to, text);
			}

		});

		bot.getCurrentlyOnline = getCurrentlyOnline;
		bot.isCurrentlyOnline = isCurrentlyOnline;

	};



})();

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
		currentlyOnline = {},
		maxUsers = {};

	emit.on('time', function (from, channel, text) {
		var parts = text.trim().split(' ');
		var utc = moment().utc();

		if (parts.length === 1) {
			//utc time
			return bot.say(channel, 'It is currently ' + utc.format('YYYY-MM-DD HH:mm [UTC]'));
		} else {
			try {
				var tme = utc.utcOffset(parts[1]);
				return bot.say(channel, 'It is currently ' + tme.format('YYYY-MM-DD HH:mm Z'));
			} catch (e) {
			}

		}

		return bot.say(channel, 'I don`t know how to respond to that.');
	});

	emit.on('lastseen', function(from, to, text) {
		var nick = text.replace('#lastseen', '').trim().toLowerCase();

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
					bot.say(to, 'The last users with activity were: ' + people);
				} else {
					bot.say(to, 'I haven\'t seen anyone all day.');
				}
			});
		}
	});

	emit.on('lastleave', function(from, to, text) {
		var nick = text.replace('#lastleave', '').trim().toLowerCase();

		if (nick.length) {
			redis.hget(bot.botName + '.' + to + '.lastleave', nick, function(err, data) {
				if (data !== null) {
					var date = new Date(parseInt(data, 10));
					bot.say(to, 'I last saw ' + nick + ' leave around ' + date.toLocaleString());
				} else {
					bot.say(to, 'who? ' + nick + '? Never heard of them.');
				}
			});
		} else {
			redis.hgetall(bot.botName + '.' + to + '.lastleave', function(err, data){
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

	emit.on('stats', function(from, to, text, message){
		var nick = text.replace('#stats', '').trim();

		if (nick.length) {
            if (nick.toLowerCase().split(' ')[0] === '!reset') {
                bot.ops.isOp(message.user, function (err, data) {
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

	emit.on('maxcount', function(from, channel, text) {
		var parts = text.split(' ');
		var checkChannel = channel;
		if (parts.length > 1) {
			checkChannel = parts[1].toLowerCase().trim();
		}

		getMaxUsers(checkChannel, function(err, data){
			if (err) return console.error(err);
			if (!_.isNull(data) && data.length > 0) {
				try {
					data = JSON.parse(data);
					return bot.say(channel, 'The most I`ve seen in ' + checkChannel + ' was ' + data.maxUserCount + ' users on ' + moment(data.dte).format('MMMM Do YYYY, HH:mm:ss Z'));
				} catch (e) {}
			}
			getChannels(function(err, channels){
				bot.say(channel, 'I`m not familiar with ' + checkChannel + '. I have information for the following channels: ' + channels.join(', '));
			});

		});
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

	function setLastLeave (channel, nick) {
		redis.hset(bot.botName + '.' + channel + '.lastleave', nick.toLowerCase(), Date.now());
	}

	function setCurrentlyOnline(channel, nick, isOnline) {
		if (_.isBoolean(isOnline)) {
			if (isOnline) {
                log('setCurrentlyOnline:', channel, nick, isOnline);
				currentlyOnline[channel + '.' + nick.toLowerCase()] = 1;
				checkMaxUsers(channel);
			} else {
                log('clearingCurrentlyOnline:', channel, nick, isOnline);
				delete currentlyOnline[channel + '.' + nick.toLowerCase()];

			}
		}
	}

	function checkMaxUsers (channel) {
		//get the current count of users in this channel
		var cnt = _.reduce(currentlyOnline, function(acc, item, key) {
			if (key.indexOf(channel) === 0) {
				acc++;
			}
			return acc;
		}, 0);
		if (cnt > maxUsers[channel]) {
			bot.say(bot.conf.get('testingChannel'), 'New max user count in ' + channel + ' with ' + cnt + ' users!');
			maxUsers[channel] = cnt;
			setMaxUsers(cnt, channel);
		}
	}

	function getCurrentlyOnline (channel) {
		return _.map(_.filter(_.keys(currentlyOnline), function(item) {
				return item.indexOf(channel + '.') === 0;
			}), function(item) {
				return item.replace(channel + '.', '');
			});
	}

	function setMaxUsers (maxUsersCount, channel) {
		redis.set(bot.botName + '.' + channel.toLowerCase() + '.maxUsers', JSON.stringify({maxUserCount: maxUsersCount, dte: new Date().getTime()}));
	}

	function getMaxUsers (channel, callback) {
		redis.get(bot.botName + '.' + channel.toLowerCase() + '.maxUsers', callback);
	}

	function isCurrentlyOnline (channel, nick) {
        log('isCurrentlyOnline:', channel, nick, currentlyOnline, currentlyOnline[channel + '.' + nick.toLowerCase()]);
		return !_.isUndefined(currentlyOnline[channel + '.' + nick.toLowerCase()]);
	}

    function getChannels (callback) {
        redis.smembers(bot.botName + '.channels', callback);
    }

	function countMessage (channel, nick, text) {
        redis.sadd(bot.botName + '.channels', channel);
		redis.hincrby(bot.botName + '.' + channel + '.messageCount', channel, 1);
		redis.hincrby(bot.botName + '.' + channel + '.messageCount', nick.toLowerCase(), 1);

		getNickMessageCount(channel, nick, function(err, data) {
			if (data !== null && _.isNumber(_.parseInt(data)) && data % 1000 === 0) {
				var time = moment().seconds(5 * data).fromNow(true);
				bot.say(channel, 'Congrats ' + nick + '! Your ' + data + 'th message was: `' + text + '` ~ guessing an average of 5 seconds per message, that`s about ' + time + ' spent in IRC!');
			}
		});
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

		//get the max users for the current channels and save them
		getChannels(function(err, channels) {
			_.each(channels, function(channel){
				getMaxUsers(channel, function(err, data){
					maxUsers[channel] = 0;

					if (err) return console.error(err);
					if (!_.isNull(data) && data.length > 0) {
						try {
							data = JSON.parse(data);
							maxUsers[channel] = data.maxUsersCount;
						} catch (e) {}
					} else {
						setMaxUsers(0, channel);
					}

					log('populate maxusers', channel, maxUsers[channel]);
				});
			});
		});

		bot.addListener('part', function(channel, nick, reason) {
			log('part', channel, nick, reason);
			setLastSeen(channel, nick);
            setLastLeave(channel, nick);
			setCurrentlyOnline(channel, nick, false);
		});

		bot.addListener('quit', function(nick, reason, channels) {
			log('quit', channels, nick, reason);
            _.each(channels, function(channel) {
                setLastSeen(channel, nick);
                setLastLeave(channel, nick);
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

			if (bot.isChannelPaused(to)) return;

			setLastSeen(to, from);
			countMessage(to, from, text);

			if (to === bot.botName) {
				//they are talking to us in a private message, set to to be from
				to = from;
			}

			if (text.indexOf('#lastseen') === 0) {
				emit.emit('lastseen', from, to, text);
			} else if (text.indexOf('#lastleave') === 0) {
                emit.emit('lastleave', from, to, text);
            } else if (text.indexOf('#stats') === 0) {
				emit.emit('stats', from, to, text);
			} else if (text.indexOf('#random') === 0) {
				emit.emit('random', from, to, text);
			} else if (text.indexOf('#maxusers') === 0) {
				emit.emit('maxcount', from, to, text);
			} else if (text.indexOf('#currentlyonline') === 0) {
				emit.emit('currentlyonline', from, to, text);
			} else if (text.indexOf('#time') === 0) {
				emit.emit('time', from, to, text);
			}

		});

		bot.getCurrentlyOnline = getCurrentlyOnline;
		bot.isCurrentlyOnline = isCurrentlyOnline;

	};



})();

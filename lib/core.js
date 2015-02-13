'use strict';

module.exports = (function(){

	var bot;
	var redis;
	var moment = require('moment');
	var _ = require('lodash');
    var async = require('async');

    var pausedRooms = [];

	return function init( _bot ){
		bot = _bot;
		bot.log = log;
		bot.starttime = Date.now();
		bot.redis = initRedis();
        bot.setCooldown = setCooldown;
        bot.isOnCooldown = isOnCooldown;
        bot.clearAllCooldowns = clearAllCooldowns;
        bot.isChannelPaused = isChannelPaused;

        var originalBotSay = bot.say;
        bot.say = function(to, text, dontLog){
            dontLog = dontLog || false;
            if (!dontLog) {
                bot.logMessage(to, bot.botName, bot.botName, text);
            }
            originalBotSay.apply(bot, [to, text]);
        };

		bot.on('error', function(err) {
			log('irc error', err);
		});

		bot.on('message', function( from, channel, text, message){

			bot.log('message', from, channel, text);

            var parts = text.trim().split(' ');

			if (text.indexOf('#help') === 0 && !bot.isChannelPaused(channel)) {
                if (parts.length === 2) {
                    var nick = parts[1];
                    if (!bot.isCurrentlyOnline(channel, nick)) {
                        bot.say(channel, 'who is ' + nick + '?');
                    } else {
                        isOnCooldown(['help.' + from, 'help-to.' + nick], function(err, data) {
                            if (!err && !data) {
                                sendHelp(nick);
                                setCooldown(['help.' + from, 'help-to.' + nick], 5 * 60);
                            } else {
                                bot.say(from, 'maybe I can`t give you the help you need... (you can only use #help every 5 minutes)');
                            }
                        });
                    }
                } else {
                    sendHelp(from, message.user);
                }
			} else if (text.indexOf('#pause') === 0) {
                if (parts.length === 2 && parts[1] === bot.botName) {
                    bot.ops.isOp(message.user, function (err, data) {
                        if (data !== 0) {
                            pausedRooms = _.union(pausedRooms, [channel]);
                            bot.say(channel, 'I have been blocked from listening or responding to all input in ' + channel + '.  An OP must issue #play for me to resume');
                        }
                    });
                }
            } else if (text.indexOf('#unpause') === 0 || text.indexOf('#play') === 0) {
                if (parts.length === 2 && parts[1] === bot.botName) {
                    bot.ops.isOp(message.user, function (err, data) {
                        if (data !== 0) {
                            pausedRooms = _.difference(pausedRooms, [channel]);
                            bot.say(channel, 'I`m back baby!');
                        }
                    });
                }
            }
		});
	};



    function isChannelPaused (channel) {
        return _.some(pausedRooms, function (item) {
            return item === channel;
        });
    }

    function sendHelp (to, user) {
        log('sendHelp:', to);
        // var keyword = text.replace('#help', '').trim();
        bot.say(to, 'I am zoidbox! Please check my documentation here: https://github.com/atuttle/zoidbox/blob/master/help.md');
        bot.say(to, 'I am open source, pull requests welcome! https://github.com/atuttle/zoidbox');

        bot.ops.isOp(user || to, function (err, data) {
            if (data !== 0) {
                bot.say(to, 'OP Commands are available here: https://github.com/atuttle/zoidbox/blob/master/opshelp.md');
            }
        });
        bot.say(to, 'I have been running for ' + moment(bot.starttime).fromNow(true));
    }

    function setCooldown (key, timeoutInSeconds) {
        if (!_.isArray(key)) {
            key = [key];
        }

        _.each(key, function(item) {
            redis.hset(bot.botName + '.cooldown', item, Date.now() + (timeoutInSeconds * 1000));
        });
    }

    function isOnCooldown (key, callback) {
        if (!_.isArray(key)) {
            key = [key];
        }

        async.some(key, isOnCooldownHelper, function(result) {
            callback(null, result);
        });
    }

    function isOnCooldownHelper (key, callback) {
        redis.hget(bot.botName + '.cooldown', key, function(err, data) {
            if (err) {
                log('isOnCooldown Error', err, data);
                callback(false);
            }

            log('isOnCooldownHelper:', key, data);
            if (_.isNull(data)) {
                callback(false);
            } else {
                if (Date.now() < data) {
                    callback(true);
                } else {
                    callback(false);
                }
            }
        });
    }

    function clearAllCooldowns () {
        redis.del(bot.botName + '.cooldown', function(err, data) {
            if (err) {
                log('clearAllCooldowns error:', err, data);
            }
        });
    }

	function initRedis(){
        var redis;

		if (bot.conf.get('REDISTOGO_URL')) {
			var rtg = require('url').parse( bot.conf.get('REDISTOGO_URL') );
			redis = require('redis').createClient(rtg.port, rtg.hostname);
			redis.auth(rtg.auth.split(':')[1]);
		} else {
			redis = require('redis').createClient(
				bot.conf.get('redis_port')
				, bot.conf.get('redis_host')
				, {}
			);
			if (bot.conf.get('redis_auth_pass')) {
				redis.auth(bot.conf.get('redis_auth_pass'), function(err, data) {
					if (err) {
						bot.log('redisClientAuthError:', err, data);
					}
				});
			}
			bot.log('redis initialized');
		}

		redis.on('error', function(err){
			bot.log('redisClientError:', err);
		});

		return redis;
	}

	function log() {
		if (bot.conf.get('debug') || false) {
			console.log( Array.prototype.slice.call(arguments) );
		}
	}

})();

/* global module,require */
'use strict';

var _ = require('lodash');
var events = require('events');
var emit = new events.EventEmitter();

module.exports = (function(){

	var bot,
		redis,
		log,
		conf;

	emit.on('addKarmaSucceeding', function(from, to, text) {
		var nick = text.replace(/[:,]\s*\+1/g, '').trim();
		addKarma(nick, from, to, text);
	});

	emit.on('addKarmaPreceding', function(from, to, text) {
		var nick = text.replace(/\+1[:,]*/g, '').trim().split(' ');
		addKarma(nick[0], from, to, text);
	});

	emit.on('karma', function(from, to, text){
		var nick = text.replace('#karma', '').trim();

		if (nick.length) {
			if (nick.toLowerCase().split(' ')[0] === '!reset') {
				bot.ops.isOp(from, function (err, data) {
					if (data === 0) {
						bot.say(to, 'You must be an op to do that.');
					} else {
						var parts = nick.toLowerCase().split(' ');
						if (parts.length === 1) {
							resetKarma(to);
							bot.say(to, 'All karma has been reset.');
						} else {
							nick = parts.slice(-(parts.length - 1)).join(' ');
							resetKarmaNick(to, nick);
							bot.say(to, 'karma for ' + nick + ' has been reset.');
						}

					}
				});
			} else if (nick.toLowerCase().split(' ')[0] === '!ban') {
				bot.ops.isOp(from, function (err, data) {
					if (data === 0) {
						bot.say(to, 'You must be an op to do that.');
					} else {
						var parts = nick.toLowerCase().split(' ');
						if (parts.length === 1) {
							bot.say(to, 'Who do you want to ban? #karma !ban nick');
						} else {
							nick = parts.slice(-(parts.length - 1)).join(' ');
							resetKarmaNick(to, nick);
                            banKarma(to, nick);
							bot.say(to, nick + ' has been banned from receiving karma in ' + to + '.');
						}

					}
				});
            } else if (nick.toLowerCase().split(' ')[0] === '!unban') {
				bot.ops.isOp(from, function (err, data) {
					if (data === 0) {
						bot.say(to, 'You must be an op to do that.');
					} else {
						var parts = nick.toLowerCase().split(' ');
						if (parts.length === 1) {
							bot.say(to, 'Who do you want to unban? #karma !unban nick');
						} else {
							nick = parts.slice(-(parts.length - 1)).join(' ');
							unbanKarma(to, nick);
							bot.say(to, nick + ' has had karma privileges restored in ' + to + '.');
						}

					}
				});
            } else if (nick.toLowerCase().split(' ')[0] === '!bans') {
				bot.ops.isOp(from, function (err, data) {
					if (data === 0) {
						bot.say(to, 'You must be an op to do that.');
					} else {
                        getKarmaBans(to, function(err, data) {
                            bot.say(to, 'Users currently banned from receiving karma in ' + to + ': ' + data.join(', '));
                        });
					}
				});
			} else if (nick.toLowerCase().split(' ')[0] === '!all' && to === '#zoidbox') { //todo: need to change this from hard coded
                log('#karma !all', to, bot.botName);
                getChannels(function(err, data){
                    bot.say(to, 'I have data for the following channels: ' + data.join(', '));
                    _.each(data, function(channel) {
                        getLeaderboardDisplay(channel, to);
                    });
                });
			} else {
				getKarma(to, nick, function(err, data){
					if (data !== null && data !== 0) {
						bot.say(to, nick + ' has ' + data.toString() + ' karma.');
					} else {
						bot.say(to, ' ' + nick + ' doesn\'t have any karma yet.');
					}
				});
			}
		} else {
			getLeaderboardDisplay(to, to);
		}
	});

	emit.on('karmaGivers', function(from, to, text){
		var nick = text.replace('#karmagivers', '').trim();

		if (nick.length) {
			if (nick.toLowerCase().split(' ')[0] === '!reset') {
				bot.ops.isOp(from, function(err, data){
					if (data === 0) {
						bot.say(to, 'You must be an op to do that.');
					} else {
						var parts = nick.toLowerCase().split(' ');
						if (parts.length === 1) {
							resetKarmaGives(to);
							bot.say(to, 'All karma gives has been reset.');
						} else {
							nick = parts.slice(-(parts.length-1)).join(' ');
							resetKarmaGivesNick(to, nick);
							bot.say(to, 'karma gives for ' + nick + ' has been reset.');
						}

					}
				});
			} else if (nick.toLowerCase().split(' ')[0] === '!all' && to === '#zoidbox') { //todo: need to change this from hard coded
                log('#karmagivers !all', to, bot.botName);
                getChannels(function(err, data){
                    bot.say(to, 'I have data for the following channels: ' + data.join(', '));
                    _.each(data, function(channel) {
                        getGiverLeaderboardDisplay(channel, to);
                    });
                });
			} else {
				getKarmaGives(to, nick, function(err, data){
					if (data !== null && data !== 0) {
						bot.say(to, nick + ' has given ' + data.toString() + ' karma.');
					} else {
						bot.say(to, ' ' + nick + ' hasn\'t given any karma yet.');
					}
				});
			}
		} else {
			getGiverLeaderboardDisplay(to, to);
		}
	});

	//todo: I believe this is duplicated, should probably be moved to bot
	function getChannels (callback) {
        redis.smembers(bot.botName + '.channels', callback);
    }

	function incrKarma(channel, nick, giver, incrby) {
		redis.hincrby(conf.get('botName') + '.' + channel + '.karma', nick.toLowerCase(), incrby);
		redis.hincrby(conf.get('botName') + '.' + channel + '.karma_giver', giver.toLowerCase(), incrby);
		setLastKarmaGive(channel, giver);
	}

	function getKarma(channel, nick, callback) {
		redis.hget(conf.get('botName') + '.' + channel + '.karma', nick.toLowerCase(), callback);
	}

	function getKarmaGives(channel, nick, callback) {
		redis.hget(conf.get('botName') + '.' + channel + '.karma_giver', nick.toLowerCase(), callback);
	}

	function getLeaderboard(channel, callback) {
		redis.hgetall(conf.get('botName') + '.' + channel + '.karma', callback);
	}

	function getLeaderboardDisplay(channel, replyToChannel) {
		getLeaderboard(channel, function(err, data){
			log('getLeaderboard', err, data);

			var leaders = _.map(
								_.sortBy(
									_.filter(
										_.map(data, function(item, key) {
											return [key, item];
										})
									, function(item) {
										return _.parseInt(item[1], 10) > 0;
									})
								, function(value){
									return _.parseInt(value[1], 10);
								})
								.reverse()
								.slice(0, 10),
							function(item) {
								return item[0] + ' (' + item[1] + ')';
							}).join(', ');

			bot.say(replyToChannel, 'Current karma leaders in ' + channel + ' are: ' + leaders);
		});
	}

	function getGiverLeaderboard(channel, callback) {
		redis.hgetall(conf.get('botName') + '.' + channel + '.karma_giver', callback);
	}

	function getGiverLeaderboardDisplay(channel, replyToChannel) {
		getGiverLeaderboard(channel, function(err, data){
			log('getGiverLeaderboard', err, data);

			var leaders = _.map(
								_.sortBy(
									_.filter(
										_.map(data, function(item, key) {
											return [key, item];
										})
									, function(item) {
										return _.parseInt(item[1], 10) > 0;
									})
								, function(value){
									return _.parseInt(value[1], 10);
								})
								.reverse()
								.slice(0, 10),
							function(item) {
								return item[0] + ' (' + item[1] + ')';
							}).join(', ');

			bot.say(replyToChannel, 'Current karma giving leaders in ' + channel + ' are: ' + leaders);
		});
	}

	function resetKarma(channel) {
		redis.del(conf.get('botName') + '.' + channel + '.karma');
	}

	function resetKarmaNick(channel, nick) {
		redis.hset(conf.get('botName') + '.' + channel + '.karma', nick.toLowerCase(), 0);
	}

	function banKarma(channel, nick) {
		redis.sadd(conf.get('botName') + '.' + channel + '.karma_bans', nick.toLowerCase());
	}

	function unbanKarma(channel, nick) {
		redis.srem(conf.get('botName') + '.' + channel + '.karma_bans', nick.toLowerCase());
	}

    function isBannedFromKarma(channel, nick, callback) {
        redis.sismember(conf.get('botName') + '.' + channel + '.karma_bans', nick.toLowerCase(), callback);
    }

	function resetKarmaGives(channel) {
		redis.del(conf.get('botName') + '.' + channel + '.karma_giver');
	}

	function getKarmaBans(channel, callback) {
		redis.smembers(conf.get('botName') + '.' + channel + '.karma_bans', callback);
	}

	function resetKarmaGivesNick(channel, nick) {
		redis.hset(conf.get('botName') + '.' + channel + '.karma_giver', nick.toLowerCase(), 0);
	}

	function setLastKarmaGive(channel, giver) {
		redis.hset(conf.get('botName') + '.' + channel + '.last_karma_give', giver.toLowerCase(), Date.now());
	}

	function getLastKarmaGive(channel, giver, callback) {
		redis.hget(conf.get('botName') + '.' + channel + '.last_karma_give', giver.toLowerCase(), callback);
	}

	function addKarma(nick, from, to) {
		if (nick.toLowerCase() === from.toLowerCase()) {
			bot.say(to, 'You can\'t give karma to yourself ಠ_ಠ');
		} else {
			if (!bot.isCurrentlyOnline(to, nick)) {
				bot.say(to, 'who is ' + nick + '?');
			} else {
                isBannedFromKarma(to, nick, function(err, data) {
                    if (data) {
                        bot.say(to, nick + ' is banned from receiving karma in ' + to);
                    } else {
                        getLastKarmaGive(to, from, function (err, data) {
                            //log(Date.now() - data, conf.get('karmaCooldown'));
                            if (Date.now() - data > conf.get('karmaCooldown') * 1000) {
                                incrKarma(to, nick, from, 1);
                                bot.say(to, from + ' gives karma to ' + nick);
                            } else {
                                bot.say(to, 'easy ' + from + '.');
                            }
                        });
                    }
                });


			}
		}
	}

	return function init (_bot){
		bot = _bot;
		log = bot.log;
		conf = bot.conf;
		redis = bot.redis;


		bot.on( 'message#', function (from, to, text){
			if (text.search(/[:,]\s*\+1/g) !== -1) {
				emit.emit('addKarmaSucceeding', from, to, text);
			} else if (text.search(/^\+1[:,\s]*[\w\[\]]/g) !== -1) {
				emit.emit('addKarmaPreceding', from, to, text);
			} else if (text.indexOf('#karmagivers') === 0) {
				emit.emit('karmaGivers', from, to, text);
			} else if (text.indexOf('#karma') === 0) {
				emit.emit('karma', from, to, text);
			}
		});
	};

	

})();

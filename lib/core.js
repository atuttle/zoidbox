/* jshint laxcomma: true */
/* global module,require */
'use strict';

module.exports = (function(){

	var bot;
	var redis;
	var _ = require('lodash');
	var moment = require('moment');
	var starttime = Date.now();

	return function init( _bot ){
		bot = _bot;

		initRedis();
		initOps();

		bot.log = log;

		bot.ops = {
			setOp: setOp
			,deOp: deOp
			,isOp: isOp
			,getOps: getOps
		};

		bot.on("error", function(err) {
			log("irc error", err);
		});

		bot.on('message', function( from, to, text){

			bot.log('message', from, to, text);

			if (text.indexOf('#help') === 0) {

				// var keyword = text.replace('#help', '').trim();
				bot.say(from, 'I am zoidbox! Please check my documentation here: https://github.com/atuttle/zoidbox/blob/master/help.md');

				isOp(from, function(err, data){
					if (data !== 0) {
						bot.say(from, 'OP Commands are available here: https://github.com/atuttle/zoidbox/blob/master/opshelp.md');
					}
				});
				bot.say(from, 'I have been running for ' + moment(starttime).fromNow(true));

			} else if (text.indexOf('#ops') === 0) {

				getOps(function(err, data){
					if (data.length) {
						bot.say(to, 'Ops are currently: ' + data.join(', '));
					} else {
						bot.say(to, 'I have no ops :(');
					}
				});

			} else if (text.indexOf('#op') === 0) {

				//make sure the from is an op
				isOp(from, function(err, data){
					if (data === 0) {
						bot.say(to, 'You must be an op.');
					} else {
						var nick = text.replace('#op', '').trim();

						if (!nick.length) {
							bot.say(to, 'who do you want to op? use #op nick');
						} else {
							isOp(nick, function(err, data){
								if (data === 0) {
									setOp(nick);
									bot.say(to, nick + ' is now an op.');
								} else {
									bot.say(to, nick + ' is already an op.');
								}
							});
						}
					}
				});

			} else if (text.indexOf('#deop') === 0) {

				//make sure the from is an op
				isOp(from, function(err, data){
					if (data === 0) {
						bot.say(to, 'You must be an op.');
					} else {
						var nick = text.replace('#deop', '').trim();

						if (!nick.length) {
							bot.say(to, 'who do you want to deop? use #deop nick');
						} else {
							isOp(nick, function(err, data){
								if (data === 0) {
									bot.say(to, nick + ' isnt an op.');
								} else {
									if (deOp(nick)){
										bot.say(to, nick + ' is no longer an op.');
									}else{
										bot.say(to, nick + ' is my God.');
									}
								}
							});
						}
					}
				});
			}

		});
	};

	function initRedis(){
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
			bot.redis = redis;
			bot.log('redis initialized');
		}

		redis.on('error', function(err){
			bot.log('redisClientError:', err);
		});
	}

	function initOps () {
		var defaultOps = bot.conf.get('ops') || [];
		if (defaultOps.length) {
			_.each(defaultOps, function(item){
				redis.sadd(bot.conf.get('botName') + '.ops', item.toLowerCase());
			});
		}
	}

	function setOp (nick) {
		redis.sadd(bot.conf.get('botName') + '.ops', nick.toLowerCase());
	}

	function deOp (nick) {
		if (_.contains(bot.conf.get('ops'), nick)){
			return false;
		}
		redis.srem(bot.conf.get('botName') + '.ops', nick.toLowerCase());
		return true;
	}

	function isOp (nick, callback) {
		redis.sismember(bot.conf.get('botName') + '.ops', nick.toLowerCase(), callback);
	}

	function getOps (callback) {
		redis.smembers(bot.conf.get('botName') + '.ops', callback);
	}

	function log() {
		if (conf.get('debug') || false) {
			console.log( Array.prototype.slice.call(arguments) );
		}
	}

})();

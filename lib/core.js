/* jshint laxcomma: true */
/* global module,require */
'use strict';

module.exports = (function(){

	var bot;
	var redis;
	var moment = require('moment');
	var starttime = Date.now();

	return function init( _bot ){
		bot = _bot;
		bot.log = log;
		initRedis();

		bot.on('error', function(err) {
			log('irc error', err);
		});

		bot.on('message', function( from, to, text){

			bot.log('message', from, to, text);

			if (text.indexOf('#help') === 0) {

				// var keyword = text.replace('#help', '').trim();
				bot.say(from, 'I am zoidbox! Please check my documentation here: https://github.com/atuttle/zoidbox/blob/master/help.md');

				bot.ops.isOp(from, function(err, data){
					if (data !== 0) {
						bot.say(from, 'OP Commands are available here: https://github.com/atuttle/zoidbox/blob/master/opshelp.md');
					}
				});
				bot.say(from, 'I have been running for ' + moment(starttime).fromNow(true));

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

	function log() {
		if (bot.conf.get('debug') || false) {
			console.log( Array.prototype.slice.call(arguments) );
		}
	}

})();

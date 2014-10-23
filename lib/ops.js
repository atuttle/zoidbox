'use strict';

module.exports = (function(){

	var bot;
	var _ = require('lodash');

	return function init( _bot ){
		bot = _bot;

		initOps();

		bot.ops = {
			setOp: setOp
			,deOp: deOp
			,isOp: isOp
			,getOps: getOps
		};

		bot.on('message', function( from, to, text){

            var parts = text.split(' ');

			if (text.indexOf('#ops') === 0) {

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
			} else if (text.indexOf('#cooldowns') === 0) {
                if (parts.length === 2 && parts[1] === '!clear') {
                    isOp(from, function(err, data) {
                        if (data === 0) {
                            bot.say(to, 'You must be an op.');
                        } else {
                            bot.clearAllCooldowns();
                            bot.say(to, 'all cooldowns have been cleared');
                        }
                    });
                }
            }


		});
	};

	function initOps () {
		var defaultOps = bot.conf.get('ops') || [];
		if (defaultOps.length) {
			_.each(defaultOps, function(item){
				bot.redis.sadd(bot.conf.get('botName') + '.ops', item.toLowerCase());
			});
		}
	}

	function setOp (nick) {
		bot.redis.sadd(bot.conf.get('botName') + '.ops', nick.toLowerCase());
	}

	function deOp (nick) {
		if (_.contains(bot.conf.get('ops'), nick)){
			return false;
		}
		bot.redis.srem(bot.conf.get('botName') + '.ops', nick.toLowerCase());
		return true;
	}

	function isOp (nick, callback) {
		bot.redis.sismember(bot.conf.get('botName') + '.ops', nick.toLowerCase(), callback);
	}

	function getOps (callback) {
		bot.redis.smembers(bot.conf.get('botName') + '.ops', callback);
	}

})();

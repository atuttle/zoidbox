'use strict';

module.exports = (function(){

	var bot;
	var _ = require( 'lodash' );

	return function init( _bot ){
		bot = _bot;

		bot.on( 'message#', function( from, to, text ){
			if (text.indexOf('#pounces') === 0){

				if (text.replace('#pounces', '').trim() === '!clear'){
					bot.ops.isOp( from, function(err, isOp){
						if (isOp === 0){
							bot.say( to, 'You must be an op to clear pounces' );
						}else{
							console.log('clearing pounces for room %s', to);
							clearPounces( to );
							bot.say( to, 'All pounces cleared.' );
						}
					});
					return;
				}

				getPouncees( to, function(err, pouncees){
					if (pouncees.length){
						bot.say( to, 'I\'m waiting to pounce: ' + pouncees.join(', ') );
					}else{
						bot.say( to, 'No pounces pending right now.' );
					}
				});

			} else if (text.indexOf('#pounce') === 0) {

				var args = text.replace('#pounce','').trim().split(' ');
				var target = args.shift();
				if (target.lenth === 0){
					return bot.say( chan, 'Whom should I pounce? #pounce nick message' );
				}
				var msg = args.join(' ');
				var chan = to;
				if (bot.isCurrentlyOnline(chan, target)){
					bot.say( chan, 'Tell them yourself, jerk!' );
				}else{
					addPounce( chan, target, from, msg );
					bot.say( chan, 'You got it, ' + from );
				}

			}
		}).on( 'nick', function( old, nick, channels ){
            _.each(channels, function(chan) {
                checkAndPounce(chan, nick);
            });
		}).on( 'join', function( chan, nick ){
			checkAndPounce( chan, nick );
		}).on( 'names', function( chan, nicks ){
			_.each(nicks, function(item, key) {
				checkAndPounce(chan, key);
			});
		});
	};

	function addPounce( chan, nick, from, msg ){
		bot.redis.sadd( chan + '.pouncees', nick.toLowerCase() );
		bot.redis.sadd( chan + '.pounce.' + nick.toLowerCase(), JSON.stringify({ from: from, msg: msg }) );
		return true;
	}

	function getPouncees( chan, callback ){
		bot.redis.smembers( chan + '.pouncees', callback );
	}

	function clearPounces( chan ){
		bot.redis.smembers( chan + '.pouncees', function(err, pouncees){
			for (var p in pouncees){
				bot.redis.del( chan + '.pounce.' + pouncees[p] );
			}
			bot.redis.del( chan + '.pouncees' );
		});
	}

	function checkAndPounce( chan, nick ){
		nick = nick.toLowerCase();
		bot.redis.sismember( chan + '.pouncees', nick, function( err, doPounce ){
			if ( doPounce === 1 ){
				bot.redis.smembers( chan + '.pounce.' + nick, function( err, pounces ){
					if (pounces.length){
						for (var p in pounces){
							console.log(pounces[p]);
							var data = JSON.parse( pounces[p] );
							console.log(data);
							bot.say( chan, nick + ': ' + data.from + ' wanted me to tell you, "' + data.msg + '"');
						}
						bot.redis.del( chan + '.pounce.' + nick );
						bot.redis.srem( chan + '.pouncees', nick );
					}
				});
			}
		});
	}

})();

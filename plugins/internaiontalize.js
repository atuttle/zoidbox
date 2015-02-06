'use strict';

module.exports = (function(){

	var pattern = /\s(\-?)(\d+)(f|c)\s/i;

	return function init( bot ){
		bot.on( 'message', function( from, to, text ){

			if (bot.isChannelPaused(to)) return;

			if (to === bot.botName) {
				 //they are talking to us in a private message, set to to be from
				 to = from;
			}

			text = ' ' + text + ' '; //because this is easier than figuring out some bizarre regex thing
			var matches = text.match(pattern);
			if (matches !== null) {
				var sign = matches[1];
				var currentVal = matches[2];
				var currentUnit = matches[3];
				if (sign === '-'){
					currentVal = -1 * currentVal;
				}
				if (currentUnit.toLowerCase() === 'f'){
					bot.say(to, 'BTW, ' + currentVal + 'ºF is ~' + f2c( currentVal ) + 'ºC');
				}else{
					bot.say(to, 'BTW, ' + currentVal + 'ºC is ~' + c2f( currentVal ) + 'ºF');
				}
			}
		});
	};

	function c2f( c ){
		var result = Math.round( c * 9 / 5 + 32 );
		return (result <= -20) ? "FUCKING COLD" : result;
	}

	function f2c( f ){
		var result = Math.round( (f - 32) * 5 / 9 );
		return (result <= -29) ? "FOOKING COLD, EH? " : result;
	}

})();

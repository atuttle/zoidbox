'use strict';

module.exports = (function(){

	var _bot;
	var isup = require('is-up');
	var validator = require('valid-url');

	return function init( bot ){
		_bot = bot;
		bot.on( 'message', function( from, to, text ){

			if (bot.isChannelPaused(to)) return;

			if (to === bot.botName) {
				//they are talking to us in a private message, set to to be from
				to = from;
			}

			if (text.indexOf('^') === 0 && text.length >= 4 && text.split(' ').length === 1) {
				var url = text.split('');
				url.shift();
				url = url.join('').toLowerCase().replace('https://', '').replace('http://', '');

				if (!validator.isWebUri( 'http://' + url )){
					//fail silently since this doesn't appear to be a url
					return;
				}

				isup(url, function(err, up){
					bot.say(to, url + ' is ' + (up ? 'up' : 'down') + ' for me' + (up ? '...' : ' too.') );
				});
			}

		});
	};

})();

'use strict';

module.exports = (function(){

	var _bot;
	var isup = require('is-up');

	return function init( bot ){
		_bot = bot;
		bot.on( 'message#', function( from, to, text ){

			if (bot.isBlocked) return;

			if (text.indexOf('^') === 0 && text.length >= 4 && text.split(' ').length === 1) {
				var url = text.split('');
				url.shift();
				url = url.join('').toLowerCase();
				url = url.replace('https://', '');
				url = url.replace('http://', '');
				isup(url, function(err, up){
					bot.say(to, url + ' is ' + (up ? 'up' : 'down') + ' for me' + (up ? '...' : ' too.') );
				});
			}

		});
	};

})();

/* global module,require */
'use strict';

module.exports = (function(){

	var _bot;
	var request = require('request');

	return function init( bot ){
		_bot = bot;
		bot.on( 'message#', function( from, to, text ){
			if (text.indexOf('gif:') === 0 && text.length >= 5) {
				gifme(text.substr(4), function(err, url){
					if (err){
						bot.say(to, err);
					}else{
						bot.say(to, url);
					}
				});
			}
		});
	};

	function gifme(term, callback){
		var url = 'http://api.gifme.io/v1/gifs/random?key=rX7kbMzkGu7WJwvG&term=';
		request( url + term, function(err, result){
			var response = JSON.parse( result.body );

			if (response.status !== 200) return callback( 'oops, looks like shit\'s broke, yo.', null );
			else return callback( null, response.gif.gif );
		});
	}

})();

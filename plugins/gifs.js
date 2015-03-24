'use strict';

module.exports = (function(){

	return function init( bot ){
		bot.on( 'message', function( from, to, text ){

			if (bot.isChannelPaused(to)) return;

			if (to === bot.botName) {
				//they are talking to us in a private message, set to to be from
				to = from;
			}

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

	function gifme(term, callback, abort){
		var request = require('request');
		var url = 'http://api.gifme.io/v1/gifs/random?key=rX7kbMzkGu7WJwvG&term=';
		abort = abort || false;
		request( url + term, function(err, result){
			if( err ){
				callback('Sorry, looks like there was a problem with the api... http://i.imgur.com/amCuffe.gif');
				return console.error( err );
			}
			try {
				var response = JSON.parse( result.body );
			}catch(e){
				return callback('Sorry, the API returned a bunch of crap. http://i.imgur.com/fjmMVba.gif');
			}

			if (response.status !== 200) return callback( 'oops, looks like shit\'s broke, yo.', null );
			else {
				var URL = require('url');
				if (URL.parse(response.gif.gif).host == 'i.minus.com'){
					if (abort){
						return callback( 'Tried twice, all I got was i.minus.com gifs... trust me, you don`t want that... minus sucks.' );
					}
					return gifme( term, callback, true );
				}
				return callback( null, response.gif.gif );
			}
		});
	}

})();

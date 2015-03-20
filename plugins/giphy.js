'use strict';

module.exports = (function(){

	var _ = require( 'lodash' );

	return function init( bot ){
		bot.on( 'message', function( from, to, text ){

			if (bot.isChannelPaused(to)) return;

			if (to === bot.botName) {
				//they are talking to us in a private message, set to to be from
				to = from;
			}

			if (text.indexOf('giphy:') === 0 && text.length >= 5) {
				var term = text.substr(6);
				randomGiphy(text.substr(6), function(err, url){
					if (err){
						bot.say(to, err);
					}else{
						bot.say(to, url);
					}
				});
			}
		});
	};

	function randomGiphy(term, callback){
		var request = require('request');
		var url = 'http://api.giphy.com/v1/gifs/random?api_key=dc6zaTOxFJmzC&rating=pg&tag=';
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

			if (response.meta.status !== 200) return callback( 'oops, looks like shit\'s broke, yo.', null );
			else return callback( null, response.data.image_url );
		});
	}

})();

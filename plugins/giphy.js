'use strict';

module.exports = (function(){

  var _ = require( 'lodash' );
  var giphy = require('apigiphy');
  giphy = giphy({ api_key: 'dc6zaTOxFJmzC' });

  return function init( bot ){
    bot.on( 'message', function( from, to, text ){

      if (bot.isChannelPaused(to)) return;

      if (to === bot.botName) {
          //they are talking to us in a private message, set to to be from
          to = from;
      }

      if (text.indexOf('giphy:') === 0 && text.length >= 5) {

        var command = text.trim().split(' ');
        var rating = getRating(command);
        var term = text.substr(6);

		giphy.random({ tag: text.substr(6), rating: rating })
		.then(function(response){
			bot.say(to, response.data.image_original_url);
		}, function(error){
			bot.say(to, err);
		});

      }
    });
  };

  function getRating(command) {
      var rating = 'pg-13'; // (y, g, pg, pg-13 or r)
      if (command.length > 1) {
          switch (command[1].trim()) {
              case '-y' :
                  rating = 'y';
                  break;
              case '-g' :
                  rating = 'g';
                  break;
              case '-pg' :
                  rating = 'pg';
                  break;
              case '-pg-13' :
              case '-pg13' :
                  rating = 'pg-13';
                  break;
              case '-r' :
                  rating = 'r';
                  break;
              default :
                  rating = 'pg-13';
                  break;
          }
      }
      return rating;
  };


})();

'use strict';

var request = require( 'request' );
var _ = require('lodash');
var SpotifyWebApi = require('spotify-web-api-node');
var spotifyApi = new SpotifyWebApi();

module.exports = (function(){

  var bot,
	redis,
	log,
	conf;

  return function init( _bot ){
	bot = _bot;
	log = bot.log;
	conf = bot.conf;

	bot.on( 'message', function( from, to, text, message ){

	  if (bot.isChannelPaused(to)) return;

	  if (to === bot.botName) {
		//they are talking to us in a private message, set to to be from
		to = from;
	  }

	  if (text.indexOf('spotify:') >= 0){
		text = text.substring(text.indexOf('spotify:'));
		var parts = text.trim().split(':');

		switch (parts[1]) {
		  case 'track':
			spotifyApi.getTrack(parts[2])
			  .then(function(data) {
				//console.log('Track data', data);
				console.log('%s by %s ~ %s', data.name, data.artists[0].name, data.external_urls.spotify);
				bot.say( '##geekonomics', 'Spotify track: ' + data.name + ' by ' + data.artists[0].name + ' ~ ' + data.external_urls.spotify );
				bot.say( '#geekonomicsBot', 'Spotify track: ' + data.name + ' by ' + data.artists[0].name + ' ~ ' + data.external_urls.spotify );
			  }, function(err) {
				console.error(err);
			  });
			break;
		  case 'artist':
			spotifyApi.getArtist(parts[2])
			  .then(function(data) {
				//console.log('Artist information', data);
				console.log('%s ~ %s', data.name, data.external_urls.spotify);
				bot.say( '##geekonomics', 'Spotify artist: ' + data.name + ' ~ ' + data.external_urls.spotify );
				bot.say( '#geekonomicsBot', 'Spotify artist: ' + data.name + ' ~ ' + data.external_urls.spotify );
			  }, function(err) {
				console.error(err);
			  });
			break;
		  case 'album':
			spotifyApi.getAlbum(parts[2])
			  .then(function(data) {
				//console.log('Album information', data);
				console.log('%s by %s ~ %s', data.name, data.artists[0].name, data.external_urls.spotify);
				bot.say( '##geekonomics', 'Spotify album: ' + data.name + ' by ' + data.artists[0].name + ' ~ ' + data.external_urls.spotify );
				bot.say( '#geekonomicsBot', 'Spotify album: ' + data.name + ' by ' + data.artists[0].name + ' ~ ' + data.external_urls.spotify );
			  }, function(err) {
				console.error(err);
			  });
			break;
		}
	  }
	});
  };


}());

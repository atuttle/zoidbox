'use strict';

var request = require( 'request' );

module.exports = (function(){

	var _bot;

	return function init( bot ){
		_bot = bot;
		bot.on( 'message#', function( from, to, text ){
			if (text.indexOf('!') === 0 && text.split(' ').length === 1){
				bot.log('cfdocs', from, to, text);
				return docs(to, text.slice(1));
			}
		});
	};

	function docs(channel, q){
		q = q.toLowerCase();

		if (q === 'cfclient'){
			return _bot.say(channel, '<cfclient></cfclient> → returns a pink slip, because if you use this shit you should be fired. ~ http://www.codecademy.com/en/tracks/javascript');
		}

		if (q === 'cf_socialplugin'){
			return _bot.say(channel, '<cf_socialplugin .. /> → returns a bunch of outdated junk that would have been better as a community project dear god what have we done... we should have just given them a package manager like they\'ve been requesting for years ~ http://cfdocs.org/cf_socialplugin');
		}

		docsApi( q, function(err, result){
			if (err !== null){
				_bot.say(channel, err );
			}else{
				var msg = '';
				if (result.type === 'tag'){
					msg = result.syntax + ' → ' + result.description.replace(/\s+/g, ' ') + ' ~ http://cfdocs.org/' + q;
				}else{
					msg = result.syntax + ' → returns ' + ( result.returns.length ? result.returns : ' nothing' ) + ' ~ http://cfdocs.org/' + q;
				}
				_bot.say(channel, msg );
			}
		});

	}

	function docsApi(q, callback){
		var base = 'https://raw.githubusercontent.com/foundeo/cfdocs/master/data/en/';
		var full = base + q + '.json';

		request(full, function (error, response, body) {
			if ( !error && response.statusCode === 200 ) {
				var r = JSON.parse(body);
				callback(null, r);
			} else if ( response.statusCode === 404 ){
				callback( 'Unable to find docs for `' + q + '`', null );
			}
		});
	}

}());

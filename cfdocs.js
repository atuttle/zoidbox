'use strict';

var request = require( 'request' );

module.exports = function(q, callback){
	var base = 'https://raw.githubusercontent.com/foundeo/cfdocs/master/data/en/';
	var full = base + q + '.json';

	request(full, function (error, response, body) {
		if ( !error && response.statusCode == 200 ) {
			var r = JSON.parse(body);
			callback(null, r);
		}else if ( response.statusCode == 404 ){
			callback( "Unable to find docs for `" + q + "`", null );
		}
	});
};

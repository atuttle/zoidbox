var request = require('request');

module.exports = function(term, callback){
	var url = 'http://api.gifme.io/v1/gifs/random?key=rX7kbMzkGu7WJwvG&term=';

	request( url + term, function(err, result){

		var response = JSON.parse( result.body );

		if (response.status !== 200){
			return callback( "oops, looks like shit's broke, yo.", null );
		}else{
			return callback( null, response.gif.gif );
		}
	});
}

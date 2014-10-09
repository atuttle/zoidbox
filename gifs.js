var request = require('request');

module.exports = function(term, callback){
	var url = 'http://api.gifme.io/v1/gifs/random?key=rX7kbMzkGu7WJwvG&term=';
	request( url + term, function(err, result){
console.log(result.body);
		var response = JSON.parse( result.body );
console.log(response);
		if (response.status !== 200){
			return callback( "oops, looks like shit's broke, yo.", null );
		}else{
			return callback( null, response.gif.gif );
		}
	});
}

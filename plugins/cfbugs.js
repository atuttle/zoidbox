'use strict';

module.exports = (function(){

	var _ = require( 'lodash' );
	var request = require( 'request' );
	var charmed = require( 'charmed' );
	var bot;
	var frequency = 1000 * 60 * 15; //every 15 minutes

	//adapted from: https://github.com/daccfml/scratch/blob/master/adamcameroncoldfusion.cfmldeveloper.com/wwwroot/cfbugs/adobeBugRss.cfm
	var product = 1149;
	var versions = {
		'11.0': 10206
		,'10.0.0': 7770
		,'9.0.1': 9288
		,'9.0.0': 9289
		,'8.0.1': 9290
		,'8.0.0': 9291
	};
	var inversions = {
		10206: '11.0'
		,7770: '10.0.0'
		,9288: '9.0.1'
		,9289: '9.0.0'
		,9290: '8.0.1'
		,9291: '8.0.0'
	};
	var bugsUrl = 'https://bugbase.adobe.com/index.cfm?event=qSearchBugs&page=1&pageSize=50&product={PRODUCT}&version={VERSION}&gridsortcolumn=AD_S_DEFECT_ID&gridsortdirection=DESC'.split( '{PRODUCT}' ).join( product );
	var bugUrl = 'https://bugbase.adobe.com/index.cfm?event=bug&id=';

	return function init( _bot ){
		bot = _bot;

		bot.on( 'message', function( from, to, text, message){

			if (bot.isChannelPaused(to)) return;

			if (to === bot.botName) {
			    //they are talking to us in a private message, set to to be from
			    to = from;
			}

			if ( text === '#cfbugs !poll' ){
				checkForBugs();
			}else if ( text === '#cfbugs !init' ){
				bot.ops.isOp( message.user, function( err, data ){
					if ( err ){
						return bot.say( to, 'Error determinging your OPS status. Oops.');
					}
					if ( data === 0 ){
						return bot.say( to, 'You must be an op to do that, ' + from );
					}
					checkForBugs( true );
					bot.say( to, 'Good to go, ' + from );
				});
			}
		});

		setInterval( checkForBugs, frequency );
	};

	function checkForBugs( quietly ){
		quietly = quietly || false;
		_.each( versions, function( code, label ){

			console.log('Checking for latest CF ' + label + ' bugs...' );

			var _url = bugsUrl.split( '{VERSION}' ).join( code );
			request( _url, function( err, response, body ){

				if ( !err && response.statusCode === 200 ) {
					try {
						var b = body.substr( 2 ); //trims off the leading `//`
						var resp = JSON.parse( b );

						_.each( resp.QUERY.DATA, function( row ){

							var bugId = parseInt( row[ 1 ], 10);
							var title = charmed.toAscii( row[ 4 ] );
							var link = bugUrl + bugId;

							notify( bugId, title, link, code, quietly );

						});

					} catch (e) {
						console.error( 'Error parsing JSON response :(' );
						bot.say( '#zoidbox', 'There was a problem parsing the CFBugs JSON response :( ~ ' + _url );
					}
				} else {
					console.error( err );
				}

			});

		});
	}

	function notify( bugId, title, link, versionCode, quietly ){
		quietly = quietly || false;
		bot.redis.sismember( 'cfbugs.seen', bugId, function( err, data ){
			if ( err ){
				return bot.say( '#zoidbox', 'CFBugs plugin error' );
			}
			if ( data === 0 ){ //haven't posted about this one yet, share it
				if ( !quietly ){
					bot.say( '#zoidbox', 'NEW BUG (CF' + inversions[versionCode] + '): ' + title + ' ~ ' + link );
					bot.say( '##coldfusion', 'NEW BUG (CF' + inversions[versionCode] + '): ' + title + ' ~ ' + link );
				}
				bot.redis.sadd( 'cfbugs.seen', bugId );
			}else{
				//skip notification, we've already posted about this one
				console.log( 'skipping %s, shared it already', bugId );
			}
		});
	}

}());

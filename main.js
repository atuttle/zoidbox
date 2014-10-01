'use strict';

var config = {
	channels: [ '##coldfusion' ]
	,server: 'irc.freenode.net'
	,botName: 'zoidbox'
};

var irc = require( 'irc' );
var cfdocs = require( './cfdocs' );

var bot = new irc.Client( config.server, config.botName, { channels: config.channels } );

bot.addListener( "message#", function( from, to, text /*, message*/ ){
	if ( text.substr( 0, 7 ) === 'zoidbox' ){
		bot.say( to, randomZoidism() );
	}else if ( text.substr( 0, 12 ) === 'box install ' ){
		bot.action( to, 'giggles' );
	}else if ( text.substr( 0,1 ) === '!' ){
		docs( to, text.slice( 1 ) );
	}else if ( text.slice( -5 ) === ' over' ){
		bot.say( to, "KSHHHK" );
	}
});

//=====================================

var zoidisms = [
	'Woohoo!'
	,'This is crap people will use every freaking day'
	,'Really?!'
	,'Hi!'
	,'People are freaking ridiculous'
	,'awwww'
	,'suck it'
	,'idiots... they\'re all idiots...'
	,'tough shit!'
	,'let\'s do it'
	,'ok I\'m done'
	,'He\'s a Wizard'
	,'the giants'
	,'occupy me'
];

function randomZoidism(){
	return zoidisms[ Math.floor( Math.random() * zoidisms.length ) ];
}

function docs( chan, q ){
	q = q.toLowerCase();

	if (q === "cfclient"){
		return bot.say( chan, '<cfclient></cfclient> → returns a pink slip, because if you use this shit you should be fired. ~ http://www.codecademy.com/en/tracks/javascript');
	}

	if (q === "cf_socialplugin"){
		return bot.say( chan, "<cf_socialplugin .. /> → returns a bunch of outdated junk that would have been better as a community project dear god what have we done we should have just given them a package manager like they've been asking for for years ~ http://cfdocs.org/cf_socialplugin");
	}

	cfdocs( q, function(err, result){
		if (err !== null){
			bot.say( chan, err );
		}else{
			if (result.type === "tag"){
				var msg = result.syntax + ' → ' + result.description.replace(/\n//g) + ' ~ http://cfdocs.org/' + q;
			}else{
				var msg = result.syntax + ' → returns ' + result.returns + ' ~ http://cfdocs.org/' + q;
			}
			bot.say( chan, msg );
		}
	});

}

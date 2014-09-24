var config = {
	channels: [ '##coldfusion' ]
	,server: 'irc.freenode.net'
	,botName: 'zoidbox'
};

var irc = require( 'irc' );

var bot = new irc.Client( config.server, config.botName, { channels: config.channels } );

bot.addListener( "join", function( channel, who ){
	if ( who !== 'zoidbox' ){
		bot.action( channel, 'cracks the cooler open and nods at ' + who );
	}else{
		// bot.action( channel, 'tips fedora' );
	}
});

bot.addListener( "message#", function( from, to, text, message ){
	if ( text.substr( 0,8 ) === 'zoidbox:' ){
		bot.say( to, 'occupy me, ' + from );
	}else if ( text.substr( 0, 12 ) === 'box install ' ){
		bot.action( to, 'giggles' );
	}else if ( text.slice( -1 ) === '?' ){
		bot.say( to, randomZoidism() );
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

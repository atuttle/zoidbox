'use strict';

module.exports = (function(){

	var bot,
        conf,
        hushed = false;

	return function init (_bot){
		bot = _bot;
        conf = bot.conf;
		bot.on( 'message#', function( from, to, text ){
			var me = bot.conf.get('botName').toLowerCase();
			if ( from.toLowerCase() === me ){
				return;
			}

			if ( hushed !== false ) {
				checkHushed();
			}
			if (text.indexOf('#hush') === 0 || (text.indexOf(me) === 0) && text.search(/\bhush\b/) > 0) {
				hush(from, text);
			} else if (!hushed) {
				if (text.indexOf('box install ') === 0) {
					bot.action(to, 'giggles');
				} else if (text.slice(-5) === ' over' ){
					bot.say(to, 'KSHHHK');
				} else if (text.toLowerCase().indexOf(me) !== -1 && from !== me && from !== 'zoidbox') {
					bot.say(to, randomZoidism(from));
				}
			}

		});
	};

	function randomZoidism(from){
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
			,'let\'s do it {from}'
			,'ok I\'m done'
			,'He\'s a Wizard'
			,'the giants'
			,'occupy me {from}'
			,'this is some podman-level nonsense'
		];

		return zoidisms[Math.floor(Math.random() * zoidisms.length)].split('{from}').join(from);
	}

	function hush( from, text ) {
		hushed = new Date();
		var when = 15;
		var then = 0,
			hushing;
		text = text.match(/(?:hush )([0-9]+)$/, '');
		if (text) {
			then = parseInt(text[1], 10);
		}
		if (then > 0) {
			when = then;
		}
		hushing = new Date( hushed.getTime() + (when * 60000) );
		if ( hushing > hushed ) {
			hushed = hushing;
		}
		bot.say(from, 'hushed for ' + when + ' minutes, until ' + hushed );
	}

	function checkHushed() {
		var now = new Date();
		if (now > hushed) {
			hushed = false;
		}
	}

})();

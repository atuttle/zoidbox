'use strict';

module.exports = (function(){

	var _ = require('lodash');
	var bot,
		conf,
		hushed = false;

	return function init (_bot){
		bot = _bot;
		conf = bot.conf;

		bot.on( 'message#', function( from, to, text ) {

			if (bot.isChannelPaused(to)) return;

			var me = bot.conf.get('botName').toLowerCase();
			if (from.toLowerCase() === me) {
				return;
			}

			if (hushed !== false) {
				checkHushed();
			}

			var msg = '';
			var parts = text.split(' ');

			if (parts.length > 1 && parts[0].toLowerCase().indexOf(me) === 0 && text.trim().split('').reverse().join('').indexOf('?') === 0) {
				//magic 8 ball;
				msg = random8ball(from);
				if (msg.indexOf('/me') === 0) {
					return bot.action(to, msg.replace('/me', '').trim());
				} else {
					return bot.say(to, msg);
				}
			} else if (text.indexOf('#hush') === 0 || (text.indexOf(me) === 0) && text.search(/\bhush\b/) > 0) {
				hush(from, text);
			} else if (text.indexOf('#trout') === 0 && parts.length > 1) {
				bot.action(to, randomAssault() + ' ' + parts.slice(1, parts.length).join(' ') + ' with a' + randomTroutSize() + 'trout');
			} else if (!hushed) {
				if (text.indexOf('box install ') === 0) {
					bot.action(to, 'giggles');
				} else if (text.slice(-5) === ' over' ){
					bot.say(to, 'KSHHHK');
				} else if (text.toLowerCase().indexOf(me) !== -1 && from !== me && from !== 'zoidbox') {
					msg = randomZoidism(from);
					if (msg.indexOf('/me') === 0) {
						return bot.action(to, msg.replace('/me', '').trim());
					} else {
						return bot.say(to, msg);
					}
				}
			}

		});
	};

	function randomAssault () {
		var actions = ['smacks', 'slaps', 'whacks', 'punches', 'assaults', 'wallops', 'broadsides', 'thwacks', 'flogs'];
		return actions[Math.floor(Math.random() * actions.length)];
	}

	function randomTroutSize () {
		var sizes = [' itty bitty ', ' tiny ', ' small ', ' rather large ', 'n enormous ', ' gigantic ', 'n average sized ', ' venti ', ' ginormous ', ' mecha-', ' handmade, etsy sourced '];
		return sizes[Math.floor(Math.random() * sizes.length)];
	}

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
			,'like I said, you were doing it wrong'
			,'You want to take this outside {from}?'
			,'Do you kiss your mother with that mouth?'
			,'My ears are burning'
			,'On the other side of the screen, it all looks so easy.'
			,'/me is starting to hear things...'
			,'/me thinks {from} talks too much.'
			,'{from} has died of dysentery'
			,'I find your lack of faith disturbing.'
			,'/me is looking for a new job'
			,'The `Ol Sourcerer is at it again'
		];

		return zoidisms[Math.floor(Math.random() * zoidisms.length)].split('{from}').join(from);
	}

	function random8ball (from) {
		var responses = [
			'As I see it, yes.'
			, 'It is certain.'
			, 'It is decidedly so.'
			, 'Most likely.'
			, 'Outlook good.'
			, 'Signs point to yes.'
			, 'Without a doubt.'
			, 'Yes.'
			, 'Yes - definitely.'
			, 'You may rely on it.'
			, 'Reply hazy, try again.'
			, 'Ask again later.'
			, 'Better not tell you now.'
			, 'Cannot predict now.'
			, 'Concentrate and ask again.'
			, 'Don`t count on it.'
			, 'My reply is no.'
			, 'My sources say no.'
			, 'Outlook not so good.'
			, 'Very doubtful.'];

		return responses[_.random(0, responses.length)].split('{from}').join(from);
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

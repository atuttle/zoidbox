module.exports = (function(){

	let bot;

	return function init(_bot){
		bot = _bot;
		bot.on('message', function(from, to, text){

			if (bot.isChannelPaused(to)) return;

			if (to === bot.botName) {
			    //they are talking to us in a private message, set to to be from
			    to = from;
			}

            const [command, ...message] = text.trim().split(' ');;

			if (command === '#echo' && message.length) {
				bot.say(to, message.join(' '));
			}

		});
	};

})();

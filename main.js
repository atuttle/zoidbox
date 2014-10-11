'use strict';

(function bootstrap(){
	var conf = require('nconf')
		.argv()
		.env()
		.file({file: './lib/config.json'})
		.defaults({
			'karmaCooldown': 60
			,'botName': '```zoidbox'
		});

	var bot = initIRC( conf );

	//initialize
	bot.use( require('./lib/core') );
	bot.use( require('./lib/ops') );
	bot.loadPlugins();

	//=====================================================

	function initIRC( conf ){
		var irc = require( 'irc' );
		var b = new irc.Client(
			conf.get('server')
			, conf.get('botName')
			, {
				channels: conf.get('channels')
				,floodProtection: true
			}
		);

		b.conf = conf;

		b.use = function use( plugin ){
			plugin( bot );
		};

		b.loadPlugins = function loadPlugins(){
			var plugins = [];
			var walk = require('walk');
			var walker = walk.walk('./plugins', { followLinks: false });

			walker.on('file', function(root, stat, next){

				if ( stat.name.slice(-3) === '.js' ){
					console.log('loading plugin %s/%s', root, stat.name);
					try {
						bot.use( require( root + '/' + stat.name ) );
						plugins.push( root + '/' + stat.name );
					}catch (err){
						console.error( err );
						console.log('----------------------');
					}
				}

				next();
			});

			walker.on('end', function(){
				console.log('plugins loaded: %s', plugins);
			});
		};

		return b;
	}
})();

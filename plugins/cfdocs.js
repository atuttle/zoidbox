'use strict';

var request = require( 'request' );
var _ = require('lodash');

module.exports = (function(){

	var bot,
		redis,
		log,
		conf,
		queryExceptions = {}; //make sure keys are completely lowercase

	return function init( _bot ){
		bot = _bot;
		log = bot.log;
		conf = bot.conf;
		redis = bot.redis;

		bot.on( 'message', function( from, to, text, message ){

			if (bot.isChannelPaused(to)) return;

			if (to === bot.botName) {
				//they are talking to us in a private message, set to to be from
				to = from;
			}

			var parts = text.trim().split(' ');

			if (text.indexOf('!') === 0){
				log('cfdocs', from, to, text, message.user, message.nick);
				if (parts.length > 2 && parts[1] === '!desc') {
					if (parts[0].slice(1) === from) {
						if ('~' + message.nick.toLowerCase().substr(0,9) === message.user.toLowerCase()) {
							setDesc(parts[0].slice(1), parts.slice(2, parts.length).join(' '));
							bot.say(to, 'New description saved for `' + parts[0].slice(1) + '`');
						} else {
							bot.say(to, 'You can only set a description for your nick if you are authenticated and are using your username as your nickname.  Username: ' + message.user);
						}
					} else {
						bot.ops.isOp(message.user, function (err, data) {
							if (data === 0) {
								bot.say(to, 'You must be an op to do that.');
							} else {
								if (parts[2] === '!clear') {
									clearDesc(parts[0].slice(1));
									bot.say(to, 'Description cleared for `' + parts[0].slice(1) + '`');
								} else {
									setDesc(parts[0].slice(1), parts.slice(2, parts.length).join(' '));
									bot.say(to, 'New description saved for `' + parts[0].slice(1) + '`');
								}
							}
						});
					}
				} else {
					return docs(to, text.slice(1));
				}
			} else if (text.indexOf('#cfdocs') === 0 && text.split(' ').length > 1) {
				log('#cfdocs', from, to, text);
				switch (parts[1]) {
					case '!stats' :
						getTotalHits(to, function(err, data) {
							if (err) {
								log('getTotalHits err', err, data);
							}

							var totalHits = _.parseInt((_.isNull(data) ? 0 : data), 10);

							getLeaderboard(to, function(err, data) {
								if (err) {
									log('getLeaderboard err', err, data);
								}

								var leaders = _.map(
										_.sortBy(
											_.filter(
													_.map(data, function(item, key) {
														return [key, item];
													}), function(item) {
														return item[0] !== 'TOTAL';
											}) ,
									function (value){
										return _.parseInt(value[1], 10);
									})
								.reverse()
								.slice(0, 15),
								function(item) {
									return item[0] + ': ' + item[1] + ' (' + _.parseInt((item[1] / totalHits) * 100, 10) + '%)';
								}).join(', ');

								bot.say(to, totalHits + ' total CFDocs search' + ( totalHits !== 1 ? 'es' : '') + '. Most searched queries: ' + leaders);
							});
						});

						break;
					case '!export' :
						var format = 'md';
						if (parts.length > 2) {
							format = parts[2];
						}
						getCustomDescriptions(function (err, data) {
							if (err !== null) {
								console.error(err);
								return bot.say(to, 'error: ' + err);
							}
							var filename = bot.botID + '-custom-descriptions.';
							var output = '';
							var keys = _.keys(data).sort();

							switch (format) {
								case 'md' :
								case 'markdown' :
									filename += 'md';
									output = _.map(keys, function(key) {
										return '```' + decodeURI(key) + '``` ' + decodeURI(data[key]);
									}).join('\n\n');
									break;
								case 'text' :
									filename += 'text';
									output = _.map(keys, function(key) {
										return decodeURI(key) + ': ' + decodeURI(data[key]);
									}).join('\n');
									break;
								case 'json' :
									filename += 'json';
									output = JSON.stringify(data);
									break;
								default :
									return bot.say(to, 'I don`t understand that export format.  You can export to markdown, text or json');
									break;
							}

							createGist(filename, output, function (err, response, body) {
								if (err) {
									console.error(err);
									return bot.say(to, 'error: ' + err);
								}
								try {
									var data = JSON.parse(body);
									if (_.has(data, 'message') && _.has(data, 'documentation_url')) {
										return bot.say(to, 'error: ' + body);
									} else {
										switch (format) {
											case 'md' :
											case 'markdown' :
												return bot.say(to, 'Custom descriptions: ' + data.html_url);
												break;
											case 'text' :
												return bot.say(to, 'Custom descriptions: ' + data.files[filename].raw_url);
												break;
											case 'json' :
												return bot.say(to, 'Custom descriptions: ' + data.files[filename].raw_url);
												break;
										}
									}
								} catch (e) {
									console.error(e);
									return bot.say(to, 'error:' + e);
								}

							});
						});

						break;
					case '!reset' :
						bot.ops.isOp(message.user, function(err, data){
							if (data === 0) {
								bot.say(to, 'You must be an op to do that.');
							} else {
								resetHits(to);
							   bot.say(to, 'CFDocs stats have been reset.');
							}
						});
						break;
					default :
						getHits(to, parts[1], function(err, data) {
							if (err) {
								log('getHits err:', err, data);
								return;
							}

							if (_.parseInt(data, 10) > 0) {
								bot.say(to, parts[1] + ' has been searched for ' + data + ' time' + (_.parseInt(data, 10) !== 1 ? 's.' : '.'));
							} else {
								bot.say(to, parts[1] + ' has never been searched for.');
							}
						});
						break;
				}
			}
		});
	};

	function loghit (channel, q) {
		redis.hincrby(bot.botID + '.' + channel + '.cfdocs_hits', q.toLowerCase(), 1);
		redis.hincrby(bot.botID + '.' + channel + '.cfdocs_hits', 'TOTAL', 1);
	}

	function setDesc (q, desc) {
		redis.hset(bot.botID + '.customDescriptions', q.toLowerCase(), desc);
	}

	function getDesc (q, callback) {
		redis.hget(bot.botID + '.customDescriptions', q.toLowerCase(), callback);
	}

	function clearDesc (q) {
		redis.hdel(bot.botID + '.customDescriptions', q.toLowerCase());
	}

	function getCustomDescriptions (callback) {
		redis.hgetall(bot.botID + '.customDescriptions', callback);
	}

	function getHits (channel, q, callback) {
		redis.hget(bot.botID + '.' + channel + '.cfdocs_hits', q.toLowerCase(), callback);
	}

	function getTotalHits (channel, callback) {
		redis.hget(bot.botID + '.' + channel + '.cfdocs_hits', 'TOTAL', callback);
	}

	function getLeaderboard(channel, callback) {
		redis.hgetall(bot.botID + '.' + channel + '.cfdocs_hits', callback);
	}

	function resetHits(channel) {
		redis.del(bot.botID + '.' + channel + '.cfdocs_hits');
	}

	function docs (channel, q){
		q = q.toLowerCase();
		loghit(channel, q);
		getHits(channel, q, function(err, data) {
			if (err) {
				log('getHits err:', err, data);
				return;
			}

			if (queryExceptions.hasOwnProperty(q)) {
				return bot.say(channel, queryExceptions[q]);
			}

			getDesc(q, function(err, result) {

				if (result !== null) {
					bot.say(channel, result);
				} else {
					docsApi( q, function(err, result){
						if (err !== null){
							bot.say(channel, err );
						} else {
							var theoreticalMax = 400; //rough guess at how many characters we get
							var link = ' ~ http://cfdocs.org/' + q;
							var msg = '';
							if (result.type === 'tag'){
								msg = result.syntax + ' → ' + result.description.replace(/\s+/g, ' ');
							}else{
								msg = result.syntax + ' → returns ' + ( result.returns.length ? result.returns : ' nothing' );
							}

							var bufferRemaining = theoreticalMax - ( (bot.botName.length + 1) + link.length);
							var fitMsg = msg.substr(0, bufferRemaining);
							if (fitMsg !== msg){
								fitMsg = fitMsg + '…';
							}
							fitMsg = fitMsg + link;
							bot.say( channel, fitMsg );
						}
					});
				}
			});


		});

	}

	function docsApi (q, callback){
		var base = 'https://raw.githubusercontent.com/foundeo/cfdocs/master/data/en/';
		var full = base + q + '.json';

		request(full, function (error, response, body) {
			if ( !error && response.statusCode === 200 ) {
				try {
					var r = JSON.parse(body);
					callback(null, r);
				} catch (e) {
					callback('Error Parsing JSON for `' + q + '`', null);
				}
			} else if ( response.statusCode === 404 ){
				callback( 'Unable to find docs for `' + q + '`', null );
			}
		});
	}

	function createGist (filename, data, callback) {

		var formData = {
				description: 'Custom Descriptions from ' + bot.botID,
				public: false,
				files: {}
			};

		formData.files[filename] = {content: data};

		request.post({
			url: 'https://api.github.com/gists',
			headers: {'user-agent': 'https://github.com/atuttle/zoidbox'},
			form: JSON.stringify(formData)}, callback);
	}

}());

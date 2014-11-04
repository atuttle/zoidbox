'use strict';

var request = require( 'request' );
var _ = require('lodash');

module.exports = (function(){

	var bot,
		redis,
		log,
		conf,
        queryExceptions = {
            fw1: 'http://framework-one.github.io/documentation/',
            di1: 'https://github.com/framework-one/di1/wiki (will change later)',
            taffy: 'http://docs.taffy.io',
            coldbox: 'http://wiki.coldbox.org/',
            testbox: 'http://wiki.coldbox.org/wiki/TestBox.cfm',
            wirebox: 'http://wiki.coldbox.org/wiki/WireBox.cfm',
            commandbox: 'http://www.ortussolutions.com/products/commandbox/docs/current',
            cfclient: '<cfclient></cfclient> → returns a pink slip, because if you use this shit you should be fired. ~ http://www.codecademy.com/en/tracks/javascript',
            cf_socialplugin: '<cf_socialplugin .. /> → returns a bunch of outdated junk that would have been better as a community project dear god what have we done... we should have just given them a package manager like they\'ve been requesting for years ~ http://cfdocs.org/cf_socialplugin',
            cfscriptref: 'https://github.com/daccfml/cfscript/blob/master/cfscript.md'
        }; //make sure keys are completely lowercase

	return function init( _bot ){
		bot = _bot;
		log = bot.log;
		conf = bot.conf;
		redis = bot.redis;

		bot.on( 'message#', function( from, to, text ){
			if (text.indexOf('!') === 0 && text.split(' ').length === 1){
				log('cfdocs', from, to, text);
				return docs(to, text.slice(1));
			} else if (text.indexOf('#cfdocs') === 0 && text.split(' ').length > 1) {
                log('#cfdocs', from, to, text);
                var parts = text.trim().split(' ');
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
                    case '!reset' :
                        bot.ops.isOp(from, function(err, data){
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
		redis.hincrby(conf.get('botName') + '.' + channel + '.cfdocs_hits', q.toLowerCase(), 1);
		redis.hincrby(conf.get('botName') + '.' + channel + '.cfdocs_hits', 'TOTAL', 1);
	}

    function getHits (channel, q, callback) {
        redis.hget(conf.get('botName') + '.' + channel + '.cfdocs_hits', q.toLowerCase(), callback);
    }

    function getTotalHits (channel, callback) {
        redis.hget(conf.get('botName') + '.' + channel + '.cfdocs_hits', 'TOTAL', callback);
    }

    function getLeaderboard(channel, callback) {
		redis.hgetall(conf.get('botName') + '.' + channel + '.cfdocs_hits', callback);
	}

    function resetHits(channel) {
		redis.del(conf.get('botName') + '.' + channel + '.cfdocs_hits');
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

            docsApi( q, function(err, result){
                if (err !== null){
                    bot.say(channel, err );
                }else{
                    var theoreticalMax = 400; //rough guess at how many characters we get
                    var link = ' ~ http://cfdocs.org/' + q;
                    var msg = '';
                    if (result.type === 'tag'){
                        msg = result.syntax + ' → ' + result.description.replace(/\s+/g, ' ');
                    }else{
                        msg = result.syntax + ' → returns ' + ( result.returns.length ? result.returns : ' nothing' );
                    }

                    var bufferRemaining = theoreticalMax - ( (conf.get('botName').length + 1) + link.length);
                    var fitMsg = msg.substr(0, bufferRemaining);
                    if (fitMsg !== msg){
                        fitMsg = fitMsg + '…';
                    }
                    fitMsg = fitMsg + link;
                    bot.say( channel, fitMsg );
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

}());

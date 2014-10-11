/* jshint laxcomma: true */
/* global require, console */
'use strict';

/*
	https://node-irc.readthedocs.org/en/latest/API.html
	https://www.npmjs.org/package/nconf
	https://www.npmjs.org/package/redis
	http://lodash.com/docs
*/

var bot;
var plugins = []; //populated at runtime
var conf = require('nconf');
var irc = require( 'irc' );

(function bootstrap(){

	conf.argv()
		.env()
		.file({file: './config.json'})
		.defaults({
			'karmaCooldown': 60
			,'botName': '```zoidbox'
		});

	bot = new irc.Client(
		conf.get('server')
		, conf.get('botName')
		, {
			channels: conf.get('channels')
			,floodProtection: true
		}
	);

	//monkeypatch in some utility functions
	bot.log = log;
	bot.use = use;
	bot.conf = conf;

	//load all available plugins
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

})();

function log() {
	if (conf.get('debug') || false) {
		console.log( Array.prototype.slice.call(arguments) );
	}
}
function use( plugin ){
	plugin( bot );
}

/*
var fs = require('fs');
var events = require("events");
var emit = new events.EventEmitter();
var moment = require("moment");
var currentlyOnline = {};
var isup = require('is-up');


redis.on("ready", function(){

	bot.addListener("part", function(channel, nick, reason, message) {
		log("part", channel, nick, reason);
		setLastSeen(channel, nick);
		setCurrentlyOnline(channel, nick, false);
	});

	bot.addListener("quit", function(channel, nick, reason, message) {
		log("quit", channel, nick, reason);
		setLastSeen(channel, nick);
		setCurrentlyOnline(channel, nick, false);
	});

	bot.addListener("join", function(channel, nick, message){
		log("join", channel, nick, message);
		setLastSeen(channel, nick);
		setCurrentlyOnline(channel, nick, true);
	});

	bot.addListener("names", function(channel, nicks){
		log("names", channel, nicks);

		_.each(nicks, function(item, key) {
			setLastSeen(channel, key);
			setCurrentlyOnline(channel, key, true);
		})

	});

	bot.addListener("nick", function(oldNick, newNick, channel, message) {
		setLastSeen(channel, oldNick);
		setLastSeen(channel, newNick);
		setCurrentlyOnline(channel, oldNick, false);
		setCurrentlyOnline(channel, newNick, true);
	})

	bot.addListener("message", function( from, to, text){
		log("message", from, to, text);
		//bot.say(to, from + ', ' + to + ', ' + text);

		setLastSeen(to, from);
		countMessage(to, from);

		if (to == conf.get("botName")) {
			//they are talking to us in a private message, set to to be from
			to = from;
		}
*/
		// if (text.indexOf("#lastseen") == 0) {
		// 	emit.emit("lastseen", from, to, text);
		// } else if (text.indexOf("#random") == 0) {
		// 	emit.emit("random", from, to, text);
		// } else if (text.indexOf("#karmagivers") == 0) {
		// 	emit.emit("karmagivers", from, to, text);
		// } else if (text.indexOf("#karma") == 0) {
		// 	emit.emit("karma", from, to, text);
		// } else if (text.indexOf("#stats") == 0) {
		// 	emit.emit("stats", from, to, text);
		// } else if (text.search(/[:,]\s*\+1/g) !== -1) {
		// 	emit.emit("addkarmaSucceeding", from, to, text);
		// } else if (text.search(/^\+1[:,]*\s*\w*/g) !== -1) {
		// 	emit.emit("addkarmaPreceeding", from, to, text);
		// } else if (text.indexOf("^") === 0 && text.length >= 4 && text.split(' ').length === 1) {
		// 	emit.emit("isup", from, to, text);
		// }
/*
	});
});

//lastseen

function setLastSeen (channel, nick) {
	redis.hset(conf.get("botName") + "." + channel + ".lastseen", nick.toLowerCase(), Date.now());
}

emit.on("lastseen", function(from, to, text) {
	var nick = text.replace("#lastseen", "").trim();

	if (nick.length) {
		redis.hget(conf.get("botName") + "." + to + ".lastseen", nick, function(err, data) {
			if (data !== null) {
				var date = new Date(parseInt(data, 10));
				bot.say(to, "I last saw " + nick + " around " + date.toLocaleString());
			} else {
				bot.say(to, "who? " + nick + "? Never heard of them.");
			}
		});
	} else {
		redis.hgetall(conf.get("botName") + "." + to + ".lastseen", function(err, data){
			log(data);
			if (data !== null) {
				var people = _.map(_.sortBy(_.map(data, function(item, key) { return [key, item]}), 1).reverse().slice(0, 10), function(item) {return item[0];}).join(", ");
				bot.say(to, "The last users to leave were: " + people);
			} else {
				bot.say(to, "I haven't seen anyone all day.");
			}
		})
	}
});


function setCurrentlyOnline(channel, nick, isOnline) {
	if (_.isBoolean(isOnline)) {
		if (isOnline) {
			currentlyOnline[channel + "." + nick.toLowerCase()] = 1;
		} else {
			delete currentlyOnline[channel + "." + nick.toLowerCase()];
		}
	}
}

function getCurrentlyOnline(channel) {
	return _.map(_.filter(_.keys(currentlyOnline), function(item) {
			return item.indexOf(channel + ".") === 0;
		}), function(item) {
			return item.replace(channel + ".", "");
		});
}

function isCurrentlyOnline(channel, nick) {
	return !_.isUndefined(currentlyOnline[channel + "." + nick.toLowerCase()])
}


//karma

function allowedKarma( nick ) {
	var banned = ["choop"];
	if (banned.indexOf(nick) > -1) {
		return false;
	}
	return true;
}

function incrKarma(channel, nick, giver, incrby) {
	redis.hincrby(conf.get("botName") + "." + channel + ".karma", nick.toLowerCase(), incrby);
	redis.hincrby(conf.get("botName") + "." + channel + ".karma_giver", giver.toLowerCase(), incrby);
	setLastKarmaGive(channel, giver);
}

function getKarma(channel, nick, callback) {
	redis.hget(conf.get("botName") + "." + channel + ".karma", nick.toLowerCase(), callback);
}

function getKarmaGives(channel, nick, callback) {
	redis.hget(conf.get("botName") + "." + channel + ".karma_giver", nick.toLowerCase(), callback);
}

function getLeaderboard(channel, callback) {
	redis.hgetall(conf.get("botName") + "." + channel + ".karma", callback);
}

function getGiverLeaderboard(channel, callback) {
	redis.hgetall(conf.get("botName") + "." + channel + ".karma_giver", callback);
}

function resetKarma(channel) {
	redis.del(conf.get("botName") + "." + channel + ".karma");
}

function resetKarmaNick(channel, nick) {
	redis.hset(conf.get("botName") + "." + channel + ".karma", nick.toLowerCase(), 0);
}

function resetKarmaGives(channel) {
	redis.del(conf.get("botName") + "." + channel + ".karma_giver");
}

function resetKarmaGivesNick(channel, nick) {
	redis.hset(conf.get("botName") + "." + channel + ".karma_giver", nick.toLowerCase(), 0);
}

function setLastKarmaGive(channel, giver) {
	redis.hset(conf.get("botName") + "." + channel + ".last_karma_give", giver.toLowerCase(), Date.now());
}

function getLastKarmaGive(channel, giver, callback) {
	redis.hget(conf.get("botName") + "." + channel + ".last_karma_give", giver.toLowerCase(), callback);
}


function addKarma(nick, from, to, text) {
	if (nick.toLowerCase() === from.toLowerCase()) {
		bot.say(to, "You can't give karma to yourself ಠ_ಠ");
	} else if (!allowedKarma(nick.toLowerCase()) {
		bot.say(to, "You can't give karma to " + nick.toLowerCase() + ".");
	} else {
		if (!isCurrentlyOnline(to, nick)) {
			bot.say(to, "who is " + nick + "?");
		} else {
			getLastKarmaGive(to, from, function(err, data){
				//log(Date.now() - data, conf.get("karmaCooldown"));
				if (Date.now() - data > conf.get("karmaCooldown") * 1000){
					incrKarma(to, nick, from, 1);
					bot.say(to, from + " gives karma to " + nick);
				} else {
					bot.say(to, "easy " + from + ".")
				}
			});

		}
	}
}

emit.on("addkarmaSucceeding", function(from, to, text) {
	var nick = text.replace(/[:,]\s*\+1/g, '').trim();
	addKarma(nick, from, to, text);
});

*/

// emit.on("addkarmaPreceeding", function(from, to, text) {
// 	var nick = text.replace(/\+1[:,]*/g, '').trim().split(' ');
// 	addKarma(nick[0], from, to, text);
// });

/*
emit.on("karma", function(from, to, text){
	var nick = text.replace("#karma", "").trim();

	if (nick.length) {
		if (nick.toLowerCase().split(" ")[0] === "!reset") {
			isOp(from, function(err, data){
				if (data == 0) {
					bot.say(to, "You must be an op to do that.")
				} else {
					var parts = nick.toLowerCase().split(" ");
					if (parts.length == 1) {
						resetKarma(to);
						bot.say(to, "All karma has been reset.");
					} else {
						nick = parts.slice(-(parts.length-1)).join(" ");
						resetKarmaNick(to, nick);
						bot.say(to, "karma for " + nick + " has been reset.");
					}

				}
			});
		} else {
			getKarma(to, nick, function(err, data){
				if (data !== null && data !== 0) {
					bot.say(to, nick + " has " + data.toString() + " karma.");
				} else {
					bot.say(to, " " + nick + " doesn't have any karma yet.");
				}
			});
		}
	} else {
		getLeaderboard(to, function(err, data){
			log("getLeaderboard", err, data);

			var leaders = _.map(_.sortBy(_.map(data, function(item, key) { return [key, item]}), function(value){return _.parseInt(value[1], 10);}).reverse().slice(0, 10), function(item) {return item[0] + " (" + item[1] + ")";}).join(", ");

			bot.say(to, "Current karma leaders are: " + leaders);
		})
	}
});

emit.on("karmagivers", function(from, to, text){
	var nick = text.replace("#karmagivers", "").trim();

	if (nick.length) {
		if (nick.toLowerCase().split(" ")[0] === "!reset") {
			isOp(from, function(err, data){
				if (data == 0) {
					bot.say(to, "You must be an op to do that.")
				} else {
					var parts = nick.toLowerCase().split(" ");
					if (parts.length == 1) {
						resetKarmaGives(to);
						bot.say(to, "All karma gives has been reset.");
					} else {
						nick = parts.slice(-(parts.length-1)).join(" ");
						resetKarmaGivesNick(to, nick);
						bot.say(to, "karma gives for " + nick + " has been reset.");
					}

				}
			});
		} else {
			getKarmaGives(to, nick, function(err, data){
				if (data !== null && data !== 0) {
					bot.say(to, nick + " has given " + data.toString() + " karma.");
				} else {
					bot.say(to, " " + nick + " hasnt given any karma yet.");
				}
			});
		}
	} else {
		getGiverLeaderboard(to, function(err, data){
			log("getGiverLeaderboard", err, data);

			var leaders = _.map(_.sortBy(_.map(data, function(item, key) { return [key, item]}), function(value){return _.parseInt(value[1], 10);}).reverse().slice(0, 10), function(item) {return item[0] + " (" + item[1] + ")";}).join(", ");

			bot.say(to, "Current karma giving leaders are: " + leaders);
		})
	}
});

//random

emit.on("random", function(from, to, text){
	var currentlyOnlineUsers = getCurrentlyOnline(to);
	bot.say(to, "eeny,  meeny,  miny, ... " + currentlyOnlineUsers[_.random(0, currentlyOnlineUsers.length-1)]);
});

//stats

function countMessage (channel, nick) {
	redis.hincrby(conf.get("botName") + "." + channel + ".messageCount", channel, 1);
	redis.hincrby(conf.get("botName") + "." + channel + ".messageCount", nick.toLowerCase(), 1);
}

function getChannelMessageCount(channel, callback) {
	redis.hget(conf.get("botName") + "." + channel + ".messageCount", channel, callback);
}

function getNickMessageCount(channel, nick, callback) {
	redis.hget(conf.get("botName") + "." + channel + ".messageCount", nick.toLowerCase(), callback);
}

function getMessageCountLeaderboard(channel, callback) {
	redis.hgetall(conf.get("botName") + "." + channel + ".messageCount", callback);
}

function resetStats(channel) {
	redis.del(conf.get("botName") + "." + channel + ".messageCount");
}

emit.on("stats", function(from, to, text){
	var nick = text.replace("#stats", "").trim();

	if (nick.length) {
		if (nick.toLowerCase().split(" ")[0] === "!reset") {
			isOp(from, function(err, data){
				if (data == 0) {
					bot.say(to, "You must be an op to do that.")
				} else {
					resetStats(to);
					bot.say(to, "All stats have been reset.");
				}
			});
		} else {
			getNickMessageCount(to, nick, function(err, data){
				if (data !== null && data !== 0) {
					bot.say(to, nick + " has sent " + data.toString() + " messages.");
				} else {
					bot.say(to, " " + nick + " hasn't said anything yet.");
				}
			});
		}
	} else {
		getChannelMessageCount(to, function(err, channelMessageCount){
			getMessageCountLeaderboard(to, function(err, data){
				log("getMessageCountLeaderboard", err, data);
				var leaders = _.map(
									_.sortBy(
										_.filter(
												_.map(data, function(item, key) {
													return [key, item]
												}), function(item) {
													return item[0] !== to;
										})
								, function(value){
									return _.parseInt(value[1], 10);
								})
							.reverse()
							.slice(0, 10)
							, function(item) {
								return item[0] + ": " + item[1] + " (" + _.parseInt((item[1] / channelMessageCount) * 100, 10) + "%)";
							}).join(", ");

				bot.say(to, "Total Messages: " + channelMessageCount + ". Most talkative users are: " + leaders);
				bot.say(to, "I have been running for " + moment(starttime).fromNow(true));
			});

		})
	}
});

//isup

emit.on("isup", function(from, to, text) {
	var url = text.split('');
	url.shift();
	url = url.join('').toLowerCase();
	url = url.replace('https://', '');
	url = url.replace('http://', '');
	isup(url, function(err, up){
		bot.say(to, url + " is " + (up ? "up" : "down") + " for me" + (up ? "..." : " too.") );
	});
});

*/

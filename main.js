'use strict';

/*
https://node-irc.readthedocs.org/en/latest/API.html
https://www.npmjs.org/package/nconf
https://www.npmjs.org/package/redis
http://lodash.com/docs
https://github.com/atuttle/zoidbox
*/

var fs = require('fs');
var conf = require('nconf');
var irc = require( 'irc' );
var redis;
var events = require("events");
var emit = new events.EventEmitter();
var _ = require("lodash");
var moment = require("moment");
var starttime = Date.now();
var currentlyOnline = {};
var cfdocs = require("./cfdocs");
var isup = require('is-up');
var gifs = require('./gifs');


conf.argv()
	.env()
	.file({file: './config.json'});

conf.defaults({
    'karmaCooldown': 60
  });

var log = function() {
	if (conf.get("debug") || false) {
		console.log( Array.prototype.slice.call(arguments) );
	}
}

var botName = conf.get("botName") || 'defaultBotName';

// log(conf.get("botName"));
// log(conf.get("server"));
// log(conf.get('channels'));

if (conf.get("REDISTOGO_URL")) {
	var rtg = require("url").parse(conf.get("REDISTOGO_URL"));
	redis = require("redis").createClient(rtg.port, rtg.hostname);
	redis.auth(rtg.auth.split(":")[1]);
} else {
	redis = require("redis").createClient(conf.get("redis_port"), conf.get("redis_host"), {});
	if (conf.get("redis_auth_pass")) {
		redis.auth(conf.get("redis_auth_pass"), function(err, data) {
			if (err) {
				log("redisClientAuthError:", err, data);
			}
		})
	}
}

redis.on("error", function(err){
	log("redisClientError:", err);
})


var bot;

redis.on("ready", function(){

	intializeOps();

	bot = new irc.Client( conf.get("server"), conf.get("botName"), { channels: conf.get("channels"), floodProtection: true } );

	bot.addListener("error", function(err) {
		log("botError", err);
	})

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

		if (text.indexOf("#lastseen") == 0) {
			emit.emit("lastseen", from, to, text);
		} else if (text.indexOf("#help") == 0) {
			//emit.emit("help", from, to, text);
		} else if (text.indexOf("#ops") == 0) {
			emit.emit("ops", from, to, text);
		} else if (text.indexOf("#op") == 0) {
			emit.emit("op", from, to, text);
		} else if (text.indexOf("#deop") == 0) {
			emit.emit("deop", from, to, text);
		} else if (text.indexOf("#random") == 0) {
			emit.emit("random", from, to, text);
		} else if (text.indexOf("#karmagivers") == 0) {
			emit.emit("karmagivers", from, to, text);
		} else if (text.indexOf("#karma") == 0) {
			emit.emit("karma", from, to, text);
		} else if (text.indexOf("#stats") == 0) {
			emit.emit("stats", from, to, text);
		} else if (text.indexOf("box install ") == 0) {
			bot.action(to, "giggles");
		} else if (text.indexOf("!") == 0 && text.split(' ').length == 1) {
			emit.emit("cfdocs", from, to, text);
		} else if (text.search(/[:,]\s*\+1/g) !== -1) {
			emit.emit("addkarmaSucceeding", from, to, text);
		} else if (text.search(/^\+1[:,]*\s*\w*/g) !== -1) {
			emit.emit("addkarmaPreceeding", from, to, text);
		} else if (text.slice(-5) === ' over' ){
			bot.say(to, "KSHHHK");
		} else if (text.indexOf("^") === 0 && text.length >= 4 && text.split(' ').length === 1) {
			emit.emit("isup", from, to, text);
		} else if (text.indexOf("gif:") === 0 && text.length >= 5) {
			emit.emit("gifs", from, to, text);
		} else if (text.toLowerCase().indexOf(botName.toLowerCase()) !== -1) {
			emit.emit("mention", from, to, text);
		}
	});
});

//lastseen

function setLastSeen (channel, nick) {
	redis.hset(botName + "." + channel + ".lastseen", nick.toLowerCase(), Date.now());
}

emit.on("lastseen", function(from, to, text) {
	var nick = text.replace("#lastseen", "").trim();

	if (nick.length) {
		redis.hget(botName + "." + to + ".lastseen", nick, function(err, data) {
			if (data !== null) {
				var date = new Date(parseInt(data, 10));
				bot.say(to, "I last saw " + nick + " around " + date.toLocaleString());
			} else {
				bot.say(to, "who? " + nick + "? Never heard of them.");
			}
		});
	} else {
		redis.hgetall(botName + "." + to + ".lastseen", function(err, data){
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

//help

emit.on("help", function(from, to, text) {
	var keyword = text.replace("#help", "").trim();
/*
	bot.say(from, "I am guillbot! Here are the things you can say:");
	bot.say(from, "    #lastseen - will tell you the last people to leave.");
	bot.say(from, "    #lastseen nick - will tell you when that person was last seen.");
	bot.say(from, "    #help - will give you this help message as a private message.");
	bot.say(from, "    +1 nick or nick: +1 - gives karma to user");
	bot.say(from, "    #karma - the karma leaderboard for this channel");
	bot.say(from, "    #karma nick - the karma for that user");
	bot.say(from, "    #karmagivers - the karma giving leaderboard for this channel");
	bot.say(from, "    #karmagivers nick - the karma given by that user");
	bot.say(from, "    #random - pick a random user currently in the chat");
	bot.say(from, "    #stats - show message counts from the room");
	bot.say(from, "    #stats nick - show message counts for that user");
	bot.say(from, "I have been running for " + moment(starttime).fromNow(true));

	isOp(from, function(err, data){
		if (data !== 0) {
			bot.say(from, "OP Commands");
			bot.say(from, "    #ops - get a list of ops.");
			bot.say(from, "    #op nick");
			bot.say(from, "    #deop nick");
			bot.say(from, "    #karma !reset nick");
			bot.say(from, "    #karma !reset - resets all karma stats");
			bot.say(from, "    #karmagivers !reset nick");
			bot.say(from, "    #karmagivers !reset - resets all karma giving stats");
			bot.say(from, "    #stats !reset - resets all statistics");
		}
	});
*/
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


//ops

function intializeOps () {
	var defaultOps = conf.get("ops") || [];
	if (defaultOps.length) {
		_.each(defaultOps, function(item){
			redis.sadd(botName + ".ops", item.toLowerCase());
		});
	}
}

function setOp (nick) {
	redis.sadd(botName + ".ops", nick.toLowerCase());
}

function deOp (nick) {
	redis.srem(botName + ".ops", nick.toLowerCase());
	intializeOps();
}

function isOp (nick, callback) {
	redis.sismember(botName + ".ops", nick.toLowerCase(), callback);
}

function getOps (callback) {
	redis.smembers(botName + ".ops", callback);
}

emit.on("ops", function(from, to, text) {
	getOps(function(err, data){
		if (data.length) {
			bot.say(to, "Ops are currently: " + data.join(", "))
		} else {
			bot.say(to, "I have no ops :(");
		}
	});
});

emit.on("op", function(from, to, text) {
	//make sure the from is an op
	isOp(from, function(err, data){
		if (data == 0) {
			bot.say(to, "You must be an op.")
		} else {
			var nick = text.replace("#op", "").trim();

			if (!nick.length) {
				bot.say(to, "who do you want to op? use #op nick");
			} else {
				isOp(nick, function(err, data){
					if (data == 0) {
						setOp(nick);
						bot.say(to, nick + " is now an op.");
					} else {
						bot.say(to, nick + " is already an op.");
					}
				})
			}
		}
	});
});

emit.on("deop", function(from, to, text) {
	isOp(from, function(err, data){
		if (data == 0) {
			bot.say(to, "You must be an op.")
		} else {
			var nick = text.replace("#deop", "").trim();

			if (!nick.length) {
				bot.say(to, "who do you want to deop? use #deop nick");
			} else {
				isOp(nick, function(err, data){
					if (data == 0) {
						bot.say(to, nick + " isnt an op.");
					} else {
						deOp(nick);
						bot.say(to, nick + " is no longer an op.");
					}
				})
			}
		}
	});
});

//karma

function incrKarma(channel, nick, giver, incrby) {
	redis.hincrby(botName + "." + channel + ".karma", nick.toLowerCase(), incrby);
	redis.hincrby(botName + "." + channel + ".karma_giver", giver.toLowerCase(), incrby);
	setLastKarmaGive(channel, giver);
}

function getKarma(channel, nick, callback) {
	redis.hget(botName + "." + channel + ".karma", nick.toLowerCase(), callback);
}

function getKarmaGives(channel, nick, callback) {
	redis.hget(botName + "." + channel + ".karma_giver", nick.toLowerCase(), callback);
}

function getLeaderboard(channel, callback) {
	redis.hgetall(botName + "." + channel + ".karma", callback);
}

function getGiverLeaderboard(channel, callback) {
	redis.hgetall(botName + "." + channel + ".karma_giver", callback);
}

function resetKarma(channel) {
	redis.del(botName + "." + channel + ".karma");
}

function resetKarmaNick(channel, nick) {
	redis.hset(botName + "." + channel + ".karma", nick.toLowerCase(), 0);
}

function resetKarmaGives(channel) {
	redis.del(botName + "." + channel + ".karma_giver");
}

function resetKarmaGivesNick(channel, nick) {
	redis.hset(botName + "." + channel + ".karma_giver", nick.toLowerCase(), 0);
}

function setLastKarmaGive(channel, giver) {
	redis.hset(botName + "." + channel + ".last_karma_give", giver.toLowerCase(), Date.now());
}

function getLastKarmaGive(channel, giver, callback) {
	redis.hget(botName + "." + channel + ".last_karma_give", giver.toLowerCase(), callback);
}


function addKarma(nick, from, to, text) {
	if (nick.toLowerCase() === from.toLowerCase()) {
		bot.say(to, "You can't give karma to yourself ಠ_ಠ");
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

emit.on("addkarmaPreceeding", function(from, to, text) {
	var nick = text.replace(/\+1[:,]*/g, '').trim().split(' ');
	addKarma(nick[0], from, to, text);
});

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
	redis.hincrby(botName + "." + channel + ".messageCount", channel, 1);
	redis.hincrby(botName + "." + channel + ".messageCount", nick.toLowerCase(), 1);
}

function getChannelMessageCount(channel, callback) {
	redis.hget(botName + "." + channel + ".messageCount", channel, callback);
}

function getNickMessageCount(channel, nick, callback) {
	redis.hget(botName + "." + channel + ".messageCount", nick.toLowerCase(), callback);
}

function getMessageCountLeaderboard(channel, callback) {
	redis.hgetall(botName + "." + channel + ".messageCount", callback);
}

function resetStats(channel) {
	redis.del(botName + "." + channel + ".messageCount");
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

//cfdocs

function docs(channel, q){
	q = q.toLowerCase();

	if (q === "cfclient"){
		return bot.say(channel, '<cfclient></cfclient> → returns a pink slip, because if you use this shit you should be fired. ~ http://www.codecademy.com/en/tracks/javascript');
	}

	if (q === "cf_socialplugin"){
		return bot.say(channel, "<cf_socialplugin .. /> → returns a bunch of outdated junk that would have been better as a community project dear god what have we done we should have just given them a package manager like they've been asking for for years ~ http://cfdocs.org/cf_socialplugin");
	}

	cfdocs( q, function(err, result){
		if (err !== null){
			bot.say(channel, err );
		}else{
			if (result.type === "tag"){
				var msg = result.syntax + ' → ' + result.description.replace(/\s+/g, ' ') + ' ~ http://cfdocs.org/' + q;
			}else{
				var msg = result.syntax + ' → returns ' + ( result.returns.length ? result.returns : ' nothing' ) + ' ~ http://cfdocs.org/' + q;
			}
			bot.say(channel, msg );
		}
	});

}

emit.on("cfdocs", function(from, to, text) {
	log("cfdocs", from, to, text);
	return docs(to, text.slice(1));
});

//mention

var zoidisms = [
	  'Woohoo!'
	, 'This is crap people will use every freaking day'
	, 'Really?!'
	, 'Hi!'
	, 'People are freaking ridiculous'
	, 'awwww'
	, 'suck it'
	, 'idiots... they\'re all idiots...'
	, 'tough shit!'
	, 'let\'s do it {from}'
	, 'ok I\'m done'
	, 'He\'s a Wizard'
	, 'the giants'
	, 'occupy me {from}'
];

function randomZoidism(from){
	return zoidisms[Math.floor(Math.random() * zoidisms.length)].split("{from}").join(from);
}

emit.on("mention", function(from, to, text){
	log("mention", from, to, text);
	bot.say(to, randomZoidism(from));
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

//gifs

emit.on("gifs", function(from, to, text){
	gifs(text.substr(4), function(err, url){
		if (err){
			bot.say(to, err);
		}else{
			bot.say(to, url);
		}
	});
});

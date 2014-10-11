/* global module,require */
'use strict';

var _ = require("lodash");
var events = require("events");
var emit = new events.EventEmitter();

module.exports = (function(){

	var bot,
		redis,
		log,
        conf;

	emit.on("addKarmaSucceeding", function(from, to, text) {
		var nick = text.replace(/[:,]\s*\+1/g, '').trim();
		addKarma(nick, from, to, text);
	});

	emit.on("addKarmaPreceding", function(from, to, text) {
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

	emit.on("karmaGivers", function(from, to, text){
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
		} else if (!allowedKarma(nick.toLowerCase())) {
			bot.say(to, "You can't give karma to " + nick.toLowerCase() + ".");
		} else {
			if (!bot.isCurrentlyOnline(to, nick)) {
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

    return function init (_bot){
		bot = _bot;
		log = bot.log;
        conf = bot.conf;
        redis = bot.redis;


		bot.on( 'message#', function (from, to, text){
            if (text.search(/[:,]\s*\+1/g) !== -1) {
			 	emit.emit("addKarmaSucceeding", from, to, text);
			} else if (text.search(/^\+1[:,]*\s*\w*/g) !== -1) {
			 	emit.emit("addKarmaPreceding", from, to, text);
			} else if (text.indexOf("#karmagivers") == 0) {
			 	emit.emit("karmaGivers", from, to, text);
			} else if (text.indexOf("#karma") == 0) {
			 	emit.emit("karma", from, to, text);
			}
		});
	};

	

})();

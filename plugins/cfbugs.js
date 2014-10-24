'use strict';

module.exports = (function(){

	var feed = require( 'feed-read' );
	var _ = require( 'lodash' );
	var bot;
	var frequency = 1000 * 60 * 15; //every 15 minutes
	var url = 'http://cfn.cfuser.com/feeds/cfbugs.cfm';

	return function init( _bot ){
		bot = _bot;

		bot.on( 'message#', function( from, to, text ){
			if ( text === '#cfbugs !poll' ){
				pollFeed();
			}else if ( text === '#cfbugs !init' ){
				bot.ops.isOp( from, function( err, data ){
					if ( err ){
						return bot.say( to, 'Error determinging your OPS status. Oops.');
					}
					if ( data === 0 ){
						return bot.say( to, 'You must be an op to do that, ' + from );
					}
					pollFeed( true );
					bot.say( to, 'Good to go, ' + from );
				});
			}
		});

		setInterval( pollFeed, frequency );
	};

	function pollFeed( quietly ){
		quietly = quietly || false;
		feed( url, function( err, articles ){
			_.each( articles, function( article ){
				var chunks = article.link.split( '=' );
				var bugId = parseInt( chunks[ chunks.length-1 ], 10 );
				notify( bugId, article, quietly );
			});
		});
	}

	function notify( bugId, article, quietly ){
		quietly = quietly || false;
		bot.redis.sismember( 'cfbugs.seen', bugId, function( err, data ){
			if ( err ){
				return bot.say( '#zoidbox', 'CFBugs plugin error' );
			}
			if ( data === 0 ){ //haven't posted about this one yet, share it
				if ( !quietly ){
					bot.say( '#zoidbox', article.title + ' ~ ' + article.link );
				}
				bot.redis.sadd( 'cfbugs.seen', bugId );
			}else{
				//skip notification, we've already posted about this one
				console.log( 'skipping %s, shared it already', bugId );
			}
		});
	}

}());


/*

var slackConfig = {
	domain: 'countermarch'
	,token: 'iMox7hCGEsQPdXqnAd8fhGFT'
};

/*
		Define some RSS feeds. All fields are required.
		- url: duh
		- frequencyInMinutes: number of minutes (or a fraction, if you want sub-minute polling*)
		- hipchat: {
			- roomId: integer room id in which you want new feed posts linked.
							Get a list of your rooms here: http://api.hipchat.com/v1/rooms/list?format=json&auth_token={YOUR-AUTH-TOKEN}
			- postColor: one of ['yellow', 'red', 'green', 'purple', 'gray', 'random']
			- postByName: Any string, shows up as the poster name. 1-15 characters.
			- notify: Whether or not this message should trigger a notification for people in the room (change the tab color, play a sound, etc).
							Each recipient's notification preferences are taken into account.
		}

		* I only recommend sub-minute polling when you own the RSS feed/server being polled. Hitting
				someone else's server that rapidly is kind of a jerk move.
* /
// DEV ROOM ID: 148903
var feeds = [
	{
		url: 'http://fusiongrokker.com/buglog/hq/index.cfm?event=rss&username=rss&password=etech'
		,frequencyInMinutes: 1/6
		,slack: {
			channel: '#adam'
			,name: 'BugLogHQ'
		}
	}
	,{
		url: 'http://buglog.alumnione.com/hq/index.cfm?event=rss&username=rss&password=etech'
		,frequencyInMinutes: 1/6
		,slack: {
			channel: '#ops'
			,name: 'BugLogHQ'
		}
	}
	,{
		url: 'http://feeds2.feedburner.com/FusionGrokker/'
		,frequencyInMinutes: 30
		,slack: {
			channel: '#general'
			,name: 'FusionGrokker.com'
		}
	}
	,{
		url: 'http://blog.countermarch.com/feeds/rss.cfm'
		,frequencyInMinutes: 30
		,slack: {
			channel: '#general'
			,name: 'CounterMarch.com'
		}
	}
	,{
		url: 'http://rss.uptimerobot.com/u6690-880e936bed7dbdf7d55f2a05917386fb'
		,frequencyInMinutes: 5
		,slack: {
			channel: '#ops'
			,name: 'Uptime Robot'
		}
	}
	,{
		url: 'http://phonegap.com/rss.xml'
		,frequencyInMinutes: 30
		,slack: {
			channel: '#general'
			,name: 'PhoneGap Blog'
		}
	}
	,{
		url: 'http://blog.trello.com/feed/'
		,frequencyInMinutes: 30
		,slack: {
			channel: '#general'
			,name: 'Trello Blog'
		}
	}
];

var rss = require('feedparser')
	,redis = require('redis')
	,url = require('url')
	,Slack = require('node-slack')
	,redisclient, workers = [];

var delayMultiplier = 60 * 1000; //used to convert minutes into milliseconds


//connect to Redis -- default to local instance for dev
if (process.env.REDISTOGO_URL){
	var rtg   = url.parse(process.env.REDISTOGO_URL);
	redisclient = redis.createClient(rtg.port, rtg.hostname);
	redisclient.auth(rtg.auth.split(":")[1]);
}else{
	redisclient = redis.createClient();
}

//connect to slack!
var slack = new Slack(slackConfig.domain, slackConfig.token);

var onArticle = function(article, options) {
	doIfNotNagged( article.link, function(){
		var msg = getMessage( article );
		console.log('NAGGING: %s', article.link.substr(0,35));
		slack.send({
			text: msg
			,channel: options.channel
			,username: options.name
		}
		,function(err, resp){
			if (err) {
				return console.error(err)
			}
			markArticleNagged( article.link );
		});
	});
};

var markArticleNagged = function(id) {
	redisclient.set( id, 'true' );
};

var doIfNotNagged = function(id, cb){
	redisclient.get( id, function(err, data){
		if (data === null) cb();
		return;
	});
};

var getMessage = function( article ){
	var decodedDesc = article.description.replace(/&lt;/gi, "<");
	var app = decodedDesc.match(/Application:<\/b><\/td>\s+<td>([^<]+)<\/td>/);
	app = (app) ? app[1] : null;

	return (app ? "[App: "+app+"] " : "") + "<" + article.link + "|" + article.title + ">";
};

//then schedule it every few minutes
for (ix in feeds){
	var feed = feeds[ix];
	setupPoller(feed.url, feed.frequencyInMinutes, feed.slack);
}

function setupPoller(url, freq, conf){

	var worker = eval(
		"(function(){ console.log('polling: "
		+ url
		+ "'); rss.parseUrl('"
		+ url
		+ "').on('article', function(a){ onArticle(a, "
		+ JSON.stringify(conf)
		+ "); })});");

	setInterval(
		worker
		,freq * delayMultiplier
	);

	worker();
}

*/

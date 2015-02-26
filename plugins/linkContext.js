'use strict';

module.exports = (function(){
	var _ = require('lodash');
	var request = require('request');
	var bot;

	return function init( _bot) {
		bot = _bot;

		bot.on('message', function(from, to, text) {
			if (bot.isChannelPaused(to)) return;

			if (to === bot.botName) {
				//they are talking to us in a private message, set to to be from
				to = from;
			}

			var results = /https:\/\/bitbucket.org\/[\w-]*\/[\w-]*\/issue\/\d*\/?[\w-]*/g.exec(text);
			if (!_.isNull(results) && results.length) {
				return getInfoForBitbucketIssue(to, results[0]);
			}
			results = /https:\/\/github.com\/[\w-]*\/[\w-]*\/issues\/\d*\/?[\w-]*/g.exec(text);
			if (!_.isNull(results) && results.length) {
				return getInfoForGithubIssue(to, results[0]);
			}
		});
	};

	function getInfoForBitbucketIssue (channel, link) {
		var parts = link.split('/');
		var url = 'https://bitbucket.org/api/1.0/repositories/{user}/{repo}/issues/{issueID}';
		url = url.replace('{user}', parts[3]);
		url = url.replace('{repo}', parts[4]);
		url = url.replace('{issueID}', parts[6]);

		request(url, function (err, response, body) {
			if (err) {
				console.error(err);
				return bot.say(bot.testingChannel, 'There was a problem with the request for bitbucket issue: ' + err + '; apiURL: '+ url);
			} else if (response.statusCode === 200) {
				try {
					var issue = JSON.parse(body);
					var message = _.capitalize(parts[4]) + ' Issue: ' + _.capitalize(issue.status) + ' `' + _.capitalize(issue.priority) + '` ' + _.capitalize(issue.metadata.kind) + ': ' + issue.title;

					return  bot.say(channel, message);
				} catch (e) {
					console.error('Error parsing JSON response from ' + url);
					return bot.say(bot.testingChannel, 'There was a problem parsing the bitbucket issues JSON response: ' + url);
				}
			} else if (response.statusCode === 404) {
				return bot.say(bot.testingChannel, 'Could not find bitbucket issue: '+ url);
			} else {
				console.error(err);
				return bot.say(bot.testingChannel, 'There was a problem with the request for bitbucket issue: ' + err + '; apiURL: '+ url);
			}
		});
	}

	function getInfoForGithubIssue (channel, link) {
		var parts = link.split('/');
		var url = 'https://api.github.com/repos/{user}/{repo}/issues/{issueID}';
		url = url.replace('{user}', parts[3]);
		url = url.replace('{repo}', parts[4]);
		url = url.replace('{issueID}', parts[6]);

		request({url: url, headers:{'user-agent': 'https://github.com/atuttle/zoidbox'}}, function (err, response, body) {
			if (err) {
				console.error(err);
				return bot.say(bot.testingChannel, 'There was a problem with the request for github issue: ' + err + '; apiURL: '+ url);
			} else if (response.statusCode === 200) {
				try {
					var issue = JSON.parse(body);
					var labels = _.reduce(issue.labels, function(acc, item, index) {
						if (index > 0) {
							acc += ', ';
						}
						return acc + item.name;
					}, '');
					labels = labels.trim();
					if (labels.length) {
						labels = ' [' + labels + ']';
					}

					var message = _.capitalize(parts[4]) + ' ' + _.capitalize(issue.state) + ' Issue: ' + issue.title + labels;

					return  bot.say(channel, message);
				} catch (e) {
					console.error('Error parsing JSON response from ' + url);
					return bot.say(bot.testingChannel, 'There was a problem parsing the github issues JSON response: ' + url);
				}
			} else if (response.statusCode === 404) {
				return bot.say(bot.testingChannel, 'Could not find github issue: '+ url);
			} else {
				console.error(err);
				return bot.say(bot.testingChannel, 'There was a problem with the request for github issue: ' + err + '; apiURL: '+ url);
			}
		});
	}
})();
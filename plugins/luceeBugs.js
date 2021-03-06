'use strict';

module.exports = (function(){
	var _ = require('lodash');
	var request = require('request');
	var openIssuesApiURL = 'https://luceeserver.atlassian.net/rest/api/2/search?jql=project%20in%20(LDEV%2C%20LD)%20ORDER%20BY%20createdDate';
	var issueApiURL = 'https://luceeserver.atlassian.net/rest/api/2/issue/{issueID}';
	var bot;
	var frequency = 1000 * 60 * 15; //15 minutes
	var redis;
	var onErrorDebounce = _.debounce(onError, 60 * 1000, {'leading': true, 'trailing': false});

	return function init( _bot) {
		bot = _bot;
		redis = bot.redis;

		bot.on('message', function(from, to, text, message) {
			if (bot.isChannelPaused(to)) return;

			if (to === bot.botName) {
				//they are talking to us in a private message, set to to be from
				to = from;
			}

			var parts = text.split(' ');
			if (_.contains(['#luceebugs','#luceebug','#luceeissues','#luceeissue','#lucee'], parts[0]) && parts.length > 1) {
				switch (parts[1].trim()) {
					case '!poll' :
						checkForIssues();
						break;
					case '!init' :
						bot.ops.isOp(message.user, function(err, data) {
							if (err) return bot.say(to, 'Error determining your OPS status.');
							if (data === 0) return bot.say(to, 'You must be an op to do that.');
							checkForIssues(true);
							return bot.say(to, 'Init complete');
						});
						break;

					default :
						if (!isNaN(_.parseInt(parts[1].trim()))) {
							getIssue(to, parts[1].trim());
						}
						break;
				}
			}
		});

		setInterval(checkForIssues, frequency);
	};

	function checkForIssues (quietly) {
		quietly = quietly || false;

		bot.log('Checking for latest lucee issues');

		request(openIssuesApiURL, function(err, response, body) {
			if (err) {
				console.error(err);
				return bot.say(bot.testingChannel, 'There was a problem with the request for lucee issues: ' + err + '; apiURL: '+ openIssuesApiURL);
			} else if (response.statusCode === 200) {
				try {
					var data = JSON.parse(body);

					_.each(data.issues, function(issue) {
						notify(issue.key, issue.fields.summary, issue.fields.issuetype.name, issue.fields.priority.name, issue.fields.status.name, quietly);
					});

				} catch (e) {
					console.error('Error parsing JSON response from ' + openIssuesApiURL);
					return bot.say(bot.testingChannel, 'There was a problem parsing the lucee issues JSON response: ' + openIssuesApiURL);
				}
			} else if (response.statusCode === 404) {
				return bot.say(bot.testingChannel, 'Could not find lucee issue list: '+ openIssuesApiURL);
			}
		});
	}

	function getIssue (channel, issueID) {
		var url = issueApiURL.replace('{issueID}', issueID);
		request(url, function (err, response, body) {
			if (err) {
				console.error(err);
				return bot.say(channel, 'There was a problem with the request for lucee issue: ' + err + '; apiURL: '+ url);
			} else if (response.statusCode === 200) {
				try {
					var issue = JSON.parse(body);
					return  bot.say(channel, formatMessage(issue.key, issue.fields.summary, issue.fields.issuetype.name, issue.fields.priority.name, issue.fields.status.name));
				} catch (e) {
					console.error('Error parsing JSON response from ' + url);
					return bot.say(channel, 'There was a problem parsing the lucee issues JSON response: ' + url);
				}
			} else if (response.statusCode === 404) {
				return bot.say(channel, 'Could not find lucee issue: '+ url);
			}
		});
	}

	function notify (issueID, title, issueType, priority, status, quietly) {
		quietly = quietly || false;

		redis.sismember('lucee_issues.seen', issueID, function(err, data){
			if (err) {
				console.error(err);
				return onErrorDebounce('checking lucee_issues.seen', err);
			}
			if (data === 0) {
				if (!quietly) {
					var message = formatMessage(issueID, title, issueType, priority, status);
					bot.say(bot.testingChannel, message);
					_.each(bot.channels, function(channel){
						if (channel !== bot.testingChannel) {
							bot.say(channel, message);
						}
					});
				}
				redis.sadd('lucee_issues.seen', issueID);
			} else {
				bot.log('skipping lucee issue ' + issueID + ', previously seen');
			}
		});
	}

	function formatMessage(issueID, title, issueType, priority, status, includeLink) {
		if (_.isUndefined(includeLink)) {
			includeLink = true;
		}
		var message = 'LUCEE ISSUE: ' + _.capitalize(status) + ' `' + _.capitalize(priority) + '` ' + _.capitalize(issueType) + ': ' + title;
		if (includeLink) {
			message += ' ~ https://luceeserver.atlassian.net/browse/' + issueID.toString();
		}
		return message;
	}

	function onError (msg, err) {
		bot.say(bot.testingChannel, 'lucee issues plugin error ~ ' + msg + ' : ' + err);
	}

})();
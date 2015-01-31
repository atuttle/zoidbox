'use strict';

module.exports = (function(){
    var _ = require('lodash');
    var request = require('request');
    var apiURL = 'https://bitbucket.org/api/1.0/repositories/lucee/lucee/issues?status=open&status=new';
    var bot;
    var frequency = 1000 * 60 * 15; //15 minutes
    var redis;

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
            if (parts[0] === '#luceebugs' && parts.length > 1) {
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
                    //todo: add a way to say #luceebugs 5 to show issue 5 //#oneofthesedays
                }
            }

        });

        setInterval(checkForIssues, frequency);
    };

    function checkForIssues (quietly) {
        quietly = quietly || false;

        bot.log('Checking for latest lucee issues');

        request(apiURL, function(err, response, body) {
            if (!err && response.statusCode === 200) {
                try {
                    var data = JSON.parse(body);

                    _.each(data.issues, function(issue) {
                        notify(issue.local_id, issue.title, issue.metadata.kind, issue.priority, quietly);
                    });

                } catch (e) {
                    console.error('Error parsing JSON response from ' + apiURL);
                    return bot.say(bot.testingChannel, 'There was a problem parsing the lucee issues JSON response: ' + apiURL);
                }
            } else {
                console.error(err);
                return bot.say(bot.testingChannel, 'There was a problem with the request for lucee issues: ' + err + '; apiURL: '+ apiURL);
            }
        });

    }

    function notify (issueID, title, issueType, priority, quietly) {
        quietly = quietly || false;

        redis.sismember('lucee_issues.seen', issueID, function(err, data){
            if (err) return bot.say(bot.testingChannel, 'lucee issues plugin error ~ checking lucee_issues.seen: ' + err);
            if (data === 0) {
                if (!quietly) {
                    var message = 'New `' + priority + '` http://luc.ee ' + issueType + ': ' + title + ' ~ ' + 'https://bitbucket.org/lucee/lucee/issue/' + issueID.toString();
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

})();
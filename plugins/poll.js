/* global module,require */
'use strict';

var _ = require('lodash');
var events = require('events');
var emit = new events.EventEmitter();
var moment = require('moment');

module.exports = (function() {

	var bot,
		redis,
		log,
		conf;

	var defaultState = {
		isPollOpen: false,
		pollOpenTime: 0,
		pollOpenDuration: 0,
		allowMultipleVotes: false,
		pmOnly: false,
		question: '',
		answers: [],
		votes: []
	},
	state = {};

	function letterForIndex (index) {
		return String.fromCharCode(65 + index);
	}

	function indexForLetter (letter) {
		return letter.toUpperCase().charCodeAt(0) - 65;
	}

	function isValidQuestion () {
		return !(state.question.trim().length === 0 || state.answers.length <= 1);
	}

	function getQuestionDisplay () {
		return 'Question: `' + state.question + '` Options: ' + _.reduce(state.answers, function(acc, item, index) {
			return acc += letterForIndex(index) + ': `' + item.value + '` ';
		}, '');
	}

	function getWinner () {
		var talliedVotes = _.reduce(state.votes, function(acc, item) {
			if (_.has(acc, item.letter)) {
				acc[item.letter]++;
			} else {
				acc[item.letter] = 1;
			}

			return acc;
		}, {});

		var maxVotesLetter = _.reduce(talliedVotes, function(acc, item, key, list){
			if (list[key] > (list[acc] || 0) ) {
				return key;
			}
			return acc;
		}, 'A');

		return {letter: maxVotesLetter, answer: state.answers[indexForLetter(maxVotesLetter)].value, votes: talliedVotes[maxVotesLetter] || 0, talliedVotes: talliedVotes, totalVotes: state.votes.length};

	}

	function getResultsDisplay () {
		var winner = getWinner();

		function getVotesForLetter (letter) {
			return winner.talliedVotes[letter] || 0;
		}

		//todo: handle ties
		//todo: handle no votes

		var out = '';

		if (state.isPollOpen) {
			out += 'The current leader is ';
		} else {
			out += 'The winner is ';
		}

		out += winner.letter + ': `' + winner.answer + '` with ' + winner.votes + ' vote' + (winner.votes !== 1 ? 's' : '') + '! ';

		if (state.isPollOpen) {
			out += 'Poll has been open for ';
		} else {
			out += 'Poll was open for ';
		}

		out += getPollOpenDuration() + '. ~ ' + getVoterCount() + '\n';

		return out + 'Question: `' + state.question + '` Options: ' + _.reduce(state.answers, function(acc, item) {
			return acc += item.letter + ': `' + item.value + '` (' + getVotesForLetter(item.letter) + ' vote' + (getVotesForLetter(item.letter) !== 1 ? 's' : '') + ') ';
		}, '');
	}

	function getVoteInstructions () {
		if (state.pmOnly) {
			return 'Use /msg ' + bot.botName + ' #poll {answer letter}';
		} else {
			return 'Use #poll {answer letter} ~ You can also vote through PM.';
		}
	}

	function getVoterCount () {
		return state.votes.length + ' vote' + (state.votes.length !== 1 ? 's' : '') + ' cast.';
	}

	function getPollStatus () {
		var out = (state.isPollOpen ? 'Poll Open! ' : 'Poll Closed. ') + (isValidQuestion() ? getQuestionDisplay() + ' ~ ' + getVoterCount() : '') + ' ';
		return out += (state.isPollOpen ? getVoteInstructions() : ' ');
	}

	function parseCommand (args) {

		function parse (args) {
			return _.reduce(args, function(acc, item){
				var singleQuotePos = item.indexOf('\'');
				var doubleQuotePos = item.indexOf('"');
				var openBracketPos = item.indexOf('[');
				var closeBracketPos = item.indexOf(']');

				if (acc.inSingleQuote || acc.inDoubleQuotes || acc.inBrackets) {
					acc.output[acc.output.length - 1] += ' ' + item;
				} else {
					acc.output.push(item);
				}

				if (acc.inSingleQuote) {

					if (singleQuotePos !== -1) {
						//we found the second match
						acc.inSingleQuote = false;
					}
				} else if (singleQuotePos !== -1) {
					//we found a start single quote
					var singleQuotePos2 = item.indexOf('\'', singleQuotePos+1);

					if (singleQuotePos2 === -1) {
						acc.inSingleQuote = true;
					}
				}

				if (acc.inDoubleQuotes) {

					if (doubleQuotePos !== -1) {
						//we found the second match
						acc.inDoubleQuotes = false;
					}
				} else if (doubleQuotePos !== -1) {
					//we found a start double quote
					var doubleQuotePos2 = item.indexOf('\"', doubleQuotePos+1);

					if (doubleQuotePos2 === -1) {
						acc.inDoubleQuotes = true;
					}
				}

				if (acc.inBrackets) {

					if (closeBracketPos !== -1) {
						acc.inBrackets = false;
					}
				} else if (openBracketPos !== -1) {

					if (closeBracketPos < openBracketPos) {
						acc.inBrackets = true;
					}
				}
				return acc;

			}, {output:[], inSingleQuote:false, inDoubleQuotes: false, inBrackets:false});
		}

		var arr = parse(args).output;

		return _.map(arr, function(item) {
			try {
				return JSON.parse(item);
			} catch (e) {
				return item;
			}
		});
	}

	function openPoll () {
		state.isPollOpen = true;
		state.pollOpenTime = new Date().getTime();
		state.pollOpenDuration = 0;
	}

	function closePoll () {
		state.isPollOpen = false;
		state.pollOpenDuration += new Date().getTime() - state.pollOpenTime;
		state.pollOpenTime = 0;
	}

	function getPollOpenDuration () {
		var duration = state.pollOpenDuration;
		if (state.isPollOpen) {
			duration += new Date().getTime() - state.pollOpenTime;
		}
		return moment.duration(duration).humanize();
	}

	emit.on('pollCreate', function(from, to, text) {

		if (isValidQuestion()) {
			return bot.say(to, 'There is already a poll created ~ use #poll -reset to clear current poll first.');
		}

		/*
		* expect:
		* [0] #poll
		* [1] -create
		* [2] question
		* [3] -options
		* [4] options array
		* */

		var command = parseCommand(text.trim().split(' '));

		function returnParseError(errorCode) {
			return bot.say(to, 'Invalid command. Please use the format: #poll -create {question} -options ["option A", "option B"] - please use double quotes.  errorCode: ' + errorCode);
		}

		if (command[0] !== '#poll') {
			returnParseError('1');
			return;
		} else if (command[1] !== '-create') {
			returnParseError('2');
			return;
		} else if (command[3] !== '-options') {
			returnParseError('3');
			return;
		} else if (!_.isArray(command[4]) || command[4].length <= 1) {
			returnParseError('4');
			return;
		}

		state.question = command[2];
		state.answers = _.map(command[4], function(item, index) { return {index: index, letter:letterForIndex(index), value: item};});

		if (_.any(command, function(item) {return _.isString(item) && item.toLowerCase() === '-allowmultiplevotes';})) {
			state.allowMultipleVotes = true;
		}

		if (_.any(command, function(item) {return _.isString(item) && item.toLowerCase() === '-pmonly';})) {
			state.pmOnly = true;
		}

		if (_.any(command, function(item) {return item === '-open';})) {
			openPoll();

			return bot.say(to, getPollStatus());
		} else {
			return bot.say(to, 'Poll created; Use #poll -open to start!');
		}

 	});

	emit.on('pollOpen', function(from, to) {
		if (!isValidQuestion()) {
			return bot.say(to, 'Not ready to open.  Use #poll -create to set the question up first.  See #help for more info.');
		}

		openPoll();

		bot.say(to, getPollStatus());
	});

	emit.on('pollStatus', function(from, to) {
		bot.say(to, getPollStatus());
	});

	emit.on('pollClose', function(from, to) {
		if (!state.isPollOpen) {
			return bot.say(to, 'Poll isn`t open...');
		}

		closePoll();
		bot.say(to, getResultsDisplay());
	});

	emit.on('pollResults', function(from, to) {
		bot.say(to, getResultsDisplay());
	});

	emit.on('pollCheck', function(from, to) {
		bot.say(to, getPollStatus());
	});

	emit.on('pollReset', function(from, to) {
		state = _.cloneDeep(defaultState);
		bot.say(to, 'Poll reset.');
	});

	emit.on('pollClear', function(from, to) {
		state.votes = [];
		bot.say(to, 'All Poll results cleared.');
	});

	emit.on('pollVote', function(from, to, text, message, isPrivateMessage) {

		function voteTakenResponse(from) {
			return _.sample([
				'Vote taken! Thank you ' + from + '!',
				'I`ve got your vote ' + from,
				'Really ' + from + '? Ok...',
				'Your voice has been heard ' + from,
				from + ' I have your vote down',
				'Thank you for voting ' + from
			]);
		}

		if (state.pmOnly && !isPrivateMessage) {
			return bot.say(from, 'Sorry ' + from + ', I am only accepting votes through PM. ' + getVoteInstructions());
		}

		if (!state.isPollOpen) {
			return bot.say(to, 'Poll is currently closed.  Sorry.');
		}

		var previousVotes = _.filter(state.votes, function(item){
				return item.voter === from;
			});

		//see if they have already voted
		if (previousVotes.length && !state.allowMultipleVotes) {
			return bot.say(to, 'Sorry ' + from + ', I already have your vote.');
		}

		function isDuplicateVote (voteLetter) {
			return previousVotes.length && _.any(previousVotes, function(item) { return item.letter === voteLetter;});
		}

		//see if the vote given is an option letter
		var command = text.toLowerCase().replace('#poll', '').trim();

		if (command.length ===1) {
			var index = indexForLetter(command);
			if (_.any(state.answers, function (item) {
					return item.index === index;
				})) {
				if (!isDuplicateVote(letterForIndex(index))) {
					state.votes.push({voter: from, index: index, letter: letterForIndex(index)});
					return bot.say(to, voteTakenResponse(from));
				} else {
					return bot.say(to, 'I already have that vote from you ' + from + ' - you can vote again but not for the same option.');
				}
			}
		}

		//ok, it wasn't one of the option letters, lets see if it was one of the options explicitly
		var matchedOption = _.find(state.answers, function (item) {
			return item.value.toLowerCase().trim() === command.toLowerCase().trim();
		});

		if (!_.isUndefined(matchedOption)) {
			if (!isDuplicateVote(matchedOption.letter)) {
				state.votes.push({voter: from, index: matchedOption.index, letter: matchedOption.letter});
				return bot.say(to, voteTakenResponse(from));
			} else {
				return bot.say(to, 'I already have that vote from you ' + from + ' - you can vote again but not for the same option.');
			}
		}

		return bot.say(to, 'Sorry ' + from + ', I didn`t understand that.  Please reply with #poll {Answer Letter}.  Use #poll to see the question and possible answers.');
	});

    return function init (_bot) {
		bot = _bot;
		log = bot.log;
		conf = bot.conf;
		redis = bot.redis;

	    state = _.cloneDeep(defaultState);

	    bot.on( 'message', function (from, to, text, message){

			if (bot.isChannelPaused(to)) return;

            var isPrivateMessage = false;

			if (to === bot.botName) {
			    //they are talking to us in a private message, set to to be from
			    to = from;
                isPrivateMessage = true;
			}

            if (text.indexOf('#poll') === 0) {

                var parts = text.trim().split(' ');

                if (parts.length > 1) {

                    switch (parts[1].trim()) {
	                    case '-create' :
							emit.emit('pollCreate', from, to, text, message, isPrivateMessage);
		                    break;
	                    case '-open' :
							emit.emit('pollOpen', from, to, text, message, isPrivateMessage);
		                    break;
	                    case '-status' :
							emit.emit('pollStatus', from, to, text, message, isPrivateMessage);
		                    break;
	                    case '-close' :
							emit.emit('pollClose', from, to, text, message, isPrivateMessage);
		                    break;
	                    case '-results' :
	                    case '-peek' :
							emit.emit('pollResults', from, to, text, message, isPrivateMessage);
		                    break;
	                    case '-reset' :
							emit.emit('pollReset', from, to, text, message, isPrivateMessage);
		                    break;
	                    case '-clear' :
							emit.emit('pollClear', from, to, text, message, isPrivateMessage);
		                    break;
	                    default : //they have said #poll [something], assume they are trying to vote
		                    emit.emit('pollVote', from, to, text, message, isPrivateMessage);
		                    break;
                    }
                } else {
                    emit.emit('pollCheck', from, to, text, message, isPrivateMessage);
                }
            }

		});
	};

})();

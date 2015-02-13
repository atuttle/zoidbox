# ZoidBox

An IRC bot that (attempts to) bring the knowledge and wit of @boyzoid to ##coldfusion on freenode.

Pull requests welcome!

## Documentation

Run `#help` in a chat room with zoidbox to be sent a link to the [documentation](https://github.com/atuttle/zoidbox/blob/master/help.md). There's also [ops documentation](https://github.com/atuttle/zoidbox/blob/master/opshelp.md).

## Pull Requests Encouraged!

New commands can be added in the form of a plugin: a `.js` file in the `plugins/` folder. Look at other plugins for examples of how to design them.

**Please use JSHint! JSHint options have been set in `.jshintrc`**

## Developing

You'll need to run redis locally (or otherwise have access to a non-zoidbox-production Redis instance) to run zoidbox on your local machine. Default port of 6379 is fine (you can modify this in your `lib/config.user.json`).

If you want to change something in `lib/config.json` (e.g. the bot's IRC username) for your own testing purposes, copy `lib/config.json` to `lib/config.user.json` and modify it to your heart's content. This file is excluded from the repo, and if it exists (e.g. if you create it), zoidbox will use it instead of `lib/config.json`.

## License

>The MIT License (MIT)
>
>Copyright (c) 2014 Adam Tuttle and Contributors
>
>Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
>
>The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
>
>THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

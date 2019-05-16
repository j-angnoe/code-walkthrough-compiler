# Walkthrough Compiler

Instead of writing your code and documentation separately,
you write your code inside the documentation. You take the 
reader by the hand an implement the code as you tell the story
of what the sofware should do...

This is a fun experiment.

This document you are currently reading  contains the entire source for 
the walkthrough compiler, i'm telling the story, and the compiler will 
compile the walkthrough compiler from it :-).

There's actually a name for this, it's called Literate programming,
I'll expand on the literate programming in [this document](on-literate-programming.md)

For mobile users: Go here to see the <a href="src/index.md">full text</a>

## Why
Code is perfect for instructing computers but a less ideal medium for transmitting
knowledge, in my experience. I think a compelling story is more effective for
transmitting key ideas and subtle considerations that just seeing the code (especially code
without comments). Our future selves and future collegues will thank us. 

Why Javascript: No real reason. I'm fairly comfortable with javascript. But. This being a 
narrative on how to write a walkthrough compiler it's fairly straigh forward to 
port this to any language, one of the benefits of this form of writing a program i guess.

## Installation
Via repo:
- Requirements: node (8+), npm
- Clone this repository
- run `npm link` or create a symlink `ln -s ./build/bin/wlkc /usr/local/bin/wlkc` to make wlkc available
  on your system.
- See that it works.

Via npm:
- npm install -g walkthrough-compiler

## How it works
You write the documentation and the code of your program, in a markdown file.
The walkthrough compiler will extract the markdown codeblocks and writes them 
to disk. After the compiler is done, your program is ready. 

## Example:

Markdown syntax:

<pre>
\`\`\`[type] \<\< [filename] \>\> [options]
    content for document here.
\`\`\`
</pre>
Please note: GFM Doesnt render the filename and options
so i might want to change this. You may want to check the Raw source of this 
document to get the full picture.

```php \
// << examples/my-first-program.php >>
<?php
    echo "Hello world";
```

When you run the compiler, it will write this file to disk.

Later on, we may add to this file, using the --append option:

```php \
// << examples/my-first-program.php >>+=
    echo "This is added";
```

You may focus on a specific block of code and use it in a file later on.

```php \
// << #php-example-code >>
    for ($i=0;$i<10;$i++) {
        echo "Number $i\n";
    }
```

Now we reuse it in our example file with the special code \<\< [id] \>\>. This
is the default behaviour. To prevent the compiler from touching it, you may
supply `--dont-interpret`

```php \
// << examples/my-first-program.php >>+= 

<<#php-example-code>>
```

## implementing the walkthrough compiler:

### Overview

Step one: The standalone compiler. It will be a program executed
from terminal. It will receive an file (entrypoint) as argument.
It may also receive a directory to output in.

```js \
// << # Program options >>=
    var yargs = require('yargs');

    yargs.option('output', {
        alias: 'o',
        describe: 'directory to output to'
    });

    yargs.option('verbose', {
        alias: 'v',
        describe: 'More verbose output'
    })
    yargs.option('debug', {
        describe: 'Output full context'
    })
    yargs.option('dryrun', {
        describe: 'Check results without modifying filesystem.'
    });

    << #More program options >>
    
    var argv = yargs.argv

    
    var source_file = argv._[0];    

    VERBOSE = argv.verbose;
    DEBUG = argv.debug;

    if (!source_file) {
        throw new Error('Please supply a source file as argument');
    }
    
    var output_directory = argv.output || path.join(path.dirname(source_file), 'build');

    console.log("Reading file " + source_file);
```

Before moving on we need to do some validation and cleanup.
Basically we need to locate the build directory, this is a naive
implementation though. We also clean out the build directory, to 
clear stuff from earlier runs. To prevent loosing previously working
versions of the compiler I move the previously built directory to 
backup.

```js \
// << #main-setup >>=
if (!argv.dryrun) { 
    // @todo - clear out build directory.

    /* 
    // set up some paths
    $source_directory = dirname($file);

    // this is still pretty naive. 
    $output_directory = $source_directory . '/../build';
    $backup_directory = $source_directory . '/../backups';

    system("mkdir -p '$backup_directory'");

    if (!$output_directory) {
        exit("Invalid output directory");
    }

    // clear the build directory
    $date = date('Y-m-d-his');
    system("mv '$output_directory' '$backup_directory/$date'");
    system("mkdir -p '$output_directory';");
    */
}
```

```js \
// << #main >>=

const path = require('path');
const mkdirp = require('mkdirp');

let VERBOSE = false;
let DEBUG = false;

async function main() {
    << # Program options >>

    << #Collect / extract blocks from given file >>

    << #Render the collected blocks to files >>
    
    << #Write the files to disk >>

    await Promise.all(promises);

    console.log('Compilation done.');
    << #Post compile operations >>
}
```

## Extracting
Extracting blocks is pretty straight forward.
Look for \`\`\`-blocks. This codeblock start may denote its 
syntax type (\`\`\`php for instance, to denote php syntax)
This is needed for IDE's to allow syntax highlighting inside the code block.
Next up, we need to instruct the compiler on where to put the file.
This is achieved by writing the filename on the same line as the codeblock starts.
It's also possible to give blocks an id, which can be referenced
later on. You should also be able to supply some processing instructions, for appending,
prepending.

Inside the main process we need to start collecting all the blocks
from the given file. This needs to happen sequentially, because 
we can only start rendering after we have collected all the blocks.

```js \
// << #Collect / extract blocks from given file >>=

    // Step one: extract
    var context = {};

    var blockOptions = {};

    var blocks = (await (new Promise(resolve => {
        block_stream = extract_blocks(source_file, {followLinks: true});
        block_stream.on('block', block => {
            if (VERBOSE) {
                console.info('Block defined: ' + block.block_header.id + ' in file: ' + block.block_header.file);
            }
            context[block.block_header.id] = context[block.block_header.id] || [];
            context[block.block_header.id].push(block);

            // capture all block meta information
            blockOptions[block.block_header.id] = blockOptions[block.block_header.id] || {};
            Object.assign(blockOptions[block.block_header.id], block.block_header.options);
        });
        block_stream.on('close', resolve);
    })));
    

    if (VERBOSE) {
        console.info('Done reading blocks, we currently have: ' +"\n - " + Object.keys(context).join("\n - "));
    }

    if (DEBUG) {
        console.info('[debug] context: ' + JSON.stringify(context, null, 3));
    }
```

```js \
// <<#extract_blocks>>=

var fs = require('fs');
var readline = require('readline');
var EventEmitter = require('events');
var blockOptionsParser = require('yargs')
    .option('interpret', {
        alias: 'i'
    })
    .option('already-merged')
    .option('dont-include')
    .option('prepend', { alias: 'p'})
    .option('append', { alias: 'a'})
;

function extract_blocks(file, options) {

    << #extract_blocks resolve appropriate file >>
    var {followLinks} = options || {};
    
    var promises = [];
    var emitter = new EventEmitter();

    << #extract_blocks_prevent_double_processing >>

    var rl = readline.createInterface({
        input: fs.createReadStream(file),
        output: process.stdout,
        terminal: false
    });

    var startCapture = startLine => {        
        var lines = [];
        var captureBlock = line => {
            var isBlockEnd = line.substr(0, 3) === '```';
            if (isBlockEnd) {
                rl.removeListener('line', captureBlock);
                var header = parseBlockHeader(startLine, lines);

                if (header) {
                    var skipBlock = header.options['dont-include'] || header.options['already-merged'];

                    if (!skipBlock) {
                        header.file = file;
                        emitter.emit('block', {
                            block_header: header,
                            block_content: lines
                        });
                    }
                }
                rl.on('line', awaitBlock);
            } else {
                lines.push(line);
            }
        };

        rl.on('line', captureBlock);
    }

    var awaitBlock = line => {
        if (line.substr(0, 3) === '```') {
            rl.removeListener('line', awaitBlock);
            startCapture(line);
            return;
        }

        << #extract_blocks_parser_extensions >>
    }

    var res = rl.on('line', awaitBlock);

    rl.on('close', event => {
        Promise.all(promises).then(done => {
            emitter.emit('close');
        })
    });    

    return emitter;   
}

// Parse block header:
// convert ```[type] [filename] [options?].
function parseBlockHeader(startLine, lines) {
    << #parseBlockHeader multiline mode >>

    // Split options
    var [tmp, options] = startLine.replace(/\s+/g, ' ').split(/\s-/);
    var pieces;
    var id;
    var noWebMatch = tmp.match(/<<\s*(.+?)\s*(,.+?)*\s*>>\s*(\+?=?)*/);

    if (options) {
        options = blockOptionsParser
            .parse(`-${options}`.split(/\s+/));
    } else {
        options = {}
    }

    options.interpret = options.interpret || !options['dont-interpret'];

    if (noWebMatch) {
        id = noWebMatch[1];

        if (noWebMatch[3] === '+=') {
            options.append = true;
        }
    } else {
        pieces = tmp.split(/\s+/);
        id = pieces.pop(); 

        if (id.match(/^`{3}/)) {
            return false;
        }
    }

    if (!id) {
        return false;
    }

    return {
        id,
        options
    }
}

```


## The rendering process
Some blocks just put out content for a given file, like the 
example file above. Besides this, we also want to support 
special operations, for instance, appending to a file, like so:

```text \
<< examples/example-file.txt >>+=

These lines will be appended to the file.
```

Besides direct output to files, we want named blocks for later
use (or reuse), like so:

```test \
<< #example-block >>=
This is an example block and wont be exported to filesystem.
But, we can reference it later.
```

To (re)use defined blocks, we need to have some syntax. This
is done by the interpret function. This is default behaviour 

```test \
<< examples/dynamic-example.txt >>=
Inside this file we may use special syntax to include blocks:
<< #example-block >>

It's also possible to import the example file:
<< examples/example-file.txt >>
```

@todo - prevent infinite loops


```js \
// << #render >>=

function render(block, context) {
    var prepend = '';
    var append = '';
    var final = '';

    block.map(b => {
        var content = b.block_content.join("\n");
        var opts = b.block_header.options || {};

        if (opts.interpret) {
            try {
                content = interpret(content, context);
            } catch (err) {
                console.error(err);
            }
        }

        if (opts.prepend) {
            prepend += content + "\n";
        } else if (opts.append) {
            append += content + "\n";
        } else {
            final += content + "\n";
        }
    })

    return prepend + final + append;
}

function interpret(content, context) {
    // Ability to parse \<\< Chunkname \>\> references.
    content = content.replace(/(^|(\n\s*))<<\s*(.+?)\s*>>/g, (match, space, spaceBound, includeId) => {
        // When a block cannot be found, just print a notice.
        if (!(includeId in context)) {
            console.log('[notice]: `' + includeId + ' not found');
            return '';
        }
        return (space||'') + render(context[includeId], context);
    });

    << #extra-interpreter-stuff >>

    return content;
}
```

Now we have the per-file rendering in place, we still need
to render all our collected blocks. 

```js \
// << #Render the collected blocks to files >>=

    // Step two: Render/interpret 
    var renderedFiles = {};
    Object.keys(context).map(blockId => {
        var renderedContent = render(context[blockId], context);
        renderedFiles[blockId] = {
            options: blockOptions[blockId],
            content: renderedContent,
        };
    })

    if (DEBUG) {
        console.info('[debug] rendered files: ' + JSON.stringify(renderedFiles, null, 3));
    }
```

## Writing it all
The rendered files now need to be written to disk.
This is fairly straigh forward. 
We'll only skip writing blocks that start with #.

```js \
// << #Write the files to disk >>=

    // Step three: Write to disk.
    var promises = Object.keys(renderedFiles).map(fileId => {
        var file = renderedFiles[fileId];

        if (fileId.substr(0,1) === '#') {
            // skip block ids.
            return;
        }


        var output_file = path.join(output_directory, fileId);

        if (argv.dryrun) {
            console.log("--- Start %s ---", output_file);
            console.log(file.content);
            console.log("--- End %s ---\n", output_file);
            return;
        }

        try { 
            mkdirp.sync(path.dirname(output_file));
        } catch (ignore) {
            // this may fail, if the directory already exists for instance.
        }

        return new Promise((resolve, reject) => {
            fs.writeFile(output_file, file.content, err => {
                if (err) {
                    console.error(`Unable to write ${output_file}: ${err}`);
                    reject(err);
                } else {
                    console.log(`Written ${output_file}`);
                }
    
                << #Additional file operations >>

                resolve();
            });
        });
    })
```

Now, to make a program that will actually run, I'll create a php file 
and insert my codeblocks in the proper order (as php doesn't do function hoisting like javascript does).
When this script is called, it will immediately run main and pass it the argv (command arguments).
You can find this in /build/extractor.php

```js \
// << extractor.js >>=

<< #main >>
<< #extract_blocks >>
<< #render >>

main()

```


Q.E.D.



## Advanced options:

- [Advanced subjects](advanced-subjects.md)

Now run:
`./build/bin/wlkc src/index.md -o build` to compile this document to a walkthrough compiler.


## Room for improvement
- Codeblock filename and options aren't rendered properly by Github Flavoured Markdown [GFM Fix](./fixing-github-flavoured-markdown.md)
  this should be changed. Maybe something like 
- Include images / usable assets






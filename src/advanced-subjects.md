# Advanced subjects

## Chmod file option

Example: 
```shell << bin/wlkc >> --chmod 0755
#!/usr/bin/env node 
require('../extractor.js');
```

We want to be able to output a file that is executable. To implement this
we need to add this:

```js \
// << #Additional file operations >>=

if (file.options.chmod) {
    var octalPermissions = parseInt(file.options.chmod, 8);

    console.log('Chmod ' + output_file + ' to ' + file.options.chmod);

    require('fs').chmodSync(output_file, octalPermissions);
}
```

## Follow links:

Bigger codebases require us to organize our source code in different files.
When we encounter a markdown link in the document, we want to extract blocks
from this file as well. We should only include links to md files. Images
will be recognized and skipped. Only local files will be parsed.

```js \
// << #extract_blocks_parser_extensions >>=

    // only md files.

    var linkRegex = /(!?)\[(.+)\]\((.+\.md)\)/
    // Array(4) [ "![xx](xx.md)", "!", "xx", "xx.md" ]
    // other lines: Parse links
    var linkMatch = line.match(linkRegex);
    
    if (followLinks && linkMatch) {
        var isMarkdownImage = linkMatch[1] === "!";
        var linkUrl = linkMatch[3];
        var isAbsoluteUrl = linkUrl.indexOf('://') > 0;

        if (!isAbsoluteUrl && !isMarkdownImage) {
            console.log('Following link ' + linkUrl);

            var sub_file = path.join(path.dirname(file), linkUrl);
            
            var subRl = extract_blocks(sub_file, options);

            subRl.on('block', block => {
                //console.log('subblock', block);
                emitter.emit('block', block);
            });
            
            promises.push(new Promise(resolve => {
                subRl.on('close', resolve);    
            }))
        }
    }
```

@todo error handling: Dont die when a file cannot be read. 

Now we where faced with a different challenge. Extract blocks must send
a signal when its done reading the file. But now, done means done including
all sub files. 

We solved this by returning a clean EventEmitter, when the original file is closed,
we will check if all `opened` files (recursively) are finished. This is implemented
in the main #extract_blocks block.

Now, when we run extract blocks we will receive blocks of this file including
all the blocks in every other file. 

### Prevent double inclusion:
```js \
// << #extract_blocks_prevent_double_processing >>=

    extract_blocks.processedFiles = extract_blocks.processedFiles || [];
    if (extract_blocks.processedFiles.indexOf(file) >= 0) {
        setTimeout(() => {
            console.log('File was already processed.');
            emitter.emit('close');  
        }, 1);
        return emitter;        
    }
    extract_blocks.processedFiles.push(file);
```

## A (pre)viewer (Idea)

It should render Github Flavoured Markdown. It may even include mermaid, like StackEdit.io supports..

## Dependencies in the right place

Current situation: Each project has one main package.json/requirements.txt/composer.json
Ideally we would want to store this information close to the code that depends on a given
dependency. So basically I would like to have a mechanism that allows write down individual
dependencies and stuff.

A possible solution for this would be to append
to a block.

Some proposals for this syntax:

Proposal 1, noweb style:
\<\<Depencencies\>\>+= yargs@1
- Ask yourself, inside or outside of code-blocks?

Proposal 2, markdown style:
No changes:
\`\`\` Dependencies --append
yargs@1
\`\`\`

Some changes required:
Single line blocks.
\`\`\` Dependencies+= yargs@1 \`\`\`
\`\`\` Dependencies --append yargs@1 \`\`\`

## Other ideas: 

### View & Execute 
Inside the viewer one could quickly execute certain stuffs (in isolation).
Installation scripts and such.

- Benchmark.
- Profiling.
- (Unit) testing.


## Run actions from the document
When building a walkthrough, you might want to be able 
to run certain stuff.

This is why we add the --action or -x action, which allows us to do:

`wlkc some-file.md --action block-name`

To make it easier for users, you dont have to write a block-name will resolve
both block-name and #block-name.

```js \
// << #More program options >>+=
    yargs.option('action', {
        alias: 'x',
        description: 'Immediately run a block'
    });
```

To make this happen, we just need to interpret 
the file as a bash script and immediately execute this
after compilation of files is finished.


Here is a naive implementation for it:

```js \
// << #Post compile operations >>

if (argv.action) {
    console.log("Perform action " + argv.action);

    var action = argv.action;

    if (`#${action}` in renderedFiles) {
        var actionFile = renderedFiles[`#${action}`]
    } else {
        actionFile = renderedFiles[action];
    }

    console.log(actionFile);

    if (actionFile) {
        // @todo - improve this: make this async.
        fs.writeFileSync(`${output_directory}/tmp.sh`, actionFile.content);

        var spawn = require('child_process').spawn;

        // @todo - improve this: would be best if we did not have to write 
        //         a temporary file. 

        spawn('bash', ['tmp.sh'], {
            stdio: 'inherit',
            cwd: output_directory
        });
    }
}
```

This feature also asks for even more advanced features, like being able
to recompile stuff when the source document (and/or subdocuments) change.


## Which file to open:
We want a file resolve heuristic which looks a bit like the nodejs require resolve heuristics. 

wlkc somefile should either load:
somefile/index.md
somefile.md

```js \
<< #extract_blocks resolve appropriate file >>
// Assume we have file and fs and path.
if (fs.statSync(file).isDirectory()) {
    file = path.join(file, 'index.md');
}
```


## Ability to reverse the actions executed by the file.
Sometimes you might want to be able to reverse the `damage` done by the compiler. The damage being: all files that have been created by the compiler. For this, we might want to add a `--reverse` option. This occurs when you choose to build (-o/--output .) to the current directory, instead of a dedicated build directory.
There are other solutions to this, one can simply perform a `git reset --hard` or `git clean -f` to clear these files. So i'll wait for it. We might want to have a more accurate bookkeeping, to register which files and folders we've created, and persist these to some directory, but this will add more complexity to the solution.

## Ability to append to a file which does not originate from our markdown file(s)
Usecases: Add some lines to some configuration file (for instance /etc/hosts). The difficulty here is to prevent these additions to be performed on every compile. So, preferedly this action is run manually, or interactively, inside a walkthrough viewer or something... 

## Ability to define and reference path constants
Usecase: When you have a lot of files inside some deep path you may want to prevent repeating the long path a lot of times. This also allows you to be more flexible. So, a way to define a path constant and a mechanism for referencing these
inside the paths.

## Source map support:

Experiment

Documentation: 
https://github.com/evanw/node-source-map-support
https://github.com/mozilla/source-map

Sourcemaps v3 spec (2011)
https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit#

Step 1: Let the compiler also output a source map.

```js \
<< tmp/tryout-source-maps.js >>
const SourceNode = require('source-map').SourceNode;

var sn = new SourceNode(1,1,"myfile.js", [
    'hallo hoe is het?'
]);

var map = sn.toStringWithSourceMap({file: 'test.map.js'});

console.log(map, map.map.toString());

```

```action << #tryout-sourcemaps >>
node tmp/tryout-source-maps.js
```
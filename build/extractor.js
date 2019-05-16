

const path = require('path');
const mkdirp = require('mkdirp');

let VERBOSE = false;
let DEBUG = false;

async function main() {
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

        yargs.option('action', {
        alias: 'x',
        description: 'Immediately run a block'
    });

    
    var argv = yargs.argv
    var source_file = argv._[0];    

    VERBOSE = argv.verbose;
    DEBUG = argv.debug;

    if (!source_file) {
        throw new Error('Please supply a source file as argument');
    }
    
    console.log("Working directory: %s", process.cwd());

    if (fs.statSync(source_file).isDirectory()) {
        source_file = path.join(source_file, 'index.md');
    }

    var output_directory = argv.output || path.join(path.dirname(source_file), 'build');

    console.log("Reading file " + source_file);


    
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
    
                
if (file.options.chmod) {
    var octalPermissions = parseInt(file.options.chmod, 8);

    console.log('Chmod ' + output_file + ' to ' + file.options.chmod);

    require('fs').chmodSync(output_file, octalPermissions);
}


                resolve();
            });
        });
    })


    await Promise.all(promises);

    console.log('Compilation done.');
    
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

}


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

    // Assume we have file and fs and path.
if (fs.statSync(file).isDirectory()) {
    file = path.join(file, 'index.md');
}

    var {followLinks} = options || {};
    
    var promises = [];
    var emitter = new EventEmitter();

    
    extract_blocks.processedFiles = extract_blocks.processedFiles || [];
    if (extract_blocks.processedFiles.indexOf(file) >= 0) {
        setTimeout(() => {
            console.log('File was already processed.');
            emitter.emit('close');  
        }, 1);
        return emitter;        
    }
    extract_blocks.processedFiles.push(file);


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
    
    // if a markdown codeblock unit ends with a backslash
    // the next line will also be considered as header.
    if (startLine.substr(-1,1) === "\\") {
        var extraLine = lines.shift();

        // The first extra line may contain a line comment
        // for better display.
        extraLine = extraLine.replace(/^(#|\/\/)\s*/g, '');

        startLine = startLine.substr(0, -1) + " " + extraLine;
    }



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

    return content;
}


main()


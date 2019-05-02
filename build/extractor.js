
const path = require('path');
const mkdirp = require('mkdirp');

async function main() {
        var argv = require('yargs')
        .option('output', {
            alias: 'o',
            describe: 'directory to output to'
        })
        .argv

    var source_file = argv._[0];    

    if (!source_file) {
        throw new Error('Please supply a source file as argument');
    }
    
    var output_directory = argv.output || path.join(path.dirname(source_file), 'build');

    console.log("Reading file " + source_file);


    // Step one: extract
    var context = {};

    var blockOptions = {};

    var blocks = (await (new Promise(resolve => {
        block_stream = extract_blocks(source_file, {followLinks: true});
        block_stream.on('block', block => {
            context[block.block_header.id] = context[block.block_header.id] || [];
            context[block.block_header.id].push(block);

            // capture all block meta information
            blockOptions[block.block_header.id] = blockOptions[block.block_header.id] || {};
            Object.assign(blockOptions[block.block_header.id], block.block_header.options);
        });
        block_stream.on('close', resolve);
    })));
    
    // Step two: Render/interpret 
    var renderedFiles = {};
    Object.keys(context).map(blockId => {
        var renderedContent = render(context[blockId], context);
        renderedFiles[blockId] = {
            options: blockOptions[blockId],
            content: renderedContent,
        };
    })

    // Step three: Write to disk.
    Object.keys(renderedFiles).map(fileId => {
        var file = renderedFiles[fileId];

        if (fileId.substr(0,1) === '#') {
            // skip block ids.
            return;
        }

        var output_file = path.join(output_directory, fileId);

        try { 
            mkdirp.sync(path.dirname(output_file));
        } catch (ignore) {
            // this may fail, if the directory already exists for instance.
        }

        fs.writeFile(output_file, file.content, err => {
            if (err) {
                console.error(`Unable to write ${output_file}: ${err}`);
            } else {
                console.log(`Written ${output_file}`);
            }

            if (file.options.chmod) {
    var octalPermissions = parseInt(file.options.chmod, 8);

    console.log('Chmod ' + output_file + ' to ' + file.options.chmod);

    require('fs').chmodSync(output_file, octalPermissions);
}

        });
    })
}


var fs = require('fs');
var readline = require('readline');
var EventEmitter = require('events');
var blockOptionsParser = require('yargs')
    .option('interpret', {
        alias: 'i',
    })
    .option('prepend', { alias: 'p'})
    .option('append', { alias: 'a'})
;

function extract_blocks(file, options) {
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
            if (line.substr(0, 3) === '```') {
                rl.removeListener('line', captureBlock);
                emitter.emit('block', {
                    block_header: parseBlockHeader(startLine),
                    block_content: lines
                });
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
    
    if (linkMatch) {
        var isMarkdownImage = linkMatch[1] === "!";

        if (followLinks && !isMarkdownImage) {
            var linkUrl = linkMatch[3];

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
function parseBlockHeader(startLine) {
    var [tmp, options] = startLine.split(/\s-/);

    var pieces = tmp.split(/\s+/);

    var id = pieces.pop(); 
    if (options) {
        options = blockOptionsParser
            .parse(`-${options}`.split(/\s+/));
    } else {
        options = {}
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
            content = interpret(content, context);
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
    return content.replace(/(\n\s*)>>include\s+(.+)/g, (match, space, includeId) => {
        if (!(includeId in context)) {
            throw new Error(includeId + ' not found');
        }
        return space + render(context[includeId], context);
    });
}


main()

# Advanced subjects

## Chmod file option

Example: 
```shell << bin/wlkc >> --chmod 0755
#!/usr/bin/env node 
require('../extractor.js');
```

We want to be able to output a file that is executable. To implement this
we need to add this:

```js << #Additional file operations >>
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

```js << #extract_blocks_parser_extensions >>

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
```js << #extract_blocks_prevent_double_processing >>
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

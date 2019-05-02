# Noweb syntax meets markdown

Proposed syntax will be:

\`\`\`[markdown-syntax?] \<\< Chunk Id \>\> [writeMode (+?=)]
[Chunk content]
\`\`\`

And one-line mode:

\`\`\` \<\< Chunk Id \>\> [writeMode (+?=)] [Chunk Content] \`\`\`

This syntax could easily be done with an updated parseBlockHeader
function, like so:

```js << #extract_blocks >>
function parseBlockHeader(startLine) {
    // Split options
    var [tmp, options] = startLine.replace(/\s+/g, ' ').split(/\s-/);
    var pieces;
    var id;
    var noWebMatch = tmp.match(/<<\s*(.+?)\s*>>\s*(\+?=?)/);

    if (options) {
        options = blockOptionsParser
            .parse(`-${options}`.split(/\s+/));
    } else {
        options = {}
    }

    if (noWebMatch) {
        console.log(noWebMatch);
        id = noWebMatch[1];

        if (noWebMatch[2] === '+=') {
            options.append = true;
        }
    } else {
        pieces = tmp.split(/\s+/);
        id = pieces.pop(); 
    }

    return {
        id,
        options
    }
}

```

```js run/parseBlockHeader.js --interpret
<<#extract_blocks>>
var result = parseBlockHeader('```js << chunk id >>+= hoi' + "\nhoi\nhoi" + '```');
console.log(result);
```



# Fixing Github Flavoured Markdown

The problem, when we define markdown codeblocks (\`\`\`[type] \<\<id>\>)
then stuff is not displayed on github. One proposal is to do it as follows:

\`\`\`[type] \
\<\<file \>\>+=

    blabla
\`\`\`

So, to fix it, we need the startLine must expand to the next line.

Here goes:

```js \
// << #parseBlockHeader multiline mode >>=

    // if a markdown codeblock unit ends with a backslash
    // the next line will also be considered as header.
    if (startLine.substr(-1,1) === "\\") {
        var extraLine = lines.shift();

        // The first extra line may contain a line comment
        // for better display.
        extraLine = extraLine.replace(/^(#|\/\/)\s*/g, '');

        startLine = startLine.substr(0, -1) + " " + extraLine;
    }

```

```js \
// <<examples/gfm-fix.txt>>+=

This will be the file content
```
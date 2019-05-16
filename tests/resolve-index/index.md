# Resolves index

## Test 1
If you run wlkc [source] and source is a directory
wlkc should set the working directory to source
and will start compiling source/index.md

The test will try to compile this document 
and we should expect the following example.txt file 
to be exported.

We'll use --dryrun to evaluate the outcome.

```text example.txt
When you run wlkc [directory] the index.md
should run. This file will be compiled to build/example.txt
```

## Test 2
When working with links, this will not work, not
in VS Code Markdown Preview:

This link doesn't work: [link](some-folder)

But this link will work:

Here is the [link](some-folder/index.md)




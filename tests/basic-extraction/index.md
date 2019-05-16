# Basic Extraction

Here we will document all the different ways 
we can export files from a markdown file


Simple format: \`\`\`[type] [filename]

```text file1.txt
File 1 content
```

Appending

```text file1.txt --append
This will be appended to file 1
```

Semi WEB format

The WEB format is characterized by \<\< identifier \>\>
I think this makes blocks and references easier to identify, so I chose to adapt this as well.

```text << file2.txt >>
File 2 content
```

Semi WEB Format append

```text << file2.txt >>+=
This line will be added to file2.txt
```

## Test 3

When writing codeblocks most markdown renderers will
ignore all content after the three backticks. 
When we write codeblocks we want the reader to know the 
block identifier, so we created a workaround:
The block header may be moved to the next line, when you end the block header with a backward slash \

A demonstration:

```text << # This is not visible to the reader >>
This content is visible to the reader.
The block identifier unfortunately is invisible to the reader
```

The workaround 
```text \
<< # This identifier will be visible to the reader >>
This content is also visible to the reader
```



## Test 4:
Reuse references

Here we are going to create a reference block

```text << # reference block 1 >>
Reference block 1 content
```

And here we are going te (re)use the reference

```text file4.txt
File 4 content

Using reference block:
<< # reference block 1 >>

And again:
<< # reference block 1 >>
```


## Test 5
skipping blocks

You may denote some block to be skipped by adding --skip, --exclude, --dont-include
or --already-merged

```text file5-skipped.txt --skip
This file should be skipped and will not appear in the end-result.
```

Try an alias of skip
```text file5-skipped.txt --exclude
This file should be skipped and will not appear in the end-result.
```

Try with WEB format

```text << file5-skipped.txt >> --dont-include
This file should be skipped and will not appear in the end-result.
```
# Walkthrough Compiler

Instead of writing your code and documentation separately,
you write your code inside the documentation. You take the 
reader by the hand an implement the code as you tell the story
of what the sofware should do...

This is a fun experiment.

This document you are currently reading  contains the entire source for 
the walkthrough compiler, i'm telling the story, and the compiler will 
compile the walkthrough compiler from it :-).

## Why
Code is perfect for instructing computers but a less ideal medium for transmitting
knowledge, in my experience. I think a compelling story is more effective for
transmitting key ideas and subtle considerations that just seeing the code (especially code
without comments). Our future selves and future collegues will thank us. 

Why PHP: No real reason. I'm fairly comfortable with php. But. This being a 
narrative on how to write a walkthrough compiler it's fairly straigh forward to 
port this to any language, one of the benefits of this form of writing a program i guess.

## Installation
Via repo:
- Requirements: php 7, linux (posix) (this may be improved)
- Clone this repository
- run `npm link` or create a symlink `ln -s ./bin/wlkc /usr/local/bin/wlkc` to make wlkc available
  on your system.
- See that it works.

Via npm:
- npm install -g walkthrough-compiler
- create some folders:
    - `mkdir mywalkthrough/src`
    - `mkdir mywalkthrough/build`
- Start working in mywalkthrough/src/index.md
- By default it will create a build directory as a sibling to the directory you are 
working on.

Be warned though: This is still a little rough on the edges ;-)

## How it works
You write the documentation and the code of your program, in a markdown file.
The walkthrough compiler will extract the markdown codeblocks and writes them 
to disk. After the compiler is done, your program is ready. 

## Example:

Markdown syntax:

<code>
\`\`\`[type] [filename] [options]
    content for document here.
\`\`\`
</code>
Please note: GFM Doesnt render the filename and options
so i might want to change this. You may want to check the Raw source of this 
document to get the full picture.

```php examples/my-first-program.php
<?php
    echo "Hello world";
```

When you run the compiler, it will write this file to disk.

Later on, we may add to this file, using the --append option:

examples/my-first-program.php --append:
```php examples/my-first-program.php --append
    echo "This is added";
```

You may focus on a specific block of code and use it in a file later on.

#php-example-code:
```php #php-example-code
    for ($i=0;$i<10;$i++) {
        echo "Number $i\n";
    }
```

Now we reuse it in our example file with the special code >>include [id]. To trigger this type of interpretted mode you need to add the --interpret option.

examples/my-first-program.php --append --interpret:
```php examples/my-first-program.php --append --interpret
>>include #php-example-code
```

## implementing the walkthrough compiler:

## Overview

Step one: The standalone compiler. It will be a program executed
from terminal. It will receive an file (entrypoint) as argument.

#main-read-file-argument:
```php #main-read-file-argument
    // read the file
    $file = realpath($argv[1]);
```

Before moving on we need to do some validation and cleanup.
Basically we need to locate the build directory, this is a naive
implementation though. We also clean out the build directory, to 
clear stuff from earlier runs. To prevent loosing previously working
versions of the compiler I move the previously built directory to 
backup.

#main-setup:
```php #main-setup 
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
```

It will:
- read the file
- extract the codeblocks (denoted with three backticks) 
- process the codeblocks
- export the codeblocks to filesystem.

#main --interpret:
```php #main --interpret
function main($argv) {

    >>include #main-read-file-argument
    >>include #main-setup 
    
    $current_output_file = false;

    // extract all the blocks from the file

    // pass 1: Collect all blocks, group them by id.
    $context = [];
    foreach (extract_blocks($file) as $b) {
        $context[$b['block_header']['id']][] = $b;
    }

    // pass 2: Render each block
    $rendered = [];
    foreach ($context as $id => $block) {
        $rendered[$id] = render($block, $context);
    }

    // export
    foreach ($rendered as $name => $content) {
        // skip blocks that start with a #
        if ($name{0} === '#') {
            continue;
        }

        $file = "$output_directory/$name";
        $dir = dirname($file);
        system("mkdir -p '$dir'");

        file_put_contents($file, $content);

        echo "Written $file\n";
    }
}
```

## Extracting
Extracting blocks is pretty straight forward.
Look for \`\`\`-blocks. This codeblock start may denote its 
syntax type (\`\`\`php for instance, to denote php syntax)
This is needed for IDE's to allow syntax highlighting inside the code block.
Next up, we need to instruct the compiler on where to put the file.
This is achieved by writing the filename after the 
It's also possible to give blocks an id, which can be referenced
later on.


examples/example-file.txt:
```text examples/example-file.txt
This will be exported to /build/example/example-file.txt
```

#extract_blocks:
```php #extract_blocks
function extract_blocks($file) {
    $fh = fopen($file, 'r');
    while (false !== ($line = fgets($fh))) {

        if (substr(ltrim($line), 0, 3) === '```') {
            // Block starts:

            $header = substr(trim($line), 3);

            if (preg_match('/(?<type>[a-z]+\s)?(?<file>(#[a-z_-]+|.+\.[a-z]+))(\s+(?<options>-.+))?/i', $header, $match)) {
                //print_r($match);

                $optString = explode(' ', $match['options'] ?? '');
                $hasOpt = function ($a, $b) use ($optString) {
                    return in_array($a, $optString) || ($b && in_array($b, $optString));
                };

                $options = [];
                $options['interpret'] = $hasOpt('-i', '--interpret');
                $options['append'] = $hasOpt('-a', '--append');
                $options['prepend'] = $hasOpt('-p', '--prepend');

                $header = [
                    'id' => $match['file'],
                    'options' => $options
                ];
            }

            $content = '';
            while(false !== ($line = fgets($fh))) {
                // Read block content
                if (substr(ltrim($line), 0, 3) === '```') {
                    break;
                }
                $content .= $line;
            }

            yield [
                'block_header' => $header,
                'block_content' => $content,
                'source_file' => $file
            ];

            continue;
        }

        // room for parse link.
    }
}
```

## The rendering process
Some blocks just put out content for a given file, like the 
example file above. Besides this, we also want to support 
special operations, for instance, appending to a file, like so:

examples/example-file.txt --append:
```text examples/example-file.txt --append
These lines will be appended to the file.
```

Besides direct output to files, we want named blocks for later
use (or reuse), like so:

#example-block:
```test #example-block
This is an example block and wont be exported to filesystem.
But, we can reference it later.
```

To (re)use defined blocks, we need to have some syntax. This
is provided via the --interpreted (or -i) mode:

examples/dynamic-example.txt --interpret:
```test examples/dynamic-example.txt --interpret
Inside this file we may use special syntax to include blocks:
>>include #example-block

It's also possible to import the example file:
>>include examples/example-file.txt
```

#render:
```php #render
function render($block, &$context) {
    $prepend = '';
    $append = '';
    $final = '';

    foreach ($block as $b) {
        $content = $b['block_content'];
        $opts = $b['block_header']['options'] ?? [];

        if ($opts['interpret'] ?? false) {
            $content = interpret($content, $context);
        }

        if ($opts['prepend'] ?? false) {
            $prepend .= $content . PHP_EOL;
        } elseif ($opts['append'] ?? false) {
            $append .= $content . PHP_EOL;
        } else {
            $final .= $content . PHP_EOL;
        }
    }
    return $prepend . $final . $append;
}

function interpret($content, &$context) {
    return preg_replace_callback('/\s*>>include (.+)/', function($match) use (&$context) {
        // echo "Interpretting {$match[0]}\n";
        $includeId = trim($match[1]); // clear whitespace;
        if (!isset($context[$includeId])) {
            throw new Exception('Could not find >>include ' . $match[1]);
        }
        return PHP_EOL . render($context[trim($match[1])], $context);
    }, $content);
}
```

extractor.php --interpret
```php extractor.php --interpret
<?php

>>include #extract_blocks
>>include #render
>>include #main

main($argv);
```
 
Q.E.D.

Now run:
`php build/extractor.php src/index.md` to compile this document to a walkthrough compiler.



## Room for improvement
- Codeblock filename and options aren't rendered properly by Github Flavoured Markdown
  this should be changed. Maybe something like 
- Currently only works on Linux (Mac maybe as well), because of the system() calls.
- You'd want to use this on a terminal, by running wlkc [path/to/index.md]
- Split large markdown documents into subdocuments, by following relative markdown links.
- Include images / usable assets






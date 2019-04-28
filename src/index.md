# Walkthrough Compiler

Allows you to write a narrative around your code. It will
extract the code from your documentation page which will
be the working program.

## How it works
You write the documentation of your program, in a markdown file.
Inside this file you walk the reader through all the code. This way
the documentation, your walkthrough, contains all the sourcecode 
of your program. The walkthrough compiler will extract the codeblocks
to source-files, and your program is a fact.

## Example:

```php examples/my-first-program.php
<?php
    echo "Hello world";
```

When you run the compiler, it will write this file to disk.

Later on, we may add to this file, using the --append option:

```php examples/my-first-program.php --append
    echo "This is added";
```

You may focus on a specific block of code and use it in a file later on.

```php #php-example-code
    for ($i=0;$i<10;$i++) {
        echo "Number $i\n";
    }
```

Now we reuse it in our example file with the special code >>include [id]. To trigger this type of interpretted mode you need to add the --interpret option.

```php examples/my-first-program.php --append --interpret
>>include #php-example-code
```

## Now we implement the walkthrough compiler, as walkthrough:

## Overview

Step one: The standalone compiler. It will be a program executed
from terminal. It will receive an file (entrypoint) as argument.

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

```php #main-setup 
    // set up some paths
    $source_directory = dirname($file);
    $output_directory = realpath($source_directory . '/../build');
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
Look for ```-blocks. This codeblock start may denote its 
syntax type (```php for instance, to denote php syntax)
This is needed for IDE's to allow syntax highlighting inside the code block.
Next up, we need to be denote that content inside the block must be
exportable to a file.
It's also possible to give blocks an id, which can be referenced
later on.

Example:
```text examples/example-file.txt
This will be exported to /build/example/example-file.txt
```

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

```text examples/example-file.txt --append
These lines will be appended to the file.
```

Besides direct output to files, we want named blocks for later
use (or reuse), like so:

```test #example-block
This is an example block and wont be exported to filesystem.
But, we can reference it later.
```

To (re)use defined blocks, we need to have some syntax. This
is provided via the --interpreted (or -i) mode:

```test examples/dynamic-example.txt --interpret
Inside this file we may use special syntax to include blocks:
>>include #example-block

It's also possible to import the example file:
>>include examples/example-file.txt
```

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

```php extractor.php -i
<?php

>>include #extract_blocks
>>include #render
>>include #main

main($argv);
```

I'll start with a simple php script to start with. This script needs
to be available because it's essential to start the compiler.

[basic-extractor.php](basic-extractor.php)




 




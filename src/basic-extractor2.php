<?php

function extract_blocks($file) {
    $fh = fopen($file, 'r');
    while (false !== ($line = fgets($fh))) {

        if (substr(ltrim($line), 0, 3) === '```') {
            // Block starts:

            $header = substr(trim($line), 3);


            if (preg_match('/(?<type>[a-z]+\s)?(?<file>(#.+|.+\.[a-z]+))(\s+(?<options>-.+))?/i', $header, $match)) {
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

function main($argv) {
    // read the file
    $file = realpath($argv[1]);

    // set up some paths
    $source_directory = dirname($file);
    $output_directory = realpath($source_directory . '/../build');

    if (!$output_directory) {
        exit("Invalid output directory");
    }

    // clear the build directory
    system("rm -rf '$output_directory/*'");

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
    }
}

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
    return $prepend . PHP_EOL . $final . PHP_EOL . $append;
}

function interpret($content, &$context) {
    return preg_replace_callback('/\s*>>include (.+)/', function($match) use (&$context) {
        // print_r($match);
        return render($context[$match[1]], $context);
    }, $content);
}

main($argv);

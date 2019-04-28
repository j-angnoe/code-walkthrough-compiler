<?php
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


function main($argv) {
    // read the file
    $file = realpath($argv[1]);


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



main($argv);


<?php

$file = realpath($argv[1]);

$source_directory = dirname($file);
$output_directory = realpath($source_directory . '/../build');

$current_output_file = false;

foreach (file($file) as $line) {
    if (!$current_output_file) {
        if (strpos($line, '```') === 0) {
            $line = substr($line, 3);

            if (preg_match('/[a-z]+\s.+/i', $line)) {
                list(, $line) = explode(' ', $line, 2);
            }

            $filename = $output_directory . '/' . trim($line);

            $mode = 'w';

            if (preg_match('/(.+)\s\((append|prepend)\)/', $filename, $match)) {
                if ($match[2] === 'append') {
                    $mode = 'a';
                }
                $filename = $match[1];
            }

            $dirname = dirname($filename);
            system("mkdir -p '$dirname'");
            $current_output_file = fopen($filename, $mode);
        }
    } else {
        if (strpos($line, '```') === 0) {
            fclose($current_output_file);
            $current_output_file = false;
        } else {
            fputs($current_output_file, $line);
        }
    }
}

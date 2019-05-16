cd "$(dirname $0)";

rm result.txt;

wlkc . --dryrun | grep -v 'Working directory' > result.txt

touch expected.txt;

RESULT="$(diff -uw expected.txt result.txt)";

if [ -z $RESULT ]; then
    echo "Test passed.";
    exit 0;
else 
    echo "There where diffs: "
    # Rerun the command

    diff -uw expected.txt result.txt;

    echo;
    echo "Test failed.";

    exit 1;
fi;






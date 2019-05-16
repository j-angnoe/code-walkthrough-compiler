

cd "$(dirname $0)";

wlkc . --dryrun | grep -v 'Working directory' > result.txt

touch expected.txt;

RESULT="$(diff -uw result.txt expected.txt)";

if [ -z $RESULT ]; then
    echo "Test passed.";
    exit 0;
else 
    echo "There where diffs: "
    # Rerun the command

    diff -uw result.txt expected.txt;

    echo;
    echo "Test failed.";

    exit 1;
fi;




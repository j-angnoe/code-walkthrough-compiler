
cd "$(dirname $0)";

for test_file in **/run-test.sh ; do

    echo '' > tmp.result;

    sh $test_file 2>&1 > tmp.result;
    RESULT=$?

    if [ "$RESULT" -eq "0" ] ; then
        echo "$test_file: Passed."
    else
        echo "$test_file: Failed."

        cat tmp.result;
    fi;

    rm tmp.result;

done
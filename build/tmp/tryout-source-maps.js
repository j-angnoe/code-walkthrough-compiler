const SourceNode = require('source-map').SourceNode;

var sn = new SourceNode(1,1,"myfile.js", [
    'hallo hoe is het?'
]);

var map = sn.toStringWithSourceMap({file: 'test.map.js'});

console.log(map, map.map.toString());


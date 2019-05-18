# Test NodeJS sourcemaps example


```js \
<< nodejs-example.js >>
require('source-map-support').install();

console.log("We are running");

<< # Some error >>
```


```js << # Some error >>

var message = 'hallo hoe is het';

throw new Error(message);

```



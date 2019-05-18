# Testing source maps

To build this:
```action #run
echo "Compiling example"
wlkc index.md -o . --sourcemaps;

echo "Serving demo on localhost:8080"
npx static .;
```

```html index.html
<html>
<body>
    Hello, check the source.
    <script src="script.js"></script>
</body>
</html>
```

```js script.js
// index.md regel 13 for the record

var HALLO = 'haal';

console.log("Which line is this?");

<< # script include >>

console.log("Hello");

```

```js << # script include >>
// this should be index.md line 24.

console.log("Hello 2");
console.log("Hello 3");
```


## Force sourcemaps for some file
This inline source map will force wlkc to generate a .map
file for this particular file.
The references to source files will be correct (relative to 
the path of the sourcemap file).

```test a/b/c/test-binary

// # sourceMappingURL=xxx

```


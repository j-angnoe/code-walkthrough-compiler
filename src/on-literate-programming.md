# On literate programming

After doing the initial post on the walkthrough compiler, readers pointed out
that Knuth had a name for this type of programming: Literate Programming.

This inspired me to do some research about the subject, and I've found
some interesting materials. 

- Why didn't literate programming catch on? https://news.ycombinator.com/item?id=10069748
- Literate Programming on Wikipedia: https://en.wikipedia.org/wiki/Literate_programming
- A literate implementation of `wc`: http://tex.loria.fr/litte/wc.pdf
- noweb - https://www.cs.tufts.edu/~nr/noweb/

> Without wanting to be elitist, the thing that will prevent literate programming from becoming a mainstream method is that it requires thought and discipline. The mainstream is established by people who want fast results while using roughly the same methods that everyone else seems to be using, and literate programming is never going to have that kind of appeal. This doesn't take away from its usefulness as an approach.                         —Patrick TJ McPhee 

A conclusion one could draw is: Literate Programming can be incredibly effective at
capturing all the knowledge about a piece of software. But. Why isn't everybody
doing literate programming...? Maybe it's not for all.

Literate Programming in the wild:
- CoffeeScript had the ability to parse literate coffeescript.
- iPython / Jupyter / R Markdown are seen as literate attempts.

It did inspire me to change the `>>include` syntax to noweb style:

    <<Chunk name reference>>

```js #extra-interpreter-stuff
    // Ability to parse \<\< Chunkname \>\> references.
    content = content.replace(/(^|(\n\s*))<<\s*(.+)\s*>>/g, (match, space, spaceBound, includeId) => {
        includeId = includeId.trim();

        if (!(includeId in context)) {
            throw new Error(includeId + ' not found');
        }
        return (space||'') + render(context[includeId], context);
    });
```

```text #sample-text
This is a sample text
```

```text examples/noweb-references.txt --interpret
<<#sample-text>>

<< #sample-text >>
```
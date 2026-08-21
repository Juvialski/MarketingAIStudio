# Third-Party Notices

This project incorporates components, presentation engine primitives, and interaction patterns adapted from the following open-source software:

---

## StackBlitz Bolt Slides

- **Repository:** [https://github.com/stackblitz/bolt-slides](https://github.com/stackblitz/bolt-slides)
- **License:** MIT
- **Copyright:** Copyright (c) 2026 StackBlitz

### MIT License Text

```text
MIT License

Copyright (c) 2026 StackBlitz

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Adapted Components in `src/features/presentations/`
- Deck navigation engine and dock chrome (`Deck.tsx`, `DeckContext.ts`, `icons.tsx`)
- Slide stage and container reflow (`Slide.tsx`)
- Step reveals and entrance animations (`Build.tsx`, `Reveal.tsx`, `useInView.ts`)
- Canvas drawing overlay (`Annotator.tsx`)
- Responsive presentation layouts (`Cover.tsx`, `Split.tsx`, `Bento.tsx`, `StatGrid.tsx`, `BigNumber.tsx`, `CountUp.tsx`, `Timeline.tsx`, `Steps.tsx`, `Table.tsx`, `Charts.tsx`, `BrowserFrame.tsx`, `Quote.tsx`, `Comparison.tsx`)
- Scoped presentation styles and tokens (`src/features/presentations/styles/presentation.css`)

# what I am trying to achieve.
# Name of the preprocessor is xerxisfy Elite style sheet
# File extension .x2s
# Best language to use is typescript
I am building a css preprocessor like sass or stylus and other preprocessors, my preprocessor as you can see form the dir was purely using js and typescript, it should be a tool developer will use to compile multiple .css file into one like the way sass does. meaning uses would create many .x2s files, write their css code in there for style, run a watch or run a command to compile all the .x2s files into one .css file. 


To make Xerxisfy Elite Style Sheet (X2S) a powerhouse that beats existing tools, here is a list of "next-gen" features it should have in addition to what all other preprocessors have
Logic-Based Style Injection: Unlike Sass mixins that you have to manually @include, X2S should "scan" for repeated code and automatically bundle it into a single shared utility to keep file sizes tiny.
Scoped Global Variables: Create variables that are "context-aware." For example, a $primary color that automatically shifts shades based on whether it is placed inside a <header> or a <footer>.
Built-in "Ghost" Purging: Automatically detect and delete any CSS rule that isn't being used in your HTML or JavaScript during the build process, eliminating the need for extra tools like PurgeCSS.
Semantic Layering (Z-Index Management): Replace random numbers (like z-index: 9999) with named hierarchies (e.g., layer: modal; or layer: tooltip;). X2S then calculates the correct integers for you.
Automatic Asset Processing: If you link a heavy .png or .jpg in your stylesheet, X2S should automatically convert it to a modern, lightweight .webp format during compilation.
Native Multi-Theme "Baking": Write a single line of code like color: light(#000) dark(#fff); and let X2S automatically generate all the @media (prefers-color-scheme) queries for you.
Style "Locks" (The Xerx Guard): Define "Unbreakable" rules that throw a compiler error if another developer tries to override a core brand style, ensuring your design system stays consistent.
Dynamic Container Math: Variables that can perform calculations based on the parent container's width rather than just the entire screen (Viewport) width.
Zero-Config Polyfilling: X2S should automatically detect if you're using a brand-new CSS feature and add the necessary vendor prefixes or fallbacks for older browsers without needing PostCSS.
 
 
 
what all other preprocessors have
To ensure Xerxisfy Style Sheet (X2S) is a complete replacement for tools like Sass, Less, and PostCSS, it must include these "Industry Standard" features alongside your unique "Xerx" powers:
Core "Standard" Features (What Every Pro Tool Has)
Nesting: The ability to write CSS rules inside one another to match your HTML structure (e.g., .nav { .item { color: red; } }).
Variables: Storing reusable values like colors, fonts, and spacing (e.g., $brand-blue: #007bff;).
Mixins & Includes: Creating reusable blocks of styles that can be "injected" into different selectors to avoid repeating code.
Functions & Math: Performing calculations directly in the stylesheet, like width: 100% / 3; or darken($color, 10%);.
Partials & Imports: Breaking your CSS into smaller, manageable files (like _buttons.x2s) and merging them into one main file.
Control Directives: Using @if, @else, @each, and @for loops to generate complex styles dynamically.
Inheritance/Extending: Allowing one selector to "inherit" all the styles of another selector to reduce code bloat.
Advanced "Modern" Features (What PostCSS/Sass 2.0 Offer)
Auto-Prefixing: Automatically adding -webkit-, -moz-, and -ms- tags so your CSS works on all browsers without you typing them.
Minification: Compressing the final CSS file by removing all spaces and comments to make your website load faster.
Source Maps: Creating a "map" that tells your browser's Inspector exactly which .x2s file and line a style came from, making debugging easy.
Color Manipulation: Advanced tools to mix colors, change opacity, or convert Hex to RGB/HSL on the fly.
Built-in Modules: Pre-made libraries for common tasks like typography scales, grid systems, or reset CSS.

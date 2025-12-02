import { html } from "@codemirror/lang-html";
import { Prec } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import { basicSetup, EditorView } from "codemirror";
import { expandSelection, expandSelectionExtension, shrinkSelection, swapAnchorHead } from "../src/expand-selection";

const HTML_CODE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Sample HTML Structure</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!-- Stylesheet -->
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <!-- Header -->
  <header>
    <h1>My Website</h1>
    <nav>
      <ul>
        <li><a href="#home">Home</a></li>
        <li><a href="#about">About</a></li>
        <li><a href="#services">Services</a></li>
        <li><a href="#contact">Contact</a></li>
      </ul>
    </nav>
  </header>

  <!-- Main content -->
  <main>
    <section id="home">
      <h2>Welcome</h2>
      <p>This is a sample HTML page to demonstrate typical structure.</p>
    </section>

    <section id="about">
      <h2>About Us</h2>
      <p>We are a fictional company providing sample content.</p>
      <img src="about.jpg" alt="About image">
    </section>

    <section id="services">
      <h2>Services</h2>
      <ul>
        <li>Web Development</li>
        <li>Design</li>
        <li>Consulting</li>
      </ul>
    </section>

    <section id="contact">
      <h2>Contact</h2>
      <form>
        <label for="name">Name:</label>
        <input id="name" type="text" name="name">

        <label for="email">Email:</label>
        <input id="email" type="email" name="email">

        <label for="message">Message:</label>
        <textarea id="message" name="message"></textarea>

        <button type="submit">Send</button>
      </form>
    </section>
  </main>

  <!-- Footer -->
  <footer>
    <p>&copy; 2025 My Website</p>
  </footer>

  <!-- Scripts -->
  <script src="script.js"></script>
</body>
</html>`;

(window as any).view = new EditorView({
  doc: HTML_CODE,
  extensions: [
    basicSetup,
    html(),
    expandSelectionExtension({ cyclic: true, debug: true }),
    Prec.highest(
      keymap.of([
        {
          key: "Ctrl-Alt-Space",
          run: expandSelection,
        },
        {
          key: "Ctrl-Alt-Shift-Space",
          run: shrinkSelection,
        },
        {
          key: "Ctrl-t",
          run: swapAnchorHead,
        },
      ]),
    ),
  ],
  parent: document.getElementById("editor") || document.body,
});

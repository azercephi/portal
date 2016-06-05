function haha() {
    document.body.innerHTML = "Hello<a href='test'>test</a>";
}

function main() {
  // Initialization work goes here.
  document.getElementById('tag3').innerHTML = "Hello<a href='test'>test</a>";
}

// Add event listeners once the DOM has fully loaded by listening for the
// `DOMContentLoaded` event on the document, and adding your listeners to
// specific elements when it triggers.
// document.addEventListener('DOMContentLoaded', function () {
//   document.querySelector('button').addEventListener('click', main);
// });

// document.addEventListener('DOMContentLoaded', main);


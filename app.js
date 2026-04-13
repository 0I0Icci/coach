const startButton = document.getElementById("start-button");
const entryOptions = document.getElementById("entry-options");

startButton.addEventListener("click", () => {
  const isVisible = entryOptions.classList.toggle("is-visible");
  entryOptions.setAttribute("aria-hidden", String(!isVisible));
});

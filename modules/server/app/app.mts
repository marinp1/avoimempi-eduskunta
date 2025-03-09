import "./app.css";

document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll("nav ul li a");
  const tabContents = document.querySelectorAll(".tab-content");

  tabs.forEach((tab) => {
    tab.addEventListener("click", (event) => {
      event.preventDefault();
      const target = document.querySelector(tab.getAttribute("href")!);

      tabContents.forEach((content) => {
        content.classList.remove("active");
      });

      target!.classList.add("active");
    });
  });

  // Show the first tab by default
  document.querySelector("#current-composition")!.classList.add("active");
});

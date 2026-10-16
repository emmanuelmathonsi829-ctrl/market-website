const welcomeButton = document.getElementById("welcomeButton");
const yearElement = document.getElementById("year");

welcomeButton.addEventListener("click", function () {
alert("Welcome to Vertex! Thanks for visiting our website.");
});

yearElement.textContent = new Date().getFullYear();

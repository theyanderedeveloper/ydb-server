export function initDropdowns() {
    document.querySelectorAll(".dropdownbutton").forEach(button => {
        button.addEventListener("click", () => {
            button.parentElement.classList.toggle("active");
        });
    });
}
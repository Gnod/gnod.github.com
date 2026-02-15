// --- Main Application Logic ---
document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialize Lucide Icons
    // Checks if window.lucide exists (loaded via CDN) and then renders the icons.
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // 2. Intersection Observer for Scroll Animations
    // This logic adds the 'is-visible' class to elements with 'fade-in-section'
    // when they scroll into view, triggering the CSS opacity transition.
    const observerOptions = {
        root: null,
        rootMargin: "0px",
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll(".fade-in-section").forEach(section => {
        observer.observe(section);
    });
});

// 3. Navbar Scroll Effect
// Changes the navbar background and padding when the user scrolls down.
window.addEventListener("scroll", () => {
    const navbar = document.getElementById("navbar");
    if (!navbar) return;
    
    if (window.scrollY > 20) {
        navbar.classList.add("bg-black/90", "backdrop-blur-md", "border-[#222]", "py-4");
        navbar.classList.remove("py-6", "border-transparent");
    } else {
        navbar.classList.remove("bg-black/90", "backdrop-blur-md", "border-[#222]", "py-4");
        navbar.classList.add("py-6", "border-transparent");
    }
});
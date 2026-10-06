const doctors = [
    {
        name: "Dr. Ananya Sharma",
        initials: "AS",
        specialty: "Dermatologist · 12 years experience",
        experience: "12 years exp.",
        rating: 4.9,
        reviews: 248,
        clinic: "ClearSkin Dermatology Clinic",
        area: "Indiranagar",
        fee: 600,
        available: true
    },
    {
        name: "Dr. Rohan Mehta",
        initials: "RM",
        specialty: "Dentist · 9 years experience",
        experience: "9 years exp.",
        rating: 4.8,
        reviews: 192,
        clinic: "Bright Smile Dental Care",
        area: "Koramangala",
        fee: 500,
        available: true
    },
    {
        name: "Dr. Kavya Nair",
        initials: "KN",
        specialty: "General physician · 14 years experience",
        experience: "14 years exp.",
        rating: 4.9,
        reviews: 326,
        clinic: "WellSpring Family Clinic",
        area: "Jayanagar",
        fee: 700,
        available: false
    },
    {
        name: "Dr. Arjun Rao",
        initials: "AR",
        specialty: "Cardiologist · 11 years experience",
        experience: "11 years exp.",
        rating: 4.7,
        reviews: 154,
        clinic: "HeartFirst Cardiac Centre",
        area: "HSR Layout",
        fee: 850,
        available: true
    },
    {
        name: "Dr. Meera Iyer",
        initials: "MI",
        specialty: "Eye specialist · 10 years experience",
        experience: "10 years exp.",
        rating: 4.8,
        reviews: 211,
        clinic: "Vision Care Eye Clinic",
        area: "Whitefield",
        fee: 650,
        available: false
    },
    {
        name: "Dr. Nisha Kapoor",
        initials: "NK",
        specialty: "Gynecologist · 13 years experience",
        experience: "13 years exp.",
        rating: 4.9,
        reviews: 287,
        clinic: "Bloom Women's Health",
        area: "Indiranagar",
        fee: 750,
        available: true
    }
];

const results = document.getElementById("doctorResults");
const searchForm = document.getElementById("searchForm");
const specialtyInput = document.getElementById("specialtyInput");
const locationInput = document.getElementById("locationInput");
const resultsLocation = document.getElementById("resultsLocation");
const emptyState = document.getElementById("emptyState");
const bookingDialog = document.getElementById("bookingDialog");
const toast = document.getElementById("toast");
let activeFilter = "all";
let activeSearch = "";
let toastTimer;

function renderDoctors() {
    const query = activeSearch.trim().toLowerCase();
    const location = locationInput.value.trim().toLowerCase();
    const isBengaluru = location.includes("bengaluru") || location.includes("bangalore");
    let matches = doctors.filter((doctor) => {
        const searchable = `${doctor.name} ${doctor.specialty} ${doctor.clinic} ${doctor.area}`.toLowerCase();
        const matchesQuery = !query || searchable.includes(query);
        const matchesLocation = !location || isBengaluru || doctor.area.toLowerCase().includes(location);
        const matchesFilter = activeFilter === "all"
            || (activeFilter === "available" && doctor.available)
            || (activeFilter === "rating" && doctor.rating >= 4.8);
        return matchesQuery && matchesLocation && matchesFilter;
    });

    if (activeFilter === "rating") {
        matches = matches.sort((first, second) => second.rating - first.rating || second.reviews - first.reviews);
    }

    results.innerHTML = matches.map((doctor, index) => `
        <article class="doctor-card">
            <div class="doctor-card-top">
                <div class="doctor-avatar avatar-${index % 4}">${doctor.initials}<span class="verified-mark" aria-label="Verified doctor">✓</span></div>
                <div>
                    <h3 class="doctor-name">${doctor.name}</h3>
                    <p class="doctor-specialty">${doctor.specialty}</p>
                </div>
            </div>
            <div class="doctor-meta">
                <span class="meta-rating">★ ${doctor.rating}</span>
                <span>${doctor.reviews} patient reviews</span>
                <span>${doctor.experience}</span>
            </div>
            <div class="doctor-clinic"><strong>${doctor.clinic}</strong>${doctor.area} · ${doctor.available ? "Available today" : "Next available tomorrow"}</div>
            <div class="doctor-booking">
                <span class="fee">₹${doctor.fee}<small>Consultation fee</small></span>
                <button class="book-button" type="button" data-doctor="${doctor.name}">Book appointment</button>
            </div>
        </article>
    `).join("");

    emptyState.hidden = matches.length > 0;
    results.hidden = matches.length === 0;
}

function searchDoctors(query = specialtyInput.value) {
    activeSearch = query;
    specialtyInput.value = query;
    const city = locationInput.value.trim();
    resultsLocation.textContent = `${query.trim() ? `Doctors matching “${query.trim()}”` : "Top-rated doctors"}${city ? ` in ${city}` : ""}`;
    renderDoctors();
    document.getElementById("doctors-title").scrollIntoView({ behavior: "smooth", block: "start" });
}

function showToast(message) {
    toast.textContent = message;
    toast.classList.add("visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 3200);
}

searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    searchDoctors();
});

document.querySelectorAll("[data-search]").forEach((button) => {
    button.addEventListener("click", () => searchDoctors(button.dataset.search));
});

document.querySelectorAll(".filter-chip").forEach((button) => {
    button.addEventListener("click", () => {
        activeFilter = button.dataset.filter;
        document.querySelectorAll(".filter-chip").forEach((chip) => chip.classList.toggle("active", chip === button));
        renderDoctors();
    });
});

results.addEventListener("click", (event) => {
    const button = event.target.closest("[data-doctor]");
    if (!button) return;
    document.getElementById("bookingDoctor").textContent = button.dataset.doctor;
    bookingDialog.showModal();
});

document.getElementById("closeDialog").addEventListener("click", () => bookingDialog.close());
bookingDialog.addEventListener("click", (event) => {
    if (event.target === bookingDialog) bookingDialog.close();
});

const today = new Date();
today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
document.getElementById("appointmentDate").min = today.toISOString().slice(0, 10);
document.getElementById("bookingForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const date = new Date(`${formData.get("date")}T00:00:00`).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
    const doctor = document.getElementById("bookingDoctor").textContent;
    const time = formData.get("time");
    bookingDialog.close();
    event.currentTarget.reset();
    showToast(`Appointment request for ${doctor} on ${date} at ${time}.`);
});

document.getElementById("clearSearch").addEventListener("click", () => {
    activeFilter = "all";
    document.querySelectorAll(".filter-chip").forEach((chip) => chip.classList.toggle("active", chip.dataset.filter === "all"));
    searchDoctors("");
});

document.getElementById("loginButton").addEventListener("click", () => {
    showToast("Patient sign-in will be available soon.");
});

renderDoctors();

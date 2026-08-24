/* Akrapex waitlist data */
const ACTORS = {
  developer: {
    key: "developer",
    label: "Developer",
    accent: "#2A6B84",
    eyebrow: "For developers",
    valueProp:
      "Put your developments in front of verified, ready-to-move buyers — before Akrapex goes public.",
    trust: [
      "Priority placement for your projects on launch day",
      "A direct pipeline to our demand-side waitlist",
      "Eco Score visibility that rewards sustainable builds",
    ],
  },
  landlord: {
    key: "landlord",
    label: "Landlord / Owner",
    accent: "#2A6B53",
    eyebrow: "For landlords & owners",
    valueProp:
      "List your properties to genuine, verified renters and buyers — no more chasing unqualified leads.",
    trust: [
      "Matched with verified tenants and buyers",
      "Zero listing cost through pre-launch",
      "First access to the owner dashboard",
    ],
  },
  manager: {
    key: "manager",
    label: "Property Manager",
    accent: "#2A6B84",
    eyebrow: "For property managers",
    valueProp:
      "Manage your whole portfolio — landlords, units and maintenance — in one place built for Abuja.",
    trust: [
      "Replace scattered spreadsheets with one system",
      "Onboarding support for your full portfolio",
      "Priority manager verification badge",
    ],
  },
  agent: {
    key: "agent",
    label: "Agent / Broker",
    accent: "#A87B0E",
    eyebrow: "For agents & brokers",
    valueProp:
      "Get verified, stand out, and reach renters and buyers actively searching your areas.",
    trust: [
      "An AEAN-aligned verification badge",
      "Featured placement for verified agents",
      "Real leads — not tyre-kickers",
    ],
  },
  renter: {
    key: "renter",
    label: "Renter / Buyer",
    accent: "#2A6B53",
    eyebrow: "For renters & buyers",
    valueProp:
      "Find a verified home in Abuja you can trust — with a transparent Eco Score on every listing.",
    trust: [
      "Only verified, real listings — no scams",
      "Filter by neighbourhood, budget and Eco Score",
      "First access the moment your area goes live",
    ],
  },
};

// Every role now uses the same email-only waitlist field.
const WAITLIST_FIELDS = [
  {
    name: "email",
    label: "Email",
    type: "email",
    required: true,
    placeholder: "you@email.com",
  },
];

const FAQS = [
  {
    q: "What exactly is Akrapex?",
    a: "Akrapex is a platform for renting, buying and managing property in Abuja, built around verified listings and a transparent Eco Score on every home — so you can see how sustainable a property really is before you commit.",
  },
  {
    q: "Does joining the waitlist cost anything?",
    a: "No. Joining is completely free. The waitlist simply reserves your place and puts you first in line for launch-day access to the tools built for your role.",
  },
  {
    q: "Why are there different doors?",
    a: "One site, five doors. Choose the role that best describes you, then join with only your email address. Your signup is tagged to that role so the updates you receive stay relevant.",
  },
  {
    q: "What happens after I sign up?",
    a: "You get an email confirmation with a referral link, then a short monthly update tailored to your role. Waitlist members get first access in the final run-up to launch, and your download link arrives the moment we go live.",
  },
  {
    q: "What does eco-conscious living actually mean?",
    a: "It’s choosing a home that treads lightly and lives well: lower energy and water use, cleaner power, less waste, healthier materials and greener surroundings. In practice that means smaller bills, a more comfortable home, and a smaller footprint — without giving anything up. Akrapex makes those qualities visible so you can factor them into a decision, instead of only ever seeing price and location.",
  },
  {
    q: "What does “sustainability in real estate” mean — and what does the Eco Score measure?",
    a: "Sustainable real estate looks past the asking price to how a property performs over its whole life — how it uses energy and water, how it handles waste, the quality of its build, and its impact on the neighbourhood around it. The Akrapex Eco Score turns that into one clear, comparable rating on every listing, drawing on factors like power source (grid, solar, hybrid), water and waste setup, materials and green space — so “green” stops being a vague claim and becomes something you can actually compare.",
  },
  {
    q: "I’m a developer — how does Akrapex create value for me?",
    a: "Your projects reach verified, ready-to-move buyers before launch day, and sustainable builds earn a visible Eco Score that sets you apart and can support a stronger price. Instead of marketing into the void, you get a direct pipeline to demand that is already qualified — shorter sales cycles and a credibility signal that rewards building responsibly.",
  },
  {
    q: "I’m a landlord or owner — what do I get out of it?",
    a: "You list to genuine, verified renters and buyers — no more chasing unqualified leads or fielding endless calls. Listing is free through pre-launch, a good Eco Score helps your property stand out and hold its value, and you get first access to an owner dashboard that keeps enquiries, viewings and documents in one place.",
  },
  {
    q: "I’m a property manager — how does this help me?",
    a: "Akrapex replaces scattered spreadsheets and WhatsApp threads with one system for your whole portfolio — landlords, units, maintenance and tenants in a single view. You get onboarding support to bring your full book across and a priority verification badge that signals trust to the owners and tenants you work with, so you win and keep more business.",
  },
  {
    q: "I’m an agent or broker — how does this grow my business?",
    a: "Getting verified puts an AEAN-aligned trust badge on your profile and earns featured placement in front of renters and buyers actively searching your areas. The leads you get are real and intent-driven — not tyre-kickers — so you spend less time filtering and more time closing, and your reputation compounds as your verified track record grows.",
  },
  {
    q: "I’m a renter or buyer — why should I use Akrapex?",
    a: "You see only verified, real listings — no scams, no ghost properties — and you can filter by neighbourhood, budget and Eco Score to find a home that fits your life and your values. You get first access the moment your area goes live, and a clear read on how sustainable (and how cheap to run) a home is before you ever commit.",
  },
];

/* Submissions continue to use the endpoint from the supplied page. */
const FORM_ENDPOINT = "https://formspree.io/f/mpqvljzd";

const views = {
  home: document.getElementById("view-home"),
  form: document.getElementById("view-form"),
  done: document.getElementById("view-done"),
};

let actorKey = null;
let values = {};
let errors = {};
let submitting = false;
let refCode = "";
let openFaq = 0;

function show(name) {
  Object.entries(views).forEach(([key, view]) => {
    view.style.display = key === name ? "" : "none";
  });
  window.scrollTo({ top: 0, behavior: "auto" });
}

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderFaq() {
  document.getElementById("faq-list").innerHTML = FAQS.map(
    (faq, index) => `
      <div class="border-b border-white/15">
        <button class="flex w-full items-center justify-between gap-5 bg-transparent py-[22px] text-left text-lg font-semibold text-[#EAF0E9]" data-faq="${index}" aria-expanded="${openFaq === index}">
          ${esc(faq.q)}
          <span class="shrink-0 text-2xl leading-none text-[#FFD753]">${openFaq === index ? "–" : "+"}</span>
        </button>
        ${openFaq === index ? `<p class="mb-6 max-w-[62ch] text-base leading-[1.6] text-[#B9CBC1]">${esc(faq.a)}</p>` : ""}
      </div>`,
  ).join("");
}

document.getElementById("faq-list").addEventListener("click", (event) => {
  const button = event.target.closest("[data-faq]");
  if (!button) return;
  const index = Number(button.dataset.faq);
  openFaq = openFaq === index ? -1 : index;
  renderFaq();
});

document.querySelectorAll(".door").forEach((button) => {
  button.addEventListener("click", () => selectActor(button.dataset.actor));
});

function selectActor(key) {
  actorKey = key;
  values = {};
  errors = {};

  const actor = ACTORS[key];
  const eyebrow = document.getElementById("f-eyebrow");
  eyebrow.textContent = actor.eyebrow;
  eyebrow.style.color = actor.accent;
  document.getElementById("f-title").textContent = actor.label;
  document.getElementById("f-value").textContent = actor.valueProp;
  document.getElementById("f-trust").innerHTML = actor.trust
    .map(
      (item) => `
        <div class="flex items-start gap-[13px] text-base leading-[1.45] text-[#DCE6DF]">
          <span class="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#E4EDE6] text-[#2A6B53]">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
          </span>
          <span>${esc(item)}</span>
        </div>`,
    )
    .join("");

  renderFields();
  document.getElementById("f-submit-err").innerHTML = "";
  show("form");
}

function renderFields() {
  document.getElementById("f-fields").innerHTML = WAITLIST_FIELDS.map((field) => {
    const value = values[field.name] || "";
    const error = errors[field.name]
      ? `<div class="mt-1.5 text-[13px] text-[#C0492E]">${esc(errors[field.name])}</div>`
      : "";

    return `
      <div>
        <label for="waitlist-${field.name}" class="mb-2.5 block text-[13px] font-bold uppercase tracking-[0.04em] text-[#1F3D2E]">
          ${esc(field.label)}${field.required ? '<i class="not-italic text-[#C0492E]"> *</i>' : ""}
        </label>
        <input
          id="waitlist-${field.name}"
          class="w-full rounded-2xl border border-[#D8E2D5] bg-white px-4 py-[15px] text-base text-[#1F3D2E] transition focus:border-[#2E7D32] focus:outline-none focus:ring-[3px] focus:ring-[#2E7D32]/15"
          type="${field.type}"
          name="${field.name}"
          value="${esc(value)}"
          placeholder="${esc(field.placeholder || "")}"
          autocomplete="email"
          inputmode="email"
        >
        ${error}
      </div>`;
  }).join("");
}

document.getElementById("f-fields").addEventListener("input", (event) => {
  if (!event.target.name) return;
  values[event.target.name] = event.target.value;
  if (errors[event.target.name]) {
    delete errors[event.target.name];
    renderFields();
    document.querySelector(`[name="${event.target.name}"]`)?.focus();
  }
});

document.getElementById("wl-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (submitting) return;

  errors = {};
  const email = (values.email || "").trim();

  if (!email) {
    errors.email = "This field is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Enter a valid email address";
  }

  if (Object.keys(errors).length) {
    renderFields();
    return;
  }

  const emailName = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "") || "member";
  refCode = emailName + Math.floor(100 + Math.random() * 900);

  const payload = {
    _subject: `Akrapex waitlist — ${ACTORS[actorKey].label}`,
    email,
    actor: ACTORS[actorKey].label,
    actorKey,
    referralCode: refCode,
    submittedAt: new Date().toISOString(),
  };

  const button = document.getElementById("f-submit");
  submitting = true;
  button.disabled = true;
  button.textContent = "Joining…";

  try {
    const response = await fetch(FORM_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let message = "";
      try {
        const result = await response.json();
        if (result?.errors) {
          message = result.errors.map((item) => item.message).join(" ");
        }
      } catch (_) {
        // The fallback message below handles non-JSON errors.
      }
      throw new Error(message || `HTTP ${response.status}`);
    }

    confirmDone();
  } catch (error) {
    const message =
      error?.message && !/^HTTP /.test(error.message)
        ? error.message
        : "We couldn't submit your email just now — please check your connection and try again.";
    document.getElementById("f-submit-err").innerHTML =
      `<div class="mt-5 rounded-xl border border-[#EBC9BC] bg-[#FBEEE9] px-4 py-[13px] text-[14.5px] leading-[1.45] text-[#A23B22]">${esc(message)}</div>`;
  } finally {
    submitting = false;
    button.disabled = false;
    button.textContent = "Claim my place on the list";
  }
});

function claimNumber() {
  const seed = 741;
  let number = seed + 1;
  try {
    const stored = Number.parseInt(localStorage.getItem("akrapex_wl_count"), 10);
    number = (Number.isNaN(stored) ? seed : stored) + 1;
    localStorage.setItem("akrapex_wl_count", String(number));
  } catch (_) {
    // The confirmation still works if localStorage is unavailable.
  }
  return number;
}

function confirmDone() {
  const number = claimNumber();
  document.getElementById("d-eyebrow").textContent = ACTORS[actorKey].eyebrow;
  document.getElementById("d-num").textContent = `#${number.toLocaleString("en-US")}`;
  document.getElementById("d-note").textContent =
    number > 0 && number <= 1000
      ? `Founder pricing secured — ${(1000 - number).toLocaleString("en-US")} of 1,000 spots left`
      : "You're on the priority launch list";
  document.getElementById("d-ref").value = `akrapex.ng/join?ref=${refCode}`;
  document.getElementById("btn-copy").textContent = "Copy";
  show("done");
}

document.getElementById("btn-copy").addEventListener("click", async () => {
  const link = `https://akrapex.ng/join?ref=${refCode}`;
  try {
    await navigator.clipboard.writeText(link);
  } catch (_) {
    const input = document.getElementById("d-ref");
    input.select();
    document.execCommand("copy");
  }

  const button = document.getElementById("btn-copy");
  button.textContent = "Copied ✓";
  window.setTimeout(() => {
    button.textContent = "Copy";
  }, 2200);
});

document.getElementById("btn-back").addEventListener("click", goHome);
document.getElementById("btn-again").addEventListener("click", goHome);
document.getElementById("btn-home").addEventListener("click", goHome);

function goHome() {
  actorKey = null;
  values = {};
  errors = {};
  show("home");
}

renderFaq();

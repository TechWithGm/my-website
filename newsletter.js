(() => {
  "use strict";

  document.querySelectorAll(".subscribe").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const emailInput = form.querySelector('input[name="email"]');
      const submitButton = form.querySelector('button[type="submit"]');
      const status = form.parentElement.querySelector(".subscribe-result");
      if (!emailInput || !submitButton || !status) return;

      status.textContent = "Subscribing…";
      submitButton.disabled = true;
      try {
        const response = await fetch("/api/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailInput.value.trim() })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `Subscription failed (${response.status}).`);
        status.textContent = result.message || "Subscription saved.";
        form.reset();
      } catch (error) {
        status.textContent = error.message || "Subscription could not be saved. Please try again.";
      } finally {
        submitButton.disabled = false;
      }
    });
  });
})();

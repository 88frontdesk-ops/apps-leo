(() => {
  const initDailyAccordions = () => {
    document.querySelectorAll("#daily_table .accordion").forEach((accordionButton) => {
      if (accordionButton.dataset.dailyAccordionBound === "1") return;
      accordionButton.dataset.dailyAccordionBound = "1";
      accordionButton.addEventListener("click", function () {
        const panel = this.nextElementSibling;
        const icon = this.querySelector(".more_down_icon_Class");
        document.querySelectorAll("#daily_table .accordion").forEach((other) => {
          if (other !== this) {
            other.classList.remove("active");
            const otherPanel = other.nextElementSibling;
            const otherIcon = other.querySelector(".more_down_icon_Class");
            if (otherPanel) otherPanel.style.maxHeight = null;
            if (otherIcon) otherIcon.style.transform = "rotate(0deg)";
          }
        });
        this.classList.toggle("active");
        if (!panel) return;
        if (this.classList.contains("active")) {
          panel.style.maxHeight = `${panel.scrollHeight}px`;
          if (icon) icon.style.transform = "rotate(180deg)";
        } else {
          panel.style.maxHeight = null;
          if (icon) icon.style.transform = "rotate(0deg)";
        }
      });
    });
  };

  const observer = new MutationObserver(initDailyAccordions);
  const start = () => {
    const table = document.getElementById("daily_table");
    if (table) {
      initDailyAccordions();
      observer.observe(table, { childList: true, subtree: true });
    }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();

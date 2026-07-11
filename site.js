(function () {
  var c = window.IWP_SITE_CONFIG || {};

  document.querySelectorAll("[data-config]").forEach(function (el) {
    var key = el.getAttribute("data-config");
    if (c[key]) el.textContent = c[key];
  });

  document.querySelectorAll("[data-href-config]").forEach(function (el) {
    var key = el.getAttribute("data-href-config");
    if (c[key]) el.href = c[key];
  });

  document.querySelectorAll("[data-mailto-config]").forEach(function (el) {
    var key = el.getAttribute("data-mailto-config");
    if (c[key]) el.href = "mailto:" + c[key];
  });

  document.querySelectorAll("[data-launch-app]").forEach(function (el) {
    if (!c.appUrl || c.appUrl.indexOf("PASTE_") === 0) {
      el.href = "#launch";
      el.addEventListener("click", function (event) {
        event.preventDefault();
        alert("The Community Connections application link is being finalized.");
      });
    } else {
      el.href = c.appUrl;
      el.target = "_blank";
      el.rel = "noopener";
    }
  });


  var revealElements = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealElements.forEach(function (element) {
      if (!element.classList.contains("is-visible")) observer.observe(element);
    });
  } else {
    revealElements.forEach(function (element) {
      element.classList.add("is-visible");
    });
  }
})();

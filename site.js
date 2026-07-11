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
  var launchButtons = document.querySelectorAll("[data-launch-app]");
  launchButtons.forEach(function (el) {
    if (!c.appUrl || c.appUrl.indexOf("PASTE_") === 0) {
      el.href = "#launch";
      el.addEventListener("click", function (event) {
        event.preventDefault();
        alert("Add the public Apps Script URL to config.js first.");
      });
    } else {
      el.href = c.appUrl;
    }
  });
})();
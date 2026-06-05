(function () {
  var form = document.getElementById("contact-form");
  if (!form) return;

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var data = new FormData(form);
    var name = String(data.get("name") || "").trim();
    var email = String(data.get("email") || "").trim();
    var message = String(data.get("message") || "").trim();
    var subject = encodeURIComponent("Westlake Analytics | Contact");
    var body = encodeURIComponent(
      "Name: " + name + "\nEmail: " + email + "\n\n" + message,
    );
    window.location.href = "mailto:chris@westlakeanalytics.com?subject=" + subject + "&body=" + body;
  });
})();

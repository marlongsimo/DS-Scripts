// Gemeinsames Verhalten: mobiles Menü + aktiven Nav-Link markieren
document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');

  if (toggle && links) {
    toggle.addEventListener('click', function () {
      links.classList.toggle('open');
    });
  }

  document.querySelectorAll('.nav-links a[data-nav]').forEach(function (link) {
    if (link.getAttribute('data-nav') === 'start') {
      link.classList.add('active');
    }
  });
});

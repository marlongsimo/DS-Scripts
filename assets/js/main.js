// Gemeinsames Verhalten: mobiles Menü + aktiven Nav-Link markieren
document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');

  if (toggle && links) {
    toggle.addEventListener('click', function () {
      links.classList.toggle('open');
    });
  }

  var section = window.location.pathname.indexOf('/tools/') !== -1 ? 'tools' : 'start';

  document.querySelectorAll('.nav-links a[data-nav]').forEach(function (link) {
    if (link.getAttribute('data-nav') === section) {
      link.classList.add('active');
    }
  });
});

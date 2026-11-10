(() => {
  const requested = new URLSearchParams(window.location.search).get('lang');
  const language = ['en', 'zh'].includes(requested) ? requested : 'en';
  const current = document.querySelector(`[data-site-lang="${language}"]`);
  document.documentElement.lang = { en: 'en', zh: 'zh-CN' }[language];
  document.querySelectorAll('[data-site-lang]').forEach((section) => {
    section.hidden = section.dataset.siteLang !== language;
  });
  document.querySelectorAll('[data-en][data-zh]').forEach((element) => {
    element.textContent = element.dataset[language];
  });
  document.querySelectorAll('[data-local]').forEach((link) => {
    const url = new URL(link.getAttribute('href'), window.location.href);
    url.searchParams.set('lang', language);
    link.href = `${url.pathname}${url.search}${url.hash}`;
  });
  document.querySelectorAll('[data-locale]').forEach((link) => {
    if (link.dataset.locale === language) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');
  });
  if (current) {
    document.title = current.dataset.title;
    document.querySelector('meta[name="description"]').content = current.dataset.description;
    document.querySelector('meta[property="og:title"]').content = current.dataset.title;
    document.querySelector('meta[property="og:description"]').content = current.dataset.description;
  }
})();

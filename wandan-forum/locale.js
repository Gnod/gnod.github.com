(() => {
  const requested = new URLSearchParams(window.location.search).get('lang');
  const language = ['zh', 'en', 'ja'].includes(requested) ? requested : 'zh';
  const current = document.querySelector(`[data-site-lang="${language}"]`);
  document.documentElement.lang = { zh: 'zh-CN', en: 'en', ja: 'ja' }[language];
  document.querySelectorAll('[data-site-lang]').forEach((section) => {
    section.hidden = section.dataset.siteLang !== language;
  });
  document.querySelectorAll('[data-zh][data-en][data-ja]').forEach((element) => {
    element.textContent = element.dataset[language];
  });
  document.querySelectorAll('[data-local]').forEach((link) => {
    const url = new URL(link.getAttribute('href'), window.location.origin);
    url.searchParams.set('lang', language);
    link.href = `${url.pathname}${url.search}`;
  });
  document.querySelectorAll('[data-locale]').forEach((link) => {
    if (link.dataset.locale === language) link.setAttribute('aria-current', 'true');
  });
  if (current) {
    document.title = current.dataset.title;
    document.querySelector('meta[name="description"]').content = current.dataset.description;
    document.querySelector('meta[property="og:title"]').content = current.dataset.title;
    document.querySelector('meta[property="og:description"]').content = current.dataset.description;
  }
})();

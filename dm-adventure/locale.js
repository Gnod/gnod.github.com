(() => {
  const locale = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'zh';
  document.documentElement.dataset.locale = locale;
  document.documentElement.lang = locale === 'en' ? 'en' : 'zh-CN';
  document.title = document.documentElement.dataset[locale === 'en' ? 'titleEn' : 'titleZh'] || document.title;
  document.querySelectorAll('[data-locale]').forEach(link => {
    const target = new URL(location.href);
    target.searchParams.set('lang', link.dataset.locale);
    link.href = target.pathname + target.search;
    if (link.dataset.locale === locale) link.setAttribute('aria-current', 'true');
  });
  document.querySelectorAll('a[href^="/dm-adventure/"]:not([data-locale])').forEach(link => {
    const target = new URL(link.href);
    target.searchParams.set('lang', locale);
    link.href = target.pathname + target.search + target.hash;
  });
  document.querySelectorAll('img[data-alt-en]').forEach(image => {
    if (locale === 'en') {
      if (image.dataset.sourceEn) image.src = image.dataset.sourceEn;
      image.alt = image.dataset.altEn || image.alt;
    }
  });
})();

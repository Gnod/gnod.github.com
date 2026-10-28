(() => {
  const english = new URLSearchParams(location.search).get('lang') === 'en';
  const lang = english ? 'en' : 'zh';
  document.documentElement.lang = english ? 'en' : 'zh-CN';
  for (const element of document.querySelectorAll('[data-lang]')) element.hidden = element.dataset.lang !== lang;
  document.title = document.body.dataset[english ? 'titleEn' : 'titleZh'];
  const description = document.body.dataset[english ? 'descriptionEn' : 'descriptionZh'];
  document.querySelector('meta[name="description"]').content = description;
  document.querySelector('meta[property="og:title"]').content = document.title;
  document.querySelector('meta[property="og:description"]').content = description;
  for (const link of document.querySelectorAll('a[data-local]')) {
    const url = new URL(link.href);
    if (english) url.searchParams.set('lang', 'en');
    link.href = url;
  }
  const toggle = document.querySelector('.locale');
  toggle.textContent = english ? '中文' : 'EN';
  toggle.href = english ? '?lang=zh' : '?lang=en';
  toggle.setAttribute('aria-label', english ? '切换为中文' : 'Switch to English');
})();

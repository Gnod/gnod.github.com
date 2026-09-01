(() => {
  const copy = {
    en: {
      battle: {
        alt: "A Four Crowns battle with four kingdom pillars, a crisis, advisors, and a poker hand",
        caption: "A hand decides more than a score—it decides which pillar survives the next crisis."
      },
      court: {
        alt: "Three advisors in the royal court market",
        caption: "<span>THE COURT</span><strong>24 advisors. 13 edicts.<br>Every build reshapes your rule.</strong>"
      },
      map: {
        alt: "The campaign map across the four realms of Four Crowns",
        caption: "From the Verdant Fields to the Iron March."
      }
    },
    zh: {
      battle: {
        alt: "《四冠》的战斗界面，显示四根国柱、危机、顾问与手牌",
        caption: "一手牌决定的不只是分数，也决定下一场危机中哪根国柱能够撑住。"
      },
      court: {
        alt: "王廷市集中的三名顾问",
        caption: "<span>王廷</span><strong>24 名顾问，13 道敕令。<br>每一次构筑都会重塑你的统治。</strong>"
      },
      map: {
        alt: "《四冠》横跨四国的征程地图",
        caption: "从翠野沃土，走向钢铁边境。"
      }
    },
    ja: {
      battle: {
        alt: "四つの国柱、危機、顧問、手札が表示された『Four Crowns』の戦闘画面",
        caption: "一つの役が決めるのは得点だけではない。次の危機を生き延びる国柱も決まる。"
      },
      court: {
        alt: "王廷の市場に並ぶ三人の顧問",
        caption: "<span>王廷</span><strong>24人の顧問、13種の勅令。<br>構築するたび、統治の形が変わる。</strong>"
      },
      map: {
        alt: "『Four Crowns』の四王国を巡る征程マップ",
        caption: "緑豊かな沃野から、鉄の辺境へ。"
      }
    }
  };

  function normalizeLanguage(value) {
    const language = String(value || "").toLowerCase();
    if (language.startsWith("zh")) return "zh";
    if (language.startsWith("ja")) return "ja";
    if (language.startsWith("ko")) return "ko";
    if (language.startsWith("en")) return "en";
    return "";
  }

  function storedLanguage() {
    try {
      return localStorage.getItem("gnodstudio.lang");
    } catch {
      return "";
    }
  }

  const params = new URLSearchParams(window.location.search);
  const requestedLanguage = normalizeLanguage(params.get("lang")) ||
    normalizeLanguage(storedLanguage()) ||
    normalizeLanguage(navigator.language) ||
    "en";
  const screenshotLanguage = requestedLanguage === "zh" || requestedLanguage === "ja" ? requestedLanguage : "en";

  if (normalizeLanguage(params.get("lang"))) {
    try {
      localStorage.setItem("gnodstudio.lang", requestedLanguage);
    } catch {
      // URL language selection still works when browser storage is unavailable.
    }
  }

  document.querySelectorAll("[data-shot]").forEach((image) => {
    const shot = image.dataset.shot;
    const localizedCopy = copy[screenshotLanguage][shot];
    if (!localizedCopy) return;
    image.src = `/four-crowns/assets/screenshots/${screenshotLanguage}/${shot}.jpg`;
    image.alt = localizedCopy.alt;
  });

  document.querySelectorAll("[data-shot-copy]").forEach((element) => {
    const localizedCopy = copy[screenshotLanguage][element.dataset.shotCopy];
    if (!localizedCopy) return;
    if (element.classList.contains("visual-caption")) element.innerHTML = localizedCopy.caption;
    else element.textContent = localizedCopy.caption;
  });

  document.querySelectorAll("[data-locale]").forEach((link) => {
    const active = link.dataset.locale === screenshotLanguage;
    link.setAttribute("aria-current", String(active));
  });
})();

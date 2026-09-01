(() => {
  const languages = {
    zh: { label: "中", htmlLang: "zh-CN" },
    en: { label: "EN", htmlLang: "en" },
    ja: { label: "日", htmlLang: "ja" },
    ko: { label: "한", htmlLang: "ko" }
  };

  const legalDate = {
    zh: "生效日期：2026 年 6 月 18 日",
    en: "Effective date: June 18, 2026",
    ja: "施行日：2026年6月18日",
    ko: "시행일: 2026년 6월 18일"
  };

  const shared = {
    navHome: { zh: "首页", en: "Home", ja: "ホーム", ko: "홈" },
    navWorks: { zh: "作品", en: "Works", ja: "作品", ko: "작품" },
    navAbout: { zh: "关于", en: "About", ja: "紹介", ko: "소개" },
    navPrivacy: { zh: "隐私", en: "Privacy", ja: "プライバシー", ko: "개인정보" },
    navOpenSource: { zh: "开源声明", en: "Open Source", ja: "オープンソース", ko: "오픈소스" },
    backHomeReel: { zh: "返回 HomeReel", en: "Back to HomeReel", ja: "HomeReel に戻る", ko: "HomeReel로 돌아가기" },
    appStore: { zh: "App Store", en: "App Store", ja: "App Store", ko: "App Store" },
    allRights: { zh: "保留所有权利。", en: "ALL RIGHTS RESERVED.", ja: "All rights reserved.", ko: "All rights reserved." }
  };

  const text = {
    ...shared,
    homeTitle: { zh: "Gnod Studio", en: "Gnod Studio", ja: "Gnod Studio", ko: "Gnod Studio" },
    homeDescription: {
      zh: "Gnod Studio 的产品、应用与创作项目。",
      en: "Products, apps, and creative projects from Gnod Studio.",
      ja: "Gnod Studio のプロダクト、アプリ、制作プロジェクト。",
      ko: "Gnod Studio의 제품, 앱, 창작 프로젝트."
    },
    role: { zh: "产品与工程创作者", en: "Work Architect", ja: "プロダクト設計者", ko: "제품과 엔지니어링 크리에이터" },
    heroLine: { zh: "专注创造好用、耐看的产品。", en: "Focusing on creating products.", ja: "使いやすく、長く使えるプロダクトをつくります。", ko: "오래 쓰기 좋은 제품을 만드는 데 집중합니다." },
    viewWorks: { zh: "查看作品", en: "View Works", ja: "作品を見る", ko: "작품 보기" },
    scroll: { zh: "滚动", en: "Scroll", ja: "スクロール", ko: "스크롤" },
    latestProjects: { zh: "近期项目", en: "Latest Projects", ja: "最近のプロジェクト", ko: "최근 프로젝트" },
    selectedWorks: { zh: "精选作品", en: "Selected Works", ja: "主な作品", ko: "선정 작품" },
    fourCrownsEyebrow: { zh: "扑克王国构筑 Roguelike", en: "Poker kingdom roguelike", ja: "ポーカー王国ローグライク", ko: "포커 왕국 로그라이크" },
    fourCrownsSummary: {
      zh: "用扑克牌型治理王国。守住军队、金库、民心与粮仓，在十二场危机中建立你的宫廷。",
      en: "Rule a kingdom with poker hands. Defend four pillars through twelve crises and build a court that reshapes every campaign.",
      ja: "ポーカーの役で王国を統治。四つの柱を守り、十二の危機を越えながら自分だけの宮廷を築こう。",
      ko: "포커 핸드로 왕국을 다스리세요. 네 개의 기둥을 지키고 열두 번의 위기를 넘으며 나만의 궁정을 만드세요."
    },
    exploreFourCrowns: { zh: "查看游戏介绍", en: "Explore Four Crowns", ja: "Four Crowns を見る", ko: "Four Crowns 살펴보기" },
    fourCrownsAvailability: { zh: "App Store 准备中", en: "Coming to the App Store", ja: "App Store に近日登場", ko: "App Store 출시 예정" },
    lumenEyebrow: { zh: "极简线条解谜", en: "Minimal line-puzzle game", ja: "ミニマルなラインパズル", ko: "미니멀 라인 퍼즐" },
    lumenSummary: {
      zh: "沿着一条光，解开一个世界。在 7 个世界、143 个房间里，等待、转向，找到前行的节奏。",
      en: "Follow a line of light through 7 worlds and 143 rooms. Observe, wait and find your rhythm.",
      ja: "一筋の光とともに、7つの世界と143の部屋へ。観察し、待ち、自分のリズムで進もう。",
      ko: "한 줄기 빛을 따라 7개 세계와 143개 방을 탐험하세요. 관찰하고 기다리며 나만의 리듬을 찾아보세요."
    },
    exploreLumen: { zh: "探索 LUMEN →", en: "Explore LUMEN →", ja: "LUMEN を見る →", ko: "LUMEN 살펴보기 →" },
    playLumen: { zh: "网页版试玩 →", en: "Play in browser →", ja: "ブラウザでプレイ →", ko: "브라우저에서 플레이 →" },
    homeReelEyebrow: { zh: "Apple Vision Pro 媒体库", en: "Apple Vision Pro media library", ja: "Apple Vision Pro メディアライブラリ", ko: "Apple Vision Pro 미디어 라이브러리" },
    homeReelSummary: {
      zh: "一款为 Apple Vision Pro 打造的本地优先视频库与播放器。浏览本地文件夹、SMB/NAS 共享和自托管媒体源。",
      en: "A local-first video library and player for Apple Vision Pro. Browse local folders, SMB/NAS shares, and self-hosted media sources in an immersive spatial interface.",
      ja: "Apple Vision Pro のためのローカル優先ビデオライブラリ兼プレイヤー。ローカルフォルダ、SMB/NAS 共有、セルフホストのメディアソースを空間インターフェイスで閲覧できます。",
      ko: "Apple Vision Pro를 위한 로컬 우선 비디오 라이브러리 및 플레이어입니다. 로컬 폴더, SMB/NAS 공유, 자체 호스팅 미디어 소스를 공간 인터페이스에서 둘러볼 수 있습니다."
    },
    tagLocalMedia: { zh: "本地媒体", en: "Local media", ja: "ローカルメディア", ko: "로컬 미디어" },
    exploreHomeReel: { zh: "查看 HomeReel", en: "Explore HomeReel", ja: "HomeReel を見る", ko: "HomeReel 보기" },
    adventureGame: { zh: "冒险游戏", en: "Adventure Game", ja: "アドベンチャーゲーム", ko: "어드벤처 게임" },
    nighfallSummary: {
      zh: "带有解谜挑战的平台冒险游戏。",
      en: "A puzzle-adventure platformer with brain-teasing challenges.",
      ja: "頭を使うパズルに挑む、アドベンチャー・プラットフォーマー。",
      ko: "두뇌를 자극하는 퍼즐을 담은 어드벤처 플랫폼 게임."
    },
    tagAdventure: { zh: "冒险", en: "Adventure", ja: "冒険", ko: "어드벤처" },
    tagPuzzle: { zh: "解谜", en: "Puzzle", ja: "パズル", ko: "퍼즐" },
    viewOnAppStore: { zh: "查看 App Store", en: "View on App Store", ja: "App Store で見る", ko: "App Store에서 보기" },
    watermark: { zh: "照片水印", en: "Water Mark", ja: "写真ウォーターマーク", ko: "사진 워터마크" },
    youmarkSummary: {
      zh: "自动读取 EXIF 信息，为照片叠加拍摄参数水印。记录精彩瞬间，也展示你的拍摄技巧与风格。",
      en: "Automatically reads EXIF data and overlays shooting-parameter watermarks on your photos. Capture every brilliant moment and share your skills and professional flair.",
      ja: "EXIF データを自動で読み取り、撮影パラメータのウォーターマークを写真に重ねます。印象的な瞬間と撮影スタイルをそのまま共有できます。",
      ko: "EXIF 데이터를 자동으로 읽어 사진에 촬영 파라미터 워터마크를 입힙니다. 멋진 순간과 촬영 감각을 함께 공유할 수 있습니다."
    },
    tagImage: { zh: "图片", en: "Image", ja: "画像", ko: "이미지" },
    tagMark: { zh: "标记", en: "Mark", ja: "マーク", ko: "마크" },
    fullArchive: { zh: "查看完整作品", en: "View Full Archive", ja: "すべての作品を見る", ko: "전체 아카이브 보기" },
    philosophy: { zh: "理念", en: "Philosophy", ja: "フィロソフィー", ko: "철학" },
    designCode: { zh: "设计 <span class=\"text-[#333]\">&</span><br />代码", en: "Design <span class=\"text-[#333]\">&</span><br />Code", ja: "Design <span class=\"text-[#333]\">&</span><br />Code", ko: "Design <span class=\"text-[#333]\">&</span><br />Code" },
    philosophyBody: {
      zh: "“创造，就是为混沌建立结构。”<br/><br/>我不只是写代码，也在打磨体验。从底层架构到界面像素，每个应用都在性能与审美之间寻找平衡。",
      en: "\"To create is to structure chaos.\"<br/><br/>I don't just write code; I craft experiences. From backend architecture to pixel-perfect UI rendering, every application is a balance between performance and aesthetics.",
      ja: "「つくることは、混沌に構造を与えること。」<br/><br/>コードを書くだけではなく、体験そのものを設計します。バックエンドの構成から UI の細部まで、すべてのアプリで性能と美しさの両立を目指します。",
      ko: "“창작은 혼돈에 구조를 부여하는 일입니다.”<br/><br/>코드만 작성하는 것이 아니라 경험을 설계합니다. 백엔드 구조부터 UI의 픽셀까지, 모든 앱에서 성능과 미감의 균형을 찾습니다."
    },

    homeReelTitle: { zh: "HomeReel | Gnod Studio", en: "HomeReel | Gnod Studio", ja: "HomeReel | Gnod Studio", ko: "HomeReel | Gnod Studio" },
    homeReelDescription: {
      zh: "HomeReel 是为 Apple Vision Pro 打造的本地优先视频库与播放器。",
      en: "HomeReel is a local-first video library and player for Apple Vision Pro.",
      ja: "HomeReel は Apple Vision Pro 向けのローカル優先ビデオライブラリ兼プレイヤーです。",
      ko: "HomeReel은 Apple Vision Pro를 위한 로컬 우선 비디오 라이브러리 및 플레이어입니다."
    },
    hrHeroEyebrow: { zh: "Apple Vision Pro 媒体库", en: "Apple Vision Pro Media Library", ja: "Apple Vision Pro メディアライブラリ", ko: "Apple Vision Pro 미디어 라이브러리" },
    hrHeroPrimary: {
      zh: "为 Apple Vision Pro 打造的本地优先视频库与播放器，用来整理和播放你已经拥有的媒体。",
      en: "A local-first video library and player for Apple Vision Pro, designed for the media you already own.",
      ja: "Apple Vision Pro 向けのローカル優先ビデオライブラリ兼プレイヤー。すでに持っているメディアを整理して再生できます。",
      ko: "Apple Vision Pro를 위한 로컬 우선 비디오 라이브러리 및 플레이어입니다. 이미 가지고 있는 미디어를 정리하고 감상할 수 있습니다."
    },
    hrHeroSecondary: {
      zh: "连接本地文件夹、SMB/NAS 与自托管媒体源，在空间界面里整理、搜索、继续观看，并进入沉浸式播放。",
      en: "Connect local folders, SMB/NAS shares, and self-hosted media sources. Organize, search, continue watching, and move into immersive playback.",
      ja: "ローカルフォルダ、SMB/NAS、セルフホストのメディアソースを接続。空間インターフェイスで整理、検索、続きから再生、没入再生まで行えます。",
      ko: "로컬 폴더, SMB/NAS, 자체 호스팅 미디어 소스를 연결하세요. 공간 인터페이스에서 정리, 검색, 이어 보기, 몰입형 재생까지 이어집니다."
    },
    hrPrivacy: { zh: "隐私政策", en: "Privacy Policy", ja: "プライバシーポリシー", ko: "개인정보 처리방침" },
    hrOpenSource: { zh: "开源声明", en: "Open Source Notices", ja: "オープンソース表記", ko: "오픈소스 고지" },
    screenshotsEyebrow: { zh: "真实 Apple Vision Pro 截图", en: "Actual Apple Vision Pro screenshots", ja: "Apple Vision Pro の実機感に近いスクリーンショット", ko: "실제 Apple Vision Pro 화면" },
    screenshotsTitle: { zh: "运行在 Apple Vision Pro 上", en: "Running on Apple Vision Pro", ja: "Apple Vision Pro で動作", ko: "Apple Vision Pro에서 실행" },
    screenshotsBody: {
      zh: "截图来自运行中的 HomeReel 应用，并使用本地演示素材，因此能匹配当前界面，同时不暴露私人片库内容。",
      en: "Captured from the HomeReel app running with local fixture media, so the screens match the current interface without exposing private library content.",
      ja: "ローカルのデモ素材を使って動作中の HomeReel から撮影しています。現在の UI を反映しつつ、個人のライブラリは公開しません。",
      ko: "로컬 데모 미디어로 실행 중인 HomeReel 앱에서 캡처했습니다. 현재 인터페이스를 보여 주면서 개인 미디어 라이브러리는 노출하지 않습니다."
    },
    mediaLibrary: { zh: "媒体库", en: "Media Library", ja: "メディアライブラリ", ko: "미디어 라이브러리" },
    detailView: { zh: "详情页", en: "Detail View", ja: "詳細ビュー", ko: "상세 보기" },
    playbackWindow: { zh: "播放窗口", en: "Playback Window", ja: "再生ウィンドウ", ko: "재생 창" },
    builtForPrivate: { zh: "为私人片库而建", en: "Built For Private Libraries", ja: "プライベートライブラリのために", ko: "개인 미디어 라이브러리를 위해" },
    videosInSpace: { zh: "你的影片，在空间里", en: "Your Videos, In Space", ja: "あなたの映像を、空間で", ko: "나의 영상을 공간에서" },
    localFirstTitle: { zh: "本地优先媒体库", en: "Local-first library", ja: "ローカル優先ライブラリ", ko: "로컬 우선 라이브러리" },
    localFirstBody: {
      zh: "浏览本地 Documents 中的视频，并把播放进度、已看状态、封面缓存和偏好设置保存在设备上。",
      en: "Browse videos from local Documents and keep playback progress, watched state, artwork cache, and preferences on device.",
      ja: "ローカルの Documents にある動画を閲覧し、再生位置、視聴済み状態、アートワークキャッシュ、設定をデバイス上に保持します。",
      ko: "로컬 Documents의 비디오를 탐색하고 재생 위치, 시청 상태, 아트워크 캐시, 설정을 기기 안에 보관합니다."
    },
    nasTitle: { zh: "NAS 与自托管来源", en: "NAS and self-hosted sources", ja: "NAS とセルフホストソース", ko: "NAS 및 자체 호스팅 소스" },
    nasBody: {
      zh: "添加 SMB/NAS 共享或自己的媒体服务器，无需把大型家庭片库全部复制到头显上。",
      en: "Add SMB/NAS shares or your own media server, then browse large home libraries without copying everything to the headset.",
      ja: "SMB/NAS 共有や自分のメディアサーバーを追加。大きなホームライブラリをヘッドセットへコピーせずに閲覧できます。",
      ko: "SMB/NAS 공유나 직접 운영하는 미디어 서버를 추가하고, 큰 홈 라이브러리를 헤드셋으로 복사하지 않고 탐색하세요."
    },
    immersiveTitle: { zh: "沉浸式播放", en: "Immersive playback", ja: "没入再生", ko: "몰입형 재생" },
    immersiveBody: {
      zh: "打开聚焦的详情页，从进度继续观看，并进入适合 Apple Vision Pro 的影院式播放空间。",
      en: "Open a focused detail view, continue from progress, and move into a cinema-style playback space made for Apple Vision Pro.",
      ja: "詳細ビューから続き再生し、Apple Vision Pro に合わせたシネマスタイルの再生空間へ移動できます。",
      ko: "집중된 상세 화면을 열고 이어 보기를 시작한 뒤, Apple Vision Pro에 맞춘 영화관 스타일 재생 공간으로 이동합니다."
    },
    releaseLinks: { zh: "发布链接", en: "Release Links", ja: "リリースリンク", ko: "출시 링크" },
    trustCompliance: { zh: "信任与合规", en: "Trust & Compliance", ja: "信頼とコンプライアンス", ko: "신뢰와 컴플라이언스" },
    downloadCopy: {
      zh: "在 App Store 下载适用于 Apple Vision Pro 的 HomeReel Vision。",
      en: "Download HomeReel Vision for Apple Vision Pro from the App Store.",
      ja: "Apple Vision Pro 向けの HomeReel Vision を App Store からダウンロードできます。",
      ko: "App Store에서 Apple Vision Pro용 HomeReel Vision을 다운로드하세요."
    },
    privacyCopy: {
      zh: "HomeReel 不包含广告 SDK 或分析 SDK，也不收集你的媒体文件、凭据、播放历史或文件路径。",
      en: "HomeReel does not include advertising SDKs or analytics SDKs, and does not collect your media files, credentials, playback history, or file paths.",
      ja: "HomeReel には広告 SDK や解析 SDK は含まれず、メディアファイル、認証情報、再生履歴、ファイルパスを収集しません。",
      ko: "HomeReel에는 광고 SDK나 분석 SDK가 없으며 미디어 파일, 자격 증명, 재생 기록, 파일 경로를 수집하지 않습니다."
    },
    openSourceCopy: {
      zh: "HomeReel 使用的第三方组件、许可证名称与源码链接。",
      en: "Third-party component notices, license names, and source links for libraries used by HomeReel.",
      ja: "HomeReel が使用するサードパーティコンポーネント、ライセンス名、ソースリンクです。",
      ko: "HomeReel에서 사용하는 타사 구성 요소, 라이선스 이름, 소스 링크입니다."
    },
    privacyTitle: { zh: "HomeReel 隐私政策 | Gnod Studio", en: "HomeReel Privacy Policy | Gnod Studio", ja: "HomeReel プライバシーポリシー | Gnod Studio", ko: "HomeReel 개인정보 처리방침 | Gnod Studio" },
    privacyDescription: {
      zh: "HomeReel 隐私政策。",
      en: "HomeReel Privacy Policy.",
      ja: "HomeReel のプライバシーポリシー。",
      ko: "HomeReel 개인정보 처리방침."
    },
    openSourceTitle: { zh: "HomeReel 开源声明 | Gnod Studio", en: "HomeReel Open Source Notices | Gnod Studio", ja: "HomeReel オープンソース表記 | Gnod Studio", ko: "HomeReel 오픈소스 고지 | Gnod Studio" },
    openSourceDescription: {
      zh: "HomeReel 第三方开源组件声明。",
      en: "HomeReel open source component notices.",
      ja: "HomeReel のオープンソースコンポーネント表記。",
      ko: "HomeReel 오픈소스 구성 요소 고지."
    }
  };

  const privacyContent = {
    zh: {
      title: "HomeReel 隐私政策",
      intro: "HomeReel 是为 Apple Vision Pro 打造的本地媒体库与播放器，用于播放你选择的本地文件、局域网共享或自托管媒体服务器中的视频。",
      sections: [
        ["摘要", ["HomeReel 不创建账号，不包含广告 SDK，不包含分析 SDK。Gnod Studio 不通过 HomeReel 收集、出售或共享个人数据。"]],
        ["保存在设备上的数据", ["HomeReel 可能在你的设备本地保存以下数据：", ["媒体来源配置，例如显示名称、主机、共享名和起始路径。", "播放进度、已看状态、播放队列和应用设置。", "用于加速媒体库显示的封面缓存文件。", "你添加来源时需要保存的密码或凭据，这些内容会存储在系统 Keychain 中。"], "这些数据仅用于应用功能，并保留在你的设备上，除非你主动删除应用、清理数据或通过系统备份迁移。"]],
        ["局域网访问", ["HomeReel 可能请求局域网访问权限，用于连接你配置的 SMB/NAS 来源或其他本地媒体服务器。局域网访问仅用于访问你输入或选择的媒体来源。"]],
        ["可选第三方服务", ["如果你配置了 TMDB 元数据，HomeReel 可能会向 TMDB 发送电影名或文件标题搜索请求，用于获取海报、背景图和简介。TMDB 是第三方服务，其数据处理受其自身条款和隐私政策约束。", "如果你配置了 Jellyfin 或其他自托管来源，HomeReel 会与你提供的服务器地址通信。凭据和媒体请求会发送到该服务器，以便浏览和播放你的媒体库。"]],
        ["我们不收集的数据", ["Gnod Studio 不收集：", ["你的视频文件。", "你的 NAS 或本地服务器凭据。", "你的播放历史。", "你的媒体库文件路径。", "分析数据、广告标识符或使用跟踪数据。"]]],
        ["儿童", ["HomeReel 并非面向儿童设计，也不会有意收集儿童的个人信息。"]],
        ["联系方式", ['如有隐私问题，请联系 <a href="mailto:gnodsy@gmail.com">gnodsy@gmail.com</a>。']],
        ["政策更新", ['如本政策发生变化，更新版本会发布在 <a href="https://gnodstudio.com/homereel/privacy">https://gnodstudio.com/homereel/privacy</a>。']]
      ]
    },
    en: {
      title: "Privacy Policy",
      intro: "HomeReel is a local media library and player for Apple Vision Pro. It is built to work with videos you choose from local storage, local network shares, or self-hosted media servers.",
      sections: [
        ["Summary", ["HomeReel does not create an account for you, does not include advertising SDKs, and does not include analytics SDKs. Gnod Studio does not collect, sell, or share personal data from HomeReel."]],
        ["Data Stored On Your Device", ["HomeReel may store the following data locally on your device:", ["Media source configuration, such as display name, host, share name, and start path.", "Playback progress, watched status, queue state, and app settings.", "Artwork cache files used to make the library faster.", "Passwords or credentials for sources you add, stored in the system Keychain when needed."], "This data is used only to make the app work and remains on your device unless you choose to remove the app, clear data, or change system backups."]],
        ["Local Network Access", ["HomeReel may request local network access so it can connect to SMB/NAS sources or other local media servers that you configure. Local network access is used only to reach the sources you enter or select."]],
        ["Optional Third-Party Services", ["If you configure TMDB metadata, HomeReel may send movie or file-title search queries to TMDB to retrieve posters, artwork, and descriptions. TMDB is a third-party service and its processing is governed by its own terms and privacy policy.", "If you configure Jellyfin or another self-hosted source, HomeReel communicates with the server address you provide. Credentials and media requests are sent to that server so the app can browse and play your library."]],
        ["Data We Do Not Collect", ["Gnod Studio does not collect:", ["Your video files.", "Your NAS or local server credentials.", "Your playback history.", "Your media library file paths.", "Analytics, advertising identifiers, or usage tracking data."]]],
        ["Children", ["HomeReel is not directed to children and does not knowingly collect personal information from children."]],
        ["Contact", ['For privacy questions, contact <a href="mailto:gnodsy@gmail.com">gnodsy@gmail.com</a>.']],
        ["Changes", ['If this policy changes, the updated version will be posted at <a href="https://gnodstudio.com/homereel/privacy">https://gnodstudio.com/homereel/privacy</a>.']]
      ]
    },
    ja: {
      title: "プライバシーポリシー",
      intro: "HomeReel は Apple Vision Pro 向けのローカルメディアライブラリ兼プレイヤーです。ローカルストレージ、ローカルネットワーク共有、またはセルフホストのメディアサーバーから、ユーザーが選択した動画を扱います。",
      sections: [
        ["概要", ["HomeReel はアカウントを作成せず、広告 SDK や解析 SDK を含みません。Gnod Studio は HomeReel から個人データを収集、販売、共有しません。"]],
        ["デバイス上に保存されるデータ", ["HomeReel は以下のデータをデバイス上に保存する場合があります：", ["表示名、ホスト、共有名、開始パスなどのメディアソース設定。", "再生位置、視聴済み状態、キュー状態、アプリ設定。", "ライブラリ表示を高速化するためのアートワークキャッシュ。", "追加したソースに必要なパスワードや認証情報。必要に応じてシステム Keychain に保存されます。"], "これらのデータはアプリを動作させる目的でのみ使用され、アプリの削除、データの消去、またはシステムバックアップの変更を行わない限りデバイス上に残ります。"]],
        ["ローカルネットワークアクセス", ["HomeReel は、設定した SMB/NAS ソースやローカルメディアサーバーへ接続するためにローカルネットワークアクセスを要求する場合があります。このアクセスはユーザーが入力または選択したソースに到達するためだけに使用されます。"]],
        ["任意のサードパーティサービス", ["TMDB メタデータを設定した場合、HomeReel はポスター、アートワーク、説明文を取得するために映画名またはファイルタイトルの検索クエリを TMDB に送信する場合があります。TMDB はサードパーティサービスであり、その処理は TMDB の利用規約とプライバシーポリシーに従います。", "Jellyfin または別のセルフホストソースを設定した場合、HomeReel はユーザーが指定したサーバーアドレスと通信します。ライブラリの閲覧と再生のため、認証情報とメディアリクエストがそのサーバーへ送信されます。"]],
        ["収集しないデータ", ["Gnod Studio は以下を収集しません：", ["動画ファイル。", "NAS またはローカルサーバーの認証情報。", "再生履歴。", "メディアライブラリのファイルパス。", "解析データ、広告識別子、利用状況トラッキングデータ。"]]],
        ["子どもについて", ["HomeReel は子ども向けに設計されたものではなく、子どもの個人情報を意図的に収集しません。"]],
        ["連絡先", ['プライバシーに関するお問い合わせは <a href="mailto:gnodsy@gmail.com">gnodsy@gmail.com</a> までご連絡ください。']],
        ["変更", ['本ポリシーが変更された場合、更新版は <a href="https://gnodstudio.com/homereel/privacy">https://gnodstudio.com/homereel/privacy</a> に掲載されます。']]
      ]
    },
    ko: {
      title: "개인정보 처리방침",
      intro: "HomeReel은 Apple Vision Pro를 위한 로컬 미디어 라이브러리 및 플레이어입니다. 사용자가 선택한 로컬 저장소, 로컬 네트워크 공유 또는 자체 호스팅 미디어 서버의 비디오를 다루도록 설계되었습니다.",
      sections: [
        ["요약", ["HomeReel은 계정을 만들지 않으며 광고 SDK나 분석 SDK를 포함하지 않습니다. Gnod Studio는 HomeReel을 통해 개인 데이터를 수집, 판매 또는 공유하지 않습니다."]],
        ["기기에 저장되는 데이터", ["HomeReel은 다음 데이터를 기기 내에 저장할 수 있습니다:", ["표시 이름, 호스트, 공유 이름, 시작 경로와 같은 미디어 소스 설정.", "재생 위치, 시청 상태, 재생 대기열, 앱 설정.", "라이브러리 표시 속도를 높이기 위한 아트워크 캐시 파일.", "추가한 소스에 필요한 비밀번호 또는 자격 증명. 필요한 경우 시스템 Keychain에 저장됩니다."], "이 데이터는 앱 기능을 위해서만 사용되며, 사용자가 앱을 삭제하거나 데이터를 지우거나 시스템 백업 설정을 변경하지 않는 한 기기에 남아 있습니다."]],
        ["로컬 네트워크 접근", ["HomeReel은 사용자가 설정한 SMB/NAS 소스 또는 다른 로컬 미디어 서버에 연결하기 위해 로컬 네트워크 접근 권한을 요청할 수 있습니다. 이 접근은 사용자가 입력하거나 선택한 소스에 연결하는 데에만 사용됩니다."]],
        ["선택적 타사 서비스", ["TMDB 메타데이터를 설정한 경우 HomeReel은 포스터, 아트워크, 설명을 가져오기 위해 영화명 또는 파일 제목 검색 쿼리를 TMDB로 보낼 수 있습니다. TMDB는 타사 서비스이며 해당 처리는 TMDB의 약관과 개인정보 정책을 따릅니다.", "Jellyfin 또는 다른 자체 호스팅 소스를 설정한 경우 HomeReel은 사용자가 제공한 서버 주소와 통신합니다. 라이브러리 탐색과 재생을 위해 자격 증명과 미디어 요청이 해당 서버로 전송됩니다."]],
        ["수집하지 않는 데이터", ["Gnod Studio는 다음을 수집하지 않습니다:", ["비디오 파일.", "NAS 또는 로컬 서버 자격 증명.", "재생 기록.", "미디어 라이브러리 파일 경로.", "분석 데이터, 광고 식별자 또는 사용 추적 데이터."]]],
        ["아동", ["HomeReel은 아동을 대상으로 하지 않으며 아동의 개인정보를 고의로 수집하지 않습니다."]],
        ["문의", ['개인정보 관련 문의는 <a href="mailto:gnodsy@gmail.com">gnodsy@gmail.com</a> 으로 연락해 주세요.']],
        ["변경", ['본 정책이 변경되면 업데이트된 버전은 <a href="https://gnodstudio.com/homereel/privacy">https://gnodstudio.com/homereel/privacy</a> 에 게시됩니다.']]
      ]
    }
  };

  const components = [
    ["MPVKit / libmpv", "LGPL / LGPL-compatible build", '<a href="https://github.com/mpvkit/MPVKit">github.com/mpvkit/MPVKit</a>'],
    ["FFmpeg libraries", "LGPL v2.1+ build", '<a href="https://github.com/mpvkit/ffmpeg-build">github.com/mpvkit/ffmpeg-build</a><br><a href="https://ffmpeg.org/download.html">ffmpeg.org/download.html</a>'],
    ["libass", "ISC", '<a href="https://github.com/libass/libass">github.com/libass/libass</a>'],
    ["AMSMB2 / libsmb2 client", "MIT / upstream notices", '<a href="https://github.com/amosavian/AMSMB2">github.com/amosavian/AMSMB2</a>'],
    ["Kingfisher", "MIT", '<a href="https://github.com/onevcat/Kingfisher">github.com/onevcat/Kingfisher</a>'],
    ["FreeType", "FTL / GPL dual license", '<a href="https://freetype.org/">freetype.org</a>'],
    ["FriBidi", "LGPL", '<a href="https://github.com/fribidi/fribidi">github.com/fribidi/fribidi</a>'],
    ["HarfBuzz", "MIT", '<a href="https://github.com/harfbuzz/harfbuzz">github.com/harfbuzz/harfbuzz</a>'],
    ["libunibreak", "zlib-style upstream license", '<a href="https://github.com/adah1972/libunibreak">github.com/adah1972/libunibreak</a>'],
    ["GnuTLS", "LGPL", '<a href="https://gnutls.org/">gnutls.org</a>'],
    ["GMP", "LGPL / GPL dual license", '<a href="https://gmplib.org/">gmplib.org</a>'],
    ["Nettle / Hogweed", "LGPL / GPL upstream notices", '<a href="https://www.lysator.liu.se/~nisse/nettle/">lysator.liu.se/~nisse/nettle</a>'],
    ["OpenSSL", "Apache License 2.0", '<a href="https://www.openssl.org/source/">openssl.org/source</a>'],
    ["libplacebo", "LGPL", '<a href="https://code.videolan.org/videolan/libplacebo">code.videolan.org/videolan/libplacebo</a>'],
    ["libdovi", "MIT", '<a href="https://github.com/quietvoid/dovi_tool">github.com/quietvoid/dovi_tool</a>'],
    ["Little CMS / lcms2", "MIT-style", '<a href="https://www.littlecms.com/">littlecms.com</a>'],
    ["dav1d", "BSD 2-Clause", '<a href="https://code.videolan.org/videolan/dav1d">code.videolan.org/videolan/dav1d</a>'],
    ["libbluray", "LGPL", '<a href="https://code.videolan.org/videolan/libbluray">code.videolan.org/videolan/libbluray</a>'],
    ["uchardet", "MPL / GPL / LGPL tri-license", '<a href="https://www.freedesktop.org/wiki/Software/uchardet/">freedesktop.org/wiki/Software/uchardet</a>'],
    ["uavs3d", "upstream notices", '<a href="https://github.com/uavs3/uavs3d">github.com/uavs3/uavs3d</a>'],
    ["shaderc", "Apache License 2.0", '<a href="https://github.com/google/shaderc">github.com/google/shaderc</a>'],
    ["MoltenVK", "Apache License 2.0", '<a href="https://github.com/KhronosGroup/MoltenVK">github.com/KhronosGroup/MoltenVK</a>'],
    ["TMDB API", "API Terms of Service", '<a href="https://www.themoviedb.org/">themoviedb.org</a>']
  ];

  const openSourceContent = {
    zh: {
      title: "第三方开源组件声明",
      intro: ["HomeReel 包含第三方开源组件。除非另有书面许可，HomeReel 应用本体不作为开源软件分发。", "本页面用于列明 HomeReel 使用的第三方组件、许可证与源码获取方式。许可证信息基于上游项目声明整理。"],
      sourceTitle: "源码获取",
      sourceBody: ["对于 LGPL 组件，HomeReel 尽可能以独立 framework 组件形式使用。用户可以通过下方链接获取对应的上游源码。如果 Gnod Studio 修改了 LGPL 组件，本页面会提供修改后的源码。", "HomeReel 当前未主动修改 FFmpeg、libmpv、libass 或 MPVKit binary dependency 的源代码。"],
      componentsTitle: "组件",
      headers: ["组件", "许可证", "源码"],
      ffmpegTitle: "FFmpeg 与 GPL 组件",
      ffmpegBody: "HomeReel 目标是使用非 GPL 的 MPVKit product 与 LGPL FFmpeg build。Release build 不应链接 <code>MPVKit-GPL</code>、<code>Libmpv-GPL</code> 或 <code>Libav*-GPL</code> framework。如后续情况变化，本声明会同步更新。",
      trademarksTitle: "第三方商标",
      trademarksBody: "TMDB 用于可选的电影元数据与封面。HomeReel 使用 TMDB，但不被 TMDB 背书或认证。",
      contactTitle: "联系方式",
      contactBody: '如有开源合规问题，请联系 <a href="mailto:support@gnodstudio.com">support@gnodstudio.com</a>。'
    },
    en: {
      title: "Open Source Notices",
      intro: ["HomeReel includes third-party open source components. HomeReel itself is not distributed as open source unless a separate written license says otherwise.", "This page is intended to satisfy notice and source-availability obligations for third-party components used by HomeReel. License names below are based on upstream project notices."],
      sourceTitle: "Source Availability",
      sourceBody: ["For LGPL-covered libraries, HomeReel uses the libraries as separate framework components where possible. Users may obtain the corresponding upstream source from the links below. If Gnod Studio modifies an LGPL-covered library, the modified source will be provided on this page.", "HomeReel currently does not intentionally modify FFmpeg, libmpv, libass, or the MPVKit binary dependency source code."],
      componentsTitle: "Components",
      headers: ["Component", "License", "Source"],
      ffmpegTitle: "FFmpeg and GPL Components",
      ffmpegBody: "HomeReel is intended to use the non-GPL MPVKit product and LGPL FFmpeg build. The release build should not link <code>MPVKit-GPL</code>, <code>Libmpv-GPL</code>, or <code>Libav*-GPL</code> frameworks. If this changes, this notice will be updated accordingly.",
      trademarksTitle: "Third-Party Trademarks",
      trademarksBody: "TMDB is used for optional metadata and artwork. HomeReel uses TMDB but is not endorsed or certified by TMDB.",
      contactTitle: "Contact",
      contactBody: 'For open source compliance questions, contact <a href="mailto:support@gnodstudio.com">support@gnodstudio.com</a>.'
    },
    ja: {
      title: "オープンソース表記",
      intro: ["HomeReel にはサードパーティのオープンソースコンポーネントが含まれます。別途書面によるライセンスがない限り、HomeReel 本体はオープンソースとして配布されません。", "このページは、HomeReel が使用するサードパーティコンポーネントに関する通知およびソース入手性の義務を満たすためのものです。ライセンス名は上流プロジェクトの表記に基づいています。"],
      sourceTitle: "ソースの入手",
      sourceBody: ["LGPL 対象ライブラリについて、HomeReel は可能な限り別個の framework コンポーネントとして使用します。ユーザーは下記リンクから対応する上流ソースを入手できます。Gnod Studio が LGPL 対象ライブラリを変更した場合、変更後のソースを本ページで提供します。", "HomeReel は現在、FFmpeg、libmpv、libass、または MPVKit binary dependency のソースコードを意図的に変更していません。"],
      componentsTitle: "コンポーネント",
      headers: ["コンポーネント", "ライセンス", "ソース"],
      ffmpegTitle: "FFmpeg と GPL コンポーネント",
      ffmpegBody: "HomeReel は non-GPL の MPVKit product と LGPL FFmpeg build を使用することを意図しています。リリースビルドは <code>MPVKit-GPL</code>、<code>Libmpv-GPL</code>、<code>Libav*-GPL</code> framework にリンクしない想定です。変更がある場合、この通知を更新します。",
      trademarksTitle: "サードパーティ商標",
      trademarksBody: "TMDB は任意のメタデータとアートワークに使用されます。HomeReel は TMDB を使用していますが、TMDB による承認または認証を受けたものではありません。",
      contactTitle: "連絡先",
      contactBody: 'オープンソースコンプライアンスに関するお問い合わせは <a href="mailto:support@gnodstudio.com">support@gnodstudio.com</a> までご連絡ください。'
    },
    ko: {
      title: "오픈소스 고지",
      intro: ["HomeReel에는 타사 오픈소스 구성 요소가 포함되어 있습니다. 별도의 서면 라이선스가 없는 한 HomeReel 앱 자체는 오픈소스로 배포되지 않습니다.", "이 페이지는 HomeReel에서 사용하는 타사 구성 요소에 대한 고지 및 소스 제공 의무를 충족하기 위한 것입니다. 아래 라이선스 이름은 upstream 프로젝트 고지를 기준으로 정리했습니다."],
      sourceTitle: "소스 제공",
      sourceBody: ["LGPL 적용 라이브러리의 경우 HomeReel은 가능한 한 별도의 framework 구성 요소로 사용합니다. 사용자는 아래 링크에서 해당 upstream 소스를 받을 수 있습니다. Gnod Studio가 LGPL 적용 라이브러리를 수정하는 경우 수정된 소스를 이 페이지에 제공합니다.", "HomeReel은 현재 FFmpeg, libmpv, libass 또는 MPVKit binary dependency 소스 코드를 의도적으로 수정하지 않습니다."],
      componentsTitle: "구성 요소",
      headers: ["구성 요소", "라이선스", "소스"],
      ffmpegTitle: "FFmpeg 및 GPL 구성 요소",
      ffmpegBody: "HomeReel은 non-GPL MPVKit product와 LGPL FFmpeg build를 사용하는 것을 목표로 합니다. 릴리스 빌드는 <code>MPVKit-GPL</code>, <code>Libmpv-GPL</code>, <code>Libav*-GPL</code> framework에 링크하지 않아야 합니다. 변경이 발생하면 이 고지를 업데이트합니다.",
      trademarksTitle: "타사 상표",
      trademarksBody: "TMDB는 선택적 메타데이터와 아트워크에 사용됩니다. HomeReel은 TMDB를 사용하지만 TMDB의 보증 또는 인증을 받은 것은 아닙니다.",
      contactTitle: "문의",
      contactBody: '오픈소스 컴플라이언스 문의는 <a href="mailto:support@gnodstudio.com">support@gnodstudio.com</a> 으로 연락해 주세요.'
    }
  };

  function normaliseLanguage(value) {
    const raw = (value || "").toLowerCase();
    if (raw.startsWith("zh")) return "zh";
    if (raw.startsWith("ja")) return "ja";
    if (raw.startsWith("ko")) return "ko";
    if (raw.startsWith("en")) return "en";
    return "";
  }

  function getInitialLanguage() {
    const params = new URLSearchParams(window.location.search);
    return normaliseLanguage(params.get("lang")) ||
      normaliseLanguage(localStorage.getItem("gnodstudio.lang")) ||
      normaliseLanguage(navigator.language) ||
      "zh";
  }

  function valueFor(key, lang) {
    const entry = text[key];
    if (!entry) return "";
    return entry[lang] || entry.en || entry.zh || "";
  }

  function renderParagraphs(items) {
    return items.map((item, index) => {
      if (Array.isArray(item)) {
        return `<ul>${item.map((li) => `<li>${li}</li>`).join("")}</ul>`;
      }
      return `<p class="${index > 0 ? "mt-4" : ""}">${item}</p>`;
    }).join("");
  }

  function renderPrivacy(lang) {
    const copy = privacyContent[lang] || privacyContent.en;
    return `
      <a href="/homereel/" class="inline-flex items-center gap-2 text-gray-500 hover:text-gold transition-colors text-xs tracking-[0.2em] uppercase mb-10">
        <i data-lucide="arrow-left" class="w-4 h-4"></i>
        <span>${valueFor("backHomeReel", lang)}</span>
      </a>
      <span class="block text-gold text-xs tracking-[0.3em] uppercase mb-5">HomeReel</span>
      <h1>${copy.title}</h1>
      <p class="mt-6 text-gray-500">${legalDate[lang]}</p>
      <p class="mt-10">${copy.intro}</p>
      ${copy.sections.map(([title, body]) => `<h2>${title}</h2>${renderParagraphs(body)}`).join("")}
    `;
  }

  function renderOpenSource(lang) {
    const copy = openSourceContent[lang] || openSourceContent.en;
    const rows = components.map(([component, license, source]) => `<tr><td>${component}</td><td>${license}</td><td>${source}</td></tr>`).join("");
    return `
      <a href="/homereel/" class="inline-flex items-center gap-2 text-gray-500 hover:text-gold transition-colors text-xs tracking-[0.2em] uppercase mb-10">
        <i data-lucide="arrow-left" class="w-4 h-4"></i>
        <span>${valueFor("backHomeReel", lang)}</span>
      </a>
      <span class="block text-gold text-xs tracking-[0.3em] uppercase mb-5">HomeReel</span>
      <h1>${copy.title}</h1>
      <p class="mt-6 text-gray-500">${legalDate[lang]}</p>
      ${copy.intro.map((line, index) => `<p class="${index === 0 ? "mt-10" : "mt-4"}">${line}</p>`).join("")}
      <h2>${copy.sourceTitle}</h2>
      ${copy.sourceBody.map((line, index) => `<p class="${index > 0 ? "mt-4" : ""}">${line}</p>`).join("")}
      <h2>${copy.componentsTitle}</h2>
      <div class="overflow-x-auto">
        <table>
          <thead><tr><th>${copy.headers[0]}</th><th>${copy.headers[1]}</th><th>${copy.headers[2]}</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <h2>${copy.ffmpegTitle}</h2>
      <p>${copy.ffmpegBody}</p>
      <h2>${copy.trademarksTitle}</h2>
      <p>${copy.trademarksBody}</p>
      <h2>${copy.contactTitle}</h2>
      <p>${copy.contactBody}</p>
    `;
  }

  function injectSwitcher(activeLang) {
    const nav = document.querySelector("#navbar .container");
    if (!nav || document.querySelector("[data-lang-switcher]")) return;

    const switcher = document.createElement("div");
    switcher.dataset.langSwitcher = "";
    switcher.className = "language-switcher ml-4 flex items-center gap-1 border border-[#222] bg-black/40 p-1 text-[10px] tracking-[0.12em]";
    switcher.setAttribute("aria-label", "Language selector");

    Object.entries(languages).forEach(([code, meta]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.langButton = code;
      button.className = "px-2.5 py-1.5 text-gray-500 transition-colors hover:text-white";
      button.textContent = meta.label;
      button.addEventListener("click", () => applyLanguage(code, true));
      switcher.appendChild(button);
    });

    nav.appendChild(switcher);
    updateSwitcher(activeLang);
  }

  function updateSwitcher(lang) {
    document.querySelectorAll("[data-lang-button]").forEach((button) => {
      const active = button.dataset.langButton === lang;
      button.classList.toggle("bg-[#C9A227]", active);
      button.classList.toggle("text-black", active);
      button.classList.toggle("text-gray-500", !active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function applyLanguage(lang, persist) {
    const nextLang = languages[lang] ? lang : "zh";
    if (persist) {
      localStorage.setItem("gnodstudio.lang", nextLang);
      const url = new URL(window.location.href);
      url.searchParams.set("lang", nextLang);
      window.history.replaceState({}, "", url);
    }

    document.documentElement.lang = languages[nextLang].htmlLang;
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const value = valueFor(element.dataset.i18n, nextLang);
      if (value) element.textContent = value;
    });
    document.querySelectorAll("[data-i18n-html]").forEach((element) => {
      const value = valueFor(element.dataset.i18nHtml, nextLang);
      if (value) element.innerHTML = value;
    });
    document.querySelectorAll("[data-lang-path]").forEach((link) => {
      const url = new URL(link.dataset.langPath, window.location.origin);
      url.searchParams.set("lang", nextLang);
      link.setAttribute("href", `${url.pathname}${url.search}`);
    });

    const page = document.documentElement.dataset.page || "";
    const titleKey = document.documentElement.dataset.titleKey;
    const descriptionKey = document.documentElement.dataset.descriptionKey;
    if (titleKey) document.title = valueFor(titleKey, nextLang);
    if (descriptionKey) {
      const meta = document.querySelector('meta[name="description"]');
      if (meta) meta.setAttribute("content", valueFor(descriptionKey, nextLang));
    }

    const legal = document.querySelector("[data-i18n-legal-page]");
    if (legal) {
      legal.innerHTML = page === "open-source" ? renderOpenSource(nextLang) : renderPrivacy(nextLang);
      if (window.lucide) window.lucide.createIcons();
    }

    updateSwitcher(nextLang);
  }

  document.addEventListener("DOMContentLoaded", () => {
    const lang = getInitialLanguage();
    injectSwitcher(lang);
    applyLanguage(lang, false);
  });
})();

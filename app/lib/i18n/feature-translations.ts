export interface FeatureCardData {
  icon: string;
  title: string;
  description: string;
}

export interface FeaturePageSection {
  title?: string;
  paragraphs?: string[];
  cards?: FeatureCardData[];
  listItems?: string[];
  /** Info box at end of some pages */
  infoBox?: string;
  /** GitHub button */
  githubButton?: boolean;
}

export interface FeaturePageContent {
  slug: string;
  badge: string;
  title: string;
  titleHighlight: string;
  subtitle: string;
  breadcrumb: string;
  metaTitle: string;
  metaDescription: string;
  sections: FeaturePageSection[];
}

export const ALL_FEATURE_SLUGS = [
  "smart-ai",
  "zero-friction",
  "personal-memory",
  "privacy",
  "understand-anything",
  "image-generation",
  "documents",
  "scheduled-tasks",
  "track-everything",
  "prowrite",
  "open-source",
] as const;

export type FeatureSlug = (typeof ALL_FEATURE_SLUGS)[number];

export const featurePages = {
  "smart-ai": {
    en: {
      slug: "smart-ai",
      badge: "Smart AI",
      title: "Powered by",
      titleHighlight: "the Best AI",
      subtitle:
        "Ghali doesn't lock you into one model. It uses Google Gemini, Anthropic Claude, and OpenAI — and picks the right one for every task, automatically.",
      breadcrumb: "Powered by the Best AI",
      metaTitle: "Powered by the Best AI",
      metaDescription:
        "Ghali uses Google Gemini, Anthropic Claude, and OpenAI — and automatically picks the best model for every task.",
      sections: [
        {
          title: "Why multiple models?",
          paragraphs: [
            "No single AI model is the best at everything. Gemini is lightning fast for everyday questions. Claude excels at deep analysis and nuanced writing. Each has strengths.",
            "Ghali knows this. So instead of forcing everything through one model, it picks the best tool for the job — every single time, without you having to think about it.",
          ],
        },
        {
          title: "How it works",
          cards: [
            {
              icon: "⚡",
              title: "Fast & smart (85%)",
              description:
                "Google Gemini handles most messages instantly — quick answers, search, everyday tasks.",
            },
            {
              icon: "🧠",
              title: "Deep thinking (15%)",
              description:
                "Complex analysis, coding, strategic planning, and premium writing get escalated to Claude Opus.",
            },
            {
              icon: "🎨",
              title: "Image generation",
              description:
                "When you need visuals, Gemini Pro creates stunning images from your descriptions.",
            },
          ],
        },
        {
          title: "Deep thinking for the hard stuff",
          paragraphs: [
            "Some questions need more than a quick answer. When you ask Ghali to analyze a complex document, plan a business strategy, write a detailed proposal, or debug code — it automatically escalates to a more powerful model.",
            "You don't need to ask for it. You don't need to switch modes. Ghali recognizes when a question deserves deeper thinking and brings in the heavy artillery.",
          ],
        },
        {
          title: "What deep thinking handles",
          cards: [
            {
              icon: "📊",
              title: "Analysis",
              description:
                "Break down complex data, compare options, find patterns, make sense of messy information.",
            },
            {
              icon: "📋",
              title: "Strategic planning",
              description:
                "Business plans, project roadmaps, decision frameworks — structured thinking for real problems.",
            },
            {
              icon: "✍️",
              title: "Premium writing",
              description:
                "Proposals, reports, creative writing — when every word matters, you get the best model.",
            },
            {
              icon: "💻",
              title: "Code & technical",
              description:
                "Debugging, code review, architecture decisions — complex technical questions get the right brain.",
            },
          ],
        },
        {
          title: "Real-time information too",
          paragraphs: [
            "Ghali has access to Google Search grounding. That means it can look up today's weather, latest news, current prices, sports scores — anything that needs real-time data. No stale training data, no guessing.",
          ],
        },
      ],
    },
    ar: {
      slug: "smart-ai",
      badge: "ذكاء اصطناعي متقدم",
      title: "مدعوم بـ",
      titleHighlight: "أفضل ذكاء اصطناعي",
      subtitle:
        "غالي ما يقيّدك بنموذج واحد. يستخدم Google Gemini وAnthropic Claude وOpenAI — ويختار الأنسب لكل مهمة تلقائياً.",
      breadcrumb: "مدعوم بأفضل ذكاء اصطناعي",
      metaTitle: "مدعوم بأفضل ذكاء اصطناعي",
      metaDescription:
        "مساعد ذكاء اصطناعي يستخدم أفضل النماذج — Google Gemini وClaude وOpenAI — ويختار النموذج المناسب لكل مهمة تلقائياً عبر تيليجرام.",
      sections: [
        {
          title: "ليش عدة نماذج؟",
          paragraphs: [
            "ما في نموذج ذكاء اصطناعي واحد هو الأفضل في كل شي. Gemini سريع جداً للأسئلة اليومية. Claude يتفوق في التحليل العميق والكتابة الدقيقة. كل واحد عنده نقاط قوة.",
            "غالي يعرف هالشي. فبدل ما يمرر كل شي عبر نموذج واحد، يختار أفضل أداة للمهمة — كل مرة، بدون ما تفكر فيها.",
          ],
        },
        {
          title: "كيف يعمل",
          cards: [
            {
              icon: "⚡",
              title: "سريع وذكي (85%)",
              description:
                "Google Gemini يتعامل مع أغلب الرسائل فوراً — إجابات سريعة، بحث، مهام يومية.",
            },
            {
              icon: "🧠",
              title: "تفكير عميق (15%)",
              description:
                "التحليل المعقد، البرمجة، التخطيط الاستراتيجي، والكتابة الاحترافية ترتقي لـ Claude Opus.",
            },
            {
              icon: "🎨",
              title: "إنشاء صور",
              description:
                "لما تحتاج صور، Gemini Pro ينشئ صور مذهلة من وصفك.",
            },
          ],
        },
        {
          title: "تفكير عميق للأشياء الصعبة",
          paragraphs: [
            "بعض الأسئلة تحتاج أكثر من إجابة سريعة. لما تطلب من غالي يحلل مستند معقد، يخطط استراتيجية عمل، يكتب عرض تفصيلي، أو يصلح كود — يرتقي تلقائياً لنموذج أقوى.",
            "ما تحتاج تطلب. ما تحتاج تبدّل وضع. غالي يدرك متى السؤال يستحق تفكير أعمق ويجيب بالثقيل.",
          ],
        },
        {
          title: "شو يعالج التفكير العميق",
          cards: [
            {
              icon: "📊",
              title: "تحليل",
              description:
                "حلل بيانات معقدة، قارن خيارات، اكتشف أنماط، افهم معلومات فوضوية.",
            },
            {
              icon: "📋",
              title: "تخطيط استراتيجي",
              description:
                "خطط أعمال، خرائط طريق، أطر قرارات — تفكير منظم لمشاكل حقيقية.",
            },
            {
              icon: "✍️",
              title: "كتابة احترافية",
              description:
                "عروض، تقارير، كتابة إبداعية — لما كل كلمة مهمة، تحصل على أفضل نموذج.",
            },
            {
              icon: "💻",
              title: "كود وتقنية",
              description:
                "تصحيح أخطاء، مراجعة كود، قرارات معمارية — الأسئلة التقنية المعقدة تحصل على العقل المناسب.",
            },
          ],
        },
        {
          title: "معلومات فورية أيضاً",
          paragraphs: [
            "غالي عنده وصول لبحث Google. يعني يقدر يبحث عن طقس اليوم، آخر الأخبار، الأسعار الحالية، نتائج الرياضة — أي شي يحتاج بيانات فورية. بدون بيانات تدريب قديمة، بدون تخمين.",
          ],
        },
      ],
    },
  },

  "zero-friction": {
    en: {
      slug: "zero-friction",
      badge: "Zero Friction",
      title: "No Extra App. No Signup.",
      titleHighlight: "Just Message.",
      subtitle:
        "Other AI assistants want you to download an app, create an account, pick a plan, and figure out a new interface. Ghali just works.",
      breadcrumb: "Zero Friction",
      metaTitle: "Zero Friction",
      metaDescription:
        "No app to download, no account to create. Ghali works entirely through Telegram — just send a message and go.",
      sections: [
        {
          title: "Open Telegram. Say Hi. Done.",
          paragraphs: [
            "That's literally it. You already have Telegram on your phone. You already know how to send a message. There's nothing new to learn, nothing to install, nothing to update.",
            "Ghali lives where you already are. No new app taking up storage. No login screens. No \"please update to the latest version\" popups.",
          ],
        },
        {
          title: "Why this matters",
          cards: [
            {
              icon: "📱",
              title: "No download required",
              description:
                "Works on any phone with Telegram. Android, iPhone, even Telegram Desktop.",
            },
            {
              icon: "🔑",
              title: "No account to create",
              description:
                "Your Telegram account is your identity. No passwords, no email verification.",
            },
            {
              icon: "🔄",
              title: "No updates to install",
              description:
                "Ghali improves on our end. You always get the latest version automatically.",
            },
            {
              icon: "🌍",
              title: "Works everywhere",
              description:
                "Telegram works on slow connections, old phones, and in every country. So does Ghali.",
            },
          ],
        },
        {
          title: "Compare that to other AI assistants",
          paragraphs: [
            "ChatGPT needs an app or a browser. Google Gemini needs a Google account. Every other AI assistant adds friction between you and the answer you need.",
            "Ghali removes all of it. The best assistant is the one you actually use — and you're way more likely to use something that's already in your pocket.",
          ],
        },
      ],
    },
    ar: {
      slug: "zero-friction",
      badge: "بدون تعقيد",
      title: "بدون تطبيق إضافي. بدون تسجيل.",
      titleHighlight: "بس راسل.",
      subtitle:
        "مساعدات الذكاء الاصطناعي الثانية تبيك تحمّل تطبيق، تسوي حساب، تختار خطة، وتتعلم واجهة جديدة. غالي يشتغل وبس.",
      breadcrumb: "بدون تعقيد",
      metaTitle: "بدون تعقيد",
      metaDescription:
        "مساعد ذكي على تيليجرام بدون تطبيق ولا تسجيل. ارسل رسالة وابدأ فوراً — مجاني وسهل الاستخدام.",
      sections: [
        {
          title: "افتح تيليجرام. قول هلا. خلاص.",
          paragraphs: [
            "هذا حرفياً كل شي. تيليجرام عندك بالتلفون. تعرف ترسل رسالة. ما في شي جديد تتعلمه، ما في شي تحمّله، ما في شي تحدّثه.",
            "غالي موجود وين أنت أصلاً. بدون تطبيق جديد ياخذ مساحة. بدون شاشات تسجيل دخول. بدون \"رجاءً حدّث للنسخة الأخيرة\".",
          ],
        },
        {
          title: "ليش هالشي مهم",
          cards: [
            {
              icon: "📱",
              title: "بدون تحميل",
              description:
                "يشتغل على أي تلفون فيه تيليجرام. أندرويد، آيفون، حتى تيليجرام ديسكتوب.",
            },
            {
              icon: "🔑",
              title: "بدون إنشاء حساب",
              description:
                "حسابك في تيليجرام هو هويتك. بدون كلمات سر، بدون تحقق إيميل.",
            },
            {
              icon: "🔄",
              title: "بدون تحديثات",
              description:
                "غالي يتحسن من طرفنا. دايماً تحصل على آخر نسخة تلقائياً.",
            },
            {
              icon: "🌍",
              title: "يشتغل في كل مكان",
              description:
                "تيليجرام يشتغل على اتصالات بطيئة، تلفونات قديمة، وفي كل بلد. وغالي كذلك.",
            },
          ],
        },
        {
          title: "قارن مع مساعدات الذكاء الاصطناعي الثانية",
          paragraphs: [
            "ChatGPT يحتاج تطبيق أو متصفح. Google Gemini يحتاج حساب Google. كل مساعد ذكاء اصطناعي ثاني يضيف عوائق بينك وبين الإجابة اللي تحتاجها.",
            "غالي يشيل كل هالعوائق. أفضل مساعد هو اللي فعلاً تستخدمه — وأنت أكيد بتستخدم شي موجود أصلاً في جيبك.",
          ],
        },
      ],
    },
  },

  "personal-memory": {
    en: {
      slug: "personal-memory",
      badge: "Personal Memory",
      title: "Gets Smarter",
      titleHighlight: "the More You Use It",
      subtitle:
        "Most AI assistants forget everything between conversations. Ghali doesn't. It learns who you are, how you work, and what you care about.",
      breadcrumb: "Personal Memory",
      metaTitle: "Personal Memory",
      metaDescription:
        "Ghali remembers your preferences, context, and style. It gets smarter the more you use it.",
      sections: [
        {
          title: "It actually remembers you",
          paragraphs: [
            "Tell Ghali you like your coffee at 7am, that you work at ADNOC, or that you prefer concise answers. It remembers. Next time, it already knows.",
            "No more repeating yourself. No more \"as I mentioned before...\" — Ghali keeps a living memory of everything that matters about you.",
          ],
        },
        {
          title: "Three layers of personalization",
          cards: [
            {
              icon: "🧠",
              title: "Memory",
              description:
                "Facts about you — your name, work, preferences, habits. Grows organically from conversation.",
            },
            {
              icon: "🎭",
              title: "Personality",
              description:
                "How Ghali talks to you — formal or casual, detailed or brief, emoji or no emoji. You shape it.",
            },
            {
              icon: "💓",
              title: "Heartbeat",
              description:
                "Proactive check-ins based on your routine. Ghali reaches out when it matters.",
            },
          ],
        },
        {
          title: "You're always in control",
          paragraphs: [
            "Want to see what Ghali knows about you? Just ask — say \"my memory\" and it'll show you everything. Want to change something? Just tell it. Want to erase it all? Say \"clear memory\" and it's gone.",
            "You can also shape Ghali's personality through conversation. \"Be more casual.\" \"Use less emoji.\" \"Always respond in Arabic.\" It adapts to you, not the other way around.",
          ],
        },
      ],
    },
    ar: {
      slug: "personal-memory",
      badge: "ذاكرة شخصية",
      title: "يصير أذكى",
      titleHighlight: "كل ما استخدمته",
      subtitle:
        "أغلب مساعدات الذكاء الاصطناعي تنسى كل شي بين المحادثات. غالي لا. يتعلم مين أنت، كيف تشتغل، وشو يهمك.",
      breadcrumb: "ذاكرة شخصية",
      metaTitle: "ذاكرة شخصية",
      metaDescription:
        "مساعد شخصي ذكي يتذكر تفضيلاتك وسياقك وأسلوبك. ذاكرة شخصية بالذكاء الاصطناعي تتطور مع كل محادثة على تيليجرام.",
      sections: [
        {
          title: "فعلاً يتذكرك",
          paragraphs: [
            "قول لغالي إنك تحب قهوتك الساعة 7 الصبح، إنك تشتغل في أدنوك، أو إنك تفضل إجابات مختصرة. يتذكر. المرة الجاية، أصلاً يعرف.",
            "بدون ما تكرر نفسك. بدون \"زي ما ذكرت قبل...\" — غالي يحتفظ بذاكرة حية لكل شي مهم عنك.",
          ],
        },
        {
          title: "ثلاث طبقات من التخصيص",
          cards: [
            {
              icon: "🧠",
              title: "الذاكرة",
              description:
                "حقائق عنك — اسمك، شغلك، تفضيلاتك، عاداتك. تنمو طبيعياً من المحادثة.",
            },
            {
              icon: "🎭",
              title: "الشخصية",
              description:
                "كيف غالي يكلمك — رسمي أو عادي، مفصل أو مختصر، إيموجي أو بدون. أنت تشكّله.",
            },
            {
              icon: "💓",
              title: "النبض",
              description:
                "متابعات استباقية حسب روتينك. غالي يتواصل معك لما يهم.",
            },
          ],
        },
        {
          title: "دايماً أنت المتحكم",
          paragraphs: [
            "تبي تشوف شو غالي يعرف عنك؟ بس اسأل — قول \"ذاكرتي\" ويوريك كل شي. تبي تغير شي؟ بس قوله. تبي تمسح كل شي؟ قول \"امسح الذاكرة\" وراح.",
            "تقدر كمان تشكّل شخصية غالي من خلال المحادثة. \"كن أكثر عفوية.\" \"استخدم إيموجي أقل.\" \"دايماً رد بالعربي.\" يتكيف معك، مو العكس.",
          ],
        },
      ],
    },
  },

  privacy: {
    en: {
      slug: "privacy",
      badge: "Privacy First",
      title: "Your Stuff",
      titleHighlight: "Stays Yours",
      subtitle:
        "We don't sell your data. We don't use it for training. You can see everything we know about you, and delete it all in one message.",
      breadcrumb: "Privacy & Your Data",
      metaTitle: "Privacy & Your Data",
      metaDescription:
        "We don't sell your data. You can see everything Ghali knows about you and delete it anytime.",
      sections: [
        {
          title: "Privacy isn't a feature. It's the default.",
          paragraphs: [
            "A lot of AI companies say they care about privacy. We built Ghali so you don't have to take our word for it — you can verify it yourself.",
            "Your conversations are yours. Your documents are yours. Your memory and preferences are yours. We're just holding them for you, and you can take them back anytime.",
          ],
        },
        {
          title: "What this means in practice",
          cards: [
            {
              icon: "🚫",
              title: "No data selling",
              description:
                "We will never sell your personal data. Our business model is subscriptions, not surveillance.",
            },
            {
              icon: "🔍",
              title: "Full transparency",
              description:
                "Say \"my memory\" to see everything Ghali knows about you. No hidden profiles.",
            },
            {
              icon: "🗑️",
              title: "Delete anytime",
              description:
                "\"Clear memory\", \"clear documents\", or \"clear everything\" — your data is gone instantly.",
            },
            {
              icon: "🔒",
              title: "No model training",
              description:
                "Your conversations are never used to train AI models. Not ours, not anyone's.",
            },
          ],
        },
        {
          title: "AI providers we use",
          paragraphs: [
            "Your messages are processed by Google, Anthropic, and OpenAI to generate responses. These providers have strict data handling policies — they don't use API data for model training.",
            "We also use Clerk for authentication and PostHog for anonymous analytics. You can opt out of analytics anytime.",
          ],
        },
        {
          title: "And yes, the code is open",
          paragraphs: [
            "Ghali is open source. You can read every line of code and see exactly how your data is handled. No black boxes, no trust-me-bro. Just code you can audit yourself.",
          ],
        },
      ],
    },
    ar: {
      slug: "privacy",
      badge: "الخصوصية أولاً",
      title: "بياناتك",
      titleHighlight: "ملكك",
      subtitle:
        "ما نبيع بياناتك. ما نستخدمها للتدريب. تقدر تشوف كل شي نعرفه عنك، وتمسحه كله برسالة وحدة.",
      breadcrumb: "الخصوصية وبياناتك",
      metaTitle: "الخصوصية وبياناتك",
      metaDescription:
        "خصوصية البيانات أولاً — ما نبيع ولا نشارك بياناتك. تحكم كامل في معلوماتك مع حذف فوري على تيليجرام.",
      sections: [
        {
          title: "الخصوصية مو ميزة. هي الأساس.",
          paragraphs: [
            "كثير من شركات الذكاء الاصطناعي تقول تهتم بالخصوصية. احنا بنينا غالي عشان ما تحتاج تاخذ كلامنا — تقدر تتحقق بنفسك.",
            "محادثاتك ملكك. مستنداتك ملكك. ذاكرتك وتفضيلاتك ملكك. احنا بس نحفظها لك، وتقدر تاخذها وقت ما تبي.",
          ],
        },
        {
          title: "شو يعني هذا عملياً",
          cards: [
            {
              icon: "🚫",
              title: "بدون بيع بيانات",
              description:
                "ما راح نبيع بياناتك الشخصية أبداً. نموذج عملنا اشتراكات، مو مراقبة.",
            },
            {
              icon: "🔍",
              title: "شفافية كاملة",
              description:
                "قول \"ذاكرتي\" وشوف كل شي غالي يعرفه عنك. بدون ملفات مخفية.",
            },
            {
              icon: "🗑️",
              title: "امسح بأي وقت",
              description:
                "\"امسح الذاكرة\"، \"امسح المستندات\"، أو \"امسح كل شي\" — بياناتك تختفي فوراً.",
            },
            {
              icon: "🔒",
              title: "بدون تدريب نماذج",
              description:
                "محادثاتك ما تُستخدم أبداً لتدريب نماذج ذكاء اصطناعي. لا نماذجنا، ولا أحد ثاني.",
            },
          ],
        },
        {
          title: "مزودي الذكاء الاصطناعي اللي نستخدمهم",
          paragraphs: [
            "رسائلك تُعالج بواسطة Google وAnthropic وOpenAI لتوليد الردود. هالمزودين عندهم سياسات صارمة للتعامل مع البيانات — ما يستخدمون بيانات API لتدريب النماذج.",
            "نستخدم كمان Clerk للمصادقة وPostHog لتحليلات مجهولة الهوية. تقدر تلغي التحليلات بأي وقت.",
          ],
        },
        {
          title: "وإيه، الكود مفتوح",
          paragraphs: [
            "غالي مفتوح المصدر. تقدر تقرأ كل سطر كود وتشوف بالضبط كيف بياناتك تُعالج. بدون صناديق سوداء، بدون ثق فينا. بس كود تقدر تدققه بنفسك.",
          ],
        },
      ],
    },
  },

  "understand-anything": {
    en: {
      slug: "understand-anything",
      badge: "Multimodal",
      title: "Send Anything.",
      titleHighlight: "Ghali Gets It.",
      subtitle:
        "Photos, voice notes, videos, audio files — just send them in Telegram and Ghali understands what you're sharing.",
      breadcrumb: "Understand Anything",
      metaTitle: "Understand Anything",
      metaDescription:
        "Send photos, voice notes, videos, and audio files through Telegram. Ghali understands all media types natively.",
      sections: [
        {
          title: "More than just text",
          paragraphs: [
            "Real conversations aren't just words. You snap a photo of a menu. You record a quick voice note. You forward a video someone sent you. Ghali handles all of it — natively, through Telegram.",
          ],
        },
        {
          title: "What Ghali can understand",
          cards: [
            {
              icon: "📸",
              title: "Images",
              description:
                "Send a photo and ask about it. Screenshots, documents, receipts, menus, signs — Ghali reads and describes them.",
            },
            {
              icon: "🎤",
              title: "Voice notes",
              description:
                "Too lazy to type? Just talk. Ghali transcribes your voice note and responds to what you said.",
            },
            {
              icon: "🎬",
              title: "Videos",
              description:
                "Forward a video and ask what's happening. Ghali watches it and gives you a summary or answers your questions.",
            },
            {
              icon: "🔊",
              title: "Audio files",
              description:
                "Podcasts, recordings, audio messages — send them over and Ghali listens and responds.",
            },
          ],
        },
        {
          title: "It just works",
          paragraphs: [
            "No special commands. No \"please analyze this image.\" Just send it the way you'd send it to a friend — drop the photo, add a question if you want, and Ghali figures out the rest.",
            "Reply to a photo you sent earlier with a new question, and Ghali pulls it up and re-analyzes it. Context carries over naturally.",
          ],
        },
        {
          title: "Powered by Gemini's multimodal engine",
          paragraphs: [
            "Under the hood, Ghali uses Google Gemini's native multimodal capabilities. That means images, audio, and video aren't converted to text first — the AI actually sees and hears them, giving you much better results than transcription-based approaches.",
          ],
        },
      ],
    },
    ar: {
      slug: "understand-anything",
      badge: "متعدد الوسائط",
      title: "ارسل أي شي.",
      titleHighlight: "غالي يفهمه.",
      subtitle:
        "صور، رسائل صوتية، فيديوهات، ملفات صوتية — بس ارسلها على تيليجرام وغالي يفهم شو تشاركه.",
      breadcrumb: "يفهم أي شي",
      metaTitle: "يفهم أي شي",
      metaDescription:
        "ذكاء اصطناعي يفهم الصور والرسائل الصوتية والفيديو على تيليجرام. ارسل أي وسائط وغالي يحللها فوراً.",
      sections: [
        {
          title: "أكثر من مجرد نص",
          paragraphs: [
            "المحادثات الحقيقية مو بس كلام. تصور قائمة مطعم. تسجل رسالة صوتية سريعة. تحوّل فيديو أحد أرسله لك. غالي يتعامل مع كل شي — أصلياً، عبر تيليجرام.",
          ],
        },
        {
          title: "شو غالي يقدر يفهم",
          cards: [
            {
              icon: "📸",
              title: "صور",
              description:
                "ارسل صورة واسأل عنها. سكرين شوت، مستندات، فواتير، قوائم، لافتات — غالي يقرأها ويوصفها.",
            },
            {
              icon: "🎤",
              title: "رسائل صوتية",
              description:
                "كسلان تكتب؟ بس تكلم. غالي يحول رسالتك الصوتية لنص ويرد على اللي قلته.",
            },
            {
              icon: "🎬",
              title: "فيديوهات",
              description:
                "حوّل فيديو واسأل شو يصير فيه. غالي يشاهده ويعطيك ملخص أو يجاوب أسئلتك.",
            },
            {
              icon: "🔊",
              title: "ملفات صوتية",
              description:
                "بودكاست، تسجيلات، رسائل صوتية — ارسلها وغالي يسمع ويرد.",
            },
          ],
        },
        {
          title: "يشتغل وبس",
          paragraphs: [
            "بدون أوامر خاصة. بدون \"رجاءً حلل هالصورة\". بس ارسلها زي ما ترسلها لصديقك — حط الصورة، أضف سؤال لو تبي، وغالي يفهم الباقي.",
            "رد على صورة أرسلتها قبل بسؤال جديد، وغالي يسحبها ويحللها من جديد. السياق ينتقل طبيعياً.",
          ],
        },
        {
          title: "مدعوم بمحرك Gemini متعدد الوسائط",
          paragraphs: [
            "من الداخل، غالي يستخدم قدرات Google Gemini الأصلية متعددة الوسائط. يعني الصور والصوت والفيديو ما تتحول لنص أولاً — الذكاء الاصطناعي فعلاً يشوفها ويسمعها، ويعطيك نتائج أفضل بكثير من طرق التحويل للنص.",
          ],
        },
      ],
    },
  },

  "image-generation": {
    en: {
      slug: "image-generation",
      badge: "Image Generation",
      title: "Describe It.",
      titleHighlight: "Get It.",
      subtitle:
        "Tell Ghali what you want to see and get a stunning image delivered right in your Telegram chat. No design skills needed.",
      breadcrumb: "Image Generation",
      metaTitle: "Image Generation",
      metaDescription:
        "Describe what you want and get stunning AI-generated images delivered right in your Telegram chat.",
      sections: [
        {
          title: "From words to visuals in seconds",
          paragraphs: [
            "Need a logo concept? A social media graphic? An illustration for a presentation? Just describe it in plain language and Ghali creates it for you.",
            "No need to learn Midjourney prompts or figure out Stable Diffusion settings. Just say what you want, the way you'd explain it to a designer friend.",
          ],
        },
        {
          title: "What you can create",
          cards: [
            {
              icon: "🎨",
              title: "Art & illustrations",
              description:
                "Digital art, paintings, illustrations in any style — realistic, cartoon, watercolor, you name it.",
            },
            {
              icon: "📱",
              title: "Social media graphics",
              description:
                "Eye-catching visuals for Instagram, Twitter, LinkedIn — ready to post.",
            },
            {
              icon: "💼",
              title: "Business visuals",
              description:
                "Logo concepts, presentation graphics, marketing materials — professional-looking results.",
            },
            {
              icon: "🎭",
              title: "Creative & fun",
              description:
                "Memes, avatars, gift ideas, fun visualizations — let your imagination run wild.",
            },
          ],
        },
        {
          title: "Delivered right in Telegram",
          paragraphs: [
            "The image shows up as a regular Telegram photo. Save it, share it, forward it — no extra steps. No need to download from a website or copy from another app.",
          ],
        },
        {
          title: "Powered by Gemini Pro",
          paragraphs: [
            "Ghali uses Google's Gemini Pro for image generation. That means high-quality results, fast generation, and the ability to understand complex, detailed prompts.",
          ],
        },
      ],
    },
    ar: {
      slug: "image-generation",
      badge: "إنشاء صور",
      title: "وصّفها.",
      titleHighlight: "احصل عليها.",
      subtitle:
        "قول لغالي شو تبي تشوف واحصل على صورة مذهلة مباشرة في محادثة تيليجرام. بدون مهارات تصميم.",
      breadcrumb: "إنشاء صور",
      metaTitle: "إنشاء صور",
      metaDescription:
        "إنشاء صور بالذكاء الاصطناعي على تيليجرام — وصّف اللي تبيه واحصل على صورة مذهلة خلال ثواني. تصميم شعارات وصور فنية.",
      sections: [
        {
          title: "من كلمات لصور في ثواني",
          paragraphs: [
            "تحتاج فكرة شعار؟ تصميم سوشال ميديا؟ رسم توضيحي لعرض تقديمي؟ بس وصّف بلغة عادية وغالي يسويه لك.",
            "بدون ما تتعلم برومبتات Midjourney أو تفهم إعدادات Stable Diffusion. بس قول شو تبي، زي ما تشرح لصديق مصمم.",
          ],
        },
        {
          title: "شو تقدر تسوي",
          cards: [
            {
              icon: "🎨",
              title: "فن ورسومات",
              description:
                "فن رقمي، لوحات، رسومات بأي أسلوب — واقعي، كرتون، ألوان مائية، سمّه.",
            },
            {
              icon: "📱",
              title: "تصاميم سوشال ميديا",
              description:
                "صور جذابة لإنستغرام، تويتر، لينكد إن — جاهزة للنشر.",
            },
            {
              icon: "💼",
              title: "تصاميم أعمال",
              description:
                "أفكار شعارات، تصاميم عروض، مواد تسويقية — نتائج احترافية.",
            },
            {
              icon: "🎭",
              title: "إبداعي وممتع",
              description:
                "ميمز، أفاتارات، أفكار هدايا، تصاميم ممتعة — خل خيالك يطير.",
            },
          ],
        },
        {
          title: "تُسلّم مباشرة في تيليجرام",
          paragraphs: [
            "الصورة تظهر كصورة تيليجرام عادية. احفظها، شاركها، حوّلها — بدون خطوات إضافية. بدون تحميل من موقع أو نسخ من تطبيق ثاني.",
          ],
        },
        {
          title: "مدعوم بـ Gemini Pro",
          paragraphs: [
            "غالي يستخدم Gemini Pro من Google لإنشاء الصور. يعني نتائج عالية الجودة، إنشاء سريع، وقدرة على فهم أوصاف معقدة ومفصلة.",
          ],
        },
      ],
    },
  },

  documents: {
    en: {
      slug: "documents",
      badge: "Documents & Knowledge",
      title: "Send a File.",
      titleHighlight: "Get Answers.",
      subtitle:
        "Drop a PDF, Word doc, or spreadsheet into Telegram. Ghali reads it, answers your questions about it, and stores it in your personal knowledge base for later.",
      breadcrumb: "Document Analysis & Knowledge Base",
      metaTitle: "Document Analysis & Knowledge Base",
      metaDescription:
        "Send PDFs, Word docs, and spreadsheets through Telegram. Ghali analyzes them and stores them in your personal knowledge base.",
      sections: [
        {
          title: "Instant document analysis",
          paragraphs: [
            "Got a 50-page report and need the key takeaways? A contract you need to understand? A spreadsheet full of data? Just send it to Ghali and ask your question.",
            "Ghali reads the entire document, understands the content, and gives you exactly what you asked for — no need to read through it all yourself.",
          ],
        },
        {
          title: "Supported formats",
          cards: [
            {
              icon: "📄",
              title: "PDFs",
              description:
                "Reports, contracts, papers, invoices — sent directly through Telegram.",
            },
            {
              icon: "📝",
              title: "Word & PowerPoint",
              description:
                "DOCX, PPTX files are converted and analyzed automatically.",
            },
            {
              icon: "📊",
              title: "Spreadsheets",
              description:
                "XLSX files with data — Ghali reads the numbers and answers your questions.",
            },
          ],
        },
        {
          title: "Your personal knowledge base",
          paragraphs: [
            "Here's where it gets powerful. Every document you send is stored in your personal knowledge base. That means you can ask about it days, weeks, or months later.",
            "\"What were the payment terms in that contract I sent last week?\" — Ghali searches your knowledge base and pulls up the answer, even if it's been a while.",
          ],
        },
        {
          title: "Reply-to-media",
          paragraphs: [
            "Sent a document earlier and want to ask a follow-up? Just reply to the original message in Telegram. Ghali pulls up the document and re-analyzes it with your new question. Natural and effortless.",
          ],
        },
        {
          title: "You're in control",
          paragraphs: [
            "Your documents are stored per-user — no one else can access them. Want to clear your knowledge base? Say \"clear documents\" and it's gone. Media files are automatically cleaned up after 90 days.",
          ],
        },
      ],
    },
    ar: {
      slug: "documents",
      badge: "مستندات ومعرفة",
      title: "ارسل ملف.",
      titleHighlight: "احصل على إجابات.",
      subtitle:
        "حط PDF أو ملف وورد أو جدول بيانات في تيليجرام. غالي يقرأه، يجاوب أسئلتك عنه، ويحفظه في قاعدة معرفتك الشخصية للمستقبل.",
      breadcrumb: "تحليل المستندات وقاعدة المعرفة",
      metaTitle: "تحليل المستندات وقاعدة المعرفة",
      metaDescription:
        "تحليل مستندات بالذكاء الاصطناعي — ارسل PDF ووورد وإكسل عبر تيليجرام. غالي يحلل ويجاوب أسئلتك من الملفات.",
      sections: [
        {
          title: "تحليل مستندات فوري",
          paragraphs: [
            "عندك تقرير 50 صفحة وتحتاج النقاط الرئيسية؟ عقد تحتاج تفهمه؟ جدول بيانات مليان أرقام؟ بس ارسله لغالي واسأل سؤالك.",
            "غالي يقرأ المستند كامل، يفهم المحتوى، ويعطيك بالضبط اللي طلبته — بدون ما تقرأ كل شي بنفسك.",
          ],
        },
        {
          title: "الصيغ المدعومة",
          cards: [
            {
              icon: "📄",
              title: "PDF",
              description:
                "تقارير، عقود، أوراق، فواتير — ترسل مباشرة عبر تيليجرام.",
            },
            {
              icon: "📝",
              title: "وورد وباوربوينت",
              description: "ملفات DOCX وPPTX تتحول وتُحلل تلقائياً.",
            },
            {
              icon: "📊",
              title: "جداول بيانات",
              description:
                "ملفات XLSX ببيانات — غالي يقرأ الأرقام ويجاوب أسئلتك.",
            },
          ],
        },
        {
          title: "قاعدة معرفتك الشخصية",
          paragraphs: [
            "هنا القوة الحقيقية. كل مستند ترسله يُحفظ في قاعدة معرفتك الشخصية. يعني تقدر تسأل عنه بعد أيام، أسابيع، أو أشهر.",
            "\"شو كانت شروط الدفع في العقد اللي أرسلته الأسبوع الماضي؟\" — غالي يبحث في قاعدة معرفتك ويطلع الإجابة، حتى لو مر وقت.",
          ],
        },
        {
          title: "الرد على الوسائط",
          paragraphs: [
            "أرسلت مستند قبل وتبي تسأل سؤال متابعة؟ بس رد على الرسالة الأصلية في تيليجرام. غالي يسحب المستند ويحلله من جديد مع سؤالك الجديد. طبيعي وسهل.",
          ],
        },
        {
          title: "أنت المتحكم",
          paragraphs: [
            "مستنداتك محفوظة لكل مستخدم — ما أحد ثاني يقدر يوصل لها. تبي تمسح قاعدة معرفتك؟ قول \"امسح المستندات\" وراحت. ملفات الوسائط تُنظف تلقائياً بعد 90 يوم.",
          ],
        },
      ],
    },
  },

  "scheduled-tasks": {
    en: {
      slug: "scheduled-tasks",
      badge: "Scheduled Tasks",
      title: "AI That Works",
      titleHighlight: "While You Sleep",
      subtitle:
        "Schedule tasks and Ghali runs them automatically — a full AI turn with research, analysis, and rich results delivered straight to your Telegram.",
      breadcrumb: "Scheduled Tasks",
      metaTitle: "Scheduled Tasks",
      metaDescription:
        "Schedule tasks and Ghali runs them automatically — morning briefings, reminders, recurring reports delivered to Telegram.",
      sections: [
        {
          title: "More than reminders",
          paragraphs: [
            "Old-school reminders just repeat a message back to you. Ghali's scheduled tasks are different — each one triggers a full AI turn. Ghali thinks, researches, and delivers a rich result at the time you set.",
            "\"Every morning at 7am, give me a weather briefing for Dubai.\" \"At 5pm on Friday, summarize my week.\" \"Remind me to call Ahmad tomorrow at 3pm.\" — Ghali handles all of these.",
          ],
        },
        {
          title: "What you can schedule",
          cards: [
            {
              icon: "⏰",
              title: "One-time tasks",
              description:
                "Set a task for a specific date and time. Ghali runs it and delivers the result.",
            },
            {
              icon: "🔁",
              title: "Recurring tasks",
              description:
                "Daily briefings, weekly summaries, habit check-ins — set it once and Ghali keeps delivering.",
            },
            {
              icon: "🧠",
              title: "Full AI power",
              description:
                "Each task gets a full agent turn — web search, analysis, document recall, and more.",
            },
            {
              icon: "📋",
              title: "List & manage",
              description:
                "See all your tasks, pause, resume, edit, or delete them anytime.",
            },
          ],
        },
        {
          title: "Examples",
          listItems: [
            "\"Remind me to take my medication at 8am every day\"",
            "\"Every weekday at 9am, give me a news briefing about AI\"",
            "\"In 2 hours, remind me to check the oven\"",
            "\"Every Sunday at 6pm, help me plan my week\"",
            "\"Tomorrow at 3pm, remind me to call the dentist\"",
          ],
        },
        {
          title: "Heartbeat — Ghali reaches out first",
          paragraphs: [
            "Beyond scheduled tasks, Ghali's heartbeat feature provides loose, proactive check-ins. Set up a routine — \"check in every morning about my goals\" — and Ghali reaches out on its own with hourly precision.",
            "Scheduled tasks are for specific times. Heartbeat is for general awareness. Together, they make Ghali a truly proactive assistant.",
          ],
        },
        {
          title: "Timezone-aware",
          paragraphs: [
            "Ghali detects your timezone from your phone number and respects it for all scheduled tasks. Living in Dubai but set a task for 9am? It'll fire at 9am Dubai time. No manual timezone config needed.",
          ],
        },
        {
          infoBox:
            "Scheduled tasks and heartbeat check-ins are available to all users. Each task execution costs 1 credit. Basic users can have up to 3 scheduled tasks, Pro users up to 24.",
        },
      ],
    },
    ar: {
      slug: "scheduled-tasks",
      badge: "مهام مجدولة",
      title: "ذكاء اصطناعي يشتغل",
      titleHighlight: "وأنت نايم",
      subtitle:
        "جدول مهام وغالي ينفذها تلقائياً — دورة ذكاء اصطناعي كاملة مع بحث وتحليل ونتائج غنية تُسلّم مباشرة على تيليجرام.",
      breadcrumb: "مهام مجدولة",
      metaTitle: "مهام مجدولة",
      metaDescription:
        "مهام مجدولة وتذكيرات بالذكاء الاصطناعي على تيليجرام — ملخصات صباحية وتقارير دورية وتنبيهات تلقائية.",
      sections: [
        {
          title: "أكثر من تذكيرات",
          paragraphs: [
            "التذكيرات القديمة بس تكرر رسالة لك. مهام غالي المجدولة مختلفة — كل وحدة تشغّل دورة ذكاء اصطناعي كاملة. غالي يفكر، يبحث، ويسلّم نتيجة غنية في الوقت اللي حددته.",
            "\"كل صباح الساعة 7، عطني ملخص الطقس في دبي.\" \"الساعة 5 يوم الجمعة، لخّص أسبوعي.\" \"ذكرني أتصل بأحمد بكرة الساعة 3.\" — غالي يتعامل مع كل هذا.",
          ],
        },
        {
          title: "شو تقدر تجدول",
          cards: [
            {
              icon: "⏰",
              title: "مهام لمرة واحدة",
              description:
                "حدد مهمة لتاريخ ووقت معين. غالي ينفذها ويسلّم النتيجة.",
            },
            {
              icon: "🔁",
              title: "مهام متكررة",
              description:
                "ملخصات يومية، تلخيصات أسبوعية، متابعة عادات — حددها مرة وغالي يستمر.",
            },
            {
              icon: "🧠",
              title: "قوة ذكاء اصطناعي كاملة",
              description:
                "كل مهمة تحصل على دورة وكيل كاملة — بحث ويب، تحليل، استرجاع مستندات، والمزيد.",
            },
            {
              icon: "📋",
              title: "عرض وإدارة",
              description:
                "شوف كل مهامك، أوقف، استأنف، عدّل، أو احذفها بأي وقت.",
            },
          ],
        },
        {
          title: "أمثلة",
          listItems: [
            "\"ذكرني آخذ دوائي الساعة 8 الصبح كل يوم\"",
            "\"كل يوم عمل الساعة 9 الصبح، عطني ملخص أخبار عن الذكاء الاصطناعي\"",
            "\"بعد ساعتين، ذكرني أتشيك على الفرن\"",
            "\"كل يوم أحد الساعة 6 المساء، ساعدني أخطط أسبوعي\"",
            "\"بكرة الساعة 3، ذكرني أتصل بطبيب الأسنان\"",
          ],
        },
        {
          title: "النبض — غالي يتواصل أولاً",
          paragraphs: [
            "بالإضافة للمهام المجدولة، ميزة النبض في غالي توفر متابعات استباقية مرنة. حدد روتين — \"تابعني كل صباح عن أهدافي\" — وغالي يتواصل معك من نفسه بدقة ساعية.",
            "المهام المجدولة لأوقات محددة. النبض للوعي العام. مع بعض، يخلون غالي مساعد استباقي حقيقي.",
          ],
        },
        {
          title: "واعي بالمنطقة الزمنية",
          paragraphs: [
            "غالي يكتشف منطقتك الزمنية من رقم تلفونك ويحترمها لكل المهام المجدولة. ساكن في دبي وحددت مهمة الساعة 9 الصبح؟ تشتغل الساعة 9 بتوقيت دبي. بدون إعداد يدوي.",
          ],
        },
        {
          infoBox:
            "المهام المجدولة ومتابعات النبض متاحة لكل المستخدمين. كل تنفيذ مهمة يكلف 1 رصيد. المستخدمين الأساسيين يقدرون يحددون حتى 3 مهام مجدولة، المحترفين حتى 24.",
        },
      ],
    },
  },

  "track-everything": {
    en: {
      slug: "track-everything",
      badge: "Structured Data",
      title: "Track",
      titleHighlight: "Everything",
      subtitle:
        "Expenses, tasks, contacts, notes — tell Ghali and it organizes, searches, and reminds automatically.",
      breadcrumb: "Track Everything",
      metaTitle: "Track Everything",
      metaDescription:
        "Track expenses, tasks, contacts, notes — tell Ghali and it organizes everything in one place.",
      sections: [
        {
          title: "Just tell Ghali",
          paragraphs: [
            "\"I spent 45 AED on lunch at Shake Shack.\" \"Add a task: finish the quarterly report by Friday.\" \"Save Ahmad's number: +971501234567.\" \"Bookmark this article about AI trends.\"",
            "No forms, no apps, no categories to pick from. Just say what happened and Ghali figures out the rest — type, tags, amounts, dates, everything.",
          ],
        },
        {
          title: "What you can track",
          cards: [
            {
              icon: "💰",
              title: "Expenses",
              description:
                "Amounts, currencies, tags, and categories. Track spending as it happens.",
            },
            {
              icon: "✅",
              title: "Tasks",
              description:
                "Status, due dates, and priority. Mark done when you're finished.",
            },
            {
              icon: "👤",
              title: "Contacts",
              description:
                "Names, phone numbers, and notes. Your personal address book.",
            },
            {
              icon: "📝",
              title: "Notes",
              description:
                "Freeform text, tagged and searchable. Capture ideas on the go.",
            },
            {
              icon: "🔖",
              title: "Bookmarks",
              description:
                "URLs, descriptions, and tags. Save links for later.",
            },
            {
              icon: "🏃",
              title: "Habits",
              description:
                "Track streaks and progress. Build consistency over time.",
            },
          ],
        },
        {
          title: "Smart search that understands you",
          paragraphs: [
            "\"Show me what I spent on food last week\" works even if you tagged things as \"lunch\", \"dinner\", or \"groceries.\" Ghali combines exact text matching with semantic vector search — it understands meaning, not just keywords.",
            "Ask in any way that feels natural. \"What did I save about AI?\" \"Find my tasks due this week.\" \"How much did I spend in January?\" Ghali finds it.",
          ],
        },
        {
          title: "Collections keep you organized",
          paragraphs: [
            "Items are automatically grouped into collections — or you can create your own. \"Create a collection called Travel Planning\" and start adding items to it.",
            "Need a summary? \"How much did I spend this month?\" \"Show my tasks by tag.\" \"Count my bookmarks.\" Ghali aggregates, groups, and totals across your data instantly.",
          ],
        },
        {
          title: "Attach reminders to anything",
          paragraphs: [
            "Any item can have a due date and a reminder. \"Add a task: dentist appointment tomorrow at 9am, remind me.\" Ghali saves the item and sends you a reminder right on time.",
            "Combine tracking with scheduling — expenses with payment deadlines, tasks with follow-ups, contacts with birthdays. Everything in one place.",
          ],
        },
        {
          infoBox:
            "Searching and viewing items is free. Adding or updating items costs 1 credit (part of the message). Basic plan: 200 items, 10 collections. Pro plan: unlimited.",
        },
      ],
    },
    ar: {
      slug: "track-everything",
      badge: "بيانات منظمة",
      title: "تابع",
      titleHighlight: "كل شي",
      subtitle:
        "مصاريف، مهام، جهات اتصال، ملاحظات — قول لغالي وينظم ويبحث ويذكّر تلقائياً.",
      breadcrumb: "تابع كل شي",
      metaTitle: "تابع كل شي",
      metaDescription:
        "تتبع المصروفات والمهام والملاحظات بالذكاء الاصطناعي على تيليجرام. نظّم كل شي بكلام طبيعي — بدون تطبيقات إضافية.",
      sections: [
        {
          title: "بس قول لغالي",
          paragraphs: [
            "\"صرفت 45 درهم على غداء في شيك شاك.\" \"أضف مهمة: خلص التقرير الربعي يوم الجمعة.\" \"احفظ رقم أحمد: +971501234567.\" \"احفظ هالمقال عن توجهات الذكاء الاصطناعي.\"",
            "بدون نماذج، بدون تطبيقات، بدون فئات تختار منها. بس قول شو صار وغالي يفهم الباقي — النوع، الوسوم، المبالغ، التواريخ، كل شي.",
          ],
        },
        {
          title: "شو تقدر تتابع",
          cards: [
            {
              icon: "💰",
              title: "مصاريف",
              description:
                "مبالغ، عملات، وسوم، وفئات. تابع الإنفاق لحظة بلحظة.",
            },
            {
              icon: "✅",
              title: "مهام",
              description:
                "حالة، مواعيد استحقاق، وأولوية. علّم منتهي لما تخلص.",
            },
            {
              icon: "👤",
              title: "جهات اتصال",
              description:
                "أسماء، أرقام هواتف، وملاحظات. دفتر عناوينك الشخصي.",
            },
            {
              icon: "📝",
              title: "ملاحظات",
              description:
                "نص حر، موسوم وقابل للبحث. التقط أفكارك أثناء التنقل.",
            },
            {
              icon: "🔖",
              title: "إشارات مرجعية",
              description: "روابط، أوصاف، ووسوم. احفظ روابط للاحق.",
            },
            {
              icon: "🏃",
              title: "عادات",
              description:
                "تابع السلاسل والتقدم. ابني الاتساق مع الوقت.",
            },
          ],
        },
        {
          title: "بحث ذكي يفهمك",
          paragraphs: [
            "\"وريني شو صرفت على الأكل الأسبوع الماضي\" يشتغل حتى لو وسمت الأشياء كـ \"غداء\" أو \"عشاء\" أو \"بقالة\". غالي يجمع بين مطابقة النص الدقيقة والبحث الدلالي — يفهم المعنى، مو بس الكلمات.",
            "اسأل بأي طريقة تحس فيها طبيعية. \"شو حفظت عن الذكاء الاصطناعي؟\" \"لقّ مهامي المستحقة هالأسبوع.\" \"كم صرفت في يناير؟\" غالي يلقاها.",
          ],
        },
        {
          title: "المجموعات تنظمك",
          paragraphs: [
            "العناصر تتجمع تلقائياً في مجموعات — أو تقدر تسوي مجموعاتك. \"سوّ مجموعة اسمها تخطيط السفر\" وابدأ أضف عناصر لها.",
            "تحتاج ملخص؟ \"كم صرفت هالشهر؟\" \"وريني مهامي حسب الوسم.\" \"عدّ إشاراتي المرجعية.\" غالي يجمع ويصنف ويحسب من بياناتك فوراً.",
          ],
        },
        {
          title: "أضف تذكيرات لأي شي",
          paragraphs: [
            "أي عنصر ممكن يكون عنده تاريخ استحقاق وتذكير. \"أضف مهمة: موعد طبيب أسنان بكرة الساعة 9 الصبح، ذكرني.\" غالي يحفظ العنصر ويرسلك تذكير في الوقت.",
            "ادمج التتبع مع الجدولة — مصاريف مع مواعيد دفع، مهام مع متابعات، جهات اتصال مع أعياد ميلاد. كل شي في مكان واحد.",
          ],
        },
        {
          infoBox:
            "البحث وعرض العناصر مجاني. إضافة أو تحديث العناصر يكلف 1 رصيد (جزء من الرسالة). الخطة الأساسية: 200 عنصر، 10 مجموعات. خطة Pro: بلا حدود.",
        },
      ],
    },
  },

  prowrite: {
    en: {
      slug: "prowrite",
      badge: "ProWrite",
      title: "Write Like a Pro.",
      titleHighlight: "8 AI Models Deep.",
      subtitle:
        "Say \"prowrite\" and Ghali orchestrates a full writing pipeline — research, drafting, editing, and voice-matching — across 8 sequential AI calls.",
      breadcrumb: "ProWrite",
      metaTitle: "ProWrite",
      metaDescription:
        "Say \"prowrite\" and Ghali orchestrates a full multi-model writing pipeline for professional content.",
      sections: [
        {
          title: "How it works",
          paragraphs: [
            "ProWrite isn't a single prompt. It's a pipeline. Your request passes through 8 specialized AI steps, each handled by the model best suited for that job.",
            "The result: content that's researched, well-structured, creatively polished, and sounds like you wrote it — not a machine.",
          ],
        },
        {
          title: "The pipeline",
          cards: [
            {
              icon: "📋",
              title: "Brief & clarify",
              description:
                "Claude Opus parses your request into a creative brief and asks smart clarifying questions.",
            },
            {
              icon: "🔍",
              title: "Research & enrich",
              description:
                "Gemini Flash searches the web for facts, stats, and trends. Your stored documents are searched too.",
            },
            {
              icon: "🏗️",
              title: "Synthesize & draft",
              description:
                "Claude Opus builds a narrative arc, then Kimi K2.5 writes the full piece with natural flow.",
            },
            {
              icon: "✨",
              title: "Elevate & humanize",
              description:
                "GPT-5.2 sharpens hooks and creativity. Claude Opus strips AI artifacts and matches your voice.",
            },
          ],
        },
        {
          title: "What you can write",
          cards: [
            {
              icon: "💼",
              title: "LinkedIn posts",
              description:
                "Thought leadership, industry insights, career updates — professional and authentic.",
            },
            {
              icon: "📧",
              title: "Emails & outreach",
              description:
                "Cold emails, follow-ups, proposals — persuasive without being pushy.",
            },
            {
              icon: "📝",
              title: "Articles & reports",
              description:
                "Blog posts, whitepapers, research summaries — well-structured and data-backed.",
            },
            {
              icon: "🎯",
              title: "Anything else",
              description:
                "Newsletters, social media threads, speeches, cover letters — you name it.",
            },
          ],
        },
        {
          title: "Skip if you want",
          paragraphs: [
            "Don't feel like answering questions? Just say \"skip questions\" or \"just write it\" and ProWrite will use sensible defaults and get straight to writing.",
          ],
        },
        {
          title: "Same credit, premium result",
          paragraphs: [
            "ProWrite costs 1 credit — the same as any message. The multi-model orchestration happens behind the scenes at no extra cost to you.",
          ],
        },
      ],
    },
    ar: {
      slug: "prowrite",
      badge: "ProWrite",
      title: "اكتب كالمحترفين.",
      titleHighlight: "8 نماذج ذكاء اصطناعي.",
      subtitle:
        "قول \"prowrite\" وغالي ينسق خط إنتاج كتابة كامل — بحث، مسودة، تحرير، ومطابقة صوتك — عبر 8 مراحل ذكاء اصطناعي متتالية.",
      breadcrumb: "ProWrite",
      metaTitle: "ProWrite",
      metaDescription:
        "مساعد كتابة بالذكاء الاصطناعي — قول \"prowrite\" وغالي يبحث ويكتب ويصقل محتواك عبر 8 نماذج ذكاء اصطناعي على تيليجرام.",
      sections: [
        {
          title: "كيف يعمل",
          paragraphs: [
            "ProWrite مو مجرد أمر واحد. إنه خط إنتاج. طلبك يمر عبر 8 خطوات ذكاء اصطناعي متخصصة، كل وحدة يتعامل معها النموذج الأنسب لها.",
            "النتيجة: محتوى مبحوث، منظم، مصقول إبداعياً، ويبدو كأنك أنت كتبته — مو آلة.",
          ],
        },
        {
          title: "خط الإنتاج",
          cards: [
            {
              icon: "📋",
              title: "ملخص وتوضيح",
              description:
                "Claude Opus يحلل طلبك لملخص إبداعي ويسأل أسئلة توضيحية ذكية.",
            },
            {
              icon: "🔍",
              title: "بحث وإثراء",
              description:
                "Gemini Flash يبحث في الإنترنت عن حقائق وإحصائيات واتجاهات. مستنداتك المحفوظة تُبحث أيضاً.",
            },
            {
              icon: "🏗️",
              title: "تركيب ومسودة",
              description:
                "Claude Opus يبني قوس سردي، ثم Kimi K2.5 يكتب القطعة كاملة بتدفق طبيعي.",
            },
            {
              icon: "✨",
              title: "ارتقاء وأنسنة",
              description:
                "GPT-5.2 يشحذ الخطافات والإبداع. Claude Opus يزيل آثار الذكاء الاصطناعي ويطابق صوتك.",
            },
          ],
        },
        {
          title: "شو تقدر تكتب",
          cards: [
            {
              icon: "💼",
              title: "منشورات لينكد إن",
              description:
                "قيادة فكرية، رؤى صناعية، تحديثات مهنية — احترافية وأصيلة.",
            },
            {
              icon: "📧",
              title: "إيميلات وتواصل",
              description:
                "إيميلات باردة، متابعات، عروض — مقنعة بدون إلحاح.",
            },
            {
              icon: "📝",
              title: "مقالات وتقارير",
              description:
                "منشورات مدونة، أوراق بيضاء، ملخصات بحث — منظمة ومدعومة ببيانات.",
            },
            {
              icon: "🎯",
              title: "أي شي ثاني",
              description:
                "نشرات، سلاسل سوشال ميديا، خطابات، رسائل تغطية — سمّه.",
            },
          ],
        },
        {
          title: "تخطى لو تبي",
          paragraphs: [
            "ما تحب تجاوب أسئلة؟ بس قول \"تخطى الأسئلة\" أو \"بس اكتب\" وProWrite يستخدم إعدادات افتراضية ويبدأ الكتابة مباشرة.",
          ],
        },
        {
          title: "نفس الرصيد، نتيجة احترافية",
          paragraphs: [
            "ProWrite يكلف 1 رصيد — نفس أي رسالة. التنسيق متعدد النماذج يصير خلف الكواليس بدون تكلفة إضافية عليك.",
          ],
        },
      ],
    },
  },

  "open-source": {
    en: {
      slug: "open-source",
      badge: "Open Source",
      title: "Built in",
      titleHighlight: "the Open",
      subtitle:
        "Ghali's code is public on GitHub. You don't have to trust us — you can verify us.",
      breadcrumb: "Open Source",
      metaTitle: "Open Source",
      metaDescription:
        "Ghali is open source. Read every line of code and see exactly how your data is handled.",
      sections: [
        {
          title: "Why open source?",
          paragraphs: [
            "When an AI assistant handles your personal conversations, documents, and memories — you deserve to know exactly what's happening under the hood.",
            "We don't think \"trust us\" is good enough. So we made the code public. Every line. Every decision. Every data flow. Read it yourself.",
          ],
        },
        {
          title: "What this means for you",
          cards: [
            {
              icon: "🔍",
              title: "Full transparency",
              description:
                "See exactly how your data is stored, processed, and protected. No hidden surprises.",
            },
            {
              icon: "🛡️",
              title: "Security by openness",
              description:
                "Open code means more eyes catching bugs. Security through obscurity is no security at all.",
            },
            {
              icon: "🤝",
              title: "Community trust",
              description:
                "Developers, security researchers, and users can audit the code. Accountability built in.",
            },
            {
              icon: "📖",
              title: "Learn from it",
              description:
                "Building your own AI assistant? Learn from our architecture, patterns, and decisions.",
            },
          ],
        },
        {
          title: "What you'll find on GitHub",
          paragraphs: [
            "The full Ghali codebase — the Telegram integration, the AI agent, the credit system, the memory system, document processing, image generation, the landing page you're looking at right now. All of it.",
            "Licensed under Apache 2.0, which means you can read it, learn from it, and even build on it.",
          ],
        },
        {
          githubButton: true,
        },
      ],
    },
    ar: {
      slug: "open-source",
      badge: "مفتوح المصدر",
      title: "مبني في",
      titleHighlight: "العلن",
      subtitle:
        "كود غالي عام على GitHub. ما تحتاج تثق فينا — تقدر تتحقق بنفسك.",
      breadcrumb: "مفتوح المصدر",
      metaTitle: "مفتوح المصدر",
      metaDescription:
        "مساعد ذكاء اصطناعي مفتوح المصدر — كود غالي عام على GitHub. تقدر تتحقق بالضبط كيف بياناتك تُعالج.",
      sections: [
        {
          title: "ليش مفتوح المصدر؟",
          paragraphs: [
            "لما مساعد ذكاء اصطناعي يتعامل مع محادثاتك الشخصية ومستنداتك وذكرياتك — تستاهل تعرف بالضبط شو يصير تحت الغطاء.",
            "ما نعتقد إن \"ثق فينا\" كافي. فخلينا الكود عام. كل سطر. كل قرار. كل تدفق بيانات. اقرأه بنفسك.",
          ],
        },
        {
          title: "شو يعني هالشي لك",
          cards: [
            {
              icon: "🔍",
              title: "شفافية كاملة",
              description:
                "شوف بالضبط كيف بياناتك تُخزن وتُعالج وتُحمى. بدون مفاجآت مخفية.",
            },
            {
              icon: "🛡️",
              title: "أمان بالانفتاح",
              description:
                "كود مفتوح يعني عيون أكثر تلتقط الأخطاء. الأمان بالغموض مو أمان أصلاً.",
            },
            {
              icon: "🤝",
              title: "ثقة المجتمع",
              description:
                "مطورين، باحثين أمنيين، ومستخدمين يقدرون يدققون الكود. مساءلة مدمجة.",
            },
            {
              icon: "📖",
              title: "تعلم منه",
              description:
                "تبني مساعد ذكاء اصطناعي خاص فيك؟ تعلم من معماريتنا وأنماطنا وقراراتنا.",
            },
          ],
        },
        {
          title: "شو بتلقى على GitHub",
          paragraphs: [
            "كود غالي الكامل — تكامل تيليجرام، وكيل الذكاء الاصطناعي، نظام الأرصدة، نظام الذاكرة، معالجة المستندات، إنشاء الصور، صفحة الهبوط اللي تشوفها الحين. كله.",
            "مرخص تحت Apache 2.0، يعني تقدر تقرأه، تتعلم منه، وحتى تبني عليه.",
          ],
        },
        {
          githubButton: true,
        },
      ],
    },
  },
} satisfies Record<FeatureSlug, { en: FeaturePageContent; ar: FeaturePageContent }>;

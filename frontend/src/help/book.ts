export type Pair = [string, string];

export type FigId = "window" | "roles" | "select" | "toolbox" | "picture" | "table" | "learn" | "exam" | "course";

export type HelpBlock =
  | { k: "p"; t: Pair }
  | { k: "h"; t: Pair }
  | { k: "note"; t: Pair }
  | { k: "steps"; items: Pair[] }
  | { k: "fig"; id: FigId; cap: Pair }
  | { k: "tools"; items: Tool[] }
  | { k: "code"; text: string };

export type Tool = { name: Pair; where: Pair; what: Pair; ex: Pair };

export type Chapter = {
  id: string;
  group: Pair;
  title: Pair;
  lead: Pair;
  blocks: HelpBlock[];
};

const p = (en: string, ar: string): HelpBlock => ({ k: "p", t: [en, ar] });
const h = (en: string, ar: string): HelpBlock => ({ k: "h", t: [en, ar] });
const note = (en: string, ar: string): HelpBlock => ({ k: "note", t: [en, ar] });
const steps = (...items: Pair[]): HelpBlock => ({ k: "steps", items });
const fig = (id: FigId, en: string, ar: string): HelpBlock => ({ k: "fig", id, cap: [en, ar] });
const tools = (...items: Tool[]): HelpBlock => ({ k: "tools", items });
const code = (text: string): HelpBlock => ({ k: "code", text });
const tool = (name: Pair, where: Pair, what: Pair, ex: Pair): Tool => ({ name, where, what, ex });

export const CHAPTERS: Chapter[] = [
  {
    id: "guide",
    group: ["Start here", "ابدأ من هنا"],
    title: ["How to use this guide", "كيف تستخدم هذا الدليل"],
    lead: ["A map of Web Studio: every menu, every panel, and a short example for each tool.", "خريطة استوديو الويب: كل قائمة، وكل لوحة، ومثال قصير لكل أداة."],
    blocks: [
      p("Open this guide from Help → Web Studio Help, or press F1. The same guide is on the welcome page, before you sign in.", "افتح هذا الدليل من تعليمات ← دليل استوديو الويب، أو اضغط F1. الدليل نفسه موجود في صفحة الترحيب قبل تسجيل الدخول."),
      p("Every chapter is written in English and in Arabic, one under the other. English and العربية at the top choose which language comes first, and which language the pictures use. Search looks through both languages.", "كل فصل مكتوب بالإنجليزية وبالعربية، واحد تحت الآخر. English والعربية في الأعلى يختاران أي لغة تأتي أولًا، وأي لغة تستخدمها الصور. البحث يمر على اللغتين."),
      fig("window", "The studio window, with the six places this guide keeps returning to.", "نافذة الاستوديو، وفيها الأماكن الستة التي يعود إليها هذا الدليل."),
      h("What a chapter contains", "ماذا يحتوي كل فصل"),
      p("A chapter names the tool, says where it lives in the window, explains what it changes, and then gives an example you can follow on a practice page. Menu names are written the way they appear on screen.", "يسمّي الفصل الأداة، ويذكر مكانها في النافذة، ويشرح ما الذي تغيّره، ثم يعطي مثالًا يمكنك اتباعه في صفحة تدريب. أسماء القوائم مكتوبة كما تظهر على الشاشة."),
      note("Save often with the Save button or Ctrl+S. A full reload of the browser drops text that has not been saved. Undo also lives only until you reload.", "احفظ كثيرًا بزر حفظ أو Ctrl+S. إعادة تحميل المتصفح تسقط النص الذي لم يُحفظ. التراجع أيضًا يبقى فقط إلى أن تعيد التحميل."),
    ],
  },
  {
    id: "signin",
    group: ["Start here", "ابدأ من هنا"],
    title: ["Signing in", "تسجيل الدخول"],
    lead: ["Three doors. Each one opens a different kind of work.", "ثلاثة أبواب. كل باب يفتح نوعًا مختلفًا من العمل."],
    blocks: [
      fig("roles", "Student, lecturer, and coordinator use different secrets.", "الطالب والمحاضر ومنسق المقرر يستخدمون أسرارًا مختلفة."),
      p("The welcome page always starts empty of the last student's work. A shared computer does not reopen someone else's website.", "صفحة الترحيب تبدأ دائمًا خالية من عمل الطالب السابق. الحاسوب المشترك لا يعيد فتح موقع شخص آخر."),
      tools(
        tool(
          ["I'm a student", "أنا طالب"],
          ["Welcome page, first tab", "صفحة الترحيب، التبويب الأول"],
          ["Opens your own workspace for one course section. You need a student ID, your name, the course from the list, and the section PIN.", "يفتح مساحة عملك الخاصة لشعبة واحدة. تحتاج الرقم الجامعي، واسمك، والمقرر من القائمة، والرقم السري للشعبة."],
          ["Type ID S2026001 and the name Sara. Open the course list and choose CMPS100A, section 1. Type the 4 to 8 digit PIN your lecturer gave you. Press Start learning HTML. The next visit with the same ID and the same name lists the websites you saved.", "اكتب الرقم S2026001 والاسم سارة. افتح قائمة المقررات واختر CMPS100A، الشعبة 1. اكتب الرقم السري من 4 إلى 8 أرقام الذي أعطاك إياه المحاضر. اضغط ابدأ تعلّم HTML. الزيارة التالية بنفس الرقم ونفس الاسم تعرض المواقع التي حفظتها."],
        ),
        tool(
          ["I'm the lecturer", "أنا المحاضر"],
          ["Welcome page, second tab", "صفحة الترحيب، التبويب الثاني"],
          ["Opens the section board: lessons and the student list. It does not open Course settings. Choose the section from the list, then enter its 4 to 8 digit PIN.", "يفتح لوحة الشعبة: الدروس وقائمة الطلاب. لا يفتح إعدادات المقررات. اختر الشعبة من القائمة، ثم أدخل رقمها السري من 4 إلى 8 أرقام."],
          ["Open the course list and choose CMPS100A, section 1. Type the section PIN saved in Course settings. Press Open lecturer view. A password from the Coordinator tab will not open this door.", "افتح قائمة المقررات واختر CMPS100A، الشعبة 1. اكتب الرقم السري المحفوظ في إعدادات المقررات. اضغط افتح لوحة المحاضر. كلمة المرور من تبويب منسق المقرر لا تفتح هذا الباب."],
        ),
        tool(
          ["Coordinator", "منسق المقرر"],
          ["Welcome page, third tab", "صفحة الترحيب، التبويب الثالث"],
          ["Signs in with a username and a password of at least 8 characters. A coordinator manages courses and exams. An admin can also create accounts.", "يدخل باسم مستخدم وكلمة مرور من 8 أحرف على الأقل. المنسق يدير المقررات والاختبارات. المدير يستطيع أيضًا إنشاء الحسابات."],
          ["The first time the staff list is empty, this tab asks you to create the first admin. After that, sign in and choose Open course settings.", "في المرة الأولى، عندما تكون قائمة الموظفين فارغة، يطلب هذا التبويب إنشاء المدير الأول. بعد ذلك سجّل الدخول واختر افتح إعدادات المقررات."],
        ),
        tool(
          ["Continue the websites on this computer", "تابع المواقع على هذا الحاسوب"],
          ["Bottom of the welcome page", "أسفل صفحة الترحيب"],
          ["Opens websites that belong to this computer, outside a class. It does not enter a course.", "يفتح المواقع التي تخص هذا الحاسوب، خارج الصف. لا يدخل إلى مقرر."],
          ["Use it on your own machine when you are practising without a class PIN.", "استخدمه على جهازك عندما تتدرّب من غير رقم سري للصف."],
        ),
      ),
      note("A section PIN is 4 to 8 digits. A coordinator password is longer and belongs only on the Coordinator tab. If the lecturer PIN is longer than 8 digits, the studio says the course code, section, or PIN is not right.", "الرقم السري للشعبة من 4 إلى 8 أرقام. كلمة مرور المنسق أطول وتُكتب فقط في تبويب منسق المقرر. إذا كان رقم المحاضر أطول من 8 أرقام، يقول الاستوديو إن رمز المقرر أو الشعبة أو الرقم السري غير صحيح."),
      h("After a student enters", "بعد دخول الطالب"),
      p("The workspace lists saved websites with their dates. Nothing opens by itself. Press a website to continue it, New website to start one, or Choose a folder to import a folder from the computer. That folder is then stored under your student ID.", "تعرض مساحة العمل المواقع المحفوظة مع تواريخها. لا يُفتح شيء من تلقاء نفسه. اضغط موقعًا لمتابعته، أو موقع جديد للبدء، أو اختر مجلدًا لاستيراد مجلد من الحاسوب. يُحفظ ذلك المجلد تحت رقمك الجامعي."),
      p("The same student ID with a different name is refused: that ID is already saved with another name. A different ID gets a different workspace, even in the same section.", "الرقم الجامعي نفسه مع اسم مختلف يُرفض: الرقم محفوظ باسم آخر. الرقم المختلف يحصل على مساحة عمل مختلفة، حتى داخل الشعبة نفسها."),
    ],
  },
  {
    id: "window",
    group: ["The window", "النافذة"],
    title: ["Parts of the window", "أجزاء النافذة"],
    lead: ["Six regions. Learn their names and the rest of the guide is easier to follow.", "ست مناطق. تعلّم أسماءها فيسهل عليك بقية الدليل."],
    blocks: [
      fig("window", "Menus and toolbar on top, folders and properties on the left, the page in the centre, the Toolbox on the right.", "القوائم وشريط الأدوات في الأعلى، والمجلدات والخصائص على اليسار، والصفحة في الوسط، وصندوق الأدوات على اليمين."),
      tools(
        tool(["Menu bar", "شريط القوائم"], ["Top row: File through Help", "الصف العلوي: من ملف إلى تعليمات"], ["Holds every command, including ones that are not on the toolbar.", "يحمل كل الأوامر، بما فيها ما ليس على شريط الأدوات."], ["Open Insert and choose Heading 1. The heading lands on the page.", "افتح إدراج واختر عنوان 1. ينزل العنوان على الصفحة."]),
        tool(["Toolbar", "شريط الأدوات"], ["Second row", "الصف الثاني"], ["New, Open, Save, Page, Undo, Redo, Preview, Download, Visual Aids, Check, Learn HTML, HTML exam, and Styles.", "جديد، فتح، حفظ، الصفحة، تراجع، إعادة، معاينة، تنزيل، مساعدات مرئية، فحص، تعلّم HTML، اختبار HTML، وأنماط."], ["Press Save. The status at the right of the bar changes to Saved.", "اضغط حفظ. تتغير الحالة يمين الشريط إلى تم الحفظ."]),
        tool(["Format bar", "شريط التنسيق"], ["Third row, in Design", "الصف الثالث، في التصميم"], ["Font, size, bold, italic, underline, alignment, font colour, and highlight for the selected tag.", "الخط، والحجم، والعريض، والمائل، والتسطير، والمحاذاة، ولون الخط، والتمييز للوسم المحدد."], ["Click a paragraph, choose 24 in Size, then press B.", "انقر فقرة، واختر 24 في الحجم، ثم اضغط B."]),
        tool(["Folder List", "قائمة المجلدات"], ["Left, top", "اليسار، الأعلى"], ["The website as files: pages, folders, images, style.css, and script.js.", "الموقع كملفات: صفحات، ومجلدات، وصور، وstyle.css، وscript.js."], ["Click index.html to show that page. Click the new-file icon to add about.html.", "انقر index.html لإظهار تلك الصفحة. انقر أيقونة الملف الجديد لإضافة about.html."]),
        tool(["Tag Properties", "خصائص الوسم"], ["Left, under the folders", "اليسار، تحت المجلدات"], ["Settings for the tag you clicked: words, link, list, table, colours, and spacing.", "إعدادات الوسم الذي نقرته: الكلمات، والرابط، والقائمة، والجدول، والألوان، والمسافات."], ["Click a heading. Its name, such as Heading and <h1>, appears at the top of this panel.", "انقر عنوانًا. يظهر اسمه، مثل عنوان و<h1>، أعلى هذه اللوحة."]),
        tool(["Page", "الصفحة"], ["Centre", "الوسط"], ["The page you are designing. Click to select. Double-click words to type.", "الصفحة التي تصممها. انقر للتحديد. انقر مرتين على الكلمات لتكتب."], ["Double-click the heading and type Hello, I'm Sara.", "انقر مرتين على العنوان واكتب مرحبًا، أنا سارة."]),
        tool(["Toolbox", "صندوق الأدوات"], ["Right side", "الجانب الأيمن"], ["HTML tags, Pictures, Layers, and Learn. Drag a tag onto the page.", "وسوم HTML، والصور، والطبقات، وتعلّم. اسحب وسمًا إلى الصفحة."], ["In HTML, drag Paragraph onto the page under the heading.", "في HTML، اسحب فقرة إلى الصفحة تحت العنوان."]),
        tool(["Status bar", "شريط الحالة"], ["Bottom", "الأسفل"], ["Names the selected tag and says whether the page is saved.", "يسمّي الوسم المحدد ويقول إن كانت الصفحة محفوظة."], ["Click a picture. The left side of the bar shows <img>.", "انقر صورة. يظهر <img> في يسار الشريط."]),
      ),
      p("On a phone, the bottom bar switches among Toolbox, Page, and Properties, because the three columns do not fit at once.", "على الهاتف، يبدّل الشريط السفلي بين الأدوات والصفحة والخصائص، لأن الأعمدة الثلاثة لا تتسع معًا."),
      p("Classroom on the menu bar opens the class board. Coordinator, Course settings, or Admin opens the staff sign-in. The label follows the account you are using.", "الصف الدراسي في شريط القوائم يفتح لوحة الصف. منسق المقرر أو إعدادات المقررات أو المدير يفتح دخول الموظفين. التسمية تتبع الحساب الذي تستخدمه."),
    ],
  },
  {
    id: "file",
    group: ["The window", "النافذة"],
    title: ["File, sites, and pages", "ملف، والمواقع، والصفحات"],
    lead: ["A website is a project. A project holds pages, pictures, style.css, and script.js.", "الموقع مشروع. المشروع يحمل صفحات وصورًا وstyle.css وscript.js."],
    blocks: [
      tools(
        tool(["New website", "موقع جديد"], ["File, or the New button", "ملف، أو زر جديد"], ["Starts another project. The current website stays saved.", "يبدأ مشروعًا آخر. يبقى الموقع الحالي محفوظًا."], ["File → New website. Name it Sara. Choose English or Arabic. Pick a blank page or a ready example, then Create project.", "ملف ← موقع جديد. سمّه سارة. اختر الإنجليزية أو العربية. اختر صفحة فارغة أو مثالًا جاهزًا، ثم أنشئ المشروع."]),
        tool(["Open…", "فتح…"], ["File, or the Open button", "ملف، أو زر فتح"], ["Lists websites saved for this student, this lecturer session, or this computer.", "يعرض المواقع المحفوظة لهذا الطالب، أو لجلسة المحاضر، أو لهذا الحاسوب."], ["File → Open… and click the website you want. The × on a row deletes that website after you confirm.", "ملف ← فتح… وانقر الموقع الذي تريده. علامة × في الصف تحذف ذلك الموقع بعد التأكيد."]),
        tool(["Open a folder…", "فتح مجلد…"], ["File", "ملف"], ["Imports a ZIP, an HTML file, or a folder from the computer.", "يستورد ملف ZIP أو HTML أو مجلدًا من الحاسوب."], ["File → Open a folder… → Folder, and choose the folder that contains index.html.", "ملف ← فتح مجلد… ← مجلد، واختر المجلد الذي فيه index.html."]),
        tool(["Save", "حفظ"], ["File, toolbar, Ctrl+S", "ملف، شريط الأدوات، Ctrl+S"], ["Writes the open project to the studio.", "يكتب المشروع المفتوح في الاستوديو."], ["Change a heading, press Ctrl+S, and wait until the bar says Saved.", "غيّر عنوانًا، واضغط Ctrl+S، وانتظر حتى يقول الشريط تم الحفظ."]),
        tool(["Save to my computer…", "حفظ في حاسوبي…"], ["File", "ملف"], ["Writes the website into a folder you choose on the computer.", "يكتب الموقع في مجلد تختاره على الحاسوب."], ["File → Save to my computer… and pick a folder named sara-site.", "ملف ← حفظ في حاسوبي… واختر مجلدًا باسم sara-site."]),
        tool(["Download website", "تنزيل الموقع"], ["File, or Download", "ملف، أو تنزيل"], ["Downloads a ZIP of the pages, style.css, script.js, and images.", "ينزّل ملف ZIP فيه الصفحات وstyle.css وscript.js والصور."], ["Press Download, then unzip the file and open index.html in a browser.", "اضغط تنزيل، ثم فك ضغط الملف وافتح index.html في المتصفح."]),
        tool(["Page settings…", "إعدادات الصفحة…"], ["File, or the Page button", "ملف، أو زر الصفحة"], ["Sets the title shown in the browser tab, and the page language: English left to right, or Arabic right to left.", "يضبط العنوان الظاهر في تبويب المتصفح، ولغة الصفحة: الإنجليزية من اليسار، أو العربية من اليمين."], ["Press Page, set the title to Sara Al Harthy, choose Arabic, and press Apply. The design direction follows that choice.", "اضغط الصفحة، واجعل العنوان سارة الحارثية، واختر العربية، واضغط تطبيق. اتجاه التصميم يتبع هذا الاختيار."]),
        tool(["Preview in browser", "معاينة في المتصفح"], ["File, or Preview", "ملف، أو معاينة"], ["Opens the website as a visitor would see it, without the editing boxes.", "يفتح الموقع كما يراه الزائر، من غير صناديق التحرير."], ["Press Preview after you save. Click your links and look at the page title in the tab.", "اضغط معاينة بعد الحفظ. انقر روابطك وانظر إلى عنوان الصفحة في التبويب."]),
        tool(["Website name", "اسم الموقع"], ["The box beside the page tabs", "المربع بجانب تبويبات الصفحات"], ["Renames the project in the studio. It is the name in Open, not the browser-tab title.", "يعيد تسمية المشروع في الاستوديو. هو الاسم في فتح، وليس عنوان تبويب المتصفح."], ["Click the name box, type My first website, then Save.", "انقر مربع الاسم، واكتب موقعي الأول، ثم احفظ."]),
      ),
      h("Page tabs", "تبويبات الصفحات"),
      p("Each open page is a tab above the design. Click the name to switch. Click × to close the tab. Closing a tab does not delete the file. The file stays in the Folder List.", "كل صفحة مفتوحة تبويب فوق التصميم. انقر الاسم للتبديل. انقر × لإغلاق التبويب. إغلاق التبويب لا يحذف الملف. يبقى الملف في قائمة المجلدات."),
    ],
  },
  {
    id: "folders",
    group: ["The window", "النافذة"],
    title: ["Folder List", "قائمة المجلدات"],
    lead: ["The website as a tree of files, the same idea as a folder on the computer.", "الموقع كشجرة ملفات، بنفس فكرة المجلد على الحاسوب."],
    blocks: [
      tools(
        tool(["Open a file", "فتح ملف"], ["Click its name", "انقر اسمه"], ["A page opens in the centre. style.css and script.js open in the code area. A picture is selected for insert.", "الصفحة تُفتح في الوسط. style.css وscript.js يُفتحان في منطقة الكود. الصورة تُحدَّد للإدراج."], ["Click about.html. Its tab appears, and the design shows that page.", "انقر about.html. يظهر تبويبها، ويعرض التصميم تلك الصفحة."]),
        tool(["New File", "ملف جديد"], ["Icon in the Folder List caption, or right-click", "أيقونة في عنوان قائمة المجلدات، أو النقر باليمين"], ["Adds a page. Type the name and press Enter. Use a name such as contact.html.", "يضيف صفحة. اكتب الاسم واضغط Enter. استخدم اسمًا مثل contact.html."], ["Press New File, type visit.html, press Enter, then click the new file and add a heading.", "اضغط ملف جديد، واكتب visit.html، واضغط Enter، ثم انقر الملف الجديد وأضف عنوانًا."]),
        tool(["New Folder", "مجلد جديد"], ["Folder icon, or right-click", "أيقونة المجلد، أو النقر باليمين"], ["Makes a folder you can drop files into.", "ينشئ مجلدًا يمكنك إسقاط الملفات فيه."], ["Press New Folder, type notes, press Enter.", "اضغط مجلد جديد، واكتب notes، واضغط Enter."]),
        tool(["Refresh", "تحديث"], ["Circular arrow", "السهم الدائري"], ["Reads the file list again.", "يقرأ قائمة الملفات من جديد."], ["Press Refresh after you import a folder and do not see the new files yet.", "اضغط تحديث بعد استيراد مجلد إذا لم تظهر الملفات الجديدة بعد."]),
        tool(["Collapse All", "طي الكل"], ["The last icon in the caption", "الأيقونة الأخيرة في العنوان"], ["Closes every folder in the tree.", "يغلق كل المجلدات في الشجرة."], ["Press Collapse All when the tree is long, then open only images.", "اضغط طي الكل عندما تطول الشجرة، ثم افتح الصور فقط."]),
        tool(["Drag to move", "اسحب للنقل"], ["Drag a file onto a folder", "اسحب ملفًا إلى مجلد"], ["Moves that file into the folder. The site itself cannot be deleted from this menu.", "ينقل ذلك الملف إلى المجلد. لا يمكن حذف الموقع نفسه من هذه القائمة."], ["Drag visit.html onto the notes folder.", "اسحب visit.html إلى مجلد notes."]),
        tool(["Delete", "حذف"], ["Right-click the file", "انقر الملف باليمين"], ["Removes that file or folder from the website. Pages named by the studio as the main page stay protected.", "يزيل ذلك الملف أو المجلد من الموقع. الصفحات التي يسميها الاستوديو صفحة رئيسية تبقى محمية."], ["Right-click an old draft and choose Delete, then confirm.", "انقر مسودة قديمة باليمين واختر حذف، ثم أكّد."]),
      ),
      note("index.html is the first page visitors open. style.css is the look of the whole site. script.js is the JavaScript. images holds pictures. A hidden exam file is kept out of this list.", "index.html هي أول صفحة يفتحها الزائر. style.css هو مظهر الموقع كله. script.js هو جافاسكربت. images يحمل الصور. ملف الاختبار المخفي يبقى خارج هذه القائمة."),
    ],
  },
  {
    id: "editing",
    group: ["Building a page", "بناء صفحة"],
    title: ["Selecting and typing", "التحديد والكتابة"],
    lead: ["The page is made of tags. You select a tag, then you change it.", "الصفحة مصنوعة من وسوم. تحدد وسمًا، ثم تغيّره."],
    blocks: [
      fig("select", "One click selects the box. A second click on the words lets you type.", "نقرة واحدة تحدد الصندوق. نقرة ثانية على الكلمات تتيح لك الكتابة."),
      steps(
        ["Click a paragraph once. A box appears around it, the tag bar shows <p>, and Tag Properties shows the paragraph.", "انقر فقرة مرة واحدة. يظهر صندوق حولها، ويعرض شريط الوسوم <p>، وتعرض خصائص الوسم الفقرة."],
        ["Double-click the words and type. Press Escape or click outside when you finish.", "انقر الكلمات مرتين واكتب. اضغط Escape أو انقر خارجها عند الانتهاء."],
        ["The tag bar under the page tabs lists <body> and then each parent, such as <section> then <p>. Click a parent to select a larger box.", "شريط الوسوم تحت تبويبات الصفحات يعرض <body> ثم كل أب، مثل <section> ثم <p>. انقر الأب لتحديد صندوق أكبر."],
        ["In Tag Properties, the Outside button selects the parent. Copy duplicates the tag. Delete removes it.", "في خصائص الوسم، زر ما حوله يحدد الأب. نسخ يكرّر الوسم. حذف يزيله."],
      ),
      h("Right-click", "النقر باليمين"),
      p("Right-click the selected tag for a short menu: bold, italic, underline, alignment, make this a link, cut, copy, paste, duplicate, and delete. A picture, a list, a link, and a table add their own commands. Those are described in their own chapters.", "انقر الوسم المحدد باليمين لقائمة قصيرة: عريض، ومائل، وتسطير، ومحاذاة، واجعل هذا رابطًا، وقص، ونسخ، ولصق، وتكرار، وحذف. الصورة والقائمة والرابط والجدول تضيف أوامرها. تلك موصوفة في فصولها."),
      h("Empty page", "صفحة فارغة"),
      p("A blank page offers four starters: Welcome banner, Menu bar, Three ideas, and Footer. You can also drag any tag from the Toolbox.", "الصفحة الفارغة تعرض أربع بدايات: واجهة ترحيب، وشريط القائمة، وثلاث أفكار، وتذييل. يمكنك أيضًا سحب أي وسم من صندوق الأدوات."),
      h("Next step", "الخطوة التالية"),
      p("Above the page, Next suggests one action: a banner, a story, a photo, a row of cards, colours, the phone view, Check, then Preview. Press Do this to run that action. The strip hides while a mission is running.", "فوق الصفحة، يقترح التالي عملًا واحدًا: واجهة، وقصة، وصورة، وصف بطاقات، وألوان، وعرض الهاتف، والفحص، ثم المعاينة. اضغط افعل هذا لتنفيذ ذلك العمل. يختفي الشريط أثناء تشغيل مهمة."),
    ],
  },
  {
    id: "editmenu",
    group: ["Building a page", "بناء صفحة"],
    title: ["Edit menu", "قائمة تحرير"],
    lead: ["The same editing commands you expect in a desktop page editor.", "أوامر التحرير نفسها التي تتوقعها في محرر صفحات مكتبي."],
    blocks: [
      tools(
        tool(["Undo", "تراجع"], ["Edit, toolbar, Ctrl+Z", "تحرير، شريط الأدوات، Ctrl+Z"], ["Steps back through design changes. Typing several characters quickly can count as one step.", "يرجع خطوة في تغييرات التصميم. كتابة عدة أحرف بسرعة قد تُحسب خطوة واحدة."], ["Make a heading bold, press Ctrl+Z, and the bold goes away.", "اجعل عنوانًا عريضًا، واضغط Ctrl+Z، فيزول العريض."]),
        tool(["Redo", "إعادة"], ["Edit, toolbar, Ctrl+Y", "تحرير، شريط الأدوات، Ctrl+Y"], ["Brings back the step you just undid.", "يعيد الخطوة التي تراجعت عنها."], ["After Undo, press Ctrl+Y. The bold returns.", "بعد التراجع، اضغط Ctrl+Y. يعود العريض."]),
        tool(["Cut", "قص"], ["Edit, Ctrl+X", "تحرير، Ctrl+X"], ["Removes the selected tag and keeps it for Paste. In Code view it cuts the selected text.", "يزيل الوسم المحدد ويحتفظ به للصق. في عرض الكود يقص النص المحدد."], ["Click a card, choose Edit → Cut, click another place, then Paste.", "انقر بطاقة، واختر تحرير ← قص، وانقر مكانًا آخر، ثم الصق."]),
        tool(["Copy", "نسخ"], ["Edit, Ctrl+C", "تحرير، Ctrl+C"], ["Copies the selected tag, or the selected code.", "ينسخ الوسم المحدد، أو الكود المحدد."], ["Copy a paragraph and paste it under the first one.", "انسخ فقرة والصقها تحت الأولى."]),
        tool(["Paste", "لصق"], ["Edit, Ctrl+V", "تحرير، Ctrl+V"], ["Pastes the tag you cut or copied.", "يلصق الوسم الذي قصصته أو نسخته."], ["Copy a list and press Ctrl+V to place a second copy.", "انسخ قائمة واضغط Ctrl+V لوضع نسخة ثانية."]),
        tool(["Paste Text", "لصق كنص"], ["Edit", "تحرير"], ["Pastes words only, without the tags they came from.", "يلصق الكلمات فقط، من غير الوسوم التي جاءت منها."], ["Copy a heading from another site and use Paste Text so you get the words, not its layout.", "انسخ عنوانًا من موقع آخر واستخدم لصق كنص لتحصل على الكلمات، لا على تخطيطه."]),
        tool(["Paste HTML…", "لصق HTML…"], ["Edit", "تحرير"], ["Opens a box where you paste tags. They become parts you can click.", "يفتح مربعًا تلصق فيه الوسوم. تصبح أجزاء يمكنك نقرها."], ["Paste <h2>Club day</h2><p>Thursday at 2.</p> and press Insert.", "الصق <h2>يوم النادي</h2><p>الخميس عند 2.</p> واضغط إدراج."]),
        tool(["Duplicate", "تكرار"], ["Edit", "تحرير"], ["Makes a second copy of the selected tag, in Design view.", "يصنع نسخة ثانية من الوسم المحدد، في عرض التصميم."], ["Select a card and choose Duplicate. Change the title of the copy.", "حدد بطاقة واختر تكرار. غيّر عنوان النسخة."]),
        tool(["Delete", "حذف"], ["Edit, Delete key", "تحرير، مفتاح Delete"], ["Removes the selected tag.", "يزيل الوسم المحدد."], ["Click a spare horizontal line and press Delete.", "انقر خطًا أفقيًا زائدًا واضغط Delete."]),
        tool(["Select All", "تحديد الكل"], ["Edit, Ctrl+A", "تحرير، Ctrl+A"], ["In Code view, selects all the text in the file you are editing.", "في عرض الكود، يحدد كل النص في الملف الذي تحرره."], ["Switch to Code, click the HTML, and press Ctrl+A.", "انتقل إلى كود، وانقر HTML، واضغط Ctrl+A."]),
        tool(["Find…", "بحث…"], ["Edit, Ctrl+F", "تحرير، Ctrl+F"], ["Finds the next matching words on the page. In Code view it searches the file you are editing.", "يجد الكلمات المطابقة التالية في الصفحة. في عرض الكود يبحث في الملف الذي تحرره."], ["Press Ctrl+F, type Sara, and press Find next.", "اضغط Ctrl+F، واكتب سارة، واضغط بحث عن التالي."]),
        tool(["Replace…", "استبدال…"], ["Edit, Ctrl+H", "تحرير، Ctrl+H"], ["Replaces one match, or every match.", "يستبدل مطابقة واحدة، أو كل المطابقات."], ["Find student and replace it with learner, then press Replace all.", "ابحث عن student واستبدله بـ learner، ثم اضغط استبدال الكل."]),
      ),
    ],
  },
  {
    id: "view",
    group: ["Building a page", "بناء صفحة"],
    title: ["View", "عرض"],
    lead: ["Design is the page. Code is the tags. Split shows both.", "التصميم هو الصفحة. الكود هو الوسوم. المقسوم يعرض الاثنين."],
    blocks: [
      tools(
        tool(["Design", "تصميم"], ["View, or the switch under the page", "عرض، أو المبدّل تحت الصفحة"], ["Shows the page as a visitor sees the layout. This is where you click and drag.", "يعرض الصفحة كما يرى الزائر التخطيط. هنا تنقر وتسحب."], ["View → Design, then drag a heading onto the page.", "عرض ← تصميم، ثم اسحب عنوانًا إلى الصفحة."]),
        tool(["Split", "مقسوم"], ["View", "عرض"], ["Page on top, code underneath. Drag the splitter to give one side more room.", "الصفحة في الأعلى، والكود في الأسفل. اسحب الفاصل لتعطي جانبًا مساحة أكبر."], ["View → Split. Click a heading on the page and watch the matching lines in the HTML.", "عرض ← مقسوم. انقر عنوانًا في الصفحة وراقب الأسطر المطابقة في HTML."]),
        tool(["Code", "كود"], ["View", "عرض"], ["The files fill the centre. Edit the HTML, then style.css or script.js.", "تملأ الملفات الوسط. حرّر HTML، ثم style.css أو script.js."], ["View → Code. Change <h1>Hello</h1> to <h1>Sara</h1>, then switch back to Design.", "عرض ← كود. غيّر <h1>Hello</h1> إلى <h1>سارة</h1>، ثم عد إلى التصميم."]),
        tool(["Computer", "حاسوب"], ["View, or the size switch", "عرض، أو مبدّل الحجم"], ["A wide page.", "صفحة عريضة."], ["View → Computer after you finish the phone check.", "عرض ← حاسوب بعد أن تنهي فحص الهاتف."]),
        tool(["Tablet", "لوحي"], ["View", "عرض"], ["A middle width, to see whether columns still fit.", "عرض متوسط، لترى إن كانت الأعمدة ما زالت تتسع."], ["View → Tablet and look at a three-column row.", "عرض ← لوحي وانظر إلى صف من ثلاثة أعمدة."]),
        tool(["Phone", "هاتف"], ["View, or the Phone button", "عرض، أو زر هاتف"], ["A narrow width. Columns wrap. This is the check you want before you publish.", "عرض ضيق. تلتف الأعمدة. هذا هو الفحص الذي تريده قبل النشر."], ["Press Phone. If a picture is wider than the screen, select it and set its size lower.", "اضغط هاتف. إذا كانت الصورة أعرض من الشاشة، حددها واجعل حجمها أصغر."]),
        tool(["Visual Aids", "مساعدات مرئية"], ["View, or the toolbar", "عرض، أو شريط الأدوات"], ["Draws boxes around tags so you can see sections, margins, and padding.", "يرسم صناديق حول الوسوم لترى الأقسام والهوامش والحشو."], ["Turn Visual Aids on, then hover a card. Turn it off when you want the page clean.", "شغّل المساعدات المرئية، ثم مرّر الفأرة على بطاقة. أوقفها عندما تريد الصفحة نظيفة."]),
        tool(["Projector size", "حجم العرض"], ["View", "عرض"], ["Enlarges the studio for a classroom screen.", "يكبّر الاستوديو لشاشة الصف."], ["View → Projector size before you teach, and choose it again to return.", "عرض ← حجم العرض قبل التدريس، واختره مرة أخرى للعودة."]),
      ),
    ],
  },
  {
    id: "toolbox",
    group: ["Building a page", "بناء صفحة"],
    title: ["Toolbox and Insert", "صندوق الأدوات وقائمة إدراج"],
    lead: ["Every piece you can place on a page, and a small example of when to use it.", "كل قطعة يمكنك وضعها في الصفحة، ومثال صغير لوقت استخدامها."],
    blocks: [
      fig("toolbox", "Search the Toolbox, or drag a tag. Insert repeats the pieces you use most.", "ابحث في صندوق الأدوات، أو اسحب وسمًا. إدراج يكرّر القطع التي تستخدمها أكثر."),
      p("Open Panels → Toolbox, or the HTML tab on the right. Type in Find a tag… to filter. Drag the tag onto the page, or click it to insert it near the current selection. Insert in the menu bar places the common ones without opening the panel.", "افتح لوحات ← صندوق الأدوات، أو تبويب HTML على اليمين. اكتب في ابحث عن وسم… للتصفية. اسحب الوسم إلى الصفحة، أو انقره لإدراجه قرب التحديد الحالي. إدراج في شريط القوائم يضع الشائعة من غير فتح اللوحة."),
      h("Text", "النصوص"),
      tools(
        tool(["Heading 1 to Heading 6", "عنوان 1 إلى عنوان 6"], ["Toolbox → Text, or Insert for 1 and 2", "صندوق الأدوات ← النصوص، أو إدراج للعنوان 1 و2"], ["<h1> is the page title. Use it once. <h2> names a section. The smaller headings nest inside that.", "<h1> عنوان الصفحة. استخدمه مرة واحدة. <h2> يسمّي قسمًا. العناوين الأصغر تتداخل داخله."], ["Insert Heading 1 and type My studio. Under it, insert Heading 2 and type This week.", "أدرج عنوان 1 واكتب الاستوديو. تحته أدرج عنوان 2 واكتب هذا الأسبوع."]),
        tool(["Paragraph", "فقرة"], ["Toolbox → Text, Insert", "صندوق الأدوات ← النصوص، إدراج"], ["A block of sentences. The tag is <p>.", "كتلة من الجمل. الوسم هو <p>."], ["Drag Paragraph under the heading and replace the sample sentence with two sentences about you.", "اسحب فقرة تحت العنوان واستبدل الجملة النموذجية بجملتين عنك."]),
        tool(["Quote", "اقتباس"], ["Toolbox → Text", "صندوق الأدوات ← النصوص"], ["A <blockquote> with a bar on the side, for a sentence you are quoting.", "<blockquote> مع شريط على الجانب، لجملة تقتبسها."], ["Insert Quote and type a line from a poem you like.", "أدرج اقتباسًا واكتب بيتًا من قصيدة تحبها."]),
        tool(["Horizontal line", "خط أفقي"], ["Toolbox → Text, Insert", "صندوق الأدوات ← النصوص، إدراج"], ["A <hr> that separates two parts of the page.", "<hr> يفصل جزأين من الصفحة."], ["Put a horizontal line between the story and the timetable.", "ضع خطًا أفقيًا بين القصة والجدول."]),
        tool(["Link", "رابط"], ["Toolbox → Text, Insert as Hyperlink", "صندوق الأدوات ← النصوص، إدراج باسم ارتباط تشعبي"], ["An <a> tag. The words are what the visitor clicks. The address is href.", "وسم <a>. الكلمات هي ما ينقره الزائر. العنوان هو href."], ["Insert Hyperlink, select it, and set the address to https://nasserdiary.com.", "أدرج ارتباطًا تشعبيًا، وحدده، واجعل العنوان https://nasserdiary.com."]),
        tool(["Button", "زر"], ["Toolbox → Text", "صندوق الأدوات ← النصوص"], ["A link styled as a button. It still needs an address.", "رابط منسّق كزر. ما زال يحتاج عنوانًا."], ["Insert Button, change the words to See my work, and set the address to about.html.", "أدرج زرًا، وغيّر الكلمات إلى شاهد عملي، واجعل العنوان about.html."]),
      ),
      h("Lists, tables, media", "القوائم والجداول والوسائط"),
      p("Bulleted list, Numbered list, Nested list, and Table each have their own chapter. Image, Gallery, Video, YouTube, Map, and Audio are covered with Pictures.", "القائمة النقطية، والقائمة المرقمة، والقائمة المتداخلة، والجدول لكل منها فصل. الصورة، ومعرض الصور، والفيديو، ويوتيوب، والخريطة، والصوت مذكورة مع الصور."),
      h("Layout", "التخطيط"),
      tools(
        tool(["Section", "قسم"], ["Toolbox → Layout", "صندوق الأدوات ← التخطيط"], ["A <section> with a heading and a paragraph. Use one section per topic.", "<section> مع عنوان وفقرة. استخدم قسمًا لكل موضوع."], ["Drag Section and change the heading to Hobbies.", "اسحب قسمًا وغيّر العنوان إلى الهوايات."]),
        tool(["2 columns, 3 columns, 4 columns", "عمودان، 3 أعمدة، 4 أعمدة"], ["Toolbox → Layout", "صندوق الأدوات ← التخطيط"], ["A row of boxes that sit side by side and wrap on a phone.", "صف من الصناديق يقف جنبًا إلى جنب ويلتف على الهاتف."], ["Drag 2 columns. Put a paragraph in the first and a picture in the second.", "اسحب عمودين. ضع فقرة في الأول وصورة في الثاني."]),
        tool(["Card", "بطاقة"], ["Toolbox → Layout", "صندوق الأدوات ← التخطيط"], ["A bordered box with a title, a short text, and a button.", "صندوق بإطار، فيه عنوان ونص قصير وزر."], ["Drag Card and change the title to Drawing.", "اسحب بطاقة وغيّر العنوان إلى الرسم."]),
        tool(["Spacer", "مسافة"], ["Toolbox → Layout", "صندوق الأدوات ← التخطيط"], ["An empty gap, 48 pixels tall.", "فراغ فارغ، ارتفاعه 48 بكسل."], ["Insert Spacer between the banner and the first section if they feel crowded.", "أدرج مسافة بين الواجهة والقسم الأول إذا بديا مزدحمين."]),
      ),
      h("Ready-made", "أجزاء جاهزة"),
      tools(
        tool(["Navigation", "شريط التنقل"], ["Toolbox → Ready-made, Insert", "صندوق الأدوات ← أجزاء جاهزة، إدراج"], ["A dark bar with the site name and Home, About, Contact.", "شريط داكن فيه اسم الموقع والرئيسية ومن نحن وتواصل."], ["Insert Navigation at the top. Point Home at index.html and About at about.html.", "أدرج شريط التنقل في الأعلى. اجعل الرئيسية تشير إلى index.html ومن نحن إلى about.html."]),
        tool(["Hero", "واجهة رئيسية"], ["Toolbox → Ready-made", "صندوق الأدوات ← أجزاء جاهزة"], ["A large welcome banner: title, sentence, and button.", "واجهة ترحيب كبيرة: عنوان وجملة وزر."], ["Drag Hero and replace the title with Welcome to my studio.", "اسحب الواجهة واستبدل العنوان بـ مرحبًا بكم في الاستوديو."]),
        tool(["Three features", "ثلاث مزايا"], ["Toolbox → Ready-made", "صندوق الأدوات ← أجزاء جاهزة"], ["Three cards in a row.", "ثلاث بطاقات في صف."], ["Drag Three features and name them Draw, Write, and Photograph.", "اسحب ثلاث مزايا وسمّها ارسم، واكتب، وصوّر."]),
        tool(["Footer", "تذييل"], ["Toolbox → Ready-made, Insert", "صندوق الأدوات ← أجزاء جاهزة، إدراج"], ["A closing bar. Put the year and your name here.", "شريط ختامي. ضع السنة واسمك هنا."], ["Insert Footer and type © 2026 Sara Al Harthy.", "أدرج تذييلًا واكتب © 2026 سارة الحارثية."]),
      ),
      h("HTML5 pieces", "عناصر HTML5"),
      tools(
        tool(["Header", "ترويسة"], ["Toolbox → HTML5", "صندوق الأدوات ← عناصر HTML5"], ["A <header> for the title area of the page or of a section.", "<header> لمنطقة العنوان في الصفحة أو في قسم."], ["Use Header at the top when you want the real tag, not the coloured Hero.", "استخدم الترويسة في الأعلى عندما تريد الوسم الحقيقي، لا الواجهة الملونة."]),
        tool(["Main", "المحتوى الرئيسي"], ["Toolbox → HTML5", "صندوق الأدوات ← عناصر HTML5"], ["<main> wraps the important content. Use it once.", "<main> يغلّف المحتوى المهم. استخدمه مرة واحدة."], ["Put Main around the story, and leave the footer outside it.", "ضع المحتوى الرئيسي حول القصة، واترك التذييل خارجه."]),
        tool(["Article", "مقالة"], ["Toolbox → HTML5", "صندوق الأدوات ← عناصر HTML5"], ["A finished piece, such as a post, with a title and a date.", "قطعة مكتملة، مثل تدوينة، مع عنوان وتاريخ."], ["Drag Article and write a short post about today's class.", "اسحب مقالة واكتب تدوينة قصيرة عن حصة اليوم."]),
        tool(["Aside", "جانبي"], ["Toolbox → HTML5", "صندوق الأدوات ← عناصر HTML5"], ["A side note, the “Did you know?” box.", "ملاحظة جانبية، صندوق «هل تعلم؟»."], ["Drag Aside and write one fact about HTML.", "اسحب جانبيًا واكتب حقيقة واحدة عن HTML."]),
        tool(["Accordion", "قائمة قابلة للطي"], ["Toolbox → HTML5", "صندوق الأدوات ← عناصر HTML5"], ["A <details> block. The visitor clicks the summary to open the rest. No script is required.", "كتلة <details>. ينقر الزائر الملخص ليفتح الباقي. لا حاجة إلى سكربت."], ["Insert Accordion, change Click to open into Office hours, and write the times underneath.", "أدرج قائمة قابلة للطي، وغيّر انقر للفتح إلى ساعات المكتب، واكتب الأوقات تحتها."]),
        tool(["Code sample", "مثال كود"], ["Toolbox → HTML5", "صندوق الأدوات ← عناصر HTML5"], ["A dark <pre> box for showing tags as text.", "صندوق <pre> داكن لعرض الوسوم كنص."], ["Insert Code sample when the page itself is teaching a tag.", "أدرج مثال كود عندما تكون الصفحة نفسها تعلّم وسمًا."]),
        tool(["Embed page", "تضمين صفحة"], ["Toolbox → HTML5", "صندوق الأدوات ← عناصر HTML5"], ["An <iframe> that shows another page inside yours. Give it a title.", "<iframe> يعرض صفحة أخرى داخل صفحتك. أعطه عنوانًا."], ["Use it only for a page you are allowed to embed, and fill in the title so Check stays quiet.", "استخدمه فقط لصفحة يُسمح لك بتضمينها، واملأ العنوان ليبقى الفحص هادئًا."]),
      ),
    ],
  },
  {
    id: "format",
    group: ["Building a page", "بناء صفحة"],
    title: ["Format and Tag Properties", "التنسيق وخصائص الوسم"],
    lead: ["How a selected tag looks: type, colour, space, and small effects.", "كيف يبدو الوسم المحدد: الخط، واللون، والمسافة، والتأثيرات الصغيرة."],
    blocks: [
      p("Select a tag first. If the format buttons are dim, nothing is selected, or the selection is a picture. Picture tools are separate.", "حدد وسمًا أولًا. إذا كانت أزرار التنسيق باهتة، فلا شيء محدد، أو التحديد صورة. أدوات الصورة منفصلة."),
      tools(
        tool(["Font", "الخط"], ["Format bar, or Tag Properties → CSS → Type", "شريط التنسيق، أو خصائص الوسم ← CSS ← الخط"], ["Sets the typeface. Choosing a Google font such as Poppins or Amiri writes the font link into the stylesheet.", "يضبط نوع الخط. اختيار خط من Google مثل Poppins أو Amiri يكتب رابط الخط في ملف التنسيق."], ["Select the heading and choose Amiri for an Arabic page, or Georgia for an English one.", "حدد العنوان واختر Amiri لصفحة عربية، أو Georgia لصفحة إنجليزية."]),
        tool(["Size", "الحجم"], ["Format bar, and CSS → Type", "شريط التنسيق، وCSS ← الخط"], ["Sizes on the bar run from 12 to 48. CSS → Type also offers 16, 20, 28, 40, 56, and a box for another size such as 18px.", "الأحجام في الشريط من 12 إلى 48. CSS ← الخط يعرض أيضًا 16 و20 و28 و40 و56، ومربعًا لحجم آخر مثل 18px."], ["Select a paragraph and set 18.", "حدد فقرة واجعل الحجم 18."]),
        tool(["Bold, Italic, Underline", "عريض، مائل، تسطير"], ["Format bar, Format menu, Tag Properties → Tag", "شريط التنسيق، قائمة تنسيق، خصائص الوسم ← الوسم"], ["Wraps the selection. Format → Bold is the same command as the B button.", "يلف التحديد. تنسيق ← عريض هو الأمر نفسه لزر B."], ["Double-click one word, then press B so only that word is bold.", "انقر كلمة مرتين، ثم اضغط B ليصبح تلك الكلمة فقط عريضة."]),
        tool(["Strike", "شطب"], ["Tag Properties → Tag", "خصائص الوسم ← الوسم"], ["Draws a line through the words.", "يرسم خطًا عبر الكلمات."], ["Select a finished task in a list and press Strike.", "حدد مهمة منتهية في قائمة واضغط شطب."]),
        tool(["Align left, Center, Align right", "محاذاة لليسار، توسيط، محاذاة لليمين"], ["Format bar and Format menu", "شريط التنسيق وقائمة تنسيق"], ["Moves the words inside the selected tag. For Arabic pages, start still means the side where reading begins.", "يحرّك الكلمات داخل الوسم المحدد. في الصفحات العربية، البداية تبقى الجهة التي تبدأ منها القراءة."], ["Select the hero heading and choose Center.", "حدد عنوان الواجهة واختر توسيط."]),
        tool(["Font colour", "لون الخط"], ["The A on the format bar, or CSS → Colours → Text", "حرف A في شريط التنسيق، أو CSS ← الألوان ← النص"], ["Colours the words. Swatches under Colours apply a text colour in one click.", "يلوّن الكلمات. العينات تحت الألوان تطبّق لون النص بنقرة."], ["Select the heading and pick a deep teal.", "حدد العنوان واختر أزرقًا مخضرًا داكنًا."]),
        tool(["Highlight", "تمييز"], ["The paint chip beside A", "رقاقة اللون بجانب A"], ["Sets the background of that tag.", "يضبط خلفية ذلك الوسم."], ["Select a quote and give it a pale yellow highlight.", "حدد اقتباسًا وأعطه تمييزًا أصفر فاتحًا."]),
        tool(["Rounded, Shadow, Border", "دائري، ظل، إطار"], ["Tag Properties → CSS → Effects", "خصائص الوسم ← CSS ← تأثيرات"], ["Adds a class for round corners, a soft shadow, or a border.", "يضيف صنفًا للزوايا الدائرية، أو ظلًا ناعمًا، أو إطارًا."], ["Select a card and press Rounded, then Shadow.", "حدد بطاقة واضغط دائري، ثم ظل."]),
        tool(["Grow, Lift", "تكبير، رفع"], ["CSS → Effects", "CSS ← تأثيرات"], ["A hover effect. Grow enlarges the box slightly. Lift raises it.", "تأثير عند تمرير الفأرة. التكبير يكبر الصندوق قليلًا. الرفع يرفعه."], ["Select a button and press Grow. Preview the page and hover the button.", "حدد زرًا واضغط تكبير. عاين الصفحة ومرّر الفأرة على الزر."]),
        tool(["Clear", "مسح"], ["CSS → Effects", "CSS ← تأثيرات"], ["Removes those effect classes from the selection.", "يزيل أصناف التأثير هذه من التحديد."], ["Press Clear if a card picked up too many effects.", "اضغط مسح إذا التقطت بطاقة تأثيرات أكثر مما تريد."]),
        tool(["Space inside", "المسافة الداخلية"], ["Tag Properties → Box", "خصائص الوسم ← الصندوق"], ["Padding: none, small, medium, or large. This is space between the words and the edge of the box.", "الحشو: بدون، أو صغيرة، أو متوسطة، أو كبيرة. هذه مسافة بين الكلمات وحافة الصندوق."], ["Select a section and choose Medium.", "حدد قسمًا واختر متوسطة."]),
        tool(["Space outside", "المسافة الخارجية"], ["Tag Properties → Box", "خصائص الوسم ← الصندوق"], ["Margin around the box. Center uses automatic side margins.", "الهامش حول الصندوق. وسط يستخدم هوامش جانبية تلقائية."], ["Select a narrow form and choose Center so it sits in the middle.", "حدد نموذجًا ضيقًا واختر وسط ليجلس في المنتصف."]),
        tool(["Words", "الكلمات"], ["Tag Properties → Tag → Text", "خصائص الوسم ← الوسم ← النص"], ["Edits the text of a simple tag without double-clicking the page.", "يحرّر نص وسم بسيط من غير النقر المزدوج على الصفحة."], ["Select a footer paragraph and type the new line in Words.", "حدد فقرة التذييل واكتب السطر الجديد في الكلمات."]),
      ),
      p("Apply styles… in the Format menu opens the design kits. Those are described in Styles.", "تطبيق الأنماط… في قائمة تنسيق يفتح أطقم التصميم. تلك موصوفة في الأنماط."),
    ],
  },
  {
    id: "pictures",
    group: ["Pictures, lists, and tables", "الصور والقوائم والجداول"],
    title: ["Pictures", "الصور"],
    lead: ["Add a picture, describe it, place it, and resize it.", "أضف صورة، وصفها، وضعها، وغيّر حجمها."],
    blocks: [
      fig("picture", "Drop a picture on the page, then drag a corner. Alt text belongs in Tag Properties.", "أسقط صورة على الصفحة، ثم اسحب زاوية. النص البديل مكانه في خصائص الوسم."),
      tools(
        tool(["Upload", "رفع"], ["Toolbox → Pictures", "صندوق الأدوات ← صور"], ["Drop image files on the panel, or click the drop area. They are stored with the website.", "أسقط ملفات الصور على اللوحة، أو انقر منطقة الإسقاط. تُخزَّن مع الموقع."], ["Open Pictures and drop sara.jpg. It appears as a thumbnail.", "افتح الصور وأسقط sara.jpg. تظهر كصورة مصغرة."]),
        tool(["Insert", "إدراج"], ["Under each thumbnail", "تحت كل صورة مصغرة"], ["Places the picture on the page at the current selection.", "يضع الصورة في الصفحة عند التحديد الحالي."], ["Click Insert under sara.jpg. Then click the picture on the page.", "انقر إدراج تحت sara.jpg. ثم انقر الصورة في الصفحة."]),
        tool(["Background", "خلفية"], ["Under each thumbnail", "تحت كل صورة مصغرة"], ["Uses that file as a background image.", "يستخدم ذلك الملف صورة خلفية."], ["Select a section, then press Background under a soft photo.", "حدد قسمًا، ثم اضغط خلفية تحت صورة ناعمة."]),
        tool(["Delete", "حذف"], ["Under the thumbnail", "تحت الصورة المصغرة"], ["Removes the file from the website after you confirm. A page that still points at it will show a broken picture.", "يزيل الملف من الموقع بعد التأكيد. الصفحة التي ما زالت تشير إليه ستعرض صورة مكسورة."], ["Delete a duplicate only after no page uses it. Check links will report a missing picture.", "احذف النسخة المكررة فقط بعد أن لا تستخدمها أي صفحة. فحص الروابط سيبلّغ عن صورة مفقودة."]),
        tool(["Resize", "تغيير الحجم"], ["Drag the corner, or Picture tools", "اسحب الزاوية، أو أدوات الصورة"], ["The percentage is the width. The height follows the picture so it does not stretch.", "النسبة هي العرض. الارتفاع يتبع الصورة حتى لا تتمدد."], ["Click the picture and drag the corner until the readout says about 40%.", "انقر الصورة واسحب الزاوية حتى تقول القراءة نحو 40%."]),
        tool(["Left, Center, Right", "يسار، وسط، يمين"], ["Picture tools, or right-click", "أدوات الصورة، أو النقر باليمين"], ["Places that one picture on the left, in the centre, or on the right.", "يضع تلك الصورة على اليسار، أو في الوسط، أو على اليمين."], ["Right-click the portrait and choose Place in the center.", "انقر الصورة الشخصية باليمين واختر في الوسط."]),
        tool(["One per row, Two side by side, Three side by side", "صورة في كل صف، صورتان جنبًا إلى جنب، ثلاث صور جنبًا إلى جنب"], ["Picture tools", "أدوات الصورة"], ["Sets how wide each selected picture is, so several can share a line.", "يضبط عرض كل صورة محددة، حتى تشترك عدة صور في سطر."], ["Insert three photos, select one, and press Three side by side. Repeat for the other two.", "أدرج ثلاث صور، وحدد واحدة، واضغط ثلاث صور جنبًا إلى جنب. كرّر للصورتين الأخريين."]),
        tool(["Line up tops, middles, bottoms", "محاذاة الأعلى، المنتصف، الأسفل"], ["Picture tools", "أدوات الصورة"], ["Lines up pictures that share a row when their heights differ.", "يحاذي الصور التي تشترك في صف عندما تختلف ارتفاعاتها."], ["Select a short photo beside a tall one and press Line up tops.", "حدد صورة قصيرة بجانب صورة طويلة واضغط محاذاة الأعلى."]),
        tool(["Describe the picture", "صف الصورة"], ["Picture tools, the alt field", "أدوات الصورة، حقل alt"], ["Writes the alt attribute. Check treats a missing description as an error.", "يكتب خاصية alt. الفحص يعد الوصف الناقص خطأ."], ["For a photo of the ceramics studio, type Students at the wheel.", "لصورة استوديو الخزف، اكتب طلاب على الدولاب."]),
        tool(["Half size, Full width", "نصف الحجم، العرض كامل"], ["Right-click the picture", "انقر الصورة باليمين"], ["Sets the width to 50% or 100%.", "يجعل العرض 50% أو 100%."], ["Right-click a banner photo and choose Full width.", "انقر صورة الواجهة باليمين واختر العرض كامل."]),
        tool(["Image, Gallery", "صورة، معرض صور"], ["Toolbox → Media, Insert → Picture", "صندوق الأدوات ← الوسائط، إدراج ← صورة"], ["Image inserts one picture. Gallery inserts three in a grid. Replace the samples with your own files.", "صورة تدرج صورة واحدة. معرض صور يدرج ثلاثًا في شبكة. استبدل النماذج بملفاتك."], ["Drag Gallery, then upload your three photos and point each image at those files.", "اسحب معرض صور، ثم ارفع صورك الثلاث واجعل كل صورة تشير إلى تلك الملفات."]),
        tool(["Video, Audio", "فيديو، صوت"], ["Toolbox → Media and HTML5", "صندوق الأدوات ← الوسائط وعناصر HTML5"], ["A player with controls. You still need a media file address for it to play.", "مشغّل مع أزرار تحكم. ما زلت تحتاج عنوان ملف وسائط ليعمل."], ["Insert Audio when you have a file address ending in .mp3.", "أدرج صوتًا عندما يكون لديك عنوان ملف ينتهي بـ .mp3."]),
        tool(["YouTube, Map", "يوتيوب، خريطة"], ["Toolbox → Media", "صندوق الأدوات ← الوسائط"], ["An embedded player or a map. The samples point at a short film and at Muscat.", "مشغّل مضمّن أو خريطة. النموذجان يشيران إلى فيلم قصير وإلى مسقط."], ["Insert Map and, in Code view, change Muscat in the address to the place you want.", "أدرج خريطة، وفي عرض الكود، غيّر Muscat في العنوان إلى المكان الذي تريده."]),
      ),
    ],
  },
  {
    id: "lists",
    group: ["Pictures, lists, and tables", "الصور والقوائم والجداول"],
    title: ["Lists", "القوائم"],
    lead: ["A list is a column of items. The marker is the dot, the number, or the letter in front.", "القائمة عمود من البنود. العلامة هي النقطة أو الرقم أو الحرف في الأمام."],
    blocks: [
      tools(
        tool(["Bulleted list", "قائمة نقطية"], ["Insert, or Toolbox → Lists", "إدراج، أو صندوق الأدوات ← القوائم"], ["A <ul> of three items. Each item is an <li>.", "<ul> من ثلاثة بنود. كل بند <li>."], ["Insert Bulleted list and replace the items with Drawing, Reading, Walking.", "أدرج قائمة نقطية واستبدل البنود بـ الرسم، والقراءة، والمشي."]),
        tool(["Numbered list", "قائمة مرقمة"], ["Insert, or Toolbox → Lists", "إدراج، أو صندوق الأدوات ← القوائم"], ["An <ol>. Use it when the order matters.", "<ol>. استخدمها عندما يكون الترتيب مهمًا."], ["Insert Numbered list for the steps of a recipe.", "أدرج قائمة مرقمة لخطوات وصفة."]),
        tool(["Nested list", "قائمة متداخلة"], ["Toolbox → Lists", "صندوق الأدوات ← القوائم"], ["A numbered list whose items contain bulleted lists.", "قائمة مرقمة تحتوي بنودها على قوائم نقطية."], ["Drag Nested list and change Fruits and Vegetables to your own groups.", "اسحب قائمة متداخلة وغيّر الفواكه والخضار إلى مجموعاتك."]),
        tool(["Add item", "إضافة بند"], ["Tag Properties when a list is selected, or right-click", "خصائص الوسم عند تحديد قائمة، أو النقر باليمين"], ["Adds another <li>.", "يضيف <li> آخر."], ["Select the hobby list and press Add item, then type Photography.", "حدد قائمة الهوايات واضغط إضافة بند، ثم اكتب التصوير."]),
        tool(["Remove item", "حذف البند"], ["Tag Properties, or right-click", "خصائص الوسم، أو النقر باليمين"], ["Removes the selected item.", "يزيل البند المحدد."], ["Click the item you no longer want and press Remove item.", "انقر البند الذي لم تعد تريده واضغط حذف البند."]),
      ),
      h("Markers", "العلامات"),
      p("Select the list. In Tag Properties, or by right-click, choose a marker. The same icons sit in the List area of the panel.", "حدد القائمة. في خصائص الوسم، أو بالنقر باليمين، اختر علامة. الأيقونات نفسها موجودة في منطقة القائمة في اللوحة."),
      tools(
        tool(["Filled circles", "دوائر ممتلئة"], ["List markers", "علامات القائمة"], ["The usual disc.", "القرص المعتاد."], ["Use it for a shopping list.", "استخدمه لقائمة تسوق."]),
        tool(["Circles", "دوائر"], ["List markers", "علامات القائمة"], ["An empty circle.", "دائرة فارغة."], ["Use it for a second-level list under a disc list.", "استخدمه لقائمة من المستوى الثاني تحت قائمة بأقراص."]),
        tool(["Squares", "مربعات"], ["List markers", "علامات القائمة"], ["A small square.", "مربع صغير."], ["Use squares when the page already uses discs nearby.", "استخدم المربعات عندما تستخدم الصفحة الأقراص بالقرب منها."]),
        tool(["No marker", "بدون علامة"], ["List markers", "علامات القائمة"], ["Keeps the items, hides the bullet. Useful inside a navigation bar.", "يبقي البنود، ويخفي النقطة. مفيد داخل شريط تنقل."], ["Select the menu list and choose No marker.", "حدد قائمة القائمة واختر بدون علامة."]),
        tool(["Numbers", "أرقام"], ["List markers", "علامات القائمة"], ["1, 2, 3.", "١، ٢، ٣."], ["Turn a bulleted list of class steps into Numbers.", "حوّل قائمة نقطية لخطوات الدرس إلى أرقام."]),
        tool(["Numbers with a zero", "أرقام تبدأ بصفر"], ["List markers", "علامات القائمة"], ["01, 02, 03.", "٠١، ٠٢، ٠٣."], ["Use it for a short timetable of nine items or fewer.", "استخدمه لجدول قصير من تسعة بنود أو أقل."]),
        tool(["Small letters, Capital letters", "حروف صغيرة، حروف كبيرة"], ["List markers", "علامات القائمة"], ["a, b, c or A, B, C.", "a, b, c أو A, B, C."], ["Use capital letters for answers on a quiz page.", "استخدم الحروف الكبيرة للإجابات في صفحة اختبار."]),
        tool(["Small Roman numbers, Capital Roman numbers", "أرقام رومانية صغيرة، أرقام رومانية كبيرة"], ["List markers", "علامات القائمة"], ["i, ii, iii or I, II, III.", "i, ii, iii أو I, II, III."], ["Use Roman numbers for an outline under a numbered chapter list.", "استخدم الأرقام الرومانية لمخطط تحت قائمة فصول مرقمة."]),
      ),
    ],
  },
  {
    id: "tables",
    group: ["Pictures, lists, and tables", "الصور والقوائم والجداول"],
    title: ["Tables", "الجداول"],
    lead: ["Rows, columns, and the Table properties window.", "الصفوف والأعمدة ونافذة خصائص الجدول."],
    blocks: [
      fig("table", "Click a cell. The Table menu, the properties window, and Tag Properties all edit that table.", "انقر خلية. قائمة جدول، ونافذة الخصائص، وخصائص الوسم كلها تحرّر ذلك الجدول."),
      steps(
        ["Insert → Table…, or drag Table from the Toolbox. Move across the grid and click, for example 4 by 3. Leave Header row on if the first row names the columns.", "إدراج ← جدول…، أو اسحب جدولًا من صندوق الأدوات. تحرّك على الشبكة وانقر، مثل 4 في 3. اترك صف العناوين مفعّلًا إذا كان الصف الأول يسمّي الأعمدة."],
        ["Double-click a header cell and type the column name. Double-click a body cell and type the value.", "انقر خلية عنوان مرتين واكتب اسم العمود. انقر خلية متن مرتين واكتب القيمة."],
        ["Click one cell so the Table menu items wake up. They stay dim until a table is selected.", "انقر خلية واحدة حتى تنشط عناصر قائمة جدول. تبقى باهتة إلى أن يُحدَّد جدول."],
      ),
      tools(
        tool(["Table properties…", "خصائص الجدول…"], ["Table menu, or right-click a cell", "قائمة جدول، أو انقر خلية باليمين"], ["A window you can drag. It shows the size, such as 4 × 3, and edits the whole table or the current cell, row, and column.", "نافذة يمكنك سحبها. تعرض الحجم، مثل 4 × 3، وتحرّر الجدول كله أو الخلية والصف والعمود الحاليين."], ["Open Table properties, set Width to 80%, and choose Center.", "افتح خصائص الجدول، واجعل العرض 80%، واختر وسط."]),
        tool(["Rows and Columns", "الصفوف والأعمدة"], ["The Size fieldset in Table properties", "مجموعة الحجم في خصائص الجدول"], ["Type a new number of rows or columns. Extra cells are added. Lowering the number removes cells from the end.", "اكتب عددًا جديدًا للصفوف أو الأعمدة. تُضاف الخلايا الزائدة. إنقاص العدد يزيل خلايا من النهاية."], ["Change Rows from 3 to 5 to add two empty rows.", "غيّر الصفوف من 3 إلى 5 لإضافة صفين فارغين."]),
        tool(["Insert row below, Insert row above", "إدراج صف أسفل، إدراج صف أعلى"], ["Table menu, Tag Properties, Table properties", "قائمة جدول، خصائص الوسم، خصائص الجدول"], ["Adds one row next to the cell you clicked.", "يضيف صفًا واحدًا بجانب الخلية التي نقرتها."], ["Click Monday and press Row below, then type Tuesday.", "انقر الاثنين واضغط صف أسفل، ثم اكتب الثلاثاء."]),
        tool(["Insert column to the right, Column to the left", "إدراج عمود إلى اليمين، عمود إلى اليسار"], ["Table menu and the column icons", "قائمة جدول وأيقونات العمود"], ["Adds one column beside the selected cell.", "يضيف عمودًا واحدًا بجانب الخلية المحددة."], ["Click the last header and press Column to the right, then name it Room.", "انقر آخر عنوان واضغط عمود إلى اليمين، ثم سمّه القاعة."]),
        tool(["Delete row, Delete column, Delete table", "حذف الصف، حذف العمود، حذف الجدول"], ["Table menu, the red icons, Table properties", "قائمة جدول، الأيقونات الحمراء، خصائص الجدول"], ["Removes that row, that column, or the entire table.", "يزيل ذلك الصف، أو ذلك العمود، أو الجدول كله."], ["Click an empty practice row and choose Delete row.", "انقر صف تدريب فارغ واختر حذف الصف."]),
        tool(["Select row, Select column, Select table", "تحديد الصف، تحديد العمود، تحديد الجدول"], ["Tag Properties icons, or right-click → Select table", "أيقونات خصائص الوسم، أو النقر باليمين ← تحديد الجدول"], ["The next colour or text alignment applies to that whole row, column, or table.", "اللون التالي أو محاذاة النص تُطبَّق على ذلك الصف أو العمود أو الجدول كله."], ["Press Select row, then pick a pale fill so the whole header row changes.", "اضغط تحديد الصف، ثم اختر تعبئة فاتحة ليتغير صف العناوين كله."]),
        tool(["Merge cells, Unmerge", "دمج الخلايا، فك الدمج"], ["Table menu, right-click, Table properties", "قائمة جدول، النقر باليمين، خصائص الجدول"], ["Merge with the cell to the right, or the cell below. Drag across cells, or Shift-click, to merge more than two. Unmerge splits them again.", "الدمج مع الخلية اليمنى، أو الخلية السفلى. اسحب عبر الخلايا، أو انقر مع Shift، لدمج أكثر من خليتين. فك الدمج يفصلهما من جديد."], ["Select the two header cells above a shared title and choose Merge cells.", "حدد خليتي العنوان فوق عنوان مشترك واختر دمج الخلايا."]),
        tool(["Align left, Center, Align right", "محاذاة لليسار، توسيط، محاذاة لليمين"], ["Table menu", "قائمة جدول"], ["Moves the whole table across the page.", "يحرّك الجدول كله عبر الصفحة."], ["Choose Center for a small timetable.", "اختر توسيط لجدول حصص صغير."]),
        tool(["Width and Height", "العرض والارتفاع"], ["Table properties, in px or %", "خصائص الجدول، بالبكسل أو بالنسبة المئوية"], ["Width 100% fills the content area. A pixel width stays fixed.", "العرض 100% يملأ منطقة المحتوى. العرض بالبكسل يبقى ثابتًا."], ["Set Width to 100% on a phone-sized check if the table was cut off.", "اجعل العرض 100% عند فحص حجم الهاتف إذا كان الجدول مقطوعًا."]),
        tool(["Padding, Spacing, Border", "الحشو، التباعد، الحد"], ["Table properties → Layout", "خصائص الجدول ← التخطيط"], ["Padding is space inside each cell. Spacing is the gap between cells. Border is the line thickness and colour.", "الحشو مسافة داخل كل خلية. التباعد فجوة بين الخلايا. الحد هو سماكة الخط ولونه."], ["Set Padding to 8 and Border to 1 so the text is not touching the lines.", "اجعل الحشو 8 والحد 1 حتى لا يلمس النص الخطوط."]),
        tool(["Background", "الخلفية"], ["Table properties, and the colour fold in Tag Properties", "خصائص الجدول، وطية اللون في خصائص الوسم"], ["One colour for the table, another for the selected cell, row, or column. Clear removes the cell colour.", "لون للجدول، وآخر للخلية أو الصف أو العمود المحدد. بدون لون يزيل لون الخلية."], ["Select the header row and choose a light grey.", "حدد صف العناوين واختر رماديًا فاتحًا."]),
        tool(["Text and Vertical", "النص ورأسي"], ["Table properties, for the current cells", "خصائص الجدول، للخلايا الحالية"], ["Horizontal alignment and top, middle, or bottom inside the cell.", "المحاذاة الأفقية، وأعلى أو وسط أو أسفل داخل الخلية."], ["Select a tall cell and set Vertical to Middle.", "حدد خلية طويلة واجعل رأسي على وسط."]),
        tool(["Row height, Column width", "ارتفاع الصف، عرض العمود"], ["Table properties", "خصائص الجدول"], ["Row height accepts 24 pixels or more. Column width accepts 36 pixels or more.", "ارتفاع الصف يقبل 24 بكسل أو أكثر. عرض العمود يقبل 36 بكسل أو أكثر."], ["Set the first column to 120 pixels so the day names have room.", "اجعل العمود الأول 120 بكسل حتى تتسع أسماء الأيام."]),
        tool(["Margins", "الهوامش"], ["Table properties, and the Margins fold", "خصائص الجدول، وطية الهوامش"], ["Top, left, right, and bottom around the table. An empty value becomes auto.", "أعلى ويسار ويمين وأسفل حول الجدول. القيمة الفارغة تصبح auto."], ["Set the left and right margins to auto when Center is not quite enough.", "اجعل الهامش الأيسر والأيمن auto عندما لا يكفي التوسيط."]),
      ),
      note("Right-click a cell for the same row, column, merge, align, and delete commands. Drag across cells, or Shift-click, when you need more than one cell.", "انقر خلية باليمين لأوامر الصف والعمود والدمج والمحاذاة والحذف نفسها. اسحب عبر الخلايا، أو انقر مع Shift، عندما تحتاج أكثر من خلية."),
    ],
  },
  {
    id: "links",
    group: ["Pictures, lists, and tables", "الصور والقوائم والجداول"],
    title: ["Links and forms", "الروابط والنماذج"],
    lead: ["A link goes somewhere. A form asks the visitor for something.", "الرابط يذهب إلى مكان. النموذج يسأل الزائر عن شيء."],
    blocks: [
      tools(
        tool(["Link address", "عنوان الرابط"], ["Tag Properties → Link, or right-click a link", "خصائص الوسم ← الرابط، أو انقر رابطًا باليمين"], ["href is the address. https:// opens another site. about.html opens a page in this website. A bare # goes nowhere, and Check will mention it.", "href هو العنوان. https:// يفتح موقعًا آخر. about.html يفتح صفحة في هذا الموقع. علامة # وحدها لا تذهب إلى مكان، وسيذكرها الفحص."], ["Select the About item in the navigation and set the address to about.html.", "حدد بند من نحن في شريط التنقل واجعل العنوان about.html."]),
        tool(["Open in a new tab", "فتح في تبويب جديد"], ["The checkbox under the address", "مربع الاختيار تحت العنوان"], ["Sets target to _blank, so your site stays open.", "يجعل target القيمة _blank، فيبقى موقعك مفتوحًا."], ["Turn it on for a link to another website. Leave it off for your own pages.", "فعّله لرابط إلى موقع آخر. اتركه مطفأً لصفحاتك."]),
        tool(["Make this a link", "اجعل هذا رابطًا"], ["Right-click, or Tag Properties", "النقر باليمين، أو خصائص الوسم"], ["Wraps the selected words in an <a> and asks for the address.", "يلف الكلمات المحددة في <a> ويطلب العنوان."], ["Select the words class site and make them a link to https://nasserdiary.com.", "حدد كلمات موقع الصف واجعلها رابطًا إلى https://nasserdiary.com."]),
        tool(["Contact form", "نموذج تواصل"], ["Toolbox → Forms, Insert → Form", "صندوق الأدوات ← النماذج، إدراج ← نموذج"], ["Name, email, message, and a Send button, each field with a <label>.", "الاسم والبريد والرسالة وزر إرسال، وكل حقل مع <label>."], ["Drag Contact form to the bottom of the contact page.", "اسحب نموذج تواصل إلى أسفل صفحة التواصل."]),
        tool(["Text input", "حقل نص"], ["Toolbox → Forms", "صندوق الأدوات ← النماذج"], ["A single line. Put a <label> with it or Check will warn you.", "سطر واحد. ضع معه <label> وإلا حذّرك الفحص."], ["Add a text input labelled Student ID.", "أضف حقل نص بعنوان الرقم الجامعي."]),
        tool(["Text area", "مربع نص"], ["Toolbox → Forms", "صندوق الأدوات ← النماذج"], ["Several lines.", "عدة أسطر."], ["Add a text area labelled Note to the lecturer.", "أضف مربع نص بعنوان ملاحظة للمحاضر."]),
        tool(["Dropdown", "قائمة منسدلة"], ["Toolbox → Forms", "صندوق الأدوات ← النماذج"], ["A <select> of options.", "<select> من خيارات."], ["Insert Dropdown and change the options to Section 1, Section 2, Section 3.", "أدرج قائمة منسدلة وغيّر الخيارات إلى الشعبة 1 والشعبة 2 والشعبة 3."]),
        tool(["Checkbox", "مربع اختيار"], ["Toolbox → Forms", "صندوق الأدوات ← النماذج"], ["A box with a label beside it.", "مربع مع تسمية بجانبه."], ["Insert Checkbox and change the words to I have read the brief.", "أدرج مربع اختيار وغيّر الكلمات إلى قرأت الموجز."]),
      ),
      note("These forms are the HTML of a form. They do not send email by themselves. Sending would need a script and a service, which is a later lesson.", "هذه النماذج هي HTML النموذج. لا ترسل بريدًا من تلقاء نفسها. الإرسال يحتاج سكربتًا وخدمة، وذلك درس لاحق."),
    ],
  },
  {
    id: "layers",
    group: ["Building a page", "بناء صفحة"],
    title: ["Layers", "الطبقات"],
    lead: ["The page drawn as nested blocks, so you can select something that is hard to click.", "الصفحة مرسومة ككتل متداخلة، حتى تحدد شيئًا يصعب نقره."],
    blocks: [
      p("Open Panels → Layers, or the Layers tab in the Toolbox. Each block shows its role, such as Banner, Card, or the first words of a paragraph. Click a block. The same tag is selected on the page and in Tag Properties.", "افتح لوحات ← الطبقات، أو تبويب الطبقات في صندوق الأدوات. كل كتلة تعرض دورها، مثل واجهة أو بطاقة أو أول كلمات فقرة. انقر كتلة. يُحدَّد الوسم نفسه في الصفحة وفي خصائص الوسم."),
      steps(
        ["Build a page with a navigation bar, a hero, and a footer.", "ابنِ صفحة فيها شريط تنقل وواجهة وتذييل."],
        ["Open Layers and click Footer. The footer is selected even if it sits below the visible page.", "افتح الطبقات وانقر التذييل. يُحدَّد التذييل حتى لو كان أسفل الصفحة الظاهرة."],
        ["Press Delete in Tag Properties if that footer was a duplicate.", "اضغط حذف في خصائص الوسم إذا كان ذلك التذييل مكررًا."],
      ),
      p("Use Layers when a small tag sits inside a large coloured banner and your click keeps selecting the banner.", "استخدم الطبقات عندما يقع وسم صغير داخل واجهة ملونة كبيرة ونقرتك تظل تحدد الواجهة."),
    ],
  },
  {
    id: "code",
    group: ["Code and learning", "الكود والتعلّم"],
    title: ["Code, CSS, and JavaScript", "الكود وCSS وجافاسكربت"],
    lead: ["Design writes the tags for you. Code is where you read them and write your own.", "التصميم يكتب الوسوم عنك. الكود هو حيث تقرأها وتكتب ما تريد."],
    blocks: [
      p("View → Split is the calm way to learn this. The page stays visible. Under it, the left file is the HTML of the open page. The right side has three tabs: style.css, script.js, and Console.", "عرض ← مقسوم هو الطريق الهادئ لتعلّم هذا. تبقى الصفحة ظاهرة. تحتها، الملف الأيسر هو HTML الصفحة المفتوحة. الجانب الأيمن فيه ثلاثة تبويبات: style.css وscript.js ووحدة التحكم."),
      p("Click a tag on the page and the HTML scrolls to those lines. The line numbers appear beside the file name.", "انقر وسمًا في الصفحة فيمر HTML إلى تلك الأسطر. تظهر أرقام الأسطر بجانب اسم الملف."),
      tools(
        tool(["The page file", "ملف الصفحة"], ["Left code column, often index.html", "عمود الكود الأيسر، غالبًا index.html"], ["The tags for this page only.", "وسوم هذه الصفحة فقط."], ["Find <h1> and change the words. Switch to Design and see the new heading.", "ابحث عن <h1> وغيّر الكلمات. انتقل إلى التصميم وشاهد العنوان الجديد."]),
        tool(["style.css", "style.css"], ["Right tab, and Folder List", "التبويب الأيمن، وقائمة المجلدات"], ["Rules for the whole website. A design kit writes variables here. A block you drag may add a small rule too.", "قواعد للموقع كله. طقم التصميم يكتب متغيرات هنا. الوسم الذي تسحبه قد يضيف قاعدة صغيرة أيضًا."], ["Add p { line-height: 1.6; } and look at the paragraphs.", "أضف p { line-height: 1.6; } وانظر إلى الفقرات."]),
        tool(["script.js", "script.js"], ["Right tab, and Folder List", "التبويب الأيمن، وقائمة المجلدات"], ["JavaScript for the site. The panel can insert a ready snippet.", "جافاسكربت للموقع. اللوحة تستطيع إدراج مقطع جاهز."], ["Open script.js and insert Say hello in the console.", "افتح script.js وأدرج رسالة في وحدة التحكم."]),
        tool(["Console", "وحدة التحكم"], ["Right tab", "التبويب الأيمن"], ["Shows console.log messages after you run the page.", "يعرض رسائل console.log بعد تشغيل الصفحة."], ["Run the script, then open Console and read Hello from script.js!", "شغّل السكربت، ثم افتح وحدة التحكم واقرأ مرحبًا من script.js!"]),
        tool(["Run the script", "تشغيل السكربت"], ["Tools", "أدوات"], ["Runs the page in a window. console.log goes to the Console tab. Buttons and forms can run there.", "يشغّل الصفحة في نافذة. console.log يذهب إلى تبويب وحدة التحكم. الأزرار والنماذج يمكن أن تعمل هناك."], ["Tools → Run the script after you add a click listener.", "أدوات ← تشغيل السكربت بعد أن تضيف مستمع نقر."]),
      ),
      h("Three snippets worth trying", "ثلاثة مقاطع تستحق التجربة"),
      p("On the script.js tab, insert an example. Each one is a complete fragment.", "في تبويب script.js، أدرج مثالًا. كل واحد قطعة مكتملة."),
      code(`console.log("Hello from script.js!");`),
      p("Message when a button is clicked shows an alert with the button’s words. Change the main heading replaces the <h1> text and colours it. Dark mode button adds a button that flips the page colours.", "رسالة عند النقر على زر تعرض تنبيهًا بكلمات الزر. تغيير العنوان الرئيسي يستبدل نص <h1> ويلوّنه. زر الوضع الليلي يضيف زرًا يقلب ألوان الصفحة."),
      note("In Code view, Ctrl+F finds text in the file you are editing. The Design-view Find looks through the words a visitor can read.", "في عرض الكود، Ctrl+F يجد النص في الملف الذي تحرره. بحث عرض التصميم يمر على الكلمات التي يقرأها الزائر."),
    ],
  },
  {
    id: "learn",
    group: ["Code and learning", "الكود والتعلّم"],
    title: ["Learn HTML", "تعلّم HTML"],
    lead: ["A quiet room where you type the tags yourself. The design window waits until you come back.", "غرفة هادئة تكتب فيها الوسوم بنفسك. نافذة التصميم تنتظر حتى تعود."],
    blocks: [
      fig("learn", "Lessons on the left, your file in the middle, the page on the right.", "الدروس على اليسار، وملفك في الوسط، والصفحة على اليمين."),
      p("Toolbar → Learn HTML, or Tools → Beginning HTML. The page is first.html. If that file is missing, the studio creates an empty one. Closing Learn HTML saves your work and returns to Design.", "شريط الأدوات ← تعلّم HTML، أو أدوات ← بداية HTML. الصفحة هي first.html. إذا كان الملف مفقودًا، ينشئ الاستوديو ملفًا فارغًا. إغلاق تعلّم HTML يحفظ عملك ويعود إلى التصميم."),
      tools(
        tool(["Try these, one at a time", "جرّب هذه، واحدة واحدة"], ["Left column", "العمود الأيسر"], ["Groups: Words, Lists, Picture, Table, and Look. Each row shows a tiny example of the tag.", "المجموعات: الكلمات، والقوائم، والصورة، والجدول، والمظهر. كل صف يعرض مثالًا صغيرًا للوسم."], ["Press Write a heading. <h1>Hello</h1> is added, and the preview shows Hello.", "اضغط اكتب عنوانًا. يُضاف <h1>Hello</h1>، والمعاينة تعرض Hello."]),
        tool(["The tick", "علامة الصح"], ["On a lesson row, once that tag exists", "على صف الدرس، بعد أن يوجد الوسم"], ["Removes that tag and everything inside it, from the start tag to the end tag.", "يزيل ذلك الوسم وكل ما بداخله، من وسم البداية إلى وسم النهاية."], ["Add a paragraph, then press the tick on Add a paragraph. The <p> block disappears.", "أضف فقرة، ثم اضغط علامة الصح على أضف فقرة. تختفي كتلة <p>."]),
        tool(["Undo and Redo", "تراجع وإعادة"], ["Top of Learn HTML", "أعلى تعلّم HTML"], ["Steps through your typing in this room. This history belongs to Learn HTML. It is separate from the Design undo.", "يتنقل في كتابتك في هذه الغرفة. هذا السجل يخص تعلّم HTML. وهو منفصل عن تراجع التصميم."], ["Type a word, press Undo, then Redo.", "اكتب كلمة، واضغط تراجع، ثم إعادة."]),
        tool(["Clean the page", "تنظيف الصفحة"], ["Top of Learn HTML", "أعلى تعلّم HTML"], ["Erases the HTML and the CSS of first.html after you confirm.", "يمسح HTML وCSS في first.html بعد التأكيد."], ["Press Clean the page when you want to start the lesson from a blank file.", "اضغط تنظيف الصفحة عندما تريد بدء الدرس من ملف فارغ."]),
        tool(["Save", "حفظ"], ["Top of Learn HTML", "أعلى تعلّم HTML"], ["Writes first.html immediately.", "يكتب first.html فورًا."], ["Finish a heading and press Save before you try the next lesson.", "أنهِ عنوانًا واضغط حفظ قبل أن تجرّب الدرس التالي."]),
        tool(["Back to design", "العودة إلى التصميم"], ["Top of Learn HTML", "أعلى تعلّم HTML"], ["Saves and leaves the room. first.html remains in the Folder List.", "يحفظ ويغادر الغرفة. يبقى first.html في قائمة المجلدات."], ["Press Back to design and open first.html from the Folder List if you want to keep styling it with the Toolbox.", "اضغط العودة إلى التصميم وافتح first.html من قائمة المجلدات إذا أردت متابعة تنسيقه بصندوق الأدوات."]),
      ),
      h("What each group adds", "ماذا تضيف كل مجموعة"),
      tools(
        tool(["Words", "الكلمات"], ["Lessons", "الدروس"], ["A heading, a paragraph, bold, italic, underline, and a link.", "عنوان، وفقرة، وعريض، ومائل، وتسطير، ورابط."], ["Add the six, then change Hello to your name in the middle editor.", "أضف الستة، ثم غيّر Hello إلى اسمك في المحرر الأوسط."]),
        tool(["Lists", "القوائم"], ["Lessons", "الدروس"], ["A <ul>, an <ol>, and an extra <li>.", "<ul> و<ol> و<li> إضافي."], ["Add an unordered list, then press Add a list item so a second <li> appears.", "أضف قائمة غير مرتبة، ثم اضغط أضف عنصر قائمة ليظهر <li> ثانٍ."]),
        tool(["Picture", "صورة"], ["Lessons", "الدروس"], ["An <img> with alt text.", "<img> مع نص بديل."], ["Press Add a picture and change the alt words to a real description.", "اضغط أضف صورة وغيّر كلمات alt إلى وصف حقيقي."]),
        tool(["Table", "جدول"], ["Lessons", "الدروس"], ["A timetable, then add a row, add a column, delete a row, delete a column, or delete the table.", "جدول حصص، ثم أضف صفًا، وأضف عمودًا، واحذف صفًا، واحذف عمودًا، أو احذف الجدول."], ["Add a table, press Add a row, and type the new day in the new <tr>.", "أضف جدولًا، واضغط أضف صفًا، واكتب اليوم الجديد في <tr> الجديد."]),
        tool(["Look", "المظهر"], ["Lessons", "الدروس"], ["CSS for the heading colour, the paragraph size, and the font.", "CSS للون العنوان، وحجم الفقرة، والخط."], ["Press Change the font color. The CSS pane gains h1 { color: teal; }.", "اضغط غيّر لون الخط. يكتسب جزء CSS السطر h1 { color: teal; }."]),
      ),
      p("The encouragement line at the top changes as the file grows. You can ignore the buttons and type any correct HTML in the editor. The preview on the right updates as you type.", "سطر التشجيع في الأعلى يتغير كلما نما الملف. يمكنك تجاهل الأزرار وكتابة أي HTML صحيح في المحرر. المعاينة على اليمين تتحدث وأنت تكتب."),
    ],
  },
  {
    id: "exam",
    group: ["Code and learning", "الكود والتعلّم"],
    title: ["HTML exam", "اختبار HTML"],
    lead: ["The lecturer publishes an example and questions. The student types a whole page, by hand.", "ينشر المحاضر مثالًا وأسئلة. يكتب الطالب صفحة كاملة بيده."],
    blocks: [
      fig("exam", "Questions, the example, your answer, and a live preview.", "الأسئلة، والمثال، وإجابتك، ومعاينة حية."),
      p("Toolbar → HTML exam, or Tools → HTML exam. Students in a section see the exam that was saved for that section. If the lecturer has not published one, the page says so and does not invent a practice paper.", "شريط الأدوات ← اختبار HTML، أو أدوات ← اختبار HTML. يرى طلاب الشعبة الاختبار المحفوظ لتلك الشعبة. إذا لم ينشر المحاضر اختبارًا، تقول الصفحة ذلك ولا تخترع ورقة تدريب."),
      h("What the student does", "ماذا يفعل الطالب"),
      tools(
        tool(["Questions", "الأسئلة"], ["Left side", "الجانب الأيسر"], ["The list follows the studio language: Arabic questions when the studio is in Arabic.", "القائمة تتبع لغة الاستوديو: أسئلة عربية عندما يكون الاستوديو بالعربية."], ["Read question 1, then look at the same idea in the example before you type.", "اقرأ السؤال 1، ثم انظر إلى الفكرة نفسها في المثال قبل أن تكتب."]),
        tool(["Example", "المثال"], ["Middle", "الوسط"], ["A finished page. It stays as it was given. You do not edit it during the exam.", "صفحة مكتملة. تبقى كما أُعطيت. لا تحرّرها أثناء الاختبار."], ["Press the expand icon to read the example in a large window, then close it and type.", "اضغط أيقونة التوسيع لتقرأ المثال في نافذة كبيرة، ثم أغلقها واكتب."]),
        tool(["Your answer", "إجابتك"], ["Under the example", "تحت المثال"], ["The page you type. Pasting is refused: the toast says to type the page yourself. The answer is kept in this browser until you save it.", "الصفحة التي تكتبها. اللصق مرفوض: يقول التنبيه اكتب الصفحة بنفسك. تبقى الإجابة في هذا المتصفح إلى أن تحفظها."], ["Type a complete small page: doctype, html, head, title, body, and the tags the questions ask for.", "اكتب صفحة صغيرة كاملة: doctype وhtml وhead وtitle وbody والوسوم التي تطلبها الأسئلة."]),
        tool(["Preview", "المعاينة"], ["Right side", "الجانب الأيمن"], ["Shows your page as you type. While the lecturer is editing, it shows the example.", "تعرض صفحتك وأنت تكتب. أثناء تحرير المحاضر، تعرض المثال."], ["If the preview is blank, check that you closed the tags you opened.", "إذا كانت المعاينة فارغة، تحقق من أنك أغلقت الوسوم التي فتحتها."]),
        tool(["Undo, Redo, Clear my answer", "تراجع، إعادة، مسح إجابتي"], ["Top bar", "الشريط العلوي"], ["Undo and Redo walk through your typing. Clear empties the answer after you confirm.", "التراجع والإعادة يتنقلان في كتابتك. المسح يفرغ الإجابة بعد التأكيد."], ["Delete a wrong heading with Undo rather than selecting all, so you keep the rest.", "احذف عنوانًا خاطئًا بالتراجع بدل تحديد الكل، حتى تبقي الباقي."]),
        tool(["Save my answer…", "حفظ إجابتي…"], ["Top bar", "الشريط العلوي"], ["Asks for a folder on the computer and writes the file there. If the browser cannot do that, it downloads the file instead.", "يطلب مجلدًا على الحاسوب ويكتب الملف هناك. إذا لم يستطع المتصفح ذلك، ينزّل الملف بدلًا من ذلك."], ["Press Save my answer… and choose the folder your lecturer named, such as exam-sara.", "اضغط حفظ إجابتي… واختر المجلد الذي سمّاه المحاضر، مثل exam-sara."]),
        tool(["Expand", "توسيع"], ["The icon on Example and on Your answer", "الأيقونة على المثال وعلى إجابتك"], ["Opens that box in a large window so you can read or write with more room.", "يفتح ذلك المربع في نافذة كبيرة لتقرأ أو تكتب بمساحة أكبر."], ["Expand Your answer, type the page, and save from that window.", "وسّع إجابتك، واكتب الصفحة، واحفظ من تلك النافذة."]),
      ),
      h("What the lecturer does", "ماذا يفعل المحاضر"),
      p("A lecturer who is allowed to edit the paper sees Write the exam. That opens the English questions, the Arabic questions, and the example HTML. Give this exam stores it for the section. Students then see that paper. Coordinators can edit the same exam from Course settings, which is the place to prepare it before class.", "المحاضر المسموح له بتحرير الورقة يرى كتابة الاختبار. ذلك يفتح الأسئلة الإنجليزية، والأسئلة العربية، ومثال HTML. تسليم الاختبار يخزّنه للشعبة. يرى الطلاب تلك الورقة بعد ذلك. يستطيع المنسقون تحرير الاختبار نفسه من إعدادات المقررات، وهو المكان المناسب لإعداده قبل الحصة."),
      note("Learn HTML and HTML exam do not run at the same time. Opening one leaves the other. Design undo is not the undo inside these rooms.", "تعلّم HTML واختبار HTML لا يعملان في الوقت نفسه. فتح أحدهما يغادر الآخر. تراجع التصميم ليس التراجع داخل هاتين الغرفتين."),
    ],
  },
  {
    id: "quality",
    group: ["Code and learning", "الكود والتعلّم"],
    title: ["Check, details, and preview", "الفحص والتفاصيل والمعاينة"],
    lead: ["Read the page the way a careful editor would, then look at it as a visitor.", "اقرأ الصفحة كما يقرأها محرر دقيق، ثم انظر إليها كما ينظر الزائر."],
    blocks: [
      tools(
        tool(["Check", "فحص"], ["Toolbar, or Tools → Check this page", "شريط الأدوات، أو أدوات ← فحص هذه الصفحة"], ["Looks at the open page. It wants one <h1>, heading levels that do not skip, alt text on pictures, link text, real addresses, button text, labels on form fields, and header cells in tables.", "ينظر إلى الصفحة المفتوحة. يريد <h1> واحدًا، ومستويات عناوين لا تقفز، ونصًا بديلًا للصور، ونصًا للروابط، وعناوين حقيقية، ونصًا للأزرار، وتسميات لحقول النماذج، وخلايا عناوين في الجداول."], ["Press Check. For an image error, press Show. The picture is selected. Fill in Describe the picture and run Check again.", "اضغط فحص. لخطأ صورة، اضغط عرض. تُحدَّد الصورة. املأ صف الصورة وأعد الفحص."]),
        tool(["Check links", "فحص الروابط"], ["Tools", "أدوات"], ["Walks every page. It reports links that do not point at a real page in the site, and pictures whose files are missing.", "يمر على كل الصفحات. يبلغ عن الروابط التي لا تشير إلى صفحة حقيقية في الموقع، والصور التي فقدت ملفاتها."], ["Tools → Check links after you rename about.html. Update any menu item that still says the old name.", "أدوات ← فحص الروابط بعد أن تعيد تسمية about.html. حدّث أي بند قائمة ما زال يذكر الاسم القديم."]),
        tool(["Page details…", "تفاصيل الصفحة…"], ["Tools", "أدوات"], ["Counts words, headings, paragraphs, pictures, links, and tables on the page you are editing.", "يعد الكلمات والعناوين والفقرات والصور والروابط والجداول في الصفحة التي تحرّرها."], ["Open Page details on the home page. If Pictures is 0, go add one.", "افتح تفاصيل الصفحة في الصفحة الرئيسية. إذا كانت الصور 0، فاذهب وأضف واحدة."]),
        tool(["Preview in browser", "معاينة في المتصفح"], ["Toolbar, File, Tools", "شريط الأدوات، ملف، أدوات"], ["Opens the visitor view.", "يفتح عرض الزائر."], ["Preview, then press Phone-width in the browser window if you want a second look at the narrow layout.", "عاين، ثم اضغط عرض الهاتف في نافذة المتصفح إذا أردت نظرة ثانية على التخطيط الضيق."]),
        tool(["Download", "تنزيل"], ["Toolbar", "شريط الأدوات"], ["A ZIP of the website.", "ملف ZIP للموقع."], ["Download, unzip, and open index.html to confirm the pack is complete.", "نزّل، وفك الضغط، وافتح index.html لتتأكد أن الحزمة مكتملة."]),
      ),
      p("Check marks some notes as gentle tips. An empty page, a title that is still “My first website”, a link to #, and a table with no <th> are tips. A picture with no alt text is an error. Show jumps to the tag when the issue has a place.", "الفحص يعلّم بعض الملاحظات كتلميحات لطيفة. الصفحة الفارغة، والعنوان الذي ما زال «موقعي الأول»، والرابط إلى #، والجدول بلا <th> تلميحات. الصورة بلا نص بديل خطأ. عرض يقفز إلى الوسم عندما يكون للملاحظة مكان."),
    ],
  },
  {
    id: "styles",
    group: ["Code and learning", "الكود والتعلّم"],
    title: ["Styles", "الأنماط"],
    lead: ["A design kit recolours the whole site in one step.", "طقم التصميم يعيد تلوين الموقع كله في خطوة واحدة."],
    blocks: [
      p("Toolbar → Styles, Format → Apply styles…, or Tools → Style kit…. A kit writes CSS variables in :root inside style.css: the main colour, the colour on top of it, the font, and the corner radius. Buttons and banners that use those variables follow the kit.", "شريط الأدوات ← أنماط، أو تنسيق ← تطبيق الأنماط…، أو أدوات ← حزمة التنسيق…. يكتب الطقم متغيرات CSS في :root داخل style.css: اللون الرئيسي، واللون فوقه، والخط، ونصف قطر الزاوية. الأزرار والواجهات التي تستخدم تلك المتغيرات تتبع الطقم."),
      steps(
        ["Build a page that has a Hero and a Button, because those use the shared colours.", "ابنِ صفحة فيها واجهة وزر، لأنهما يستخدمان الألوان المشتركة."],
        ["Press Styles and click a kit. The sample button on the kit shows the new colours.", "اضغط أنماط وانقر طقمًا. الزر النموذجي على الطقم يعرض الألوان الجديدة."],
        ["Look at the page. Open style.css if you want to read the variables the kit wrote.", "انظر إلى الصفحة. افتح style.css إذا أردت قراءة المتغيرات التي كتبها الطقم."],
        ["Choose another kit if the first one fights the photographs.", "اختر طقمًا آخر إذا تعارض الأول مع الصور."],
      ),
      p("Page background, when nothing is selected, can also set a colour or a picture for the whole page from Tag Properties. That is separate from a kit.", "خلفية الصفحة، عندما لا يكون شيء محددًا، تستطيع أيضًا ضبط لون أو صورة للصفحة كلها من خصائص الوسم. ذلك منفصل عن الطقم."),
    ],
  },
  {
    id: "missions",
    group: ["Code and learning", "الكود والتعلّم"],
    title: ["Learn missions", "مهام تعلّم"],
    lead: ["Short checked tasks. The studio marks a step done when the page matches it.", "مهام قصيرة تُفحص. يعلّم الاستوديو الخطوة منتهية عندما تطابقها الصفحة."],
    blocks: [
      p("Toolbox → Learn, or Panels → Learn. Each mission has a title, a topic, and a number of steps. Start mission begins it. The banner under the toolbar shows Step 1 of … and the instruction. Show me points at the control you need, when the step has a pointer.", "صندوق الأدوات ← تعلّم، أو لوحات ← تعلّم. لكل مهمة عنوان وموضوع وعدد خطوات. ابدأ المهمة يبدأها. اللافتة تحت شريط الأدوات تعرض الخطوة 1 من … والتعليم. أرني يشير إلى الأداة التي تحتاجها، عندما يكون للخطوة مؤشر."),
      tools(
        tool(["My first page", "صفحتي الأولى"], ["Learn", "تعلّم"], ["A heading, your own heading text, a real paragraph, bold words, and a page title.", "عنوان، ونص عنوان من عندك، وفقرة حقيقية، وكلمات عريضة، وعنوان صفحة."], ["Start the mission on a blank page and follow the banner. Double-click the heading so the sample words are gone.", "ابدأ المهمة في صفحة فارغة واتبع اللافتة. انقر العنوان مرتين حتى تزول الكلمات النموذجية."]),
        tool(["Lists & tables", "القوائم والجداول"], ["Learn", "تعلّم"], ["A bulleted list of at least four items, a numbered list, a table of at least four rows, your own header text, and a merged cell.", "قائمة نقطية من أربعة بنود على الأقل، وقائمة مرقمة، وجدول من أربعة صفوف على الأقل، ونص عنوان من عندك، وخلية مدموجة."], ["Use Add item until the list has four hobbies, then merge two header cells.", "استخدم إضافة بند حتى يصبح في القائمة أربع هوايات، ثم ادمج خليتي عنوان."]),
        tool(["Pictures & links", "الصور والروابط"], ["Learn", "تعلّم"], ["Your own uploaded picture, alt text on every image, a real https link that is not example.com, a new tab, and a background image.", "صورتك التي رفعتها، ونص بديل لكل صورة، ورابط https حقيقي ليس example.com، وتبويب جديد، وصورة خلفية."], ["Upload a photo, describe it, then set a link to a real site and turn on Open in a new tab.", "ارفع صورة، وصفها، ثم اجعل رابطًا إلى موقع حقيقي وفعّل فتح في تبويب جديد."]),
        tool(["Colours & style", "الألوان والتنسيق"], ["Learn", "تعلّم"], ["A page background, a heading colour, a Google font, rounded corners, a hover effect, and a design kit.", "خلفية صفحة، ولون عنوان، وخط من Google، وزوايا دائرية، وتأثير تمرير، وطقم تصميم."], ["Select the heading, pick a colour, choose Poppins, then press Styles and apply a kit.", "حدد العنوان، واختر لونًا، واختر Poppins، ثم اضغط أنماط وطبّق طقمًا."]),
        tool(["Boxes & layout", "الصناديق والتخطيط"], ["Learn", "تعلّم"], ["Visual Aids, a section, columns, padding, margin, and the phone view.", "المساعدات المرئية، وقسم، وأعمدة، وحشو، وهامش، وعرض الهاتف."], ["Turn on Visual Aids, drag 2 columns, then press Phone.", "شغّل المساعدات المرئية، واسحب عمودين، ثم اضغط هاتف."]),
        tool(["Make it interactive", "اجعلها تفاعلية"], ["Learn", "تعلّم"], ["A button, console.log in script.js, a run, a click listener, and a change to the page from JavaScript.", "زر، وconsole.log في script.js، وتشغيل، ومستمع نقر، وتغيير للصفحة من جافاسكربت."], ["Insert the snippet Message when a button is clicked, then Tools → Run the script and click the button.", "أدرج مقطع رسالة عند النقر على زر، ثم أدوات ← تشغيل السكربت وانقر الزر."]),
        tool(["Ready to publish", "جاهز للنشر"], ["Learn", "تعلّم"], ["At least eight elements, Check, no remaining errors or warnings, Preview, and Download.", "ثمانية عناصر على الأقل، والفحص، ومن غير أخطاء أو تحذيرات متبقية، والمعاينة، والتنزيل."], ["Press Check, fix each line with Show, Preview, then Download.", "اضغط فحص، وأصلح كل سطر بعرض، وعاين، ثم نزّل."]),
      ),
      p("Practice again repeats a finished mission. Restart begins the current one from the first step. Leave closes the banner without deleting badges. Reset all progress clears every badge after you confirm. Mission complete celebrates when the last step matches.", "تدرّب مجددًا يكرّر مهمة منتهية. ابدأ من جديد يبدأ المهمة الحالية من الخطوة الأولى. مغادرة تغلق اللافتة من غير حذف الشارات. إعادة ضبط كل التقدم تمسح كل الشارات بعد التأكيد. اكتملت المهمة تحتفل عندما تطابق الخطوة الأخيرة."),
    ],
  },
  {
    id: "lecturer",
    group: ["Classroom", "الصف"],
    title: ["The lecturer board", "لوحة المحاضر"],
    lead: ["Lessons for the section, and the students who have entered it.", "دروس الشعبة، والطلاب الذين دخلوها."],
    blocks: [
      p("Sign in with I'm the lecturer, the course code, the section, and the section PIN. Then press Classroom on the menu bar. You see Lessons and Students. Course settings stay on the coordinator account.", "ادخل من أنا المحاضر، ورمز المقرر، والشعبة، والرقم السري للشعبة. ثم اضغط الصف الدراسي في شريط القوائم. ترى الدروس والطلاب. إعدادات المقررات تبقى على حساب المنسق."),
      tools(
        tool(["The join line", "سطر الانضمام"], ["Top of the board", "أعلى اللوحة"], ["Shows the course code and section students must type, together with the fact that they also need the PIN.", "يعرض رمز المقرر والشعبة اللذين يجب أن يكتبهما الطلاب، مع حقيقة أنهم يحتاجون الرقم السري أيضًا."], ["Read the line aloud at the start of class so the section number is not mixed up with another group.", "اقرأ السطر بصوت عالٍ في بداية الحصة حتى لا يختلط رقم الشعبة بمجموعة أخرى."]),
        tool(["New lesson", "درس جديد"], ["Lessons", "الدروس"], ["Publishes a lesson students can start. You give it a title and a short brief. An Arabic brief is shown when the student uses Arabic.", "ينشر درسًا يستطيع الطلاب بدؤه. تعطيه عنوانًا وموجزًا قصيرًا. الموجز العربي يظهر عندما يستخدم الطالب العربية."], ["New lesson, title Week 1, brief Build a page with a heading and a photo.", "درس جديد، العنوان الأسبوع 1، الموجز ابنِ صفحة فيها عنوان وصورة."]),
        tool(["Remove", "حذف"], ["Beside a lesson", "بجانب الدرس"], ["Removes that lesson from the section.", "يزيل ذلك الدرس من الشعبة."], ["Remove a draft lesson you published by mistake.", "احذف درسًا مسودة نشرته بالخطأ."]),
        tool(["Students", "الطلاب"], ["Lower half of the board", "النصف الأسفل من اللوحة"], ["Lists name and student ID. Refresh reads the list again.", "يعرض الاسم والرقم الجامعي. تحديث يقرأ القائمة من جديد."], ["Press Refresh after you have asked the class to enter.", "اضغط تحديث بعد أن تطلب من الصف الدخول."]),
        tool(["Open a student's page", "فتح صفحة طالب"], ["The student row", "صف الطالب"], ["You look at their page. A banner says Helping and their name. A note you save appears on their screen.", "تنظر إلى صفحتهم. لافتة تقول تساعد واسمهم. الملاحظة التي تحفظها تظهر على شاشتهم."], ["Open Sara's page, write “Add alt text to the photo”, press Save note, then Back to my page.", "افتح صفحة سارة، واكتب «أضف نصًا بديلًا للصورة»، واضغط حفظ الملاحظة، ثم العودة إلى صفحتي."]),
        tool(["Leave class", "مغادرة الصف"], ["The class panel", "لوحة الصف"], ["Closes the lecturer session for this section.", "يغلق جلسة المحاضر لهذه الشعبة."], ["Leave class when you finish on a shared classroom computer.", "غادر الصف عندما تنتهي على حاسوب قاعة مشترك."]),
      ),
      p("HTML exam on the lecturer toolbar opens the paper for this section. Preparing the questions is described in Course settings, because that is where the exam is stored.", "اختبار HTML في شريط أدوات المحاضر يفتح ورقة هذه الشعبة. إعداد الأسئلة موصوف في إعدادات المقررات، لأن الاختبار يُخزَّن هناك."),
    ],
  },
  {
    id: "courses",
    group: ["Classroom", "الصف"],
    title: ["Course settings and admin", "إعدادات المقررات والمدير"],
    lead: ["Coordinators create sections. Admins also create the people who can sign in.", "المنسقون ينشئون الشعب. المديرون ينشئون أيضًا الأشخاص الذين يستطيعون الدخول."],
    blocks: [
      fig("course", "One title and one code can have many sections. Each section has its own PIN and its own exam.", "عنوان واحد ورمز واحد يمكن أن يكون لهما عدة شعب. لكل شعبة رقمها السري واختبارها."),
      h("Sign in", "تسجيل الدخول"),
      p("Coordinator on the menu bar, or the third welcome tab. The username is 3 to 32 characters: letters, numbers, dots, and dashes, stored in lower case. The password is 8 to 80 characters. The first visit, when no staff exist yet, asks you to create the admin. Later visits ask for the username and password.", "منسق المقرر في شريط القوائم، أو تبويب الترحيب الثالث. اسم المستخدم من 3 إلى 32 حرفًا: حروف وأرقام ونقاط وشرطات، ويُخزَّن بأحرف صغيرة. كلمة المرور من 8 إلى 80 حرفًا. الزيارة الأولى، عندما لا يوجد موظفون بعد، تطلب إنشاء المدير. الزيارات اللاحقة تطلب اسم المستخدم وكلمة المرور."),
      h("A section", "شعبة"),
      tools(
        tool(["New course", "مقرر جديد"], ["Course settings", "إعدادات المقررات"], ["Starts a blank course. Use a new title and code, or the same ones with a section number that is not already used.", "يبدأ مقررًا فارغًا. استخدم عنوانًا ورمزًا جديدين، أو نفس العنوان والرمز مع رقم شعبة غير مستخدم."], ["Press New course. Type a title, CMPS100A, section 1, and a 4 to 8 digit PIN. Press Add this section.", "اضغط مقرر جديد. اكتب عنوانًا، وCMPS100A، والشعبة 1، ورقمًا سريًا من 4 إلى 8 أرقام. اضغط أضف هذه الشعبة."]),
        tool(["Add a section", "إضافة شعبة"], ["Course settings", "إعدادات المقررات"], ["Keeps the title and course code and chooses the next section number. Type a new PIN. The old section stays, with its own students and exam.", "يبقي العنوان ورمز المقرر ويختار رقم الشعبة التالي. اكتب رقمًا سريًا جديدًا. الشعبة القديمة تبقى، بطلابها واختبارها."], ["Select CMPS100A section 1, press Add a section, type a different PIN, and press Add this section. Students of section 2 use that new PIN.", "حدد CMPS100A الشعبة 1، واضغط إضافة شعبة، واكتب رقمًا سريًا مختلفًا، واضغط أضف هذه الشعبة. يستخدم طلاب الشعبة 2 ذلك الرقم الجديد."]),
        tool(["Save this section", "احفظ هذه الشعبة"], ["The form of a selected section", "نموذج الشعبة المحددة"], ["Updates the title or the course code. The PIN box shows the digits students type. Change those digits and save to replace them. Clear the box and save to keep the current PIN.", "يحدّث العنوان أو رمز المقرر. مربع الرقم السري يعرض الأرقام التي يكتبها الطلاب. غيّر الأرقام واحفظ لاستبدالها. امسح المربع واحفظ للإبقاء على الرقم الحالي."], ["Select CMPS100A section 1, read the PIN in the box, change one digit, and press Save this section.", "حدد CMPS100A الشعبة 1، واقرأ الرقم السري في المربع، وغيّر رقمًا واحدًا، واضغط احفظ هذه الشعبة."]),
        tool(["Open this section", "افتح هذه الشعبة"], ["Beside Save", "بجانب حفظ"], ["Opens the lecturer board for that section, so you can publish a lesson.", "يفتح لوحة المحاضر لتلك الشعبة، حتى تنشر درسًا."], ["Save the section, then Open this section and add Week 1.", "احفظ الشعبة، ثم افتح هذه الشعبة وأضف الأسبوع 1."]),
        tool(["Remove", "حذف"], ["The form", "النموذج"], ["Deletes that section after you confirm. Students of that section lose the page list stored there.", "يحذف تلك الشعبة بعد التأكيد. يفقد طلاب تلك الشعبة قائمة الصفحات المحفوظة هناك."], ["Remove a section you created as a rehearsal, after you have copied anything you still need.", "احذف شعبة أنشأتها للتجربة، بعد أن تنسخ أي شيء ما زلت تحتاجه."]),
      ),
      h("The exam for one section", "اختبار شعبة واحدة"),
      p("Under the course form: questions in English, questions in Arabic, and example HTML. Students of that section see this paper when they open HTML exam. Save exam stores it. Use the sample exam fills the boxes with the built-in practice paper so you can edit from a start instead of a blank file. Section 1 and section 2 can have different papers.", "تحت نموذج المقرر: الأسئلة بالإنجليزية، والأسئلة بالعربية، ومثال HTML. يرى طلاب تلك الشعبة هذه الورقة عندما يفتحون اختبار HTML. حفظ الاختبار يخزّنها. استخدم الاختبار النموذجي يملأ المربعات بورقة التدريب المدمجة حتى تحرّر من بداية بدل ملف فارغ. الشعبة 1 والشعبة 2 يمكن أن يكون لهما ورقتان مختلفتان."),
      h("Accounts", "الحسابات"),
      p("The Accounts tab is there for an admin. A coordinator does not see it. An admin creates a coordinator or another admin: name, username, password, and role. Each account can be saved with a new name, a new role, a new password, or turned off. You cannot turn off the account you are using. You cannot turn off or demote the last admin. Changing a password signs that person in again with the new secret; their old session stops working.", "تبويب الحسابات موجود للمدير. المنسق لا يراه. ينشئ المدير منسقًا أو مديرًا آخر: الاسم، واسم المستخدم، وكلمة المرور، والدور. يمكن حفظ كل حساب باسم جديد، أو دور جديد، أو كلمة مرور جديدة، أو إيقافه. لا يمكنك إيقاف الحساب الذي تستخدمه. لا يمكنك إيقاف آخر مدير أو إنزال رتبته. تغيير كلمة المرور يُدخل ذلك الشخص من جديد بالسر الجديد؛ تتوقف جلسته القديمة."),
      p("Change your password, on the same page, asks for the current password and a new one.", "غيّر كلمة مرورك، في الصفحة نفسها، يطلب كلمة المرور الحالية وجديدة."),
      note("Give the lecturer the section PIN. Give the coordinator their username and password. They are not interchangeable. A lecturer PIN cannot open Admin or Course settings.", "أعطِ المحاضر الرقم السري للشعبة. أعطِ المنسق اسم المستخدم وكلمة المرور. لا يحل أحدهما محل الآخر. رقم المحاضر السري لا يفتح المدير أو إعدادات المقررات."),
    ],
  },
  {
    id: "example",
    group: ["A full example", "مثال كامل"],
    title: ["Build one page", "ابنِ صفحة واحدة"],
    lead: ["A short site for a student named Sara. Follow it once on a blank project.", "موقع قصير لطالبة اسمها سارة. اتبعه مرة واحدة في مشروع فارغ."],
    blocks: [
      steps(
        ["Sign in as a student, or continue on this computer. Press New website, name it Sara, choose the language, and start from a blank page.", "ادخل كطالب، أو تابع على هذا الحاسوب. اضغط موقع جديد، وسمّه سارة، واختر اللغة، وابدأ من صفحة فارغة."],
        ["Press Page. Set the title to Sara Al Harthy and Apply.", "اضغط الصفحة. اجعل العنوان سارة الحارثية واضغط تطبيق."],
        ["Insert → Navigation. Select the About link and set its address to about.html. You will add that page in a moment.", "إدراج ← شريط التنقل. حدد رابط من نحن واجعل عنوانه about.html. ستضيف تلك الصفحة بعد قليل."],
        ["Drag Hero from Ready-made. Double-click the heading and type Hello, I'm Sara. Double-click the sentence and write one line about your class.", "اسحب الواجهة من الأجزاء الجاهزة. انقر العنوان مرتين واكتب مرحبًا، أنا سارة. انقر الجملة مرتين واكتب سطرًا عن صفك."],
        ["Insert → Heading 2 and type Hobbies. Insert → Bulleted list. Replace the three items, then Add item for a fourth.", "إدراج ← عنوان 2 واكتب الهوايات. إدراج ← قائمة نقطية. استبدل البنود الثلاثة، ثم أضف بندًا لرابع."],
        ["Select the list and choose Squares if you want a marker other than a disc.", "حدد القائمة واختر مربعات إذا أردت علامة غير القرص."],
        ["Toolbox → Pictures. Drop a photo, press Insert, click the picture, and drag the corner to about half size. In Describe the picture, write a real sentence.", "صندوق الأدوات ← صور. أسقط صورة، واضغط إدراج، وانقر الصورة، واسحب الزاوية إلى نحو نصف الحجم. في صف الصورة، اكتب جملة حقيقية."],
        ["Insert → Table… and choose 3 columns by 4 rows with a header. Type Day, Subject, Room in the header. Fill Sunday, Web Design, Lab 2 in the first body row. Add the other days with Row below if you need them.", "إدراج ← جدول… واختر 3 أعمدة في 4 صفوف مع صف عناوين. اكتب اليوم، المادة، القاعة في العناوين. املأ الأحد، تصميم الويب، معمل 2 في أول صف. أضف الأيام الأخرى بصف أسفل إذا احتجتها."],
        ["Insert → Footer and type © 2026 Sara Al Harthy.", "إدراج ← تذييل واكتب © 2026 سارة الحارثية."],
        ["Press Styles and choose a kit. Press Phone and confirm the columns wrap and the picture fits. Press Computer to come back.", "اضغط أنماط واختر طقمًا. اضغط هاتف وتأكد أن الأعمدة تلتف والصورة تتسع. اضغط حاسوب للعودة."],
        ["Press Check. Use Show on anything that is not a gentle tip, fix it, and check again.", "اضغط فحص. استخدم عرض على أي شيء ليس تلميحًا لطيفًا، وأصلحه، وافحص مرة أخرى."],
        ["Folder List → New File → about.html. Add a Heading 1, About, and a paragraph. Save.", "قائمة المجلدات ← ملف جديد ← about.html. أضف عنوان 1، عنّي، وفقرة. احفظ."],
        ["Tools → Check links. Preview. Download the ZIP if you want a copy outside the studio.", "أدوات ← فحص الروابط. عاين. نزّل ZIP إذا أردت نسخة خارج الاستوديو."],
      ),
      p("That is the whole loop: structure, words, picture, table, look, check, a second page, preview. The missions repeat the same loop in smaller checked steps.", "هذه هي الحلقة كلها: البنية، والكلمات، والصورة، والجدول، والمظهر، والفحص، وصفحة ثانية، والمعاينة. المهام تكرّر الحلقة نفسها في خطوات أصغر تُفحص."),
    ],
  },
  {
    id: "shortcuts",
    group: ["A full example", "مثال كامل"],
    title: ["Index of keys and names", "فهرس المفاتيح والأسماء"],
    lead: ["The short list, when you remember the job and not the menu.", "القائمة القصيرة، عندما تتذكر العمل ولا تتذكر القائمة."],
    blocks: [
      tools(
        tool(["F1", "F1"], ["Anywhere in the studio", "في أي مكان في الاستوديو"], ["Opens this guide.", "يفتح هذا الدليل."], ["Press F1 on the welcome page before you sign in.", "اضغط F1 في صفحة الترحيب قبل الدخول."]),
        tool(["Ctrl+S", "Ctrl+S"], ["Design, Code, Learn HTML", "التصميم، الكود، تعلّم HTML"], ["Saves the project.", "يحفظ المشروع."], ["Press Ctrl+S after the heading reads the way you want.", "اضغط Ctrl+S بعد أن يصبح العنوان كما تريد."]),
        tool(["Ctrl+Z, Ctrl+Y", "Ctrl+Z، Ctrl+Y"], ["Edit", "تحرير"], ["Undo and redo in Design. Learn HTML and the exam have their own undo buttons.", "التراجع والإعادة في التصميم. لتعلّم HTML والاختبار زرا تراجع خاصان بهما."], ["Ctrl+Z immediately after a delete you did not mean.", "Ctrl+Z فور حذف لم تقصده."]),
        tool(["Ctrl+X, Ctrl+C, Ctrl+V", "Ctrl+X، Ctrl+C، Ctrl+V"], ["Edit", "تحرير"], ["Cut, copy, and paste the selected tag or the selected code.", "قص ونسخ ولصق الوسم المحدد أو الكود المحدد."], ["Ctrl+C on a card, click below it, Ctrl+V.", "Ctrl+C على بطاقة، انقر تحتها، Ctrl+V."]),
        tool(["Ctrl+A", "Ctrl+A"], ["Code view", "عرض الكود"], ["Selects the whole file you are editing.", "يحدد الملف كله الذي تحرره."], ["In Code, click style.css and press Ctrl+A.", "في الكود، انقر style.css واضغط Ctrl+A."]),
        tool(["Ctrl+F, Ctrl+H", "Ctrl+F، Ctrl+H"], ["Edit", "تحرير"], ["Find, and find-and-replace.", "بحث، وبحث واستبدال."], ["Ctrl+H, find Hello, replace with Marhaba, Replace all.", "Ctrl+H، ابحث عن Hello، واستبدله بـ Marhaba، استبدال الكل."]),
        tool(["Delete", "Delete"], ["A selected tag", "وسم محدد"], ["Removes it.", "يزيله."], ["Click a spare spacer and press Delete.", "انقر مسافة زائدة واضغط Delete."]),
        tool(["Shift-click, or drag", "نقر مع Shift، أو السحب"], ["Table cells", "خلايا الجدول"], ["Selects more than one cell so you can merge them.", "يحدد أكثر من خلية حتى تدمجها."], ["Shift-click the cell to the right of the one you merged last time.", "انقر مع Shift الخلية يمين التي دمجتها في المرة السابقة."]),
        tool(["Escape", "Escape"], ["A menu, a window, typing on the page", "قائمة، أو نافذة، أو الكتابة في الصفحة"], ["Closes the open menu, the table window, or the right-click menu, and leaves in-place typing.", "يغلق القائمة المفتوحة، أو نافذة الجدول، أو قائمة النقر باليمين، ويغادر الكتابة في المكان."], ["Press Escape if a menu stays open over the page.", "اضغط Escape إذا بقيت قائمة مفتوحة فوق الصفحة."]),
      ),
      h("Names that are easy to mix up", "أسماء يسهل الخلط بينها"),
      tools(
        tool(["Page title and website name", "عنوان الصفحة واسم الموقع"], ["Page settings, and the name box", "إعدادات الصفحة، ومربع الاسم"], ["The page title is the browser tab. The website name is the project in Open.", "عنوان الصفحة هو تبويب المتصفح. اسم الموقع هو المشروع في فتح."], ["Title: Sara Al Harthy. Website name: Week 1.", "العنوان: سارة الحارثية. اسم الموقع: الأسبوع 1."]),
        tool(["Section PIN and password", "الرقم السري للشعبة وكلمة المرور"], ["Lecturer tab, and Coordinator tab", "تبويب المحاضر، وتبويب المنسق"], ["The PIN is 4 to 8 digits for one section. The password is the staff secret, at least 8 characters.", "الرقم السري من 4 إلى 8 أرقام لشعبة واحدة. كلمة المرور سر الموظف، 8 أحرف على الأقل."], ["Write the PIN in I'm the lecturer. Write the password in Coordinator.", "اكتب الرقم السري في أنا المحاضر. اكتب كلمة المرور في منسق المقرر."]),
        tool(["Save and Download", "حفظ وتنزيل"], ["Toolbar", "شريط الأدوات"], ["Save keeps the site in the studio. Download makes a ZIP you can take away.", "الحفظ يبقي الموقع في الاستوديو. التنزيل يصنع ZIP يمكنك أخذه."], ["Save while you work. Download when you want a copy for a memory stick.", "احفظ وأنت تعمل. نزّل عندما تريد نسخة لذاكرة."]),
        tool(["Learn HTML and HTML exam", "تعلّم HTML واختبار HTML"], ["Toolbar and Tools", "شريط الأدوات وأدوات"], ["Learn HTML is practice on first.html, with buttons that insert tags. HTML exam is the paper for your section, typed by hand.", "تعلّم HTML تدريب على first.html، بأزرار تدرج الوسوم. اختبار HTML هو ورقة شعبتك، تُكتب باليد."], ["Use Learn HTML on Tuesday. Use HTML exam when the lecturer has published the paper.", "استخدم تعلّم HTML يوم الثلاثاء. استخدم اختبار HTML عندما ينشر المحاضر الورقة."]),
        tool(["Design undo and lesson undo", "تراجع التصميم وتراجع الدرس"], ["Toolbar, and the Learn HTML or exam bar", "شريط الأدوات، وشريط تعلّم HTML أو الاختبار"], ["Each room remembers its own steps.", "كل غرفة تتذكر خطواتها."], ["Inside Learn HTML, use the undo icon there, not Ctrl+Z from Design.", "داخل تعلّم HTML، استخدم أيقونة التراجع هناك، لا Ctrl+Z من التصميم."]),
      ),
    ],
  },
];

export function chapterText(chapter: Chapter, index: 0 | 1) {
  const parts = [chapter.title[index], chapter.lead[index], chapter.group[index]];
  for (const block of chapter.blocks) {
    if (block.k === "p" || block.k === "h" || block.k === "note") parts.push(block.t[index]);
    else if (block.k === "steps") parts.push(...block.items.map((item) => item[index]));
    else if (block.k === "fig") parts.push(block.cap[index]);
    else if (block.k === "tools") {
      for (const item of block.items) parts.push(item.name[index], item.where[index], item.what[index], item.ex[index]);
    }
  }
  return parts.join("\n");
}

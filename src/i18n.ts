export type Lang = 'en' | 'ar';

const LANG_KEY = 'webdesigner:lang';

export function getLang(): Lang {
  try {
    const v = localStorage.getItem(LANG_KEY);
    if (v === 'ar' || v === 'en') return v;
  } catch {}
  return navigator.language?.startsWith('ar') ? 'ar' : 'en';
}

export function setLang(lang: Lang) {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {}
}

export const lang = getLang();

const dict = {
  appName: ['Web Studio', 'استوديو الويب'],
  new: ['New', 'جديد'],
  open: ['Open', 'فتح'],
  save: ['Save', 'حفظ'],
  saveFolder: ['Save to folder', 'حفظ في مجلد'],
  download: ['Download ZIP', 'تنزيل ZIP'],
  myProjects: ['My projects', 'مشاريعي'],
  visual: ['Visual', 'مرئي'],
  split: ['Split', 'مقسوم'],
  code: ['Code', 'كود'],
  desktop: ['Desktop', 'حاسوب'],
  tablet: ['Tablet', 'لوحي'],
  phone: ['Phone', 'هاتف'],
  undo: ['Undo', 'تراجع'],
  redo: ['Redo', 'إعادة'],
  preview: ['Preview', 'معاينة'],
  pasteHtml: ['Paste HTML', 'لصق HTML'],
  pageSettings: ['Page settings', 'إعدادات الصفحة'],
  bigUi: ['Projector size', 'حجم العرض'],
  langSwitch: ['العربية', 'English'],
  blocks: ['Blocks', 'العناصر'],
  structure: ['Structure', 'الهيكل'],
  dragHint: ['Drag a block onto the page', 'اسحب عنصرًا إلى الصفحة'],
  properties: ['Properties', 'الخصائص'],
  format: ['Format', 'تنسيق'],
  settings: ['Settings', 'الإعدادات'],
  style: ['Style', 'التصميم'],
  nothingSelected: ['Click an element on the page to edit it.', 'انقر على عنصر في الصفحة لتعديله.'],
  bold: ['Bold', 'عريض'],
  italic: ['Italic', 'مائل'],
  underline: ['Underline', 'تسطير'],
  strike: ['Strikethrough', 'يتوسطه خط'],
  alignLeft: ['Align left', 'محاذاة لليسار'],
  alignCenter: ['Center', 'توسيط'],
  alignRight: ['Align right', 'محاذاة لليمين'],
  justify: ['Justify', 'ضبط'],
  link: ['Link', 'رابط'],
  textColor: ['Text color', 'لون النص'],
  bgColor: ['Background', 'الخلفية'],
  fontSize: ['Size', 'الحجم'],
  table: ['Table', 'جدول'],
  rowAbove: ['Row above', 'صف أعلى'],
  rowBelow: ['Row below', 'صف أسفل'],
  colBefore: ['Column before', 'عمود قبل'],
  colAfter: ['Column after', 'عمود بعد'],
  delRow: ['Delete row', 'حذف الصف'],
  delCol: ['Delete column', 'حذف العمود'],
  list: ['List', 'قائمة'],
  addItem: ['Add item', 'إضافة بند'],
  removeItem: ['Remove item', 'حذف البند'],
  indent: ['Nest', 'تفريع'],
  toBullets: ['Bullets', 'نقاط'],
  toNumbers: ['Numbers', 'أرقام'],
  image: ['Image', 'صورة'],
  replaceImage: ['Replace image', 'استبدال الصورة'],
  element: ['Element', 'العنصر'],
  duplicate: ['Duplicate', 'تكرار'],
  delete: ['Delete', 'حذف'],
  selectParent: ['Select parent', 'تحديد الأب'],
  htmlTab: ['HTML', 'HTML'],
  cssTab: ['CSS', 'CSS'],
  codeHint: [
    'Edit the code — the page updates as you type. Click a line to find it on the page.',
    'عدّل الكود — تتحدث الصفحة أثناء الكتابة. انقر على سطر لتجده في الصفحة.',
  ],
  saved: ['Saved', 'تم الحفظ'],
  saving: ['Saving…', 'جارٍ الحفظ…'],
  unsaved: ['Unsaved changes', 'تغييرات غير محفوظة'],
  savedFolder: ['Saved to folder', 'تم الحفظ في المجلد'],
  folderUnsupported: [
    'This browser cannot save into folders. Use Chrome or Edge, or download a ZIP.',
    'هذا المتصفح لا يدعم الحفظ في المجلدات. استخدم Chrome أو Edge، أو نزّل ملف ZIP.',
  ],
  newProject: ['New website', 'موقع جديد'],
  projectName: ['Website name', 'اسم الموقع'],
  chooseTemplate: ['Start from', 'ابدأ من'],
  create: ['Create', 'إنشاء'],
  cancel: ['Cancel', 'إلغاء'],
  apply: ['Apply', 'تطبيق'],
  close: ['Close', 'إغلاق'],
  openFiles: ['Open a ZIP, HTML file or folder', 'افتح ملف ZIP أو HTML أو مجلدًا'],
  openZip: ['ZIP or HTML file…', 'ملف ZIP أو HTML…'],
  openFolder: ['Folder…', 'مجلد…'],
  noProjects: ['No saved websites yet.', 'لا توجد مواقع محفوظة بعد.'],
  deleteProjectConfirm: ['Delete this website from this browser?', 'حذف هذا الموقع من هذا المتصفح؟'],
  edited: ['Edited', 'آخر تعديل'],
  pasteHtmlHint: ['Paste any HTML. It becomes blocks you can edit.', 'الصق أي كود HTML وسيتحول إلى عناصر قابلة للتعديل.'],
  insert: ['Insert', 'إدراج'],
  pageTitle: ['Page title (shown in the browser tab)', 'عنوان الصفحة (يظهر في تبويب المتصفح)'],
  siteLang: ['Website language', 'لغة الموقع'],
  imported: ['Website opened', 'تم فتح الموقع'],
  importFailed: ['Could not open that file', 'تعذر فتح الملف'],
  pastedImage: ['Image pasted', 'تم لصق الصورة'],
  linkUrl: ['Link address (URL)', 'عنوان الرابط (URL)'],
  whatIsThis: ['What is this?', 'ما هذا؟'],
  tplBlank: ['Blank page', 'صفحة فارغة'],
  tplPersonal: ['Personal page', 'صفحة شخصية'],
  tplLanding: ['Landing page', 'صفحة تعريفية'],
  emptyCanvas: ['Your page is empty — drag blocks here', 'صفحتك فارغة — اسحب العناصر إلى هنا'],
} as const;

export type Key = keyof typeof dict;

export function t(key: Key): string {
  return dict[key][lang === 'ar' ? 1 : 0];
}

/** Fill every element carrying data-i18n / data-i18n-title. */
export function applyI18n(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n as Key);
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((el) => {
    const label = t(el.dataset.i18nTitle as Key);
    el.title = label;
    el.setAttribute('aria-label', label);
  });
}

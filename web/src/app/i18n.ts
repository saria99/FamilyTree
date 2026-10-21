import i18n from 'i18next'
import { initReactI18next, useTranslation } from 'react-i18next'
import type { Lang } from '../domain/text'

const en = {
  appName: 'Bayrab Genealogy',
  prototypeBanner: 'Prototype — your changes are saved only in this browser',
  nav: { editor: 'Editor', lineage: 'Lineage', tree: 'Tree', search: 'Search', sources: 'Sources', settings: 'Settings' },
  actions: {
    add: 'Add', save: 'Save', cancel: 'Cancel', confirm: 'Confirm', delete: 'Delete', close: 'Close', undo: 'Undo', redo: 'Redo',
    profile: 'Open profile', makePreferred: 'Make preferred', addAlternative: 'Add as alternative claim', cite: 'Cite source',
  },
  gender: { M: 'Male', F: 'Female' },
  commandBar: {
    placeholder: 'Type a name and press Enter — or a chain like "Fatimah bint Muhammad ibn Abdullah"',
    chainTitle: 'Create lineage chain',
    newPerson: 'New person',
    chainNote: 'Links are created as Unconfirmed with Low confidence. Cite a source later to verify them.',
  },
  editor: {
    hint: 'Drag a person onto another person to record a marriage, or onto a marriage ring to add them as a child.',
    phoneOnly: 'Editing is available on a desktop screen.',
    filterBranch: 'Branch', allBranches: 'Whole tree', fit: 'Fit view',
    alternativeBody: '{{name}} already has preferred parents. Record these parents as an alternative (disputed) claim? The tree keeps following the preferred parents until you choose otherwise.',
  },
  person: {
    title: 'Person', ismAr: 'Name (Arabic)', ismEn: 'Name (English)', laqabAr: 'Laqab (Arabic)', laqabEn: 'Laqab (English)',
    gender: 'Gender', birth: 'Birth', death: 'Death', living: 'Living', notes: 'Notes', id: 'ID',
    parents: 'Parents', marriages: 'Marriages', childrenWith: 'Children with {{name}}', noChildren: 'No children recorded', noMarriages: 'No marriages recorded',
    nasab: 'Nasab (paternal line)', maternal: 'Maternal line', claims: 'Parentage claims', preferred: 'Preferred', alternative: 'Alternative',
    unknownParents: 'Parents not recorded', guardian: 'Guardian (kafala)', milkMother: 'Milk mother', milkFather: 'Milk father', kinship: 'Other relationships',
    sources: 'Sources', setAsMe: 'This is me', isMe: 'You',
  },
  marriage: {
    title: 'Marriage', husband: 'Husband', wife: 'Wife', start: 'Start (nikah)', end: 'End', endReason: 'How it ended', divorceKind: 'Divorce kind',
    unknownSpouse: 'Unknown spouse',
    reasons: { Ongoing: 'Ongoing', Divorce: 'Divorce (talaq)', Khul: "Khul'", Annulment: 'Annulment (faskh)', DeathOfHusband: 'Death of husband', DeathOfWife: 'Death of wife', Unknown: 'Unknown' },
    divorceKinds: { Revocable: "Revocable (raj'i)", IrrevocableMinor: "Irrevocable minor (ba'in sughra)", IrrevocableMajor: "Irrevocable major (ba'in kubra)" },
  },
  date: { year: 'Year', month: 'Month', day: 'Day', approx: 'approx.' },
  verification: {
    status: 'Status', confidence: 'Confidence', needsSource: 'Cite a source before marking Verified',
    statuses: { Verified: 'Verified', OralAccount: 'Oral account', Disputed: 'Disputed', Unconfirmed: 'Unconfirmed' },
    confidences: { High: 'High', Medium: 'Medium', Low: 'Low' },
    legend: 'Legend', citations: '{{count}} source(s)',
  },
  sources: {
    title: 'Sources', add: 'New source', type: 'Type', titleField: 'Title', author: 'Author / issuer', narrator: 'Narrator', toldOn: 'Told on (year)', recordedBy: 'Recorded by',
    citedBy: 'Cited by', detail: 'Page / detail', quotation: 'Quotation', pick: 'Choose a source',
    types: { Document: 'Document', Book: 'Book', OfficialRecord: 'Official record', Gravestone: 'Gravestone', Photo: 'Photo', Website: 'Website', OralAccount: 'Oral account', Other: 'Other' },
  },
  rules: { refusedTitle: 'Not allowed', warningTitle: 'Please confirm', warningBody: 'These look unusual. Save anyway? Your confirmation is stored with the record.', saveAnyway: 'Save anyway' },
  search: { placeholder: 'Search by name (Arabic or English) or ID', none: 'No matches' },
  lineage: { title: 'My lineage', pick: 'Choose whose lineage to show', wives: 'Wives', showTree: 'Show as tree' },
  settings: {
    language: 'Language', data: 'Data', download: 'Download tree (JSON)', open: 'Open JSON file', reset: 'Reset to Bayrab seed', loadDemo: 'Load demo family (fictional)',
    resetConfirm: 'Replace the current tree? (You can undo.)', opened: 'Tree loaded from file.', openFailed: 'Could not open this file: {{error}}',
    feedback: 'Give feedback', feedbackBody: 'Tried something? Download your tree and send it with your comments.',
    install: 'Install app', iosInstall: 'On iPhone: tap Share, then "Add to Home Screen".', offline: 'Offline — showing saved data',
    update: 'A new version is available.', updateNow: 'Update now',
  },
}

type Resources = typeof en

const ar: Resources = {
  appName: 'أنساب آل بيرب',
  prototypeBanner: 'نموذج تجريبي — تُحفظ تعديلاتك في هذا المتصفح فقط',
  nav: { editor: 'المحرر', lineage: 'النسب', tree: 'الشجرة', search: 'بحث', sources: 'المصادر', settings: 'الإعدادات' },
  actions: {
    add: 'إضافة', save: 'حفظ', cancel: 'إلغاء', confirm: 'تأكيد', delete: 'حذف', close: 'إغلاق', undo: 'تراجع', redo: 'إعادة',
    profile: 'فتح الملف', makePreferred: 'اجعله المعتمد', addAlternative: 'أضف كادعاء بديل', cite: 'إسناد مصدر',
  },
  gender: { M: 'ذكر', F: 'أنثى' },
  commandBar: {
    placeholder: 'اكتب اسمًا واضغط Enter — أو سلسلة مثل «فاطمة بنت محمد بن عبدالله»',
    chainTitle: 'إنشاء سلسلة نسب',
    newPerson: 'شخص جديد',
    chainNote: 'تُنشأ الروابط بحالة «غير مؤكد» وثقة منخفضة. أضف مصدرًا لاحقًا لتوثيقها.',
  },
  editor: {
    hint: 'اسحب شخصًا إلى شخص آخر لتسجيل زواج، أو إلى حلقة الزواج لإضافته ابنًا.',
    phoneOnly: 'التحرير متاح على شاشة الحاسوب.',
    filterBranch: 'الفرع', allBranches: 'الشجرة كاملة', fit: 'ملاءمة العرض',
    alternativeBody: 'لـ{{name}} والدان معتمدان بالفعل. هل تسجل هذين الوالدين كادعاء بديل (متنازع عليه)؟ تبقى الشجرة على الوالدين المعتمدين حتى تختار غير ذلك.',
  },
  person: {
    title: 'شخص', ismAr: 'الاسم (عربي)', ismEn: 'الاسم (إنجليزي)', laqabAr: 'اللقب (عربي)', laqabEn: 'اللقب (إنجليزي)',
    gender: 'الجنس', birth: 'الميلاد', death: 'الوفاة', living: 'على قيد الحياة', notes: 'ملاحظات', id: 'الرقم',
    parents: 'الوالدان', marriages: 'الزيجات', childrenWith: 'الأبناء من {{name}}', noChildren: 'لا أبناء مسجلون', noMarriages: 'لا زيجات مسجلة',
    nasab: 'النسب (من جهة الأب)', maternal: 'خط الأم', claims: 'ادعاءات النسب', preferred: 'معتمد', alternative: 'بديل',
    unknownParents: 'الوالدان غير مسجلين', guardian: 'كافل', milkMother: 'أم من الرضاعة', milkFather: 'أب من الرضاعة', kinship: 'علاقات أخرى',
    sources: 'المصادر', setAsMe: 'هذا أنا', isMe: 'أنت',
  },
  marriage: {
    title: 'زواج', husband: 'الزوج', wife: 'الزوجة', start: 'البداية (العقد)', end: 'النهاية', endReason: 'سبب الانتهاء', divorceKind: 'نوع الطلاق',
    unknownSpouse: 'زوج/زوجة غير معروف',
    reasons: { Ongoing: 'قائم', Divorce: 'طلاق', Khul: 'خلع', Annulment: 'فسخ', DeathOfHusband: 'وفاة الزوج', DeathOfWife: 'وفاة الزوجة', Unknown: 'غير معروف' },
    divorceKinds: { Revocable: 'رجعي', IrrevocableMinor: 'بائن بينونة صغرى', IrrevocableMajor: 'بائن بينونة كبرى' },
  },
  date: { year: 'السنة', month: 'الشهر', day: 'اليوم', approx: 'تقريبي' },
  verification: {
    status: 'الحالة', confidence: 'الثقة', needsSource: 'أضف مصدرًا قبل التوثيق',
    statuses: { Verified: 'موثق', OralAccount: 'رواية شفهية', Disputed: 'متنازع عليه', Unconfirmed: 'غير مؤكد' },
    confidences: { High: 'عالية', Medium: 'متوسطة', Low: 'منخفضة' },
    legend: 'مفتاح الرموز', citations: '{{count}} مصدر',
  },
  sources: {
    title: 'المصادر', add: 'مصدر جديد', type: 'النوع', titleField: 'العنوان', author: 'المؤلف / الجهة', narrator: 'الراوي', toldOn: 'سنة الرواية', recordedBy: 'المدوِّن',
    citedBy: 'مستشهد به في', detail: 'الصفحة / التفاصيل', quotation: 'نص مقتبس', pick: 'اختر مصدرًا',
    types: { Document: 'وثيقة', Book: 'كتاب', OfficialRecord: 'سجل رسمي', Gravestone: 'شاهد قبر', Photo: 'صورة', Website: 'موقع إلكتروني', OralAccount: 'رواية شفهية', Other: 'أخرى' },
  },
  rules: { refusedTitle: 'غير مسموح', warningTitle: 'يرجى التأكيد', warningBody: 'تبدو هذه غير معتادة. هل تحفظ على أي حال؟ يُحفظ تأكيدك مع السجل.', saveAnyway: 'احفظ على أي حال' },
  search: { placeholder: 'ابحث بالاسم (عربي أو إنجليزي) أو الرقم', none: 'لا نتائج' },
  lineage: { title: 'نسبي', pick: 'اختر الشخص لعرض نسبه', wives: 'الزوجات', showTree: 'عرض كشجرة' },
  settings: {
    language: 'اللغة', data: 'البيانات', download: 'تنزيل الشجرة (JSON)', open: 'فتح ملف JSON', reset: 'إعادة بيانات بيرب الأولية', loadDemo: 'تحميل عائلة تجريبية (وهمية)',
    resetConfirm: 'استبدال الشجرة الحالية؟ (يمكن التراجع)', opened: 'تم تحميل الشجرة من الملف.', openFailed: 'تعذر فتح الملف: {{error}}',
    feedback: 'أرسل ملاحظاتك', feedbackBody: 'جربت شيئًا؟ نزّل شجرتك وأرسلها مع ملاحظاتك.',
    install: 'تثبيت التطبيق', iosInstall: 'على الآيفون: اضغط «مشاركة» ثم «إضافة إلى الشاشة الرئيسية».', offline: 'غير متصل — تُعرض البيانات المحفوظة',
    update: 'يتوفر إصدار جديد.', updateNow: 'حدّث الآن',
  },
}

const LANG_KEY = 'bayrab-lang'

function initialLang(): Lang {
  const saved = localStorage.getItem(LANG_KEY)
  if (saved === 'ar' || saved === 'en') return saved
  return navigator.language.startsWith('ar') ? 'ar' : 'en'
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ar: { translation: ar } },
  lng: initialLang(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export function applyDirection(lang: Lang) {
  document.documentElement.lang = lang
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
}

applyDirection(i18n.language as Lang)

export function setLanguage(lang: Lang) {
  localStorage.setItem(LANG_KEY, lang)
  void i18n.changeLanguage(lang)
  applyDirection(lang)
}

export function useLang(): { t: ReturnType<typeof useTranslation>['t']; lang: Lang } {
  const { t, i18n: instance } = useTranslation()
  return { t, lang: (instance.language === 'ar' ? 'ar' : 'en') as Lang }
}

export default i18n

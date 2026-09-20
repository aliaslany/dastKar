import GirihDivider from "./GirihDivider";

export default function Footer() {
  return (
    <footer className="mt-16 bg-ink text-parchment/80">
      <GirihDivider className="text-saffron" />
      <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        <div>
          <h4 className="text-parchment font-semibold mb-3">دستکار</h4>
          <p className="leading-relaxed text-parchment/60">
            بازاری برای هنرمندان و صنعتگران ایرانی تا آثار دست‌ساز خود را مستقیم به مشتریان بفروشند.
          </p>
        </div>
        <div>
          <h4 className="text-parchment font-semibold mb-3">خریداران</h4>
          <ul className="space-y-2 text-parchment/60">
            <li>راهنمای خرید</li>
            <li>پیگیری سفارش</li>
            <li>بازگشت کالا</li>
          </ul>
        </div>
        <div>
          <h4 className="text-parchment font-semibold mb-3">فروشندگان</h4>
          <ul className="space-y-2 text-parchment/60">
            <li>باز کردن فروشگاه</li>
            <li>هزینه‌ها و کارمزد</li>
            <li>راهنمای فروش</li>
          </ul>
        </div>
        <div>
          <h4 className="text-parchment font-semibold mb-3">درباره</h4>
          <ul className="space-y-2 text-parchment/60">
            <li>درباره دستکار</li>
            <li>تماس با ما</li>
            <li>حریم خصوصی</li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

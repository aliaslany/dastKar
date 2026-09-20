import { useOutletContext } from "react-router-dom";

export default function DashboardHome() {
  const { shop } = useOutletContext<{ shop: { name: string; slug: string } }>();
  return (
    <div className="bg-white rounded-lg border border-ink/10 p-6">
      <h2 className="font-bold mb-2">به فروشگاه {shop.name} خوش آمدید</h2>
      <p className="text-ink/60 text-sm leading-relaxed">
        از تب «محصولات» برای افزودن کالای جدید و از تب «سفارش‌ها» برای پیگیری و بروزرسانی وضعیت
        سفارش‌های دریافتی استفاده کنید.
      </p>
    </div>
  );
}

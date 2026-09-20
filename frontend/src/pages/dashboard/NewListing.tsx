import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { api } from "../../lib/api";

type Category = { id: string; name_fa: string };

export default function NewListing() {
  const { shop } = useOutletContext<{ shop: { id: string } }>();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    priceToman: "",
    quantity: "1",
    categoryId: "",
    materials: "",
    tags: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ categories: Category[] }>("/categories").then((d) => setCategories(d.categories));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await api.post<{ listing: { id: string } }>("/listings", {
        shopId: shop.id,
        title: form.title,
        description: form.description,
        priceToman: Number(form.priceToman),
        quantity: Number(form.quantity),
        categoryId: form.categoryId || null,
        materials: form.materials || null,
        tags: form.tags || null,
      });

      if (imageFile) {
        const fd = new FormData();
        fd.append("file", imageFile);
        await api.post(`/uploads/listing-image?listingId=${data.listing.id}`, fd);
      }

      navigate("/dashboard/listings");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h2 className="font-bold mb-4">افزودن محصول جدید</h2>
      <form onSubmit={submit} className="bg-white rounded-lg border border-ink/10 p-6 space-y-4 max-w-xl">
        <input
          placeholder="عنوان محصول"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full border border-ink/20 rounded-lg px-3 py-2 text-sm"
          required
        />
        <textarea
          placeholder="توضیحات کامل محصول"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full border border-ink/20 rounded-lg px-3 py-2 text-sm"
          rows={4}
          required
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            type="number"
            placeholder="قیمت (تومان)"
            value={form.priceToman}
            onChange={(e) => setForm({ ...form, priceToman: e.target.value })}
            className="border border-ink/20 rounded-lg px-3 py-2 text-sm"
            required
          />
          <input
            type="number"
            placeholder="موجودی"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            className="border border-ink/20 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <select
          value={form.categoryId}
          onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          className="w-full border border-ink/20 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">انتخاب دسته‌بندی</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name_fa}</option>
          ))}
        </select>
        <input
          placeholder="مواد اولیه (با کاما جدا کنید)"
          value={form.materials}
          onChange={(e) => setForm({ ...form, materials: e.target.value })}
          className="w-full border border-ink/20 rounded-lg px-3 py-2 text-sm"
        />
        <input
          placeholder="برچسب‌ها برای جستجو (با کاما جدا کنید)"
          value={form.tags}
          onChange={(e) => setForm({ ...form, tags: e.target.value })}
          className="w-full border border-ink/20 rounded-lg px-3 py-2 text-sm"
        />
        <div>
          <label className="block text-sm text-ink/70 mb-2">تصویر اصلی محصول</label>
          <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} className="text-sm" />
        </div>

        {error && <p className="text-madder text-sm">{error}</p>}

        <button
          disabled={busy}
          className="bg-firouzeh text-white font-semibold rounded-full px-6 py-2.5 hover:bg-firouzeh-dark transition-colors disabled:opacity-40"
        >
          {busy ? "در حال ثبت..." : "ثبت محصول"}
        </button>
      </form>
    </div>
  );
}

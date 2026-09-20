import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import NoIndex from "../components/NoIndex";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      navigate("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-16">
      <NoIndex />
      <h1 className="text-xl font-bold mb-6 text-center">ورود به دستکار</h1>
      <form onSubmit={submit} className="bg-white rounded-lg border border-ink/10 p-6 space-y-4">
        <input
          type="email"
          placeholder="ایمیل"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-ink/20 rounded-lg px-3 py-2 text-sm"
          required
        />
        <input
          type="password"
          placeholder="رمز عبور"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-ink/20 rounded-lg px-3 py-2 text-sm"
          required
        />
        {error && <p className="text-madder text-sm">{error}</p>}
        <button
          disabled={busy}
          className="w-full bg-firouzeh text-white font-semibold rounded-full py-2.5 hover:bg-firouzeh-dark transition-colors disabled:opacity-40"
        >
          {busy ? "..." : "ورود"}
        </button>
      </form>
      <p className="text-center text-sm text-ink/60 mt-4">
        حساب ندارید؟ <Link to="/register" className="text-firouzeh-dark font-medium">ثبت‌نام کنید</Link>
      </p>
    </div>
  );
}

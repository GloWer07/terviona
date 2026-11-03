/* ============================================================
   Terviona — Supabase configuration (LOCAL BUILD).

   Заполнено заглушкой: авторизация и отзывы автоматически
   выключаются, сайт полностью работает без сети.
   Для продакшена подставьте Project URL + anon key.
   ============================================================ */
window.SUPABASE_CONFIG = {
  url:     "YOUR-SUPABASE-URL",
  anonKey: "YOUR-SUPABASE-ANON-KEY",
  reviewEndpoint: "/admin/api/public/reviews",
  turnstileSiteKey: "",
};

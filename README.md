# هل تستحق البلوك أو لا؟ 🚫❤️

## 1) Supabase (مجاني)
1. supabase.com ← سجّل ← New project (اختر أي اسم وكلمة مرور، لا ترسلها لأحد).
2. من القائمة: SQL Editor ← New query ← الصق محتوى `supabase/schema.sql` كاملاً ← Run.
3. Project Settings ← API: انسخ `Project URL` و `anon public key` (لا تنسخ service_role أبداً).

## 2) تشغيل محلي
```
npm install
cp .env.example .env     # الصق القيمتين داخل .env
npm run dev
```

## 3) النشر على Vercel (مجاني)
ارفع المجلد على GitHub ← vercel.com ← Import ← أضف المتغيرين
`VITE_SUPABASE_URL` و `VITE_SUPABASE_ANON_KEY` ← Deploy.

الأمان: الجداول مقفلة بـ RLS، والإجابات الصحيحة لا تُرسل للمتصفح إطلاقاً، والتحقق يتم داخل دوال Postgres.

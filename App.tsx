import { Component, ReactNode, useEffect, useState } from 'react'
import { sb, ready } from './supabase'

type Kind = 'friends' | 'love'
type Q = { q: string; options: string[]; correct: number }
type PubQ = { q: string; options: string[] }

const TITLE = 'هل تستحق البلوك أو لا؟ 🚫❤️'
const PRESETS: Record<Kind, string[]> = {
  friends: ['شنو أكثر شي أحبه؟','شنو أكثر شي يعصبني؟','شنو حلمي بالمستقبل؟','شنو أكلتي المفضلة؟','شنو أكثر موقف يضحكني؟','شنو الشي اللي مستحيل أسامح عليه؟','شنو أكثر صفة تميزني؟','شنو الشي اللي أخاف منه؟','شنو أكثر شي يغير مزاجي؟','إذا تضايقت، شنو غالباً أسوي؟'],
  love: ['شنو أكثر شي يجذبني بالشخص؟','شنو الشي اللي يفرحني؟','شنو أكثر شي يزعلني؟','إذا تضايقت، شنو أحتاج منك؟','شنو أكثر صفة أحبها بالشخص؟','شنو المكان اللي أتمنى أزوره وياك؟','شنو أكثر تصرف يخليني أفقد اهتمامي؟','شنو الشي اللي يخليني أثق بشخص؟','شنو أكثر شي يخليني أبتعد عن شخص؟','برأيك، شنو أكثر شي أقدّره بالعلاقة؟'],
}
const verdict = (p: number) =>
  p >= 90 ? 'مستحيل! تعرفه أكثر من نفسه، البلوك ملغي! ❤️🔥'
  : p >= 70 ? 'واضح بينكم معرفة قوية، نجوت من البلوك! 😎'
  : p >= 40 ? 'نص ونص… بعدك على حافة البلوك! 😂'
  : 'يا ساتر! شكلك ما تعرفه أبد، البلوك يقترب! 🚫😂'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const go = (h: string) => { location.hash = h }

class Boundary extends Component<{ children: ReactNode }, { e: boolean }> {
  state = { e: false }
  static getDerivedStateFromError() { return { e: true } }
  render() {
    return this.state.e ? <Msg text="صار خطأ غير متوقع 😢" retry={() => { this.setState({ e: false }); go('#/') }} /> : this.props.children
  }
}
function Msg({ text, retry }: { text: string; retry?: () => void }) {
  return <div className="wrap"><div className="card c"><h2>{text}</h2>
    {retry && <button className="btn" onClick={retry}>إعادة المحاولة</button>}
    <button className="btn alt" onClick={() => go('#/')}>الصفحة الرئيسية</button></div></div>
}

function shareLinks(url: string, text: string) {
  const full = `${text}\n${url}`
  return {
    wa: `https://wa.me/?text=${encodeURIComponent(full)}`,
    native: () => navigator.share ? navigator.share({ title: TITLE, text, url }).catch(() => {}) : Promise.resolve(),
    copy: () => navigator.clipboard?.writeText(url),
  }
}

function Home() {
  return <div className="wrap">
    <h1>{TITLE}</h1>
    <p className="c">اختبر أصدقاءك وشوف منو يعرفك صدگ… ومنو يستحق البلوك! 😂</p>
    <div className="card"><h2>🫂 اختبار الأصدقاء</h2><button className="btn" onClick={() => go('#/new/friends')}>ابدأ</button></div>
    <div className="card"><h2>❤️ اختبار الحب والإعجاب</h2><button className="btn" onClick={() => go('#/new/love')}>ابدأ</button></div>
    <button className="btn" onClick={() => go('#/new/friends')}>أنشئ اختبارك الآن</button>
  </div>
}

function Create({ kind }: { kind: Kind }) {
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [qs, setQs] = useState<Q[]>([])
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [link, setLink] = useState('')
  const upd = (i: number, f: (q: Q) => Q) => setQs(qs.map((q, j) => (j === i ? f(q) : q)))
  const add = (q = '') => qs.length < 15 && setQs([...qs, { q, options: ['', '', '', ''], correct: 0 }])

  const validate = () => {
    if (qs.length < 5) return 'لازم 5 أسئلة على الأقل'
    for (const q of qs) {
      const o = q.options.filter(x => x.trim())
      if (!q.q.trim()) return 'في سؤال فارغ'
      if (o.length < 2) return `السؤال "${q.q}" يحتاج خيارين على الأقل`
      if (!q.options[q.correct]?.trim()) return `حدد إجابة صحيحة مكتوبة للسؤال "${q.q}"`
    }
    return ''
  }
  const publish = async () => {
    if (busy) return
    const v = validate(); if (v) return setErr(v)
    setBusy(true); setErr('')
    try {
      const payload = qs.map(q => {
        const keep = q.options.map((t, i) => ({ t: t.trim(), i })).filter(x => x.t)
        return { q: q.q.trim(), options: keep.map(x => x.t), correct: keep.findIndex(x => x.i === q.correct) }
      })
      const { data, error } = await sb.rpc('create_quiz', { p_creator: name.trim(), p_kind: kind, p_questions: payload })
      if (error || !data) throw error
      setLink(`${location.origin}${location.pathname}#/q/${data}`)
      setStep(4)
    } catch { setErr('ما قدرنا ننشئ الاختبار. تأكد من الاتصال وحاول مرة ثانية.') }
    setBusy(false)
  }

  if (step === 4) {
    const s = shareLinks(link, `${name.trim()} دزّلك اختبار 🚫❤️ نشوف تستحق البلوك لو لا؟ 😂`)
    return <div className="wrap"><div className="card c"><h2>اختبارك صار جاهز! دز الرابط وشوف منو يعرفك صدگ ❤️</h2>
      <p dir="ltr" style={{ wordBreak: 'break-all' }}>{link}</p>
      <button className="btn" onClick={() => { s.copy()?.then(() => setErr('تم النسخ ✅')) }}>نسخ الرابط</button>
      <a className="btn" style={{ textDecoration: 'none', boxSizing: 'border-box' }} href={s.wa} target="_blank" rel="noreferrer">مشاركة عبر WhatsApp</a>
      <button className="btn alt" onClick={() => s.native()}>مشاركة…</button>
      {err && <div className="err">{err}</div>}
      <button className="btn alt" onClick={() => go('#/')}>الرئيسية</button></div></div>
  }
  return <div className="wrap">
    <h1>{kind === 'love' ? '❤️ اختبار الحب' : '🫂 اختبار الأصدقاء'}</h1>
    <div className="bar"><i style={{ width: `${step * 33}%` }} /></div>
    {step === 1 && <div className="card"><h2>شنو اسمك أو لقبك؟</h2><p>هذا الاسم يظهر للي يستلم الرابط.</p>
      <input type="text" maxLength={30} value={name} onChange={e => setName(e.target.value)} placeholder="مثال: عباس" />
      {err && <div className="err">{err}</div>}
      <button className="btn" onClick={() => name.trim() ? (setErr(''), setStep(2)) : setErr('اكتب اسمك أولاً')}>التالي</button></div>}
    {step === 2 && <div>
      <div className="card"><h2>أسئلة جاهزة (اضغط للإضافة)</h2>
        {PRESETS[kind].filter(p => !qs.some(q => q.q === p)).map(p => <button key={p} className="chip" onClick={() => add(p)}>{p}</button>)}
        <button className="btn alt" onClick={() => add()}>+ سؤال من كتابتك</button><p>الأسئلة: {qs.length} (من 5 إلى 15)</p></div>
      {qs.map((q, i) => <div className="card" key={i}>
        <div className="row"><input type="text" value={q.q} onChange={e => upd(i, x => ({ ...x, q: e.target.value }))} placeholder="السؤال" />
          <button className="x" onClick={() => setQs(qs.filter((_, j) => j !== i))}>🗑️</button></div>
        {q.options.map((o, k) => <div className="row" key={k}>
          <input type="radio" checked={q.correct === k} onChange={() => upd(i, x => ({ ...x, correct: k }))} />
          <input type="text" value={o} placeholder={`خيار ${k + 1}`} onChange={e => upd(i, x => ({ ...x, options: x.options.map((y, m) => (m === k ? e.target.value : y)) }))} /></div>)}
        {q.options.length < 6 && <button className="chip" onClick={() => upd(i, x => ({ ...x, options: [...x.options, ''] }))}>+ خيار</button>}
        <p style={{ fontSize: 13 }}>الدائرة = الإجابة الصحيحة</p></div>)}
      {err && <div className="err">{err}</div>}
      <button className="btn" onClick={() => { const v = validate(); v ? setErr(v) : (setErr(''), setStep(3)) }}>معاينة</button>
      <button className="btn alt" onClick={() => setStep(1)}>السابق</button></div>}
    {step === 3 && <div className="card"><h2>الملخص</h2>
      <p>المنشئ: <b>{name}</b><br />النوع: <b>{kind === 'love' ? 'حب وإعجاب' : 'أصدقاء'}</b><br />عدد الأسئلة: <b>{qs.length}</b></p>
      <p>أول سؤال: {qs[0]?.q}</p>
      {err && <div className="err">{err}</div>}
      <button className="btn" disabled={busy} onClick={publish}>{busy ? '...جاري الإنشاء' : 'أنشئ الاختبار'}</button>
      <button className="btn alt" disabled={busy} onClick={() => setStep(2)}>تعديل</button></div>}
  </div>
}

function Take({ id }: { id: string }) {
  const [quiz, setQuiz] = useState<{ creator: string; kind: Kind; questions: PubQ[] } | null>(null)
  const [state, setState] = useState<'load' | 'missing' | 'fail' | 'ok'>('load')
  const [started, setStarted] = useState(false)
  const [i, setI] = useState(0)
  const [ans, setAns] = useState<number[]>([])
  const [taker, setTaker] = useState('')
  const [res, setRes] = useState<{ score: number; total: number; creator: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const load = async () => {
    setState('load')
    if (!UUID.test(id)) return setState('missing')
    try {
      const { data, error } = await sb.rpc('get_quiz', { p_id: id })
      if (error) throw error
      if (!data) return setState('missing')
      setQuiz(data); setAns(new Array(data.questions.length).fill(-1)); setState('ok')
    } catch { setState('fail') }
  }
  useEffect(() => { load() }, [id])

  if (state === 'load') return <div className="wrap"><p className="c">...جاري التحميل</p></div>
  if (state === 'missing') return <Msg text="هذا الرابط غير صالح أو الاختبار انحذف 😢" />
  if (state === 'fail' || !quiz) return <Msg text="مشكلة بالاتصال" retry={load} />

  const submit = async () => {
    if (busy || ans.includes(-1)) return
    setBusy(true); setErr('')
    try {
      const { data, error } = await sb.rpc('submit_quiz', { p_id: id, p_answers: ans, p_taker: taker })
      if (error || !data) throw error
      setRes(data)
    } catch { setErr('ما انرسلت الإجابات، حاول مرة ثانية.') }
    setBusy(false)
  }
  if (res) {
    const pct = Math.round((res.score / res.total) * 100)
    const url = `${location.origin}${location.pathname}#/q/${id}`
    const s = shareLinks(url, `جبت ${pct}% بإختبار ${res.creator}! ${verdict(pct)}`)
    return <div className="wrap"><div className="card c"><p>اختبار <b>{res.creator}</b>{taker.trim() && <> — {taker.trim()}</>}</p>
      <div className="big">{pct}%</div><p>{res.score} من {res.total} إجابات صحيحة</p><h2>{verdict(pct)}</h2>
      <p style={{ fontSize: 13 }}>النتيجة تقيس صحة الإجابات فقط 😉</p>
      <a className="btn" style={{ textDecoration: 'none' }} href={s.wa} target="_blank" rel="noreferrer">مشاركة النتيجة</a>
      <button className="btn alt" onClick={() => go(`#/new/${quiz.kind}`)}>أنشئ اختبار خاص</button>
      <button className="btn alt" onClick={() => go('#/')}>الصفحة الرئيسية</button></div></div>
  }
  if (!started) return <div className="wrap"><div className="card c">
    <h2>{quiz.creator} دزّلك اختبار 🚫❤️</h2>
    <p>{quiz.kind === 'love' ? `${quiz.creator} يريد يعرف شكد تعرفه صدگ! ❤️` : `${quiz.creator} دزّلك اختبار… نشوف تستحق البلوك لو لا؟ 😂`}</p>
    <input type="text" maxLength={30} value={taker} onChange={e => setTaker(e.target.value)} placeholder="اسمك (اختياري)" />
    <button className="btn" onClick={() => setStarted(true)}>ابدأ الاختبار</button></div></div>

  const q = quiz.questions[i], last = i === quiz.questions.length - 1
  return <div className="wrap"><p className="c">السؤال {i + 1} من {quiz.questions.length}</p>
    <div className="bar"><i style={{ width: `${((i + 1) / quiz.questions.length) * 100}%` }} /></div>
    <div className="card" style={{ marginTop: 14 }}><h2>{q.q}</h2>
      {q.options.map((o, k) => <button key={k} className={'opt' + (ans[i] === k ? ' on' : '')} onClick={() => setAns(ans.map((a, j) => (j === i ? k : a)))}>{o}</button>)}
      {err && <div className="err">{err}</div>}
      {last ? <button className="btn" disabled={ans[i] < 0 || busy} onClick={submit}>{busy ? '...جاري الإرسال' : 'شوف النتيجة'}</button>
        : <button className="btn" disabled={ans[i] < 0} onClick={() => setI(i + 1)}>التالي</button>}
      {i > 0 && <button className="btn alt" onClick={() => setI(i - 1)}>السابق</button>}</div></div>
}

export default function App() {
  const [h, setH] = useState(location.hash)
  useEffect(() => { const f = () => { setH(location.hash); scrollTo(0, 0) }; addEventListener('hashchange', f); return () => removeEventListener('hashchange', f) }, [])
  if (!ready) return <Msg text="لم يتم ربط Supabase بعد. اتبع ملف README." />
  const m = h.match(/^#\/q\/(.+)$/), n = h.match(/^#\/new\/(friends|love)$/)
  return <Boundary>{m ? <Take key={m[1]} id={m[1]} /> : n ? <Create key={n[1]} kind={n[1] as Kind} /> : <Home />}</Boundary>
}

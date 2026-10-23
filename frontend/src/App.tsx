import ServerStatus from './components/ServerStatus'

export default function App() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-16 text-slate-100">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
        <p className="text-sm font-semibold tracking-widest text-sky-400">ARAM AUGMENTS</p>
        <h1 className="text-3xl font-bold sm:text-4xl">증강 칼바람 커뮤니티</h1>
        <p className="text-slate-400">
          챔피언별 추천 증강, 증강 소개, 조합 추천을 친구들과 공유하는 곳이에요.
        </p>
        <ServerStatus />
      </div>
    </main>
  )
}

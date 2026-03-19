import { gameModules } from "@fairy/shared";

export function App() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">文字修仙世界</p>
        <h1>Fairy Cultivation</h1>
        <p className="lead">
          這是修仙文字網頁遊戲的初始前端骨架。後續會在這裡逐步接上角色、修練、副本、煉丹、種藥與鍛造系統。
        </p>
      </section>

      <section className="grid">
        {gameModules.map((module) => (
          <article key={module.key} className="module-card">
            <h2>{module.name}</h2>
            <p>{module.description}</p>
            <span className="status-tag">規劃中</span>
          </article>
        ))}
      </section>
    </main>
  );
}

import { useState } from 'react'
import '../ios-demo.css'

type Screen = 'login' | 'trabalhador' | 'chefe' | 'nova'

const SCREENS: { key: Screen; label: string }[] = [
  { key: 'login', label: 'Entrar' },
  { key: 'trabalhador', label: 'Trabalhador' },
  { key: 'chefe', label: 'Chefe' },
  { key: 'nova', label: 'Nova tarefa' },
]

function StatusBar() {
  return (
    <div className="ios-statusbar">
      <span>9:41</span>
      <div className="ios-notch" />
      <span className="right">▮▮▮ ⌁ ▰</span>
    </div>
  )
}

/* ---------------- Ecrã: Entrar ---------------- */

function LoginScreen() {
  const [role, setRole] = useState<'chefe' | 'trabalhador'>('trabalhador')
  return (
    <>
      <div className="ios-screen">
        <div className="ios-login">
          <div className="logo">✓</div>
          <h2>FlowTask</h2>
          <p>Tarefas em casa, com valor e pagamento no fim da semana.</p>

          <div className="role-picker">
            <button
              className={`role ${role === 'chefe' ? 'on' : ''}`}
              onClick={() => setRole('chefe')}
            >
              <span className="emoji">💼</span>
              Chefe
            </button>
            <button
              className={`role ${role === 'trabalhador' ? 'on' : ''}`}
              onClick={() => setRole('trabalhador')}
            >
              <span className="emoji">🧑</span>
              Trabalhador
            </button>
          </div>

          <div className="ios-field" style={{ width: '100%', textAlign: 'left' }}>
            <label>Código da família</label>
            <input className="ios-input" defaultValue="FAMILIA" readOnly />
          </div>

          <div className="ios-field" style={{ width: '100%', textAlign: 'left' }}>
            <label>O teu nome</label>
            <input className="ios-input" placeholder="Ex.: João" readOnly />
          </div>

          <button className="ios-btn">Entrar</button>
        </div>
      </div>
    </>
  )
}

/* ---------------- Ecrã: Trabalhador ---------------- */

function TrabalhadorScreen() {
  return (
    <>
      <div className="ios-screen">
        <div className="ios-header">
          <div className="eyebrow">Olá, João</div>
          <h2>As minhas tarefas</h2>
        </div>

        <div className="ios-hero">
          <div className="label">Ainda vais receber</div>
          <div className="amount">17,50 €</div>
          <div className="sub">3 tarefas feitas esta semana</div>
          <div className="row">
            <div className="pill">
              <span>Já recebido</span>
              <b>42,00 €</b>
            </div>
            <div className="pill">
              <span>Por fazer</span>
              <b>2</b>
            </div>
          </div>
        </div>

        <div className="ios-callout">
          <span className="ico">🔔</span>
          <div className="txt">
            <b>Hora de receber!</b>
            <p>É fim de semana. Avisa o chefe para te pagar.</p>
          </div>
        </div>
        <button className="ios-btn green" style={{ marginBottom: 16 }}>
          📣 Avisar o chefe
        </button>

        <div className="ios-card-title">Por fazer</div>
        <div className="ios-list">
          <div className="ios-row">
            <button className="ios-check" aria-label="marcar" />
            <div className="content">
              <div className="title">Lavar a louça</div>
              <div className="desc">⏱ até hoje</div>
            </div>
            <div className="trailing">
              <div className="price">2,50 €</div>
            </div>
          </div>
          <div className="ios-row">
            <button className="ios-check" aria-label="marcar" />
            <div className="content">
              <div className="title">Aspirar a casa</div>
              <div className="desc">⏱ até 5 de nov.</div>
            </div>
            <div className="trailing">
              <div className="price">5,00 €</div>
            </div>
          </div>
        </div>

        <div className="ios-card-title">Esta semana</div>
        <div className="ios-list">
          <div className="ios-row">
            <div className="ios-check on">✓</div>
            <div className="content">
              <div className="title">Lavar a roupa</div>
              <div className="desc">Hoje, 10:24</div>
            </div>
            <div className="trailing">
              <div className="price">7,50 €</div>
            </div>
          </div>
          <div className="ios-row">
            <div className="ios-check on">✓</div>
            <div className="content">
              <div className="title">Passear o cão</div>
              <div className="desc">Ontem, 18:02</div>
            </div>
            <div className="trailing">
              <div className="price">5,00 €</div>
            </div>
          </div>
          <div className="ios-row">
            <div className="ios-check on">✓</div>
            <div className="content">
              <div className="title">Pôr a mesa</div>
              <div className="desc">Ontem, 19:30</div>
            </div>
            <div className="trailing">
              <div className="price">5,00 €</div>
            </div>
          </div>
        </div>

        <div className="ios-card-title">Não feitas</div>
        <div className="ios-list">
          <div className="ios-row">
            <div className="ios-check" style={{ borderColor: '#ff3b30', color: '#ff3b30' }}>
              ✕
            </div>
            <div className="content">
              <div className="title">Limpar a casa de banho</div>
              <div className="desc">Motivo: Não me sinto bem</div>
            </div>
            <div className="trailing">
              <span className="ios-tag red">Recusada</span>
            </div>
          </div>
        </div>
      </div>

      <div className="ios-tabbar">
        <button className="ios-tab on">
          <span className="ico">🏠</span>
          Início
        </button>
        <button className="ios-tab">
          <span className="ico">🗓</span>
          Histórico
        </button>
        <button className="ios-tab">
          <span className="ico">👤</span>
          Perfil
        </button>
      </div>
    </>
  )
}

/* ---------------- Ecrã: Chefe ---------------- */

function ChefeScreen() {
  return (
    <>
      <div className="ios-screen">
        <div className="ios-header">
          <div className="eyebrow">Painel do chefe</div>
          <h2>Início</h2>
        </div>

        <div className="ios-stats">
          <div className="ios-stat">
            <div className="lbl">Por pagar</div>
            <div className="val" style={{ color: '#ff9500' }}>
              17,50 €
            </div>
            <div className="hint">3 tarefas feitas</div>
          </div>
          <div className="ios-stat">
            <div className="lbl">Esta semana</div>
            <div className="val" style={{ color: '#007aff' }}>
              25,00 €
            </div>
            <div className="hint">5 tarefas</div>
          </div>
          <div className="ios-stat">
            <div className="lbl">Por fazer</div>
            <div className="val">2</div>
            <div className="hint">pendentes</div>
          </div>
          <div className="ios-stat">
            <div className="lbl">Recusadas</div>
            <div className="val" style={{ color: '#ff3b30' }}>
              1
            </div>
            <div className="hint">5,00 € não pagos</div>
          </div>
        </div>

        <div className="ios-callout blue">
          <span className="ico">📣</span>
          <div className="txt">
            <b>O trabalhador pediu para receber</b>
            <p>17,50 € · semana de 27 out – 2 nov</p>
          </div>
        </div>
        <div className="ios-actions" style={{ marginBottom: 16 }}>
          <button className="ios-btn sm" style={{ flex: 1 }}>
            Pagar
          </button>
          <button className="ios-btn sm gray" style={{ flex: 1 }}>
            Já vi
          </button>
        </div>

        <div className="ios-card">
          <div className="ios-card-title">Ganhos por semana</div>
          <div className="ios-bars">
            {[
              { l: 'S1', v: 30 },
              { l: 'S2', v: 55 },
              { l: 'S3', v: 40 },
              { l: 'S4', v: 75 },
              { l: 'S5', v: 50 },
              { l: 'S6', v: 90 },
            ].map((b, i) => (
              <div className="bar-wrap" key={b.l}>
                <div
                  className={`bar ${i === 5 ? '' : 'muted'}`}
                  style={{ height: `${b.v}%` }}
                />
                <span className="lbl">{b.l}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="ios-card-title">Por fazer</div>
        <div className="ios-list">
          <div className="ios-row">
            <span className="icon blue">🧽</span>
            <div className="content">
              <div className="title">Lavar a louça</div>
              <div className="desc">⏱ até hoje</div>
            </div>
            <div className="trailing">
              <div className="price">2,50 €</div>
            </div>
          </div>
          <div className="ios-row">
            <span className="icon purple">🧹</span>
            <div className="content">
              <div className="title">Aspirar a casa</div>
              <div className="desc">⏱ até 5 de nov.</div>
            </div>
            <div className="trailing">
              <div className="price">5,00 €</div>
            </div>
          </div>
        </div>

        <div className="ios-card-title">Feitas, por pagar</div>
        <div className="ios-list">
          <div className="ios-row">
            <span className="icon green">👕</span>
            <div className="content">
              <div className="title">Lavar a roupa</div>
              <div className="desc">Hoje, 10:24</div>
            </div>
            <div className="trailing">
              <div className="price">7,50 €</div>
            </div>
          </div>
          <div className="ios-row">
            <span className="icon orange">🐕</span>
            <div className="content">
              <div className="title">Passear o cão</div>
              <div className="desc">Ontem, 18:02</div>
            </div>
            <div className="trailing">
              <div className="price">5,00 €</div>
            </div>
          </div>
        </div>

        <button className="ios-btn green">💸 Pagar 17,50 €</button>
      </div>

      <div className="ios-tabbar">
        <button className="ios-tab on">
          <span className="ico">🏠</span>
          Início
        </button>
        <button className="ios-tab">
          <span className="ico">☑</span>
          Tarefas
        </button>
        <button className="ios-tab">
          <span className="ico">🗓</span>
          Histórico
        </button>
      </div>
    </>
  )
}

/* ---------------- Ecrã: Nova tarefa ---------------- */

function NovaTarefaScreen() {
  const [price, setPrice] = useState('250')
  const [due, setDue] = useState('hoje')
  return (
    <div className="ios-screen">
      <div className="ios-header">
        <div className="eyebrow">Chefe</div>
        <h2>Nova tarefa</h2>
      </div>

      <div className="ios-field">
        <label>O que há para fazer?</label>
        <input className="ios-input" defaultValue="Lavar a louça" readOnly />
        <div className="ios-chips">
          {['Lavar a roupa', 'Aspirar', 'Pôr a mesa'].map((s) => (
            <button className="ios-chip" key={s}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="ios-field">
        <label>Detalhes</label>
        <textarea
          className="ios-input ios-textarea"
          defaultValue="Inclui secar e arrumar os armários"
          readOnly
        />
      </div>

      <div className="ios-field">
        <label>Quanto vale?</label>
        <input className="ios-input big" value={`${(Number(price) / 100).toFixed(2).replace('.', ',')} €`} readOnly />
        <div className="ios-chips">
          {[100, 250, 500, 750, 1000, 1500].map((p) => (
            <button
              className={`ios-chip ${price === String(p) ? 'on' : ''}`}
              key={p}
              onClick={() => setPrice(String(p))}
            >
              {(p / 100).toFixed(2).replace('.', ',')} €
            </button>
          ))}
        </div>
      </div>

      <div className="ios-field">
        <label>Prazo</label>
        <div className="ios-chips">
          {['hoje', 'amanhã', 'fim de semana', 'sem prazo'].map((d) => (
            <button
              className={`ios-chip ${due === d ? 'on' : ''}`}
              key={d}
              onClick={() => setDue(d)}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="ios-card" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <div className="ios-card-title" style={{ marginBottom: 2 }}>
            Tarefa
          </div>
          <b>Lavar a louça</b>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="ios-card-title" style={{ marginBottom: 2 }}>
            Valor
          </div>
          <b>{(Number(price) / 100).toFixed(2).replace('.', ',')} €</b>
        </div>
      </div>

      <button className="ios-btn">Criar tarefa</button>
    </div>
  )
}

/* ---------------- Página ---------------- */

export default function IosDemo() {
  const [screen, setScreen] = useState<Screen>('trabalhador')

  return (
    <div className="ios-demo">
      <div className="ios-demo-bar">
        <h1>Demonstração — tema iOS</h1>
        <p>Pré-visualização. Nada disto está na app real.</p>
        <div className="ios-seg">
          {SCREENS.map((s) => (
            <button
              key={s.key}
              className={screen === s.key ? 'on' : ''}
              onClick={() => setScreen(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ios-phone">
        <StatusBar />
        {screen === 'login' && <LoginScreen />}
        {screen === 'trabalhador' && <TrabalhadorScreen />}
        {screen === 'chefe' && <ChefeScreen />}
        {screen === 'nova' && <NovaTarefaScreen />}
        <div className="ios-home-indicator" />
      </div>

      <div className="ios-demo-note">
        <b>O que muda com este tema:</b>
        <ul>
          <li>Fundo cinza claro (#F2F2F7) e cartões brancos arredondados</li>
          <li>Azul iOS (#007AFF) como cor principal</li>
          <li>Bottom tab bar fixa com ícones</li>
          <li>Listas agrupadas com separadores finos</li>
          <li>Botões grandes tipo pílula e campos com cantos suaves</li>
          <li>Cabeçalhos grandes e a negrito</li>
        </ul>
      </div>
    </div>
  )
}

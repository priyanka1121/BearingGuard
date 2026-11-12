import { useEffect, useRef, useState } from 'react'
import { checkServer, predict } from './api'
import './App.css'

const NAMES = { normal: 'Normal', inner: 'Inner race', outer: 'Outer race', ball: 'Ball' }
const NOTES = {
  normal: 'The vibration pattern matches a healthy bearing.',
  inner: 'The damage pattern points to the ring that spins with the shaft.',
  outer: 'The damage pattern points to the stationary outer ring.',
  ball: 'The damage pattern points to one or more rolling balls.',
}

function Bearing({ rpm, fault }) {
  const speed = Math.min(40, Math.max(5, 9000 / (Number(rpm) || 1200)))
  const balls = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4
    return { x: 200 + 125 * Math.cos(a), y: 200 + 125 * Math.sin(a) }
  })
  return (
    <svg className="bearing" viewBox="0 0 400 400" aria-hidden="true" data-fault={fault || ''} style={{ '--spin': `${speed}s` }}>
      <circle className="ring outer" cx="200" cy="200" r="168" />
      <g className="cage">
        {balls.map((b, i) => (
          <g key={i} className="ball">
            <circle cx={b.x} cy={b.y} r="19" />
            <circle className="glint" cx={b.x - 6} cy={b.y - 6} r="4" />
          </g>
        ))}
      </g>
      <g className="shaft">
        <circle className="ring inner" cx="200" cy="200" r="84" />
        <circle className="bore" cx="200" cy="200" r="52" />
        <rect className="key" x="196" y="140" width="8" height="26" rx="3" />
      </g>
    </svg>
  )
}

export default function App() {
  const [file, setFile] = useState(null)
  const [rpm, setRpm] = useState('')
  const [phase, setPhase] = useState('idle')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [online, setOnline] = useState(null)
  const [dragging, setDragging] = useState(false)
  const input = useRef(null)

  useEffect(() => {
    let stop = false
    ;(async () => {
      for (let i = 0; i < 14 && !stop; i++) {
        if (await checkServer()) {
          if (!stop) setOnline(true)
          return
        }
        if (i === 0 && !stop) setOnline('waking')
        await new Promise((r) => setTimeout(r, 4000))
      }
      if (!stop) setOnline(false)
    })()
    return () => {
      stop = true
    }
  }, [])

  const pick = (f) => {
    if (!f) return
    if (!f.name.toLowerCase().endsWith('.mat')) {
      setError('That file is not a .mat recording. Choose a .mat vibration file.')
      return
    }
    setError('')
    setResult(null)
    setPhase('idle')
    setFile(f)
  }

  const run = async () => {
    if (!file) return setError('Choose a .mat vibration file first.')
    if (rpm === '') return setError('Please enter the motor RPM.')
    if (!(Number(rpm) > 0)) return setError('RPM must be greater than zero.')
    setError('')
    setPhase('loading')
    try {
      setResult(await predict(file, rpm))
      setPhase('done')
    } catch (e) {
      setError(e.message)
      setPhase('idle')
    }
  }

  const fault = result && result.kind !== 'normal' ? result.kind : ''
  const ranked = result ? Object.entries(result.probs).sort((a, b) => b[1] - a[1]) : []

  return (
    <div className="stage">
      <Bearing rpm={rpm} fault={fault} />
      <header className="top">
        <div className="brand">
          <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
            <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="3" />
            <circle cx="16" cy="16" r="5" fill="currentColor" />
          </svg>
          BearingGuard
        </div>
        <span className={`pill ${online === false ? 'off' : online === true ? 'on' : ''}`}>
          <i /> {online === null ? 'Checking server' : online === 'waking' ? 'Waking the server, about a minute' : online ? 'Server ready' : 'Server offline'}
        </span>
      </header>

      <main className="page">
        <section className="hero">
          <h1>Find out a bearing is wearing out before the machine breaks down.</h1>
          <p className="lead">
            Motors, pumps and fans all spin on bearings. When a bearing gets damaged it vibrates differently, long
            before it fails. BearingGuard reads a vibration recording and tells you which part is damaged.
          </p>
          <a className="cue" href="#check">Try it with a recording</a>
        </section>

        <section className="block">
          <h2>What it is</h2>
          <p>
            A bearing is the ring and set of small steel balls that lets a shaft turn smoothly. A sensor placed on the
            motor can record how it shakes, and that recording is just a long list of numbers over time.
          </p>
          <p>
            BearingGuard is a machine learning tool that studies those numbers. It tells you whether the bearing is
            healthy, or whether the outer ring, the inner ring or a ball is damaged.
          </p>
        </section>

        <section className="block">
          <h2>How it helps</h2>
          <p>
            Most teams find out about a bad bearing when the machine stops, or when someone listens to it by hand. A
            second opinion from the data is earlier and more specific: which part, how sure the model is, and what to
            do next. A repair can then be planned instead of rushed.
          </p>
        </section>

        <section className="steps">
          <div>
            <h3>1. Record</h3>
            <p>A vibration sensor on the motor housing saves a short recording as a .mat file.</p>
          </div>
          <div>
            <h3>2. Upload</h3>
            <p>Add the file below and type the motor speed in RPM.</p>
          </div>
          <div>
            <h3>3. Read the answer</h3>
            <p>
              The tool measures how rough the signal is and how much energy sits at the frequencies each bearing part
              produces. A trained model matches that to one of four conditions.
            </p>
          </div>
        </section>

        <section className="glass data">
          <h2>Where to get a recording</h2>
          <p>
            BearingGuard was trained on the Case Western Reserve University Bearing Data Center, a free public set of
            motor bearing recordings. Search for “CWRU bearing data center” and download the drive end .mat files.
          </p>
          <p>
            Your own data works if it is a .mat file with a variable ending in _DE_time, recorded at 12,000 samples
            per second. These files are good first tests:
          </p>
          <div className="scroll">
            <table>
              <thead>
                <tr><th>File</th><th>RPM</th><th>Expected result</th></tr>
              </thead>
              <tbody>
                <tr><td>Normal_3.mat</td><td>1725</td><td>Normal</td></tr>
                <tr><td>IR007_3.mat</td><td>1721</td><td>Inner race</td></tr>
                <tr><td>B007_3.mat</td><td>1722</td><td>Ball</td></tr>
                <tr><td>OR007@6_3.mat</td><td>1725</td><td>Outer race</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="tool" id="check">
          <h2>Check a bearing</h2>
          <p>Upload a recording and enter the speed the motor was running at.</p>
        <div className="glass panel" aria-label="Bearing check">
          <button
            type="button"
            className={`drop ${dragging ? 'drag' : ''} ${file ? 'has' : ''}`}
            onClick={() => input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              pick(e.dataTransfer.files[0])
            }}
          >
            <strong>{file ? file.name : 'Drop a .mat file here'}</strong>
            <span>{file ? 'Tap to choose a different file' : 'or tap to browse your files'}</span>
          </button>
          <input ref={input} type="file" accept=".mat" hidden onChange={(e) => pick(e.target.files[0])} />

          <label className="rpm">
            <span>Motor speed (RPM)</span>
            <input type="number" inputMode="numeric" min="1" placeholder="For example 1725" value={rpm} onChange={(e) => setRpm(e.target.value)} />
          </label>

          {error && <p className="error" role="alert">{error}</p>}

          <button className="go" onClick={run} disabled={phase === 'loading'}>
            {phase === 'loading' ? 'Listening to the vibration…' : 'Analyze bearing'}
          </button>

          {result && (
            <div className={`result ${fault ? 'bad' : 'good'}`} aria-live="polite">
              <div className="verdict">
                <div>
                  <h3>{fault ? `${NAMES[result.kind]} fault likely` : 'Bearing looks healthy'}</h3>
                  <p>{result.recommendation || NOTES[result.kind]}</p>
                </div>
                <div className="conf">
                  {result.confidence.toFixed(1)}%<small>confidence</small>
                </div>
              </div>
              <ul className="bars">
                {ranked.map(([k, v]) => (
                  <li key={k}>
                    <span>{NAMES[k]}</span>
                    <div><b style={{ width: `${v}%` }} /></div>
                    <em>{v.toFixed(1)}%</em>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        </section>
      </main>
      <p className="foot">
        A learning project built on one public dataset. It supports, and does not replace, a maintenance engineer’s
        inspection.
      </p>
    </div>
  )
}
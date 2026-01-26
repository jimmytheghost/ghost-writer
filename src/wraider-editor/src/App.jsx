import './App.css'
import Editor from './components/Editor'

function App() {
  return (
    <div className="app">
      <header className="app__header">
        <h1>Wraider</h1>
        <p className="app__subtitle">AI-assisted writing, powered by Ollama.</p>
      </header>
      <main className="app__main">
        <Editor />
      </main>
    </div>
  )
}

export default App

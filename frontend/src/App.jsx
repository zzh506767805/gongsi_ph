import { useState } from 'react'
import './App.css'

function App() {
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!topic) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('http://localhost:3000/api/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.message || '请求失败')
      
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <h1>AI产品研究助手</h1>
      <form onSubmit={handleSubmit} className="search-form">
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="输入产品主题"
          disabled={loading}
        />
        <button type="submit" disabled={loading}>
          {loading ? '研究中...' : '开始研究'}
        </button>
      </form>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {result && (
        <div className="result-message">
          <p>研究报告已生成！</p>
          <a href={result.docUrl} target="_blank" rel="noopener noreferrer">
            查看飞书文档
          </a>
        </div>
      )}
    </div>
  )
}

export default App
